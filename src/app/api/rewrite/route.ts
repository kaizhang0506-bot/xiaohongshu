import { RoutedTextClient as LLMClient } from '@/lib/text-client';
import { NextRequest } from 'next/server';
import { Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';
import { buildSystemPrompt, buildUserMessages } from '@/lib/prompt';
import {
  findOption,
  LENGTH_OPTIONS,
  STRUCTURE_OPTIONS,
  STYLE_OPTIONS,
  type OptionDef,
} from '@/lib/options';
import type {
  CustomOptionPayload,
  RewriteRequest,
  StreamEvent,
} from '@/lib/types';
import { getTextModel } from '@/lib/model';
import { missingSourceFacts } from '@/lib/rewrite-quality';

export const runtime = 'nodejs';
export const maxDuration = 240;

const MAX_IMAGES = 10;
const CUSTOM_LABEL_MAX = 12;
const CUSTOM_DESC_MAX = 100;

function encodeEvent(event: StreamEvent): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function extractImageParts(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter(
      (img): img is string =>
        typeof img === 'string' && img.startsWith('data:image/'),
    )
    .slice(0, MAX_IMAGES);
}

/** 校验并清洗自定义选项载荷（非法时返回 undefined，调用方回退预设） */
function sanitizeCustomPayload(
  value: unknown,
): CustomOptionPayload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const obj = value as Record<string, unknown>;
  const label = typeof obj.label === 'string' ? obj.label.trim() : '';
  const desc = typeof obj.desc === 'string' ? obj.desc.trim() : '';
  if (!label || !desc) return undefined;
  return {
    label: label.slice(0, CUSTOM_LABEL_MAX),
    desc: desc.slice(0, CUSTOM_DESC_MAX),
  };
}

function normalizeRequest(raw: unknown): RewriteRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const referenceText =
    typeof obj.referenceText === 'string' ? obj.referenceText : '';
  const images = extractImageParts(obj.images);
  if (!referenceText.trim() && images.length === 0) return null;

  const settingsRaw = (obj.settings ?? {}) as Record<string, unknown>;
  const asText = (v: unknown): string => (typeof v === 'string' ? v : '');

  // 三个维度均支持自定义：值为 'custom' 且附带合法载荷时放行，否则回退预设
  const resolveDim = (
    dimId: unknown,
    dimPayload: unknown,
    options: OptionDef<string>[],
  ): { id: string; custom?: CustomOptionPayload } => {
    if (typeof dimId === 'string' && dimId === 'custom') {
      const custom = sanitizeCustomPayload(dimPayload);
      if (custom) return { id: 'custom', custom };
    }
    return {
      id: findOption(options, typeof dimId === 'string' ? dimId : '').id,
    };
  };

  const style = resolveDim(obj.style, obj.customStyle, STYLE_OPTIONS);
  const structure = resolveDim(
    obj.structure,
    obj.customStructure,
    STRUCTURE_OPTIONS,
  );
  const length = resolveDim(obj.length, obj.customLength, LENGTH_OPTIONS);

  return {
    images,
    referenceText,
    style: style.id,
    structure: structure.id,
    length: length.id,
    customStyle: style.custom,
    customStructure: structure.custom,
    customLength: length.custom,
    modelId: getTextModel(obj.modelId).id,
    customPrompt:
      typeof obj.customPrompt === 'string' && obj.customPrompt.trim()
        ? obj.customPrompt.trim().slice(0, 500)
        : undefined,
    batchContext:
      typeof obj.batchContext === 'string' && obj.batchContext.trim()
        ? obj.batchContext.trim().slice(0, 2000)
        : undefined,
    deepThinking: obj.deepThinking === true,
    settings: {
      brandName: asText(settingsRaw.brandName),
      targetAudience: asText(settingsRaw.targetAudience),
      forbiddenWords: asText(settingsRaw.forbiddenWords),
      toneHint: asText(settingsRaw.toneHint),
    },
  };
}

/** 图片输入相关错误（文案为空且模型不支持读图等场景） */
class ImageInputError extends Error {}

function buildError(
  rewriteRequest: RewriteRequest,
  supportsImage: boolean,
): ImageInputError | null {
  if (!supportsImage && rewriteRequest.images.length > 0) {
    // 仅文本模型：忽略参考图；若连文案也没有则无法继续
    if (!rewriteRequest.referenceText.trim()) {
      return new ImageInputError(
        '当前所选模型不支持图片输入，请补充参考文案或切换支持读图的模型',
      );
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const rewriteRequest = normalizeRequest(raw);
  if (!rewriteRequest) {
    return Response.json(
      { error: '请至少提供参考文案或 1 张参考图' },
      { status: 400 },
    );
  }

  // 解析所选模型（白名单校验，未命中回退默认）
  const model = getTextModel(rewriteRequest.modelId);

  const inputError = buildError(rewriteRequest, model.supportsImage);
  if (inputError) {
    return Response.json({ error: inputError.message }, { status: 400 });
  }

  // 仅文本模型不支持读图：丢弃参考图，只用文案
  if (!model.supportsImage) {
    rewriteRequest.images = [];
  }

  const systemPrompt = buildSystemPrompt(rewriteRequest);
  const userMessages = buildUserMessages(rewriteRequest);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (event: StreamEvent) => {
        if (!closed) controller.enqueue(encodeEvent(event));
      };

      try {
        const messages: Message[] = [
          { role: 'system', content: systemPrompt },
          ...userMessages,
        ];

        const customHeaders =
          HeaderUtils.extractForwardHeaders(request.headers);
        const config = new Config();
        const client = new LLMClient(config, customHeaders);

        for (let attempt = 0; attempt < 2; attempt += 1) {
        let fullText = '';
        const llmStream = client.stream(messages, {
          model: model.id,
          thinking: rewriteRequest.deepThinking ? 'enabled' : 'disabled',
          temperature: 0.85,
          streaming: true,
        });

        for await (const chunk of llmStream) {
          if (chunk.content) {
            const text =
              typeof chunk.content === 'string'
                ? chunk.content
                : JSON.stringify(chunk.content);
            if (text) {
              fullText += text;
              safeEnqueue({ type: 'delta', text });
            }
          }
        }
        if (rewriteRequest.length !== 'follow' || !rewriteRequest.referenceText.trim()) break;
        let body = '';
        try { body = JSON.parse(fullText.slice(fullText.indexOf('{'), fullText.lastIndexOf('}') + 1)).body ?? ''; } catch { throw new Error('模型返回格式不完整，请重试'); }
        if (typeof body !== 'string') throw new Error('模型返回正文格式有误，请重试');
        const missing = missingSourceFacts(rewriteRequest.referenceText, body);
        if (!missing.length) break;
        if (attempt === 1) throw new Error(`改写仍缺少原文的关键数字或指标（${missing.join('、')}），请重试；未将不完整文案作为成品。`);
        safeEnqueue({ type: 'reset' });
        messages.push({ role: 'assistant', content: fullText }, { role: 'user', content: `请修正遗漏，重新输出完整JSON。正文遗漏了这些原文数字、周期或指标：${missing.join('、')}。必须结合原文对应的观察条件、跟踪规则或失效条件自然写回正文，不得只堆在标题、标签或说明里；保留其他原意和本套的独立表达。不要新增案例，不把原观点写成收益保证；可用中性归因介绍原文的方法。` });
        }
        closed = true;
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'AI 生成失败，请稍后重试';
        safeEnqueue({ type: 'error', message });
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Transfer-Encoding': 'chunked',
      Connection: 'keep-alive',
    },
  });
}

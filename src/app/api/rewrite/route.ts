import { NextRequest } from 'next/server';
import { Config, HeaderUtils, LLMClient, Message } from 'coze-coding-dev-sdk';
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
import {
  getTextModel,
  isDeepseekModel,
  sanitizeDeepseekBaseUrl,
  sanitizeDeepseekModelId,
} from '@/lib/model';
import { streamDeepseek, type DeepseekContentPart } from '@/lib/deepseek';

export const runtime = 'nodejs';
export const maxDuration = 120;

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
    deepseekKey:
      typeof obj.deepseekKey === 'string' && obj.deepseekKey.trim()
        ? obj.deepseekKey.trim()
        : undefined,
    deepseekBaseUrl:
      typeof obj.deepseekBaseUrl === 'string' && obj.deepseekBaseUrl.trim()
        ? obj.deepseekBaseUrl.trim()
        : undefined,
    deepseekModelId:
      typeof obj.deepseekModelId === 'string' && obj.deepseekModelId.trim()
        ? obj.deepseekModelId.trim()
        : undefined,
    deepseekVision: obj.deepseekVision === true,
    customPrompt:
      typeof obj.customPrompt === 'string' && obj.customPrompt.trim()
        ? obj.customPrompt.trim().slice(0, 500)
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

/** DeepSeek 自有 Key 缺失错误 */
class DeepseekKeyError extends Error {}

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

/** 将多模态用户消息压平为纯文本（DeepSeek 文本接口用） */
function userTextOf(req: RewriteRequest): string {
  const content = buildUserMessages(req)[0]?.content;
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('\n');
}

/** 将用户消息转换为 OpenAI 兼容多模态分片（DeepSeek 读图模式用） */
function userPartsOf(req: RewriteRequest): DeepseekContentPart[] {
  const content = buildUserMessages(req)[0]?.content;
  if (!content) return [];
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  const parts: DeepseekContentPart[] = [];
  for (const part of content) {
    if (part.type === 'text' && typeof part.text === 'string') {
      parts.push({ type: 'text', text: part.text });
    } else if (part.type === 'image_url' && part.image_url?.url) {
      parts.push({ type: 'image_url', image_url: { url: part.image_url.url } });
    }
  }
  return parts;
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
  const useDeepseek = isDeepseekModel(model);

  // DeepSeek 走自有 Key 直连：优先用户设置页配置，缺省回落服务端预配置（环境变量）
  const presetKey = process.env.DEEPSEEK_API_KEY?.trim() || undefined;
  const effectiveKey = rewriteRequest.deepseekKey ?? presetKey;

  // 完全无 Key 时给出明确指引
  if (useDeepseek && !effectiveKey) {
    return Response.json(
      {
        error:
          '未配置 DeepSeek API Key：请先在「设置」页填写你的 Key，再选择 DeepSeek 模型',
      },
      { status: 400 },
    );
  }

  // DeepSeek 通道读图：用户本地声明开启，或服务端预配置开启
  const deepseekVision =
    useDeepseek &&
    (model.supportsImage || rewriteRequest.deepseekVision === true ||
      process.env.DEEPSEEK_VISION === '1');

  const inputError = buildError(
    rewriteRequest,
    model.supportsImage || deepseekVision,
  );
  if (inputError) {
    return Response.json({ error: inputError.message }, { status: 400 });
  }

  // 仅文本模型不支持读图：丢弃参考图，只用文案
  if (!model.supportsImage && !deepseekVision) {
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
        if (useDeepseek && effectiveKey) {
          // DeepSeek 兼容接口直连：请求体字段优先，缺省回落服务端预配置
          const baseUrl = sanitizeDeepseekBaseUrl(
            rewriteRequest.deepseekBaseUrl ?? process.env.DEEPSEEK_BASE_URL,
          );
          const modelId = sanitizeDeepseekModelId(
            model.relayModelId ??
              rewriteRequest.deepseekModelId ??
              process.env.DEEPSEEK_MODEL_ID,
          );
          await streamDeepseek({
            modelId,
            apiKey: effectiveKey,
            apiUrl: `${baseUrl}/chat/completions`,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: deepseekVision
                  ? userPartsOf(rewriteRequest)
                  : userTextOf(rewriteRequest),
              },
            ],
            temperature: 0.85,
            thinking: rewriteRequest.deepThinking,
            safeEnqueue,
          });
        } else {
          // 环境托管模型
          const customHeaders =
            HeaderUtils.extractForwardHeaders(request.headers);
          const config = new Config();
          const client = new LLMClient(config, customHeaders);

          const messages: Message[] = [
            { role: 'system', content: systemPrompt },
            ...userMessages,
          ];

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
                safeEnqueue({ type: 'delta', text });
              }
            }
          }
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


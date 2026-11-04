import { NextRequest } from 'next/server';
import { Config, HeaderUtils, LLMClient, Message } from 'coze-coding-dev-sdk';
import type { ContentPart } from 'coze-coding-dev-sdk';
import type { ExtractRequest, StreamEvent } from '@/lib/types';
import {
  getTextModel,
  isDeepseekModel,
  sanitizeDeepseekBaseUrl,
  sanitizeDeepseekModelId,
} from '@/lib/model';
import { streamDeepseek } from '@/lib/deepseek';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_IMAGES = 10;

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

function normalizeRequest(raw: unknown): ExtractRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const images = extractImageParts(obj.images);
  if (images.length === 0) return null;
  return {
    images,
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
  };
}

const SYSTEM_PROMPT = `你是图片文字提取助手。用户会提供若干张截图（多为小红书笔记的整屏截图），请完整转录截图中的笔记文字。
要求：
1. 逐张转录笔记的标题、正文、话题标签，保持原文——不改写、不点评、不省略、不补充；
2. 多张截图若为同一篇笔记的连续截图，按上传顺序拼接成一篇完整文案，衔接处自然合并（去除重复部分）；若是不相关的多篇笔记，各篇之间空一行分隔；
3. 忽略手机状态栏、App 按钮、头像昵称、点赞评论收藏数、水印等界面元素，只保留笔记正文内容；
4. 若某张图完全无法辨认文字，跳过该张；
5. 直接输出转录文本本身，禁止输出 JSON、markdown 代码块或任何解释性前后缀。`;

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const req = normalizeRequest(raw);
  if (!req) {
    return Response.json(
      { error: '请先上传至少 1 张参考图，再提取图中文字' },
      { status: 400 },
    );
  }

  const model = getTextModel(req.modelId);
  const useDeepseek = isDeepseekModel(model);

  // DeepSeek 走自有 Key 直连：优先用户设置页配置，缺省回落服务端预配置（环境变量）
  const presetKey = process.env.DEEPSEEK_API_KEY?.trim() || undefined;
  const effectiveKey = req.deepseekKey ?? presetKey;

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
    (model.supportsImage || req.deepseekVision === true || process.env.DEEPSEEK_VISION === '1');

  // 提取依赖读图能力，模型不支持时明确拦截
  if (!model.supportsImage && !deepseekVision) {
    return Response.json(
      { error: '当前所选模型不支持图片输入，请切换支持读图的模型' },
      { status: 400 },
    );
  }

  const parts: ContentPart[] = [
    {
      type: 'text',
      text: `请转录以下 ${req.images.length} 张截图中的笔记文字。`,
    },
  ];
  for (const image of req.images) {
    parts.push({
      type: 'image_url',
      image_url: { url: image, detail: 'high' },
    });
  }

  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: parts },
  ];

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (event: StreamEvent) => {
        if (!closed) controller.enqueue(encodeEvent(event));
      };

      try {
        if (useDeepseek && effectiveKey) {
          const baseUrl = sanitizeDeepseekBaseUrl(
            req.deepseekBaseUrl ?? process.env.DEEPSEEK_BASE_URL,
          );
          const modelId = sanitizeDeepseekModelId(
            model.relayModelId ??
              req.deepseekModelId ??
              process.env.DEEPSEEK_MODEL_ID,
          );
          await streamDeepseek({
            modelId,
            apiKey: effectiveKey,
            apiUrl: `${baseUrl}/chat/completions`,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              {
                role: 'user',
                content: parts.map((p) =>
                  p.type === 'text'
                    ? { type: 'text' as const, text: p.text ?? '' }
                    : {
                        type: 'image_url' as const,
                        image_url: { url: p.image_url?.url ?? '' },
                      },
                ),
              },
            ],
            temperature: 0.1,
            safeEnqueue,
          });
        } else {
          const llmStream = client.stream(messages, {
            model: model.id,
            thinking: 'disabled',
            temperature: 0.1,
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
          error instanceof Error ? error.message : '文字提取失败，请稍后重试';
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


import { NextRequest } from 'next/server';
import { Config, HeaderUtils, LLMClient, Message } from 'coze-coding-dev-sdk';
import type { ContentPart } from 'coze-coding-dev-sdk';
import type { ReferenceGenerateRequest, StreamEvent } from '@/lib/types';
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
const TOPIC_MAX = 50;

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

function normalizeRequest(raw: unknown): ReferenceGenerateRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const topic =
    typeof obj.topic === 'string' ? obj.topic.trim().slice(0, TOPIC_MAX) : '';
  const images = extractImageParts(obj.images);
  if (!topic && images.length === 0) return null;
  return {
    topic,
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

const SYSTEM_PROMPT = `你是一位深耕「财经科普」赛道的小红书创作者，擅长把理财常识、金融概念、宏观经济写得通俗有料、真实可感。
本次任务：根据给定的主题（或参考图片）撰写一篇典型的原创财经科普笔记，这篇笔记之后会被用作「仿写参考素材」。
要求：
1. 真实用户口吻，像亲身经历后的真心分享，不像硬广；若给定主题偏生活向（如某商品/某习惯），必须从财经视角切入（成本核算、消费决策、背后的经济学）；
2. 结构完整：开头有吸引人的钩子，中间分段展开要点（可自然使用 emoji 与序号），结尾有互动引导；
3. 全文约 300-500 字，简体中文；
4. 不给出具体投资建议，不出现「稳赚」「保本」「躺赚」「翻倍」「无风险」「闭眼买」等收益承诺用语；涉及投资话题自然带出风险提示；
5. 结尾可另起一行附 3-6 个财经相关话题标签（带 # 号）；
6. 不编造医疗功效与绝对化用语；
7. 直接输出笔记正文本身，禁止输出 JSON、markdown 代码块或任何解释性前后缀。`;

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
      { error: '请输入创作主题，或上传至少 1 张参考图' },
      { status: 400 },
    );
  }

  const model = getTextModel(req.modelId);
  const useDeepseek = isDeepseekModel(model);

  // DeepSeek 走自有 Key 直连：优先用户设置页配置，缺省回落服务端预配置（环境变量）
  const presetKey = process.env.DEEPSEEK_API_KEY?.trim() || undefined;
  const effectiveKey = req.deepseekKey ?? presetKey;

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
    (model.supportsImage || req.deepseekVision === true || process.env.DEEPSEEK_VISION === '1');

  // 仅文本模型不支持读图：丢弃参考图
  if (!model.supportsImage && !deepseekVision) {
    req.images = [];
    if (!req.topic) {
      return Response.json(
        {
          error:
            '当前所选模型不支持图片输入，请输入创作主题或切换支持读图的模型',
        },
        { status: 400 },
      );
    }
  }

  const parts: ContentPart[] = [];
  const textLines: string[] = [];
  if (req.topic) {
    textLines.push(`请围绕主题「${req.topic}」创作这篇小红书笔记。`);
  }
  if (req.images.length > 0) {
    textLines.push(
      `【参考图片】共 ${req.images.length} 张，见本消息附带图片，请先理解图中的产品/场景/风格，笔记内容需与之强相关${req.topic ? '，并结合上述主题' : ''}。`,
    );
  }
  parts.push({ type: 'text', text: textLines.join('\n') });

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
  const userText = textLines.join('\n');

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
                content: deepseekVision
                  ? parts.map((p) =>
                      p.type === 'text'
                        ? { type: 'text' as const, text: p.text ?? '' }
                        : {
                            type: 'image_url' as const,
                            image_url: { url: p.image_url?.url ?? '' },
                          },
                    )
                  : userText,
              },
            ],
            temperature: 0.9,
            safeEnqueue,
          });
        } else {
          const llmStream = client.stream(messages, {
            model: model.id,
            thinking: 'disabled',
            temperature: 0.9,
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


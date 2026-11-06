/**
 * DeepSeek 兼容接口直连（BYOK：用户自有 Key）。
 * 走 OpenAI 兼容协议（默认官方 api.deepseek.com，支持用户自定义中转站 Base URL），
 * 流式响应转换为本工具统一的 SSE 事件协议（与托管模型一致）。
 *
 * 稳定性兜底：中转站偶发 "upstream failed to respond" / 网关 5xx / 网络断开时，
 * 在「尚未输出任何正文」的前提下自动重试一次，且重试时关闭思考模式（思考链最易触发上游失败）。
 */
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
import type { StreamEvent } from './types';

/** OpenAI 兼容多模态内容分片 */
export interface DeepseekContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface DeepseekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | DeepseekContentPart[];
}

export interface DeepseekStreamOptions {
  modelId: string;
  apiKey: string;
  /** 完整接口地址（含 /chat/completions）；缺省用官方地址 */
  apiUrl?: string;
  messages: DeepseekMessage[];
  temperature: number;
  /** 深度思考开关（OpenAI 兼容 thinking 参数透传；undefined 不发送该字段） */
  thinking?: boolean;
  safeEnqueue: (event: StreamEvent) => void;
}

interface AttemptOutcome {
  /** 是否完整读完流 */
  finished: boolean;
  /** 是否已向客户端输出过正文 */
  emitted: boolean;
  /** 是否值得再试一次 */
  retryable: boolean;
  /** 面向用户的错误文案（finished 为 true 时为空） */
  message: string;
}

/** 把上游错误体（JSON 或纯文本）整理成一句人话 */
function describeErrorBody(raw: string, status: number): string {
  const text = raw.trim();
  let detail = text;
  try {
    const data = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof data.error === 'string') detail = data.error;
    else if (data.error?.message) detail = data.error.message;
    else if (data.message) detail = data.message;
  } catch {
    // 上游返回非 JSON（如 "upstream failed to respond"），保留原文
  }
  if (/upstream failed to respond|invalid char|bad gateway|gateway/i.test(detail)) {
    return '中转站上游模型暂时无响应，请稍后重试（也可换一个文案模型）';
  }
  if (status === 401 || status === 403) return '接口认证或模型权限被拒绝，请检查 API Key、模型名称和权限';
  if (status === 402) return 'API 账户余额不足，请充值后重试';
  if (status === 429) return '接口限流，请稍后重试';
  const clipped = detail.replace(/\s+/g, ' ').slice(0, 120);
  return `接口调用失败（HTTP ${status}${clipped ? `：${clipped}` : ''}）`;
}

async function runAttempt(
  options: DeepseekStreamOptions,
  thinking: boolean | undefined,
): Promise<AttemptOutcome> {
  const { modelId, apiKey, apiUrl, messages, temperature, safeEnqueue } = options;
  let emitted = false;

  let response: Response;
  try {
    response = await fetch(apiUrl ?? DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: true,
        temperature,
        // 思考链模型的 reasoning 也计入 completion tokens，额度放宽避免正文截断
        max_tokens: 16384,
        ...(typeof thinking === 'boolean'
          ? { thinking: { type: thinking ? 'enabled' : 'disabled' } }
          : {}),
      }),
    });
  } catch {
    return {
      finished: false,
      emitted: false,
      retryable: true,
      message: '网络连接中断，未能连上模型接口',
    };
  }

  if (!response.ok || !response.body) {
    let raw = '';
    try {
      raw = await response.text();
    } catch {
      // 无响应体时忽略
    }
    return {
      finished: false,
      emitted: false,
      retryable: response.status >= 500 || /upstream/i.test(raw),
      message: describeErrorBody(raw, response.status),
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamError = '';
  const acceptLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }>; error?: { message?: string } };
      if (json.error?.message) streamError = json.error.message;
      const text = json.choices?.[0]?.delta?.content;
      if (text) { emitted = true; safeEnqueue({ type: 'delta', text }); }
    } catch { /* Ignore heartbeat or non-JSON lines. */ }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) acceptLine(line);
    }
    // Some compatible gateways finish without a final newline.
    if (buffer.trim()) acceptLine(buffer);
  } catch {
    // 流中断（网关断开 / 超时）
    return {
      finished: false,
      emitted,
      retryable: !emitted,
      message: '模型输出中断，请重试',
    };
  }

  if (streamError && !emitted) {
    return {
      finished: false,
      emitted: false,
      retryable: true,
      message: describeErrorBody(streamError, 502),
    };
  }
  if (!emitted) return { finished: false, emitted: false, retryable: true, message: '模型返回了空内容，请重试' };
  return { finished: true, emitted, retryable: false, message: '' };
}

/** 调用 DeepSeek 兼容流式接口；失败时通过 safeEnqueue 下发 error 事件 */
export async function streamDeepseek(
  options: DeepseekStreamOptions,
): Promise<void> {
  const first = await runAttempt(options, options.thinking);
  if (first.finished) return;

  // 已经吐过正文就不再重试，避免内容重复
  if (!first.retryable || first.emitted) {
    options.safeEnqueue({ type: 'error', message: first.message });
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 700));
  // 重试时关闭思考模式：思考链是最容易触发上游失败的变量
  const retryThinking = options.thinking === true ? false : options.thinking;
  const second = await runAttempt(options, retryThinking);
  if (!second.finished && !second.emitted) {
    options.safeEnqueue({
      type: 'error',
      message:
        options.thinking === true
          ? `${first.message}（已自动关闭深度思考重试一次，请稍后再试）`
          : first.message,
    });
  }
}


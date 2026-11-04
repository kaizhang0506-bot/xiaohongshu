import type {
  ExtractRequest,
  ReferenceGenerateRequest,
  RewriteRequest,
  RewriteResult,
} from './types';

/**
 * 通用 SSE 流读取：按协议逐块回调累积文本，error 事件抛异常
 */
export async function readSseStream(
  response: Response,
  onDelta: (fullText: string) => void,
): Promise<string> {
  if (!response.ok || !response.body) {
    let detail = '';
    try {
      const data = (await response.json()) as { error?: string };
      detail = data.error ?? '';
    } catch {
      detail = '';
    }
    throw new Error(detail || `请求失败（${response.status}）`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 消息以空行分隔
      const messages = buffer.split('\n\n');
      buffer = messages.pop() ?? '';
      for (const msg of messages) {
        const line = msg.trim();
        if (!line.startsWith('data:')) continue;
        let payload: { type?: string; text?: string; message?: string };
        try {
          payload = JSON.parse(line.slice(5).trim()) as typeof payload;
        } catch {
          continue;
        }
        if (payload.type === 'delta' && typeof payload.text === 'string') {
          fullText += payload.text;
          onDelta(fullText);
        } else if (payload.type === 'error') {
          throw new Error(payload.message || 'AI 生成失败');
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    // 业务错误（error 事件）原样抛出
    if (!/fetch failed|network|terminated|aborted|failed to fetch/i.test(message)) {
      throw error;
    }
    // 网络中断：已有部分内容时按成功返回，避免用户白等
    if (fullText.trim()) return fullText;
    throw new Error('网络连接中断，请重试');
  }

  return fullText;
}

/** 统一 POST，网络层失败给出人话提示 */
async function postSse(path: string, body: unknown): Promise<Response> {
  try {
    return await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('网络连接中断，请检查网络后重试');
  }
}

/**
 * 客户端流式请求 /api/rewrite：读取 SSE 流，逐块回调
 */
export async function streamRewrite(
  request: RewriteRequest,
  onDelta: (fullText: string) => void,
): Promise<string> {
  const response = await postSse('/api/rewrite', request);
  return readSseStream(response, onDelta);
}

/**
 * 客户端流式请求 /api/reference：AI 自动生成参考文案
 */
export async function streamReference(
  request: ReferenceGenerateRequest,
  onDelta: (fullText: string) => void,
): Promise<string> {
  const response = await postSse('/api/reference', request);
  return readSseStream(response, onDelta);
}

/**
 * 客户端流式请求 /api/extract：转录参考截图中的文字
 */
export async function streamExtract(
  request: ExtractRequest,
  onDelta: (fullText: string) => void,
): Promise<string> {
  const response = await postSse('/api/extract', request);
  return readSseStream(response, onDelta);
}

/**
 * 从模型输出中稳健提取 JSON 并校验结构
 */
export function parseRewriteResult(text: string): RewriteResult {
  let candidate = text.trim();
  // 去掉 markdown 代码块
  candidate = candidate
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI 返回内容中未找到 JSON 结构');
  }
  candidate = candidate.slice(start, end + 1);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    throw new Error('AI 返回的 JSON 无法解析，请重试');
  }

  const titles = Array.isArray(parsed.titles)
    ? parsed.titles.filter(
        (t): t is string => typeof t === 'string' && t.trim().length > 0,
      )
    : [];
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.replace(/^#/, '').trim())
        .filter((t) => t.length > 0)
    : [];
  const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
  const rewriteNotes =
    typeof parsed.rewriteNotes === 'string' ? parsed.rewriteNotes.trim() : '';

  if (titles.length === 0 || !body) {
    throw new Error('AI 返回内容不完整（缺少标题或正文），请重试');
  }

  return {
    titles: titles.slice(0, 3),
    body,
    tags,
    rewriteNotes: rewriteNotes || '本次生成未提供改写说明。',
  };
}

/** 复制文本到剪贴板 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 兼容非安全上下文
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

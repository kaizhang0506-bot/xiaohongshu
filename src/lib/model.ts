/**
 * AI 模型信息的唯一来源（后端调用与前端展示共用，避免两处不一致）。
 * 注意：必须与当前环境实际可用的模型保持一致，禁止展示与实际调用不符的模型名。
 * DeepSeek 走用户自有 Key 直连官方 API（BYOK），标注与调用均为真实。
 */

export interface TextModelInfo {
  id: string;
  /** UI 展示名 */
  label: string;
  /** 是否支持图片输入（多模态） */
  supportsImage: boolean;
  /** 能力备注（下拉选项展示用） */
  note: string;
  /** 调用通道：managed=环境托管 SDK；deepseek=OpenAI 兼容自有 Key 直连（官方或中转站） */
  provider?: 'managed' | 'deepseek';
  /** 该条目在中转通道上的真实模型 ID（选中即按此发起调用，优先于设置页/服务端配置） */
  relayModelId?: string;
}

export interface ImageModelInfo {
  id: string;
  label: string;
  /** 能力/通道备注（下拉与提示展示用） */
  note?: string;
  /** 调用通道：managed=环境托管 SDK；relay=中转站 OpenAI 兼容 /images/generations */
  provider?: 'managed' | 'relay';
}

export const DEFAULT_TEXT_MODEL: TextModelInfo = {
  id: 'doubao-seed-2-0-pro-260215',
    provider: 'deepseek',
    relayModelId: 'doubao-seed-2-0-pro-260215',
  label: '豆包 Seed 2.0 Pro',
  supportsImage: true,
  note: '旗舰全能 · 支持读图',
};

/**
 * 文案生成可选模型（与当前环境 LLM 可用模型清单一致，已实测核对）。
 * 环境托管仅豆包 Seed 2.0 系列 3 款；DeepSeek 未托管，走 BYOK 直连。
 */
export const TEXT_MODELS: TextModelInfo[] = [
  DEFAULT_TEXT_MODEL,
  {
    id: 'doubao-seed-2-0-lite-260215',
    provider: 'deepseek',
    relayModelId: 'doubao-seed-2-0-lite-260215',
    label: '豆包 Seed 2.0 Lite',
    supportsImage: true,
    note: '均衡性价比 · 支持读图',
  },
  {
    id: 'doubao-seed-2-0-mini-260215',
    provider: 'deepseek',
    relayModelId: 'doubao-seed-2-0-mini-260215',
    label: '豆包 Seed 2.0 Mini',
    supportsImage: true,
    note: '低时延 · 支持读图',
  },
  {
    id: 'deepseek-v4.1-flash-1017',
    label: 'DeepSeek V4.1 Flash（Kaitools）',
    supportsImage: true,
    note: 'Kaitools 中转站 · 支持图片输入',
    provider: 'deepseek',
    relayModelId: 'deepseek-v4.1-flash-1017',
  },
  { id: 'auto-model-free', label: 'Auto Model Free', supportsImage: true, note: '中转站 · 支持图片输入', provider: 'deepseek', relayModelId: 'auto-model-free' },
  { id: 'deepseek-v4-flash-free', label: 'DeepSeek V4 Flash Free', supportsImage: true, note: '中转站 · 支持图片输入', provider: 'deepseek', relayModelId: 'deepseek-v4-flash-free' },
  { id: 'deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash', supportsImage: true, note: '中转站 · 支持图片输入', provider: 'deepseek', relayModelId: 'deepseek-v4.1-flash' },
  { id: 'deepseek-v4.1-flash-free', label: 'DeepSeek V4.1 Flash Free', supportsImage: true, note: '中转站 · 支持图片输入', provider: 'deepseek', relayModelId: 'deepseek-v4.1-flash-free' },
  {
    id: 'deepseek-chat',
    label: 'DeepSeek Chat',
    supportsImage: false,
    note: '自有 Key · 支持官方或中转站',
    provider: 'deepseek',
  },
  {
    id: 'agnes-3.0-flash',
    label: 'Agnes 3.0 Flash',
    supportsImage: true,
    note: '中转站 · 免费 · 支持读图',
    provider: 'deepseek',
    relayModelId: 'agnes-3.0-flash',
  },
  {
    id: 'kimi-k3.1-pro',
    label: 'Kimi K3.1 Pro',
    supportsImage: true,
    note: '中转站 · 中文写作强 · 支持读图',
    provider: 'deepseek',
    relayModelId: 'kimi-k3.1-pro',
  },
  {
    id: 'gpt-6-astra',
    label: 'GPT-6 Astra',
    supportsImage: false,
    note: '中转站 · 流式文案 · 读图能力未验证',
    provider: 'deepseek',
    relayModelId: 'gpt-6-astra',
  },
];

/** DeepSeek 官方接口地址（OpenAI 兼容协议），默认通道 */
export const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/** DeepSeek 通道默认 Base URL（官方） */
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

/** DeepSeek 通道默认模型 ID */
export const DEFAULT_DEEPSEEK_MODEL_ID = 'deepseek-chat';

/** 内网/本机地址特征（SSR 防护：服务端会按用户提供的地址转发请求） */
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /\.local$/i,
  /\.internal$/i,
];

/**
 * 清洗用户自定义的 DeepSeek 兼容接口 Base URL。
 * 仅允许 http/https 公网地址；非法或内网地址一律回退官方默认。
 * 返回值不带尾部斜杠与 /chat/completions 后缀（拼接时统一补）。
 */
export function sanitizeDeepseekBaseUrl(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_DEEPSEEK_BASE_URL;
  let value = raw.trim();
  if (!value) return DEFAULT_DEEPSEEK_BASE_URL;
  if (value.length > 200) return DEFAULT_DEEPSEEK_BASE_URL;
  // 去掉用户可能一并粘贴的端点路径与尾部斜杠
  value = value.replace(/\/chat\/completions\/?$/i, '').replace(/\/+$/, '');
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return DEFAULT_DEEPSEEK_BASE_URL;
    }
    const host = url.hostname;
    if (PRIVATE_HOST_PATTERNS.some((p) => p.test(host))) {
      return DEFAULT_DEEPSEEK_BASE_URL;
    }
    // 重组：协议 + host + 可选端口 + 路径（如中转站的 /v1）
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return DEFAULT_DEEPSEEK_BASE_URL;
  }
}

/** 清洗模型 ID：仅允许常见字符，非法回退默认 */
export function sanitizeDeepseekModelId(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_DEEPSEEK_MODEL_ID;
  const value = raw.trim();
  if (!value || value.length > 64) return DEFAULT_DEEPSEEK_MODEL_ID;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value)) {
    return DEFAULT_DEEPSEEK_MODEL_ID;
  }
  return value;
}

/** 判断模型是否走 DeepSeek 自有 Key 通道 */
export function isDeepseekModel(model: TextModelInfo): boolean {
  return model.provider === 'deepseek';
}

export const DEFAULT_TEXT_MODEL_ID = DEFAULT_TEXT_MODEL.id;

export const DEFAULT_IMAGE_MODEL: ImageModelInfo = {
  id: 'gpt-image-2.5-sunburst',
  label: 'GPT Image 2.5',
  note: '中转站 · 写实质感',
  provider: 'relay',
};

/** 卡片配图可选模型（图片生成） */
export const IMAGE_MODELS: ImageModelInfo[] = [
  DEFAULT_IMAGE_MODEL,
  {
    id: 'gpt-image-2.5-flare',
    label: 'GPT Image 2.5 Flare',
    note: '中转站 · 光影氛围',
    provider: 'relay',
  },
  {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    note: '中转站 · 稳定通用',
    provider: 'relay',
  },
  {
    id: 'agnes-image-2.5-flash',
    label: 'Agnes Image 2.5 Flash',
    note: '中转站 · 免费额度',
    provider: 'relay',
  },
  {
    id: 'doubao-seedream-5-0-260128',
    provider: 'relay',
    label: '豆包 Seedream 5.0',
    note: '中转站 · 模型可用性待验证',
  },
  {
    id: 'doubao-seedream-4-5-251128',
    provider: 'relay',
    label: '豆包 Seedream 4.5',
    note: '中转站 · 模型可用性待验证',
  },
];

/** 中转站生图默认 Base URL（服务端可被 IMAGE_BASE_URL / DEEPSEEK_BASE_URL 覆盖） */
export const DEFAULT_IMAGE_RELAY_BASE_URL = 'https://oapi.kaitools.cn/v1';

/** 中转站生图尺寸：模型支持 1024x1536（2:3 竖图，卡片 3:4 可自适应） */
export const RELAY_IMAGE_SIZE = '1024x1536';

/** 判断配图模型是否走中转站通道 */
export function isRelayImageModel(model: ImageModelInfo): boolean {
  return model.provider === 'relay';
}

export const DEFAULT_IMAGE_MODEL_ID = DEFAULT_IMAGE_MODEL.id;

/** 按 id 取文案模型；未命中或未传时回退默认模型 */
export function getTextModel(id: unknown): TextModelInfo {
  if (typeof id === 'string') {
    const found = TEXT_MODELS.find((m) => m.id === id);
    if (found) return found;
  }
  return DEFAULT_TEXT_MODEL;
}

/** 按 id 取配图模型；未命中或未传时回退默认模型 */
export function getImageModel(id: unknown): ImageModelInfo {
  if (typeof id === 'string') {
    const found = IMAGE_MODELS.find((m) => m.id === id);
    if (found) return found;
  }
  return DEFAULT_IMAGE_MODEL;
}




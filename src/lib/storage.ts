import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type CustomOption,
  type CustomOptionStores,
  type HistoryItem,
} from './types';
import {
  DEFAULT_IMAGE_MODEL_ID,
  DEFAULT_TEXT_MODEL_ID,
  IMAGE_MODELS,
  TEXT_MODELS,
} from './model';

const HISTORY_KEY = 'xhs-rewrite-history';
const SETTINGS_KEY = 'xhs-rewrite-settings';
const TEXT_MODEL_KEY = 'xhs-rewrite-text-model';
const REF_MODEL_KEY = 'xhs-rewrite-ref-model';
const IMAGE_MODEL_KEY = 'xhs-rewrite-image-model';
const CUSTOM_OPTIONS_KEY = 'xhs-rewrite-custom-options';
const DEEPSEEK_KEY_STORAGE_KEY = 'xhs-rewrite-deepseek-key';
const DEEPSEEK_BASE_URL_STORAGE_KEY = 'xhs-rewrite-deepseek-base-url';
const DEEPSEEK_MODEL_ID_STORAGE_KEY = 'xhs-rewrite-deepseek-model-id';
const DEEPSEEK_VISION_STORAGE_KEY = 'xhs-rewrite-deepseek-vision';
const CUSTOM_PROMPT_STORAGE_KEY = 'xhs-rewrite-custom-prompt';
const CUSTOM_PROMPT_MAX = 500;
const DEEP_THINKING_STORAGE_KEY = 'xhs-rewrite-deep-thinking';
const HISTORY_LIMIT = 50;
const CUSTOM_LIMIT = 20;

export const EMPTY_CUSTOM_OPTIONS: CustomOptionStores = {
  styles: [],
  structures: [],
  lengths: [],
};

/** 校验并清洗自定义选项列表 */
function sanitizeCustomList(value: unknown): CustomOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is CustomOption =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as CustomOption).id === 'string' &&
        typeof (item as CustomOption).label === 'string' &&
        typeof (item as CustomOption).desc === 'string',
    )
    .slice(0, CUSTOM_LIMIT);
}

/** 读取用户自定义选项（风格/结构/长度，SSR 安全） */
export function loadCustomOptions(): CustomOptionStores {
  if (typeof window === 'undefined') return EMPTY_CUSTOM_OPTIONS;
  try {
    const raw = window.localStorage.getItem(CUSTOM_OPTIONS_KEY);
    if (!raw) return EMPTY_CUSTOM_OPTIONS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY_CUSTOM_OPTIONS;
    const obj = parsed as Record<string, unknown>;
    return {
      styles: sanitizeCustomList(obj.styles),
      structures: sanitizeCustomList(obj.structures),
      lengths: sanitizeCustomList(obj.lengths),
    };
  } catch {
    return EMPTY_CUSTOM_OPTIONS;
  }
}

export function saveCustomOptions(stores: CustomOptionStores): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    CUSTOM_OPTIONS_KEY,
    JSON.stringify({
      styles: stores.styles.slice(0, CUSTOM_LIMIT),
      structures: stores.structures.slice(0, CUSTOM_LIMIT),
      lengths: stores.lengths.slice(0, CUSTOM_LIMIT),
    }),
  );
}

export function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HistoryItem =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as HistoryItem).id === 'string' &&
        !!((item as HistoryItem).result as HistoryItem['result'] | undefined)?.titles,
    );
  } catch {
    return [];
  }
}

export function saveHistoryItem(item: HistoryItem): void {
  if (typeof window === 'undefined') return;
  const list = [item, ...loadHistory()].slice(0, HISTORY_LIMIT);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function deleteHistoryItem(id: string): void {
  if (typeof window === 'undefined') return;
  const list = loadHistory().filter((item) => item.id !== id);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      brandName: typeof parsed.brandName === 'string' ? parsed.brandName : '',
      targetAudience:
        typeof parsed.targetAudience === 'string' ? parsed.targetAudience : '',
      forbiddenWords:
        typeof parsed.forbiddenWords === 'string' ? parsed.forbiddenWords : '',
      toneHint: typeof parsed.toneHint === 'string' ? parsed.toneHint : '',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** 读取用户偏好的文案模型 ID（校验合法性，SSR 安全） */
export function loadTextModelId(): string {
  if (typeof window === 'undefined') return DEFAULT_TEXT_MODEL_ID;
  const raw = window.localStorage.getItem(TEXT_MODEL_KEY);
  return raw && TEXT_MODELS.some((m) => m.id === raw)
    ? raw
    : DEFAULT_TEXT_MODEL_ID;
}

export function saveTextModelId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TEXT_MODEL_KEY, id);
}

/** 参考文案 AI 生成的默认模型：低成本且支持读图 */
const DEFAULT_REF_MODEL_ID = 'doubao-seed-2-0-mini-260215';

/** 读取参考文案 AI 生成所用模型 ID（独立于仿写模型，白名单校验，SSR 安全） */
export function loadRefModelId(): string {
  if (typeof window === 'undefined') return DEFAULT_REF_MODEL_ID;
  const raw = window.localStorage.getItem(REF_MODEL_KEY);
  return raw && TEXT_MODELS.some((m) => m.id === raw)
    ? raw
    : DEFAULT_REF_MODEL_ID;
}

export function saveRefModelId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REF_MODEL_KEY, id);
}

/** 读取用户偏好的配图模型 ID（校验合法性，SSR 安全） */
export function loadImageModelId(): string {
  if (typeof window === 'undefined') return DEFAULT_IMAGE_MODEL_ID;
  const raw = window.localStorage.getItem(IMAGE_MODEL_KEY);
  return raw && IMAGE_MODELS.some((m) => m.id === raw)
    ? raw
    : DEFAULT_IMAGE_MODEL_ID;
}

export function saveImageModelId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(IMAGE_MODEL_KEY, id);
}

/** 读取用户附加提示词（≤500 字，SSR 安全） */
export function loadCustomPrompt(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(CUSTOM_PROMPT_STORAGE_KEY) ?? '';
}

export function saveCustomPrompt(value: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = value.trim();
  if (trimmed) {
    window.localStorage.setItem(CUSTOM_PROMPT_STORAGE_KEY, value.slice(0, CUSTOM_PROMPT_MAX));
  } else {
    window.localStorage.removeItem(CUSTOM_PROMPT_STORAGE_KEY);
  }
}

/** 深度思考模式开关（SSR 安全） */
export function loadDeepThinking(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEEP_THINKING_STORAGE_KEY) === '1';
}

export function saveDeepThinking(on: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEEP_THINKING_STORAGE_KEY, on ? '1' : '0');
}

/** 读取 DeepSeek 自有 Key（SSR 安全） */
export function loadDeepseekKey(): string {
  if (typeof window === 'undefined') return '';
  const raw = window.localStorage.getItem(DEEPSEEK_KEY_STORAGE_KEY);
  return raw ? raw.trim() : '';
}

export function saveDeepseekKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) window.localStorage.setItem(DEEPSEEK_KEY_STORAGE_KEY, trimmed);
  else window.localStorage.removeItem(DEEPSEEK_KEY_STORAGE_KEY);
}

/** 读取 DeepSeek 兼容接口 Base URL（空串表示用官方默认，SSR 安全） */
export function loadDeepseekBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const raw = window.localStorage.getItem(DEEPSEEK_BASE_URL_STORAGE_KEY);
  return raw ? raw.trim() : '';
}

export function saveDeepseekBaseUrl(baseUrl: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = baseUrl.trim();
  if (trimmed) {
    window.localStorage.setItem(DEEPSEEK_BASE_URL_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(DEEPSEEK_BASE_URL_STORAGE_KEY);
  }
}

/** 读取 DeepSeek 通道模型 ID（空串表示用默认 deepseek-chat，SSR 安全） */
export function loadDeepseekModelId(): string {
  if (typeof window === 'undefined') return '';
  const raw = window.localStorage.getItem(DEEPSEEK_MODEL_ID_STORAGE_KEY);
  return raw ? raw.trim() : '';
}

export function saveDeepseekModelId(modelId: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = modelId.trim();
  if (trimmed) {
    window.localStorage.setItem(DEEPSEEK_MODEL_ID_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(DEEPSEEK_MODEL_ID_STORAGE_KEY);
  }
}

/** 读取 DeepSeek 通道读图开关（用户声明其配置的模型支持图片输入，SSR 安全） */
export function loadDeepseekVision(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEEPSEEK_VISION_STORAGE_KEY) === '1';
}

export function saveDeepseekVision(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.setItem(DEEPSEEK_VISION_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(DEEPSEEK_VISION_STORAGE_KEY);
  }
}

/** 仿写风格 ID */
export type RewriteStyleId =
  | 'insight'
  | 'colloquial'
  | 'professional'
  | 'narrative'
  | 'tutorial'
  | 'emotional'
  | 'echo';

/** 文案结构模板 ID */
export type StructureId =
  | 'good-share'
  | 'pain-solution'
  | 'comparison'
  | 'pitfall-guide'
  | 'how-to'
  | 'suspense-twist'
  | 'checklist'
  | 'unboxing'
  | 'knowledge'
  | 'review-log';

/** 输出长度 ID（follow = 跟随参考文案原文长度） */
export type LengthId = 'short' | 'medium' | 'long' | 'follow';

/** 图文卡片排版模板 ID（清单见 lib/layouts.ts，共 100 套） */
export type CardLayoutId = string;

/** AI 仿写结果（接口返回的 JSON 结构） */
export interface RewriteResult {
  titles: string[];
  body: string;
  tags: string[];
  rewriteNotes: string;
}

/** 生成请求参数（前端 -> /api/rewrite） */
export interface RewriteRequest {
  images: string[];
  referenceText: string;
  /** 预设风格 ID，或 'custom'（此时必须提供 customStyle） */
  style: string;
  /** 预设结构 ID，或 'custom'（此时必须提供 customStructure） */
  structure: string;
  /** 预设长度 ID，或 'custom'（此时必须提供 customLength） */
  length: string;
  settings: AppSettings;
  /** 选用的文案模型 ID（lib/model.ts 清单内），缺省用默认模型 */
  modelId?: string;
  /** DeepSeek 自有 Key（仅 provider=deepseek 的模型使用，服务端转发调用） */
  deepseekKey?: string;
  /** DeepSeek 兼容接口地址（默认官方 api.deepseek.com，可填中转站地址） */
  deepseekBaseUrl?: string;
  /** DeepSeek 通道实际调用的模型 ID（默认 deepseek-chat，中转站按其开通清单填写） */
  deepseekModelId?: string;
  /** DeepSeek 通道模型是否支持读图（用户在设置页声明，开启后参考图随请求发送） */
  deepseekVision?: boolean;
  /** 自定义风格：style === 'custom' 时生效 */
  customStyle?: CustomOptionPayload;
  /** 自定义结构：structure === 'custom' 时生效 */
  customStructure?: CustomOptionPayload;
  /** 自定义长度：length === 'custom' 时生效 */
  customLength?: CustomOptionPayload;
  /** 用户附加提示词（自由编写，注入系统提示词，≤500 字） */
  customPrompt?: string;
  /** 深度思考模式（托管模型映射 thinking 参数；DeepSeek 通道透传 thinking 开关） */
  deepThinking?: boolean;
}

/** 自定义选项内容（请求载荷与本地存储共用） */
export interface CustomOptionPayload {
  label: string;
  desc: string;
}

/** 用户自定义选项（含本地唯一 ID，localStorage 持久化） */
export interface CustomOption extends CustomOptionPayload {
  id: string;
}

/** 三类可自定义选项的存储结构 */
export interface CustomOptionStores {
  styles: CustomOption[];
  structures: CustomOption[];
  lengths: CustomOption[];
}

/** 选项选中值是否指向自定义项（形如 'custom:<id>'） */
export function isCustomValue(value: string): boolean {
  return value.startsWith('custom:');
}

/** 从 'custom:<id>' 提取原始 id */
export function customIdOf(value: string): string {
  return value.slice('custom:'.length);
}

/** 参考文案自动生成请求（前端 -> /api/reference） */
export interface ReferenceGenerateRequest {
  /** 创作主题，如「榴莲千层」；为空时需提供图片 */
  topic: string;
  images: string[];
  /** 选用的文案模型 ID（lib/model.ts 清单内），缺省用默认模型 */
  modelId?: string;
  /** DeepSeek 自有 Key（仅 provider=deepseek 的模型使用） */
  deepseekKey?: string;
  /** DeepSeek 兼容接口地址（默认官方，可填中转站地址） */
  deepseekBaseUrl?: string;
  /** DeepSeek 通道实际调用的模型 ID（默认 deepseek-chat） */
  deepseekModelId?: string;
  /** DeepSeek 通道模型是否支持读图（用户在设置页声明） */
  deepseekVision?: boolean;
}

/** 参考图文字提取请求（前端 -> /api/extract，转录截图中的原文） */
export interface ExtractRequest {
  /** 参考图（dataURL，1-10 张） */
  images: string[];
  /** 选用的读图模型 ID（lib/model.ts 清单内），缺省用默认模型 */
  modelId?: string;
  /** DeepSeek 自有 Key（仅 provider=deepseek 的模型使用） */
  deepseekKey?: string;
  /** DeepSeek 兼容接口地址（默认官方，可填中转站地址） */
  deepseekBaseUrl?: string;
  /** DeepSeek 通道实际调用的模型 ID（默认 deepseek-chat） */
  deepseekModelId?: string;
  /** DeepSeek 通道模型是否支持读图（用户在设置页声明） */
  deepseekVision?: boolean;
}

/** 应用设置（本地存储） */
export interface AppSettings {
  brandName: string;
  targetAudience: string;
  forbiddenWords: string;
  toneHint: string;
}

/** 历史记录条目（本地存储） */
export interface HistoryItem {
  id: string;
  createdAt: number;
  params: {
    /** 预设 ID 或 'custom' */
    style: string;
    structure: string;
    length: string;
    layout: CardLayoutId;
    hadImages: boolean;
    /** 生成该条结果时实际使用的文案模型（展示用） */
    modelLabel?: string;
    /** 自定义选项的显示名（存在时优先于预设 ID 映射） */
    styleLabel?: string;
    structureLabel?: string;
    lengthLabel?: string;
  };
  referenceText: string;
  result: RewriteResult;
}

/** SSE 流式事件 */
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'error'; message: string };

/** 单张卡片的内容数据 */
export interface CardContent {
  kind: 'cover' | 'section' | 'end';
  index: number;
  total: number;
  /** 封面主标题 */
  title?: string;
  /** 封面副标题 / 品牌名 */
  subtitle?: string;
  /** 内容页序号（1 起） */
  sectionNo?: number;
  /** 内容页小标题 */
  heading?: string;
  /** 内容页正文段落 */
  paragraph?: string;
  /** 结尾页标签 */
  tags?: string[];
}

/** 默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  brandName: '',
  targetAudience: '',
  forbiddenWords: '',
  toneHint: '',
};

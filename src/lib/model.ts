/**
 * AI 模型信息的唯一来源（后端调用与前端展示共用，避免两处不一致）。
 * 注意：必须与当前环境实际可用的模型保持一致。
 * relay 清单展示真实中转模型；coze 清单展示扣子模型，不能把豆包改名为 DeepSeek。
 * 生产部署脚本要求前后端显式配置一致的 provider；部署位置不决定模型通道。
 */

export interface TextModelInfo {
  id: string;
  /** UI 展示名 */
  label: string;
  /** 是否支持图片输入（多模态） */
  supportsImage: boolean;
  /** 能力备注（下拉选项展示用） */
  note: string;
}

export interface ImageModelInfo {
  id: string;
  label: string;
  /** 能力备注（下拉与提示展示用） */
  note?: string;
}

export const DEFAULT_TEXT_MODEL: TextModelInfo = {
  id: process.env.NEXT_PUBLIC_AI_TEST_PROVIDER === 'relay' ? 'deepseek-v4.1-flash-1017' : 'doubao-seed-2-0-pro-260215',
  label: process.env.NEXT_PUBLIC_AI_TEST_PROVIDER === 'relay' ? 'DeepSeek V4.1 Flash（本次测试）' : '豆包 Seed 2.0 Pro（扣子）',
  supportsImage: true,
  note: '旗舰全能 · 支持读图',
};

/**
 * 文案生成可选模型（与当前环境 LLM 可用模型清单一致）。
 * 豆包 Seed 2.0 系列与 Qwen 3.5 支持读图，其余为纯文本模型。
 */
const COZE_TEXT_MODELS: TextModelInfo[] = [
  DEFAULT_TEXT_MODEL,
  {
    id: 'doubao-seed-2-0-lite-260215',
    label: '豆包 Seed 2.0 Lite',
    supportsImage: true,
    note: '均衡性价比 · 支持读图',
  },
  {
    id: 'doubao-seed-2-0-mini-260215',
    label: '豆包 Seed 2.0 Mini',
    supportsImage: true,
    note: '低时延 · 支持读图',
  },
  {
    id: 'qwen-3-5-plus-260215',
    label: 'Qwen 3.5 Plus',
    supportsImage: true,
    note: '中文写作强 · 支持读图',
  },
  {
    id: 'glm-5-0-260211',
    label: 'GLM-5',
    supportsImage: false,
    note: '复杂长文推理 · 纯文本',
  },
  {
    id: 'glm-5-turbo-260316',
    label: 'GLM-5 Turbo',
    supportsImage: false,
    note: '高速响应 · 纯文本',
  },
  {
    id: 'minimax-m2-5-260212',
    label: 'MiniMax M2.5',
    supportsImage: false,
    note: '中文创作 · 纯文本',
  },
  {
    id: 'minimax-m2-7-260318',
    label: 'MiniMax M2.7',
    supportsImage: false,
    note: '长文案生成 · 纯文本',
  },
];

export const TEXT_MODELS: TextModelInfo[] = process.env.NEXT_PUBLIC_AI_TEST_PROVIDER === 'relay' ? [
  DEFAULT_TEXT_MODEL,
  {id:'agnes-3.0-flash',label:'Agnes 3.0 Flash',supportsImage:true,note:'兼容接口 · 多模态'},
  {id:'auto-model-free',label:'Auto Model Free',supportsImage:true,note:'兼容接口 · 自动路由'},
  {id:'deepseek-v4-flash-free',label:'DeepSeek V4 Flash Free',supportsImage:true,note:'兼容接口 · 多模态'},
] : COZE_TEXT_MODELS;
export const DEFAULT_TEXT_MODEL_ID = DEFAULT_TEXT_MODEL.id;

export const DEFAULT_IMAGE_MODEL: ImageModelInfo = {
  id: 'doubao-seedream-5-0-260128',
  label: '豆包 Seedream 5.0',
  note: '扣子托管 · 默认生图模型',
};

/** 卡片配图可选模型（扣子托管图片生成） */
export const IMAGE_MODELS: ImageModelInfo[] = [
  DEFAULT_IMAGE_MODEL,
  {
    id: 'doubao-seedream-4-5-251128',
    label: '豆包 Seedream 4.5',
    note: '扣子托管 · 稳定快速',
  },
];

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

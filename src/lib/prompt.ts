import {
  customPromptFragment,
  findOption,
  LENGTH_OPTIONS,
  STRUCTURE_OPTIONS,
  STYLE_OPTIONS,
} from './options';
import type { ContentPart, Message } from 'coze-coding-dev-sdk';
import type { RewriteRequest } from './types';

interface ResolvedOption {
  label: string;
  prompt: string;
}

/** 解析风格：预设 ID 走清单，'custom' 走用户编写内容 */
function resolveStyle(req: RewriteRequest): ResolvedOption {
  const custom = req.style === 'custom' ? req.customStyle : undefined;
  if (custom) {
    return {
      label: custom.label,
      prompt: customPromptFragment('style', custom.label, custom.desc),
    };
  }
  const preset = findOption(STYLE_OPTIONS, req.style);
  return { label: preset.label, prompt: preset.prompt ?? preset.desc };
}

function resolveStructure(req: RewriteRequest): ResolvedOption {
  const custom = req.structure === 'custom' ? req.customStructure : undefined;
  if (custom) {
    return {
      label: custom.label,
      prompt: customPromptFragment('structure', custom.label, custom.desc),
    };
  }
  const preset = findOption(STRUCTURE_OPTIONS, req.structure);
  return { label: preset.label, prompt: preset.prompt ?? preset.desc };
}

function resolveLength(req: RewriteRequest): ResolvedOption {
  const custom = req.length === 'custom' ? req.customLength : undefined;
  if (custom) {
    return {
      label: custom.label,
      prompt: customPromptFragment('length', custom.label, custom.desc),
    };
  }
  // 跟随原文：实时计算参考文案长度，注入精确字数指令
  if (req.length === 'follow') {
    const sourceChars = Array.from(req.referenceText.replace(/\s/gu, '')).length;
    if (sourceChars > 0) {
      return {
        label: '跟随原文',
        prompt: `正文字数与参考文案一致：忽略空白和换行，标点计入，原文 ${sourceChars} 字，正文也输出 ${sourceChars} 字。不要扩写或压缩成摘要；保留原文各段篇幅比例。标题、标签与改写说明不计入正文。输出前检查字数。`,
      };
    }
    return {
      label: '跟随原文',
      prompt: '从参考图片逐字读取标题和正文，忽略图表内标注、页码和装饰；正文按读取到的原文总字数等长改写，不扩写成固定篇幅，各页字数比例保持一致。',
    };
  }
  const preset = findOption(LENGTH_OPTIONS, req.length);
  return { label: preset.label, prompt: preset.prompt ?? preset.desc };
}

/**
 * 构建系统提示词：小红书文案仿写专家 + 仿写规则 + 用户参数与设置约束
 */
export function buildSystemPrompt(req: RewriteRequest): string {
  const style = resolveStyle(req);
  const structure = resolveStructure(req);
  const length = resolveLength(req);
  const s = req.settings;

  const settingLines: string[] = [];
  if (s.brandName.trim()) {
    settingLines.push(`- 品牌名：「${s.brandName.trim()}」，可在文案与标签中自然融入（每处至多出现 1 次，不生硬堆砌）`);
  }
  if (s.targetAudience.trim()) {
    settingLines.push(`- 目标人群：${s.targetAudience.trim()}，语言与案例需贴合该人群`);
  }
  if (s.forbiddenWords.trim()) {
    settingLines.push(`- 禁止词：以下词语绝对不可出现在输出的任何部分：${s.forbiddenWords.trim()}`);
  }
  if (s.toneHint.trim()) {
    settingLines.push(`- 常用语气：${s.toneHint.trim()}`);
  }

  return `你是一位深耕「财经科普」赛道的小红书内容策划与文案仿写专家，擅长把理财常识、金融概念讲得通俗易懂，也擅长在参考他人笔记的表达方式后，产出结构相似但表达完全原创的新文案。

【核心仿写规则（必须严格遵守）】
1. 学习参考素材的主题方向、情绪基调与结构骨架，但所有句子必须重新创作，禁止照搬原文连续 5 个字以上的表达，禁止复用原文的独特比喻、金句或排版符号序列。
2. 不得编造医疗功效、绝对化用语（如"第一""最有效"）与平台违禁词。
3. 内容要像真实用户笔记，分段清晰、表达自然；emoji、语气和节奏以所选风格为准，不强加热闹口吻。
4. 输出必须是简体中文。

【内容赛道（必须严格遵守）】
本工具仅产出「财经科普」内容：理财常识、金融概念、宏观经济、消费决策、风险管理、社保税收、财商思维等。无论参考素材来自什么赛道，输出都必须落在财经科普框架内：借热点讲金融逻辑、借生活场景讲钱的知识；禁止出现带货推荐、商品链接引导，禁止偏移到美妆/美食探店/旅游攻略/情感八卦等无关赛道。

【财经合规红线（必须严格遵守）】
1. 不给出具体投资建议：不推荐具体股票代码、基金代码、币种或"买这个能赚钱"式引导；
2. 禁用收益承诺与诱导用语：「稳赚」「保本」「躺赚」「翻倍」「无风险」「闭眼买」「包涨」等绝对不可出现在任何部分；
3. 涉及投资、利率、风险话题时，正文需自然带出一句风险提示（如"投资有风险，决策需谨慎"），不生硬、不堆砌；
4. 不编造利率数字、政策内容与历史行情；缺乏依据的数据直接省略，不得用“大约”包装猜测。假设案例明确标注为举例，不伪装成亲身经历或真实报道。

【风格要求】
${style.prompt}

【结构模板】
${structure.prompt}

【长度要求】
${length.prompt}${req.customLength || req.length === 'follow' ? '' : `。${req.length === 'short' ? '不强制凑满所有结构段。' : '各结构段落均可充分展开。'}`}

【用户个性化设置】
${settingLines.length > 0 ? settingLines.join('\n') : '-（无个性化设置，按通用小红书调性创作）'}
${req.customPrompt?.trim() ? `
【用户附加指令（在不违反以上仿写规则与财经合规红线的前提下，必须优先满足）】
${req.customPrompt.trim()}
` : ''}
【输出格式（必须严格遵守）】
只输出一个 JSON 对象，不要 markdown 代码块、不要任何解释文字。JSON 字段如下：
{
  "titles": ["标题1", "标题2", "标题3"],
  "body": "正文内容",
  "tags": ["标签1", "标签2", "..."],
  "rewriteNotes": "改写说明"
}
- titles：恰好 3 个标题，每个不超过 20 字，从不同信息角度切入，语气符合所选风格，不编造数字、不强行制造悬念，不加书名号与引号；
- body：正文，用 \\n 分段，可用 emoji 与序号，不要出现话题标签；
- tags：5-10 个财经相关话题标签，不带 # 号，每个不超过 12 字；
- rewriteNotes：2-4 句话，说明你如何参考原素材、在哪些地方做了原创化处理、有什么使用建议，并注明「内容仅供财经知识科普，不构成投资建议」。`;
}

/**
 * 构建用户消息：多模态（参考图 + 参数说明文本）
 */
export function buildUserMessages(req: RewriteRequest): Message[] {
  const style = resolveStyle(req);
  const structure = resolveStructure(req);
  const length = resolveLength(req);

  const parts: ContentPart[] = [];

  const textLines: string[] = ['请基于以下参考素材，完成一篇原创仿写：'];
  if (req.images.length > 0) {
    textLines.push(
      `【参考图片】共 ${req.images.length} 张，见本消息附带图片，请先理解图片中的产品/场景/风格要点。`,
    );
  }
  if (req.referenceText.trim()) {
    textLines.push(`【参考文案】\n${req.referenceText.trim()}`);
  }
  textLines.push(
    `【仿写参数】风格：${style.label}；结构：${structure.label}；长度：${length.label}。`,
  );
  textLines.push('请按系统要求输出 JSON。');

  parts.push({ type: 'text', text: textLines.join('\n\n') });

  for (const image of req.images) {
    parts.push({
      type: 'image_url',
      image_url: { url: image, detail: 'high' },
    });
  }

  return [{ role: 'user', content: parts }];
}

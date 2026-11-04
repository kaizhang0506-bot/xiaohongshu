import type {
  CardLayoutId,
  LengthId,
  RewriteStyleId,
  StructureId,
} from './types';
import { CARD_LAYOUTS, type CardLayoutSpec, type LayoutDecor } from './layouts';

export interface OptionDef<T extends string> {
  id: T;
  label: string;
  desc: string;
  /** 注入到系统提示词中的指令片段 */
  prompt?: string;
  /** 排版模板的视觉预览配置 */
  visual?: {
    bg: string;
    fg: string;
    accent: string;
    /** 版式族，用于渲染差异化的小预览 */
    decor?: LayoutDecor;
    /** 手工模板的族名（decor 为 none 时也据此渲染差异化预览） */
    family?: string;
    /** 参数化模板：强调块位置 */
    accentStyle?: string;
    /** 参数化模板：编号样式 */
    numberStyle?: string;
    /** 参数化模板：分隔线样式 */
    dividerStyle?: string;
    /** 参数化模板：文本对齐 */
    align?: string;
    /** 参数化模板：整体构图 */
    composition?: string;
  };
  /** 用户自定义选项标记（前端显示删除入口） */
  isCustom?: boolean;
}

/** 仿写风格（6 类，财经科普向，用户可自定义扩展；echo 为同义复刻模式） */
export const STYLE_OPTIONS: OptionDef<RewriteStyleId>[] = [
  {
    id: 'insight',
    label: 'DeepSeek 式深度拆解',
    desc: '观点清楚、推理扎实，讲透原因，少套话',
    prompt: '深度拆解风：像一位思路清晰、表达克制的分析者。先找出参考内容真正值得讨论的问题，给出具体判断，再用可核对的事实、因果链或明确标为假设的例子解释为什么。每段推进一个信息点，区分事实、推测与适用条件；有不同解释时说明关键差别，不用绝对口吻装作确定。保留原素材的重要细节，不机械逐句换同义词。用自然中文讲明白，长短句结合，专业词只在必要时解释。不刻意卖萌、不用 emoji，不叫“宝子”“家人们”，不写“绝绝子”“狠狠拿捏”“建议收藏”“看完秒懂”，不堆感叹号、口号和空洞金句。标题具体有信息，正文有判断依据，结尾落在一个有用的观察或适用边界，不强行互动或喊关注。深度来自解释质量，而不是拉长篇幅；只输出成稿，不展示思维过程。',
  },
  {
    id: 'echo',
    label: '原文复刻',
    desc: '保留原爆款的风格与结构，仅同义改写文字',
    prompt:
      '原文复刻风（同义改写模式）：严格保留参考原文的语气、节奏、段落结构、情绪点与详略安排——原爆款怎么组织就怎么组织，只做同义层面的表达替换；核心要求：意思与原文完全一致，但文字全部重写，禁止照搬原文连续 5 字以上（包括标题与金句）；不改变原文的观点立场与信息密度；若与所选结构模板冲突，以原文自身结构为准',
  },
  {
    id: 'colloquial',
    label: '白话拆解',
    desc: '把金融术语翻译成大白话，生活类比让小白秒懂',
    prompt:
      '白话拆解风：像耐心的财经博主给完全不懂金融的朋友科普，把专业术语翻译成大白话，多用生活化类比（把通胀比作"钱变毛了"、把复利比作"滚雪球"），句子短、节奏轻快，适量 emoji，读完有"原来这么简单"的获得感',
  },
  {
    id: 'professional',
    label: '硬核数据流',
    desc: '用数据与利率说话，逻辑严密，像专业研究员',
    prompt:
      '硬核数据流风：像专业金融研究员做科普，用具体数据、利率、百分比、时间维度说话，逻辑链完整（现象→数据→原因→影响），克制使用 emoji，严谨但不堆砌术语，每个概念都有出处式解释，体现专业可信度',
  },
  {
    id: 'narrative',
    label: '案例故事',
    desc: '用真实感的人物案例引出金融概念',
    prompt:
      '案例故事风：以第一人称或身边人的真实感经历展开（工资打理、踩雷经历、攒钱计划），有场景、有金额细节、有前后对比，先讲故事再自然带出财经概念与结论，代入感强',
  },
  {
    id: 'tutorial',
    label: '实操攻略',
    desc: '手把手步骤教学，讲清每一步怎么做',
    prompt:
      '实操攻略风：像手把手教学，步骤清晰、分点罗列（如 Step1/Step2 或 ①②③），讲清每个财务动作怎么做（开户、记账、配置应急金、看懂一只基金），强调可操作性与避坑细节，信息密度高，少煽情',
  },
  {
    id: 'emotional',
    label: '避坑警示',
    desc: '唤起风险意识，"别踩坑"式警醒表达',
    prompt:
      '避坑警示风：以风险意识与损失厌恶为情绪驱动，先点破常见的财务误区或骗局套路，语气警醒但不贩卖焦虑，善用反问与"划重点"式提醒，最后落到理性的正确做法，严肃中带一点犀利',
  },
];

/** 文案结构模板（10 类，财经科普向，默认概念解读型） */
export const STRUCTURE_OPTIONS: OptionDef<StructureId>[] = [
  {
    id: 'good-share',
    label: '概念解读型',
    desc: '抛出概念/热点 + 拆解是什么 + 为什么与你有关 + 普通人应对',
    prompt:
      '概念解读型结构：①开头用一个财经概念或热点抛出钩子（悬念/共鸣/反常识）②用通俗方式拆解它到底是什么 ③讲清它为什么与普通人的钱袋子有关 ④给出普通人该怎么看/怎么做的收尾建议',
  },
  {
    id: 'pain-solution',
    label: '痛点方案型',
    desc: '财务痛点 + 分析原因 + 解决方案 + 理性提醒',
    prompt:
      '痛点方案型结构：①先描述目标人群的具体财务痛点（月光、钱越存越薄、看不懂账单）②分析背后的金融逻辑与原因 ③给出可落地的解决方案与步骤 ④结尾理性提醒与行动引导',
  },
  {
    id: 'comparison',
    label: '对比评测型',
    desc: '对比对象与背景 + 分维度对比表现 + 适用结论',
    prompt:
      '对比评测型结构：①交代对比的金融选项与背景（如定投 vs 择时、储蓄 vs 理财、等额本金 vs 等额本息）②按维度逐一对比（收益逻辑、风险、门槛、适合人群）③给出"什么人适合什么"的结论，不替读者做决定',
  },
  {
    id: 'pitfall-guide',
    label: '避坑指南型',
    desc: '常见踩坑 + 避坑要点 + 正确做法',
    prompt:
      '避坑指南型结构：①列举财经领域常见踩坑经历/误区（高息骗局、隐形收费、征信受损）②逐条给出避坑要点与识别方法 ③总结正确做法，结尾提醒风险意识',
  },
  {
    id: 'how-to',
    label: '教程攻略型',
    desc: '目标说明 + 步骤拆解 + 要点提示 + 成果展示',
    prompt:
      '教程攻略型结构：①说明财务操作目标与适用人群（记账、配置应急金、看懂一只基金）②分步骤拆解操作流程 ③补充要点提示与常见坑 ④展示做完后的效果与继续跟进的建议',
  },
  {
    id: 'suspense-twist',
    label: '悬念反转型',
    desc: '反常识开头 + 层层铺垫 + 反转揭晓原理 + 点题',
    prompt:
      '悬念反转型结构：①开头用反常识财经现象设悬念（卖关子但不剧透）②中段层层铺垫数据与线索 ③结尾反转揭晓背后的金融原理 ④一句点题升华，让读者有"原来如此"的爽感',
  },
  {
    id: 'checklist',
    label: '清单合集型',
    desc: '主题引入 + N 条要点逐条展开 + 收藏引导',
    prompt:
      '清单合集型结构：①主题引入说明这份财经清单的价值（如"N 个必懂的理财常识"）②以编号清单逐条展开要点（每条有小标题+简短展开）③结尾总结并引导收藏/评论补充',
  },
  {
    id: 'unboxing',
    label: '工具体验型',
    desc: '入手缘由 + 工具细节 + 上手体验 + 总结评价',
    prompt:
      '工具体验型结构：①交代为什么开始用这个财经工具（记账 App、理财工具、财经书籍）②描述工具的核心功能与细节设计 ③详写实际上手体验与优缺点 ④总结适合什么人、值不值得入手',
  },
  {
    id: 'knowledge',
    label: '知识科普型',
    desc: '现象引入 + 原理拆解 + 划重点 + 记忆点收尾',
    prompt:
      '知识科普型结构：①用一个反常识的金融现象或问题引入 ②把背后的金融原理拆解成通俗易懂的解释（可打比方）③分点划重点总结 ④一句金句式记忆点收尾',
  },
  {
    id: 'review-log',
    label: '复盘打卡型',
    desc: '起点状态 + 过程记录 + 阶段成果 + 复盘心得',
    prompt:
      '复盘打卡型结构：①交代开始时的财务状态与目标（如攒钱计划、定投打卡）②记录过程中的关键节点与做法 ③展示阶段性成果对比（用数据说话）④输出复盘心得与下一步计划',
  },
];

/** 输出长度（3 档） */
export const LENGTH_OPTIONS: OptionDef<LengthId>[] = [
  {
    id: 'short',
    label: '短文案',
    desc: '约 120-200 字',
    prompt: '正文字数控制在 120-200 字',
  },
  {
    id: 'medium',
    label: '中等',
    desc: '约 300-450 字',
    prompt: '正文字数控制在 300-450 字',
  },
  {
    id: 'long',
    label: '长文案',
    desc: '约 550-750 字',
    prompt: '正文字数控制在 550-750 字',
  },
  {
    id: 'follow',
    label: '跟随原文',
    desc: '原文多长，仿写就多长（字数由 AI 按原文对齐）',
    prompt: '正文字数跟随参考文案原文长度，与原文相当',
  },
];

/** 图文卡片排版模板（5 类） */
export const LAYOUT_OPTIONS: OptionDef<CardLayoutId>[] = CARD_LAYOUTS.map((spec: CardLayoutSpec) => ({
  id: spec.id,
  label: spec.label,
  desc: spec.desc,
  visual: {
    bg: spec.bg,
    fg: spec.fg,
    accent: spec.accent,
    decor: spec.decor,
    family: spec.family,
    accentStyle: spec.accentStyle,
    numberStyle: spec.numberStyle,
    dividerStyle: spec.dividerStyle,
    align: spec.align,
    composition: spec.composition,
  },
}));

export const DEFAULT_STRUCTURE: StructureId = 'good-share';

export function findOption<T extends string>(
  options: OptionDef<T>[],
  id: string,
): OptionDef<T> {
  return options.find((o) => o.id === id) ?? options[0];
}

/**
 * 将自定义选项转为注入提示词的指令片段：
 * 用「名称（自定义）+ 用户描述」拼成完整可执行指令
 */
export function customPromptFragment(
  kind: 'style' | 'structure' | 'length',
  label: string,
  desc: string,
): string {
  const kindName =
    kind === 'style' ? '风格' : kind === 'structure' ? '结构' : '长度';
  return `${label}（用户自定义${kindName}）：${desc}`;
}

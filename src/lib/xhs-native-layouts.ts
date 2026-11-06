import type { NativeComposition, NativeFamily, NativeFont, NativeTemplate } from './xhs-native-types';

/** 本地笔记风格：字体、纸张、配色和装饰分别定义，不需要生成图片。 */
export const NATIVE_FAMILIES: NativeFamily[] = [
  {
    id: 'cream-looseleaf', name: '奶油活页',
    description: '奶油纸与松绿墨色，活页圆环贯穿页边；得意黑标题配文楷正文，像认真整理的手写知识本。',
    bg: '#FFF3CE', paper: '#FFFBEB', ink: '#153D2D', accent: '#F5BD38', secondary: '#9CAA79',
    titleFont: 'display', bodyFont: 'handwritten', decoration: 'rings',
  },
  {
    id: 'pink-scrapbook', name: '粉色剪贴',
    description: '浅粉底与乳白剪纸，透明胶带固定便签；快乐体短标题配无衬线正文，拼贴错落但文字清楚。',
    bg: '#FFE6ED', paper: '#FFF9F6', ink: '#66304B', accent: '#D64D85', secondary: '#F4AECA',
    titleFont: 'rounded', bodyFont: 'sans', decoration: 'tape',
  },
  {
    id: 'coffee-reading', name: '咖啡读书',
    description: '咖啡棕、旧书米纸和读书章印；宋体标题配文楷摘记，强调段落之间的阅读节奏。',
    bg: '#E4D4BC', paper: '#FAF1DF', ink: '#50382A', accent: '#9D6042', secondary: '#B9A483',
    titleFont: 'serif', bodyFont: 'handwritten', decoration: 'stamp',
  },
  {
    id: 'lime-pop', name: '青柠波普',
    description: '明亮青柠色块与紫色小纸屑，得意黑大标题形成跳跃节奏；正文保持清爽黑体。',
    bg: '#E9FF93', paper: '#FDFFE9', ink: '#283323', accent: '#6850B6', secondary: '#B5D64A',
    titleFont: 'display', bodyFont: 'sans', decoration: 'confetti',
  },
  {
    id: 'plum-journal', name: '梅子手记',
    description: '梅子紫与粉雾纸张，细缎带作为章节书签；文楷标题搭配宋体正文，像私藏的阅读手记。',
    bg: '#EDDFEA', paper: '#FFF7F8', ink: '#57364C', accent: '#9D4F75', secondary: '#CAB1C3',
    titleFont: 'handwritten', bodyFont: 'serif', decoration: 'ribbon',
  },
  {
    id: 'vintage-daily', name: '复古日报',
    description: '泛黄报纸、深棕宋体与细格分区；标题像报头，正文像知识专栏，留出清楚的栏间距。',
    bg: '#EAD8B5', paper: '#F8ECCE', ink: '#403427', accent: '#91633B', secondary: '#C4AA7A',
    titleFont: 'serif', bodyFont: 'serif', decoration: 'grid',
  },
  {
    id: 'red-ink', name: '红墨刊物',
    description: '暖白纸、朱红墨与编辑括号；粗黑标题配宋体内文，像有重点批注的独立小刊。',
    bg: '#F6EDE7', paper: '#FFFBF4', ink: '#432D2A', accent: '#B93936', secondary: '#DDA18A',
    titleFont: 'sans', bodyFont: 'serif', decoration: 'brackets',
  },
  {
    id: 'sea-salt', name: '海盐知识',
    description: '海盐蓝白纸面与柔和波浪边线；宋体标题配无衬线正文，用轻盈分隔讲清知识。',
    bg: '#DFEFF6', paper: '#F8FCFF', ink: '#25465A', accent: '#3F89A6', secondary: '#A4CBD7',
    titleFont: 'serif', bodyFont: 'sans', decoration: 'waves',
  },
  {
    id: 'mint-list', name: '薄荷清单',
    description: '薄荷绿便签与圆点标记，快乐体标题配清晰黑体；适合步骤、注意事项和收藏清单。',
    bg: '#DDF0E4', paper: '#F8FFF8', ink: '#244B40', accent: '#369475', secondary: '#AAD7BB',
    titleFont: 'rounded', bodyFont: 'sans', decoration: 'dots',
  },
  {
    id: 'campus-lines', name: '学院横线',
    description: '浅蓝练习纸、藏蓝文字与缝线装订；文楷标题配无衬线正文，呈现课堂重点笔记。',
    bg: '#E9EFF8', paper: '#FFFEF6', ink: '#2D3D62', accent: '#536DAD', secondary: '#ABB9D7',
    titleFont: 'handwritten', bodyFont: 'sans', decoration: 'stitch',
  },
  {
    id: 'orange-headline', name: '橙色大字',
    description: '杏橙纸底、深棕字与醒目角标；得意黑标题占据视觉中心，正文以紧凑黑体分段。',
    bg: '#FFD8AB', paper: '#FFF4E5', ink: '#4C3025', accent: '#DA6130', secondary: '#F2AC65',
    titleFont: 'display', bodyFont: 'sans', decoration: 'corners',
  },
  {
    id: 'butter-sticky', name: '黄油便签',
    description: '黄油黄便笺与波浪纸边，快乐体标题配文楷正文；像贴在手账里的实用小提示。',
    bg: '#FFF1AC', paper: '#FFFBE2', ink: '#645221', accent: '#BD8A20', secondary: '#E7D479',
    titleFont: 'rounded', bodyFont: 'handwritten', decoration: 'scallop',
  },
  {
    id: 'mono-chic', name: '黑白时髦',
    description: '暖白、炭黑与胶片边框，黑体大标题配宋体正文；通过字体对比和留白形成时髦杂志感。',
    bg: '#EAE8E2', paper: '#FFFEFA', ink: '#242322', accent: '#66625B', secondary: '#C5C1B9',
    titleFont: 'sans', bodyFont: 'serif', decoration: 'film',
  },
  {
    id: 'peach-mood', name: '蜜桃心情',
    description: '蜜桃奶油色与日光小印记，快乐体标题配文楷短句；温柔但层次鲜明的日常分享笔记。',
    bg: '#FFE3D2', paper: '#FFF8ED', ink: '#71433F', accent: '#D37A61', secondary: '#EDB69B',
    titleFont: 'rounded', bodyFont: 'handwritten', decoration: 'sun',
  },
  {
    id: 'pine-nature', name: '松绿自然',
    description: '燕麦纸与松针绿，植物叶片点缀页角；宋体标题配文楷正文，像安静的自然观察手册。',
    bg: '#E1E8D7', paper: '#FAF8EB', ink: '#324E37', accent: '#658048', secondary: '#B0BC8D',
    titleFont: 'serif', bodyFont: 'handwritten', decoration: 'leaf',
  },
  {
    id: 'taro-plan', name: '香芋计划',
    description: '香芋紫与奶白计划纸，日历格和日期标签组织重点；黑体标题配黑体正文，适合行动笔记。',
    bg: '#ECE1F5', paper: '#FFFAFF', ink: '#594267', accent: '#9470AE', secondary: '#CDB9DC',
    titleFont: 'sans', bodyFont: 'sans', decoration: 'calendar',
  },
  {
    id: 'riso-print', name: '孔版印刷',
    description: '米白纸叠加蓝红双色孔版颗粒；得意黑标题搭配宋体正文，像手工印刷的知识小报。',
    bg: '#F0E8D9', paper: '#FFF7E5', ink: '#2D486C', accent: '#BD584C', secondary: '#A6BDD4',
    titleFont: 'display', bodyFont: 'serif', decoration: 'riso',
  },
  {
    id: 'oat-magazine', name: '燕麦杂志',
    description: '燕麦纸、可可棕字与雏菊小标，宋体标题配黑体正文；像生活方式杂志里的收藏专页。',
    bg: '#EDE2D2', paper: '#FFFAF0', ink: '#514339', accent: '#A98652', secondary: '#CFBF9D',
    titleFont: 'serif', bodyFont: 'sans', decoration: 'daisy',
  },
  {
    id: 'french-photo', name: '法式相纸',
    description: '淡奶油相纸、酒红文字与拍立得纸签；宋体标题配文楷注释，图表保持完整展示。',
    bg: '#EAE0D6', paper: '#FFFCF3', ink: '#653E42', accent: '#9C5F64', secondary: '#C9AFAB',
    titleFont: 'serif', bodyFont: 'handwritten', decoration: 'polaroid',
  },
  {
    id: 'handwritten-highlight', name: '手写荧光',
    description: '暖白笔记纸与荧光黄笔刷，文楷标题配黑体正文；重点划线、旁注和段落层级一目了然。',
    bg: '#F1F0DE', paper: '#FFFFF7', ink: '#363B2B', accent: '#A1B72D', secondary: '#DDEB8D',
    titleFont: 'handwritten', bodyFont: 'sans', decoration: 'brush',
  },
];

/** 同一份文字可分别套用五种明确不同的内容构图。 */
export const NATIVE_COMPOSITIONS: {
  id: NativeComposition;
  name: string;
  description: string;
}[] = [
  {
    id: 'headline', name: '大字主视觉',
    description: '上方通栏大标题，中部完整图像，下方分段正文；用字号反差建立一眼可读的主视觉。',
  },
  {
    id: 'sidebar', name: '侧栏分区笔记',
    description: '左侧窄栏放章节和重点标记，右侧主栏承载标题、完整图像与正文，形成清楚的横向分区。',
  },
  {
    id: 'collage', name: '错落拼贴手账',
    description: '标题纸签与分段便笺错落叠放，完整图像独立成块；装饰留在纸边，正文保持平正易读。',
  },
  {
    id: 'checklist', name: '编号清单卡',
    description: '页首紧凑标题，正文按编号排成独立清单块，完整图像单独占区；长短条目分别适配高度。',
  },
  {
    id: 'editorial', name: '杂志分栏专页',
    description: '刊头和章节标题形成编辑层级，导语、完整图像及分栏正文分区展开，像一张可收藏的知识专页。',
  },
];

const TITLE_PROFILES: Record<NativeFont, { size: number; weight: number; tracking: number }> = {
  sans: { size: 110, weight: 900, tracking: -2.4 },
  serif: { size: 106, weight: 700, tracking: -1.2 },
  handwritten: { size: 112, weight: 400, tracking: 0.8 },
  rounded: { size: 114, weight: 400, tracking: 0.2 },
  display: { size: 122, weight: 400, tracking: -0.8 },
};

const COMPOSITION_SCALE: Record<NativeComposition, number> = {
  headline: 1,
  sidebar: 0.8,
  collage: 0.88,
  checklist: 0.76,
  editorial: 0.84,
};

const CENTERED_HEADLINES = new Set([
  'plum-journal', 'sea-salt', 'butter-sticky', 'peach-mood', 'pine-nature', 'french-photo',
]);

/** 编号固定为风格序号 × 5 + 构图序号，链接和收藏不受渲染时间影响。 */
export const NATIVE_TEMPLATES: NativeTemplate[] = NATIVE_FAMILIES.flatMap((family, familyIndex) =>
  NATIVE_COMPOSITIONS.map((composition, compositionIndex) => {
    const typography = TITLE_PROFILES[family.titleFont];
    return {
      id: `xhs-native-${family.id}-${composition.id}`,
      name: `${family.name} · ${composition.name}`,
      family,
      composition: composition.id,
      description: `${family.description} ${composition.description}`,
      number: familyIndex * NATIVE_COMPOSITIONS.length + compositionIndex + 1,
      align: composition.id === 'headline' && CENTERED_HEADLINES.has(family.id) ? 'center' : 'left',
      titleSize: Math.round(typography.size * COMPOSITION_SCALE[composition.id]),
      titleWeight: typography.weight,
      letterSpacing: typography.tracking,
    };
  }),
);

const TEMPLATES_BY_ID = new Map(NATIVE_TEMPLATES.map((template) => [template.id, template]));

export function getNativeTemplate(id: string): NativeTemplate | undefined {
  return TEMPLATES_BY_ID.get(id);
}

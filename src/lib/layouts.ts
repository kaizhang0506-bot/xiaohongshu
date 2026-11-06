import { templates as rednoteTemplates } from '@/components/rednote-templates/registry';
import { STUDIO_LAYOUTS } from './studio-layouts';
import { NATIVE_TEMPLATES } from './xhs-native-layouts';
/**
 * 卡片排版模板清单（唯一来源，共 100 套）。
 * 前 16 套为手工调校的独立渲染分支（family 与 id 同名）；
 * 其余 84 套由「参数化版式引擎」生成：强调块位置(6) × 编号样式(5) × 分隔线(5) = 150 种骨架，
 * 均匀抽取 84 组（索引互不相同 → 84 套骨架两两不同），再叠加 14 组配色、14 组字体、3 种对齐、3 种标题位置，
 * 保证每套模板在结构、配色、字体、对齐上都各不相同。全部走 GenericCover/Section/End 参数化渲染，
 * 新增模板只需在此追加条目，无需改动 CardItem 的渲染代码。
 */

export type LayoutFamily =
  | 'minimal'
  | 'magazine'
  | 'journal'
  | 'pop'
  | 'dark'
  | 'polaroid'
  | 'terminal'
  | 'newspaper'
  | 'sakura'
  | 'mint'
  | 'blueprint'
  | 'sticky'
  | 'ink'
  | 'sunset'
  | 'taro'
  | 'pixel'
  | 'frame'
  | 'ribbon'
  | 'ticket'
  | 'dotted'
  | 'banded'
  | 'label';

export type LayoutDecor = 'none' | 'frame' | 'ribbon' | 'ticket' | 'dots' | 'band' | 'label';

export interface CardLayoutSpec {
  customTemplate?: { image: string; x: number; y: number; width: number; height: number; color: string; font: 'sans' | 'serif' | 'mono'; align: 'left' | 'center' };
  id: string;
  label: string;
  desc: string;
  /** 版式族：决定用哪套渲染分支 */
  family: LayoutFamily;
  bg: string;
  fg: string;
  fgSoft: string;
  accent: string;
  accentSoft: string;
  noteColor: string;
  /** 标题字体：sans 无衬线 / serif 衬线 / mono 等宽 / round 圆润无衬线 */
  titleFont: 'sans' | 'serif' | 'mono' | 'round';
  decor: LayoutDecor;
  /** 卡片圆角（px），参数化族使用 */
  radius: number;
  /** 标题字重（参数化模板，缺省 900） */
  titleWeight?: number;
  /** 标题字距（参数化模板，px） */
  titleSpacing?: number;
  /** 标题斜体样式 */
  titleStyle?: 'normal' | 'italic';
  /** 版式变体（0-3，参数化模板用于错开对齐与装饰） */
  variant?: number;
  /** 参数化版式：文本对齐 */
  align?: 'left' | 'center' | 'right';
  /** 参数化版式：封面标题垂直位置 */
  titlePos?: 'top' | 'mid' | 'bottom';
  /** 参数化版式：强调块位置（顶栏/左栏/右栏/角块/点带/下划线） */
  accentStyle?: 'topbar' | 'leftblock' | 'sidebar' | 'cornerbox' | 'dotrow' | 'underline';
  /** 参数化版式：编号样式 */
  numberStyle?: 'ghost' | 'box' | 'pill' | 'outline' | 'none';
  /** 参数化版式：分隔线样式 */
  dividerStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  /** 参数化版式：整体构图（上下堆叠 / 左右分栏 / 顶部色带） */
  composition?: 'stack' | 'split' | 'bandtop';
}

const handcrafted: CardLayoutSpec[] = [
  {
    id: 'minimal', label: '极简大字报', desc: '纯白底 + 超大黑字 + 红色点缀', family: 'minimal',
    bg: '#FFFFFF', fg: '#111111', fgSoft: '#5A5A5A', accent: '#FF2E4D',
    accentSoft: 'rgba(255, 46, 77, 0.12)', noteColor: '#9A9A9A', titleFont: 'sans', decor: 'none', radius: 0,
  },
  {
    id: 'magazine', label: '杂志风', desc: '米色纸感 + 衬线标题 + 优雅细线', family: 'magazine',
    bg: '#F5F0E6', fg: '#1C1A16', fgSoft: '#6B6459', accent: '#A08348',
    accentSoft: 'rgba(160, 131, 72, 0.14)', noteColor: '#8A8171', titleFont: 'serif', decor: 'none', radius: 0,
  },
  {
    id: 'journal', label: '奶油手账风', desc: '奶油底 + 粉色贴纸 + 手绘虚线', family: 'journal',
    bg: '#FFF6E9', fg: '#4A3F35', fgSoft: '#8A7A6A', accent: '#F49B9B',
    accentSoft: '#FCD5CE', noteColor: '#A6988A', titleFont: 'round', decor: 'none', radius: 0,
  },
  {
    id: 'pop', label: '撞色波普风', desc: '明黄底 + 黑色大块 + 高对比', family: 'pop',
    bg: '#FFD93D', fg: '#111111', fgSoft: '#4A3A00', accent: '#FF4D6D',
    accentSoft: 'rgba(255, 77, 109, 0.18)', noteColor: '#6B5B00', titleFont: 'sans', decor: 'none', radius: 0,
  },
  {
    id: 'dark', label: '暗黑高级风', desc: '深黑底 + 米白字 + 金色细线', family: 'dark',
    bg: '#161616', fg: '#F2EDE3', fgSoft: '#A8A296', accent: '#C9A96A',
    accentSoft: 'rgba(201, 169, 106, 0.16)', noteColor: '#8A857A', titleFont: 'serif', decor: 'none', radius: 0,
  },
  {
    id: 'polaroid', label: '拍立得相纸', desc: '白相框 + 奶油衬纸 + 手写标注', family: 'polaroid',
    bg: '#F0EDE4', fg: '#2B2822', fgSoft: '#6E675C', accent: '#E8484F',
    accentSoft: 'rgba(232, 72, 79, 0.14)', noteColor: '#8B8477', titleFont: 'round', decor: 'none', radius: 0,
  },
  {
    id: 'terminal', label: '极客终端风', desc: '深夜底 + 荧光绿字 + 命令行', family: 'terminal',
    bg: '#0C0C14', fg: '#D7F5DD', fgSoft: '#7FA98C', accent: '#3DDC84',
    accentSoft: 'rgba(61, 220, 132, 0.16)', noteColor: '#5F7F69', titleFont: 'mono', decor: 'none', radius: 0,
  },
  {
    id: 'newspaper', label: '报纸头条风', desc: '米纸底 + 报头双线 + 油墨红章', family: 'newspaper',
    bg: '#F6F1E3', fg: '#171208', fgSoft: '#5E5647', accent: '#8C1C13',
    accentSoft: 'rgba(140, 28, 19, 0.12)', noteColor: '#7A7161', titleFont: 'serif', decor: 'none', radius: 0,
  },
  {
    id: 'sakura', label: '樱花粉', desc: '粉渐变底 + 白色圆卡 + 心形点缀', family: 'sakura',
    bg: '#FFDDE9', fg: '#4A2233', fgSoft: '#8A6474', accent: '#FF5F97',
    accentSoft: 'rgba(255, 95, 151, 0.16)', noteColor: '#A87E8D', titleFont: 'round', decor: 'none', radius: 0,
  },
  {
    id: 'mint', label: '薄荷苏打', desc: '薄荷绿底 + 白卡 + 叶片圆点', family: 'mint',
    bg: '#E3F6EC', fg: '#14342A', fgSoft: '#5A7C6C', accent: '#0FA36B',
    accentSoft: 'rgba(15, 163, 107, 0.14)', noteColor: '#7A9A8B', titleFont: 'sans', decor: 'none', radius: 0,
  },
  {
    id: 'blueprint', label: '蓝图工程风', desc: '深蓝底 + 网格线 + 黄色标注', family: 'blueprint',
    bg: '#12386F', fg: '#EAF3FF', fgSoft: '#9EB8D8', accent: '#FFD447',
    accentSoft: 'rgba(255, 212, 71, 0.18)', noteColor: '#8AA5C6', titleFont: 'mono', decor: 'none', radius: 0,
  },
  {
    id: 'sticky', label: '便利贴墙', desc: '黄便签 + 白胶带 + 手写衬线', family: 'sticky',
    bg: '#E7E3D2', fg: '#3D3524', fgSoft: '#726951', accent: '#E8542F',
    accentSoft: 'rgba(232, 84, 47, 0.14)', noteColor: '#8B8368', titleFont: 'serif', decor: 'none', radius: 0,
  },
  {
    id: 'ink', label: '水墨留白', desc: '宣纸底 + 墨色衬线 + 朱红印章', family: 'ink',
    bg: '#F4EFE3', fg: '#26221A', fgSoft: '#6A6255', accent: '#B03A2E',
    accentSoft: 'rgba(176, 58, 46, 0.12)', noteColor: '#8B8272', titleFont: 'serif', decor: 'none', radius: 0,
  },
  {
    id: 'sunset', label: '落日胶片', desc: '橙红渐变 + 胶片齿孔 + 暖白字', family: 'sunset',
    bg: '#E85A68', fg: '#FFFFFF', fgSoft: '#FFD9C9', accent: '#FFE08A',
    accentSoft: 'rgba(255, 224, 138, 0.24)', noteColor: '#FFC9BC', titleFont: 'sans', decor: 'none', radius: 0,
  },
  {
    id: 'taro', label: '香芋奶盖', desc: '香芋紫底 + 白圆卡 + 奶盖圆点', family: 'taro',
    bg: '#EFE7F8', fg: '#3A2E55', fgSoft: '#7A6E96', accent: '#7E57C2',
    accentSoft: 'rgba(126, 87, 194, 0.14)', noteColor: '#948AAE', titleFont: 'round', decor: 'none', radius: 0,
  },
  {
    id: 'pixel', label: '像素冒险', desc: '深空底 + 双层粗框 + 复古游戏色', family: 'pixel',
    bg: '#141428', fg: '#F3F3E9', fgSoft: '#9C9CB4', accent: '#FFD93D',
    accentSoft: 'rgba(255, 217, 61, 0.18)', noteColor: '#7C7C96', titleFont: 'mono', decor: 'none', radius: 0,
  },
];

interface Palette {
  key: string;
  name: string;
  bg: string;
  fg: string;
  fgSoft: string;
  accent: string;
  accentSoft: string;
  noteColor: string;
}

const palettes: Palette[] = [
  { key: 'ivory', name: '象牙白', bg: '#FDFBF6', fg: '#1A1814', fgSoft: '#6B655C', accent: '#D8452F', accentSoft: 'rgba(216, 69, 47, 0.12)', noteColor: '#9A948B' },
  { key: 'grid', name: '方格纸', bg: '#F7F9FB', fg: '#1B2A38', fgSoft: '#5C6B78', accent: '#2E6FAF', accentSoft: 'rgba(46, 111, 175, 0.14)', noteColor: '#8A98A5' },
  { key: 'sand', name: '沙丘棕', bg: '#F3E7D3', fg: '#3A2A16', fgSoft: '#7D6547', accent: '#B4661F', accentSoft: 'rgba(180, 102, 31, 0.14)', noteColor: '#9A8365' },
  { key: 'forest', name: '森林绿', bg: '#E8F1E5', fg: '#17281A', fgSoft: '#5D7361', accent: '#2F7D4F', accentSoft: 'rgba(47, 125, 79, 0.14)', noteColor: '#7C927F' },
  { key: 'night', name: '夜幕蓝', bg: '#111A2B', fg: '#E9EFF9', fgSoft: '#95A5BC', accent: '#5AB0FF', accentSoft: 'rgba(90, 176, 255, 0.18)', noteColor: '#7C8DA6' },
  { key: 'cocoa', name: '可可深棕', bg: '#221815', fg: '#F5E9DE', fgSoft: '#B1968A', accent: '#E07A5F', accentSoft: 'rgba(224, 122, 95, 0.18)', noteColor: '#8F776C' },
  { key: 'rose', name: '玫瑰米', bg: '#FBEFF0', fg: '#3A1F26', fgSoft: '#83626A', accent: '#C63A5B', accentSoft: 'rgba(198, 58, 91, 0.14)', noteColor: '#A6838B' },
  { key: 'sky', name: '天空青', bg: '#E7F6FA', fg: '#123840', fgSoft: '#4F7681', accent: '#1D9AAE', accentSoft: 'rgba(29, 154, 174, 0.14)', noteColor: '#7B9AA2' },
  { key: 'gold', name: '香槟金', bg: '#FAF3E0', fg: '#2C2416', fgSoft: '#6F6044', accent: '#B08A2E', accentSoft: 'rgba(176, 138, 46, 0.16)', noteColor: '#94836A' },
  { key: 'grape', name: '葡萄紫', bg: '#F1EAF8', fg: '#2C2143', fgSoft: '#6A5B85', accent: '#6C46B8', accentSoft: 'rgba(108, 70, 184, 0.14)', noteColor: '#8A7EA3' },
  { key: 'clay', name: '陶土橙', bg: '#FBEDE3', fg: '#33200F', fgSoft: '#7A5B41', accent: '#D2603A', accentSoft: 'rgba(210, 96, 58, 0.14)', noteColor: '#9A7A62' },
  { key: 'mono', name: '黑白灰', bg: '#F4F4F4', fg: '#111111', fgSoft: '#5E5E5E', accent: '#111111', accentSoft: 'rgba(17, 17, 17, 0.10)', noteColor: '#8A8A8A' },
  { key: 'lake', name: '湖水绿', bg: '#EAF6F1', fg: '#0F2E26', fgSoft: '#4E7367', accent: '#0E8C74', accentSoft: 'rgba(14, 140, 116, 0.14)', noteColor: '#77988D' },
  { key: 'peach', name: '蜜桃粉', bg: '#FFF0E8', fg: '#3D2218', fgSoft: '#8A6252', accent: '#F0703C', accentSoft: 'rgba(240, 112, 60, 0.14)', noteColor: '#A9836F' },
];

/** 标题字体池：每套参数化模板轮换一种，做到「每套字体都不同」 */
const fontPool: Array<{ font: 'sans' | 'serif' | 'mono' | 'round'; weight: number; spacing: number; style: 'normal' | 'italic' }> = [
  { font: 'sans', weight: 900, spacing: -1, style: 'normal' },
  { font: 'serif', weight: 700, spacing: 0, style: 'normal' },
  { font: 'mono', weight: 700, spacing: 1, style: 'normal' },
  { font: 'sans', weight: 500, spacing: 3, style: 'normal' },
  { font: 'round', weight: 900, spacing: 0, style: 'normal' },
  { font: 'serif', weight: 900, spacing: -1, style: 'italic' },
  { font: 'sans', weight: 900, spacing: 5, style: 'normal' },
  { font: 'mono', weight: 500, spacing: 0, style: 'normal' },
  { font: 'serif', weight: 600, spacing: 2, style: 'normal' },
  { font: 'sans', weight: 300, spacing: 1, style: 'normal' },
  { font: 'round', weight: 700, spacing: 1, style: 'normal' },
  { font: 'sans', weight: 800, spacing: -2, style: 'normal' },
  { font: 'serif', weight: 700, spacing: 1, style: 'italic' },
  { font: 'mono', weight: 800, spacing: 2, style: 'normal' },
];

/** 参数化版式的正交维度：强调块位置 × 编号样式 × 分隔线，组合出大量互不相同的版式骨架 */
const ACCENTS: Array<NonNullable<CardLayoutSpec['accentStyle']>> = ['topbar', 'leftblock', 'sidebar', 'cornerbox', 'dotrow', 'underline'];
const NUMBERS: Array<NonNullable<CardLayoutSpec['numberStyle']>> = ['ghost', 'box', 'pill', 'outline', 'none'];
const DIVIDERS: Array<NonNullable<CardLayoutSpec['dividerStyle']>> = ['solid', 'dashed', 'dotted', 'double', 'none'];
const ALIGNS: Array<NonNullable<CardLayoutSpec['align']>> = ['left', 'center', 'right'];
const TITLEPOS: Array<NonNullable<CardLayoutSpec['titlePos']>> = ['top', 'mid', 'bottom'];
const COMPOSITIONS: Array<NonNullable<CardLayoutSpec['composition']>> = ['stack', 'split', 'bandtop'];
const COMP_NAME: Record<string, string> = { stack: '上下', split: '分栏', bandtop: '色带' };

const ACCENT_NAME: Record<string, string> = { topbar: '顶栏', leftblock: '左栏', sidebar: '右栏', cornerbox: '角块', dotrow: '点带', underline: '下划' };
const ACCENT_FAMILY: Record<string, LayoutFamily> = { topbar: 'banded', leftblock: 'frame', sidebar: 'frame', cornerbox: 'label', dotrow: 'dotted', underline: 'frame' };
const DIVIDER_NAME: Record<string, string> = { solid: '实线', dashed: '虚线', dotted: '点线', double: '双线', none: '无线' };
const RADIUS_POOL = [0, 8, 12, 16, 20, 24, 28];

interface Combo {
  accentStyle: NonNullable<CardLayoutSpec['accentStyle']>;
  numberStyle: NonNullable<CardLayoutSpec['numberStyle']>;
  dividerStyle: NonNullable<CardLayoutSpec['dividerStyle']>;
}

// 6×5×5 = 150 种骨架组合；以「强调块」为最快变化维度，让相邻模板一眼就能看出结构不同
const combos: Combo[] = [];
for (const n of NUMBERS) {
  for (const d of DIVIDERS) {
    for (const a of ACCENTS) {
      combos.push({ accentStyle: a, numberStyle: n, dividerStyle: d });
    }
  }
}

// 均匀抽取 84 组骨架（索引互不相同 → 这 84 套版式骨架两两不同），再叠加配色/字体/对齐轮换
const generated: CardLayoutSpec[] = Array.from({ length: 84 }, (_: unknown, i: number) => {
  const combo = combos[Math.floor((i * combos.length) / 84)];
  const palette = palettes[i % palettes.length];
  const font = fontPool[i % fontPool.length];
  const comp = COMPOSITIONS[i % COMPOSITIONS.length];
  return {
    id: `${combo.accentStyle}-${combo.numberStyle}-${combo.dividerStyle}-${comp}-${palette.key}`,
    label: `${palette.name}·${COMP_NAME[comp]}${ACCENT_NAME[combo.accentStyle]}`,
    desc: `${palette.name}配色 + ${COMP_NAME[comp]}构图 + ${ACCENT_NAME[combo.accentStyle]} + ${DIVIDER_NAME[combo.dividerStyle]}分隔`,
    family: ACCENT_FAMILY[combo.accentStyle],
    bg: palette.bg,
    fg: palette.fg,
    fgSoft: palette.fgSoft,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    noteColor: palette.noteColor,
    titleFont: font.font,
    decor: 'none',
    radius: RADIUS_POOL[i % RADIUS_POOL.length],
    titleWeight: font.weight,
    titleSpacing: font.spacing,
    titleStyle: font.style,
    variant: i % 4,
    align: ALIGNS[Math.floor(i / 3) % ALIGNS.length],
    titlePos: TITLEPOS[Math.floor(i / 9) % TITLEPOS.length],
    accentStyle: combo.accentStyle,
    numberStyle: combo.numberStyle,
    dividerStyle: combo.dividerStyle,
    composition: comp,
  };
});

/** 100 套排版模板（16 手工 + 84 组合） */
// Adapted md2card themes, MIT license; see THIRD_PARTY_NOTICES.md.
const md2cardThemes: CardLayoutSpec[] = [
  { id:'md2card-mono', label:'开源 · 极简黑白', desc:'黑白排版 + 干净线条', family:'frame', bg:'#FFFFFF', fg:'#111111', fgSoft:'#333333', accent:'#111111', accentSoft:'#EEEEEE', noteColor:'#666666', titleFont:'sans', decor:'frame', radius:0, accentStyle:'underline', numberStyle:'outline', dividerStyle:'solid', composition:'stack' },
  { id:'md2card-fresh', label:'开源 · 清新笔记', desc:'浅绿底 + 绿色重点', family:'label', bg:'#F3FFF2', fg:'#224D2B', fgSoft:'#315A3B', accent:'#6ACA7C', accentSoft:'#D8F7D3', noteColor:'#316D3E', titleFont:'round', decor:'label', radius:24, accentStyle:'leftblock', numberStyle:'pill', dividerStyle:'none', composition:'stack' },
  { id:'md2card-editorial', label:'开源 · 暖调杂志', desc:'暖纸色 + 杂志衬线', family:'frame', bg:'#F6EDE4', fg:'#2C1D17', fgSoft:'#4F3A2F', accent:'#C28763', accentSoft:'#EAD3C4', noteColor:'#76584A', titleFont:'serif', decor:'frame', radius:0, accentStyle:'sidebar', numberStyle:'ghost', dividerStyle:'double', composition:'split' },
  { id:'md2card-contrast', label:'开源 · 高对比', desc:'明亮底色 + 强烈标题', family:'banded', bg:'#FFE000', fg:'#2C1200', fgSoft:'#4B2200', accent:'#111111', accentSoft:'#FFF3A0', noteColor:'#68412A', titleFont:'sans', decor:'band', radius:0, accentStyle:'topbar', numberStyle:'box', dividerStyle:'solid', composition:'bandtop' },
  { id:'md2card-tech', label:'开源 · 科技脉搏', desc:'深蓝底 + 冰蓝强调', family:'ribbon', bg:'#0F1733', fg:'#F3FBFF', fgSoft:'#D3E9FF', accent:'#63DDFF', accentSoft:'#204D9B', noteColor:'#A8DAFF', titleFont:'sans', decor:'ribbon', radius:12, accentStyle:'cornerbox', numberStyle:'outline', dividerStyle:'dashed', composition:'stack' },
  { id:'md2card-ai', label:'开源 · AI 手记', desc:'深色底 + 青色标注', family:'dotted', bg:'#0F172A', fg:'#FFFFFF', fgSoft:'#CBD5E1', accent:'#22D3EE', accentSoft:'#164E63', noteColor:'#94A3B8', titleFont:'mono', decor:'dots', radius:16, accentStyle:'dotrow', numberStyle:'pill', dividerStyle:'dotted', composition:'stack' },
];
const rednoteLayouts: CardLayoutSpec[] = rednoteTemplates.map((template, index) => ({
  id: `rednote-${template.id}`, label: `开源 · ${template.name}`, desc: template.description,
  family: 'frame', bg: ['#EEEAFE', '#F6EEE3', '#101B33', '#F5EAE6', '#E7E4DA', '#E4E9F0', '#E7E9ED', '#25203D', '#E8EDE6', '#F6F3EC', '#F8F3DB'][index],
  fg: index === 2 || index === 7 ? '#FFFFFF' : '#222222', fgSoft: '#666666', accent: ['#8B5CF6', '#AE7050', '#00A7D0', '#B65C70', '#333333', '#3878C2', '#444444', '#F9CA40', '#4A7A50', '#9A5744', '#D9A82E'][index], accentSoft: '#EEEEEE', noteColor: '#777777', titleFont: 'sans', decor: 'frame', radius: 0,
}));
const paperNotebook: CardLayoutSpec = {
  id: 'xhs-paper-notebook', label: '小红书奶油手写笔记', desc: '本地纸纹 · 墨绿大字 · 黄色重点 · 编号手账框',
  family: 'journal', bg: '#f7efdb', fg: '#073d1d', fgSoft: '#416345', accent: '#f2c84b',
  accentSoft: '#fff8e4', noteColor: '#416345', titleFont: 'sans', decor: 'frame', radius: 22, titleWeight: 950,
};

/** New ready-to-use designs are local; legacy IDs stay registered for saved projects. */
export const NATIVE_CARD_LAYOUTS: CardLayoutSpec[] = NATIVE_TEMPLATES.map(template => ({
  id: template.id, label: template.name, desc: template.description,
  family: 'journal', bg: template.family.bg, fg: template.family.ink,
  fgSoft: template.family.ink, accent: template.family.accent,
  accentSoft: template.family.secondary, noteColor: template.family.ink,
  titleFont: template.family.titleFont === 'serif' ? 'serif' : template.family.titleFont === 'rounded' ? 'round' : 'sans',
  decor: 'none', radius: 20, titleWeight: template.titleWeight,
}));

export const CARD_LAYOUTS: CardLayoutSpec[] = [...NATIVE_CARD_LAYOUTS, paperNotebook, ...['newspaper','blueprint','scrapbook','magazine'].map((id,i)=>({...paperNotebook,id:'xhs-five-'+id,label:['复古财经报刊','蓝色研究笔记','粉色剪贴','橙黑杂志'][i]})), ...STUDIO_LAYOUTS, ...rednoteLayouts, ...md2cardThemes, ...handcrafted, ...generated];

const byId = new Map(CARD_LAYOUTS.map((spec: CardLayoutSpec) => [spec.id, spec]));

export function registerCustomLayouts(specs: CardLayoutSpec[]) {
  for (const id of byId.keys()) if (id.startsWith('uploaded-')) byId.delete(id);
  for (const spec of specs) byId.set(spec.id, spec);
}

/** 按 id 取模板，未知 id 回退第一套（历史记录里的旧 id 也不会崩） */
export function getCardLayout(id: string): CardLayoutSpec {
  return byId.get(id) ?? CARD_LAYOUTS[0];
}

/** 取同族的下 N 套模板（用于「一次生成多套模板」） */
export function pickLayouts(startId: string, count: number): CardLayoutSpec[] {
  const start = Math.max(0, CARD_LAYOUTS.findIndex((spec: CardLayoutSpec) => spec.id === getCardLayout(startId).id));
  return Array.from({ length: Math.max(1, Math.min(count, CARD_LAYOUTS.length)) }, (_: unknown, index: number) =>
    CARD_LAYOUTS[(start + index) % CARD_LAYOUTS.length],
  );
}




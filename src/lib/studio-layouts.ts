import type { CardLayoutSpec } from './layouts';
export const STUDIO_STYLES = [
  ['活页手帐','#FFF8E6','#073D1D','#F6CA53','serif','rings'],
  ['瑞士网格','#F7F5EF','#111111','#E83B2E','sans','grid'],
  ['独立报刊','#F3EAD7','#28251F','#9C3026','serif','news'],
  ['黑板课堂','#163C32','#FFF8D8','#FFC75B','round','chalk'],
  ['蓝图研究','#113B75','#FFFFFF','#8AD8FF','mono','grid'],
  ['橙色路牌','#FF6B27','#171717','#FFEACD','sans','stripe'],
  ['档案卷宗','#EAE1CD','#3E4238','#A44732','mono','file'],
  ['奶油便签','#FFF4CE','#49352B','#F4B342','round','sticky'],
  ['粉色剪贴','#FBE4EC','#612F45','#D74E80','serif','tape'],
  ['科技终端','#101919','#ACFFB7','#39CA8C','mono','terminal'],
  ['红黑宣言','#171717','#FFF9E8','#FC453F','sans','stripe'],
  ['水墨留白','#F2F0E8','#252D29','#B44533','serif','ink'],
  ['紫色梦境','#EBE2FA','#3A245B','#A378DF','round','orbs'],
  ['旅行邮戳','#EEE7D7','#2C4960','#B75837','serif','stamp'],
  ['电影字幕','#111A29','#F9E7BB','#DCB14E','serif','film'],
  ['像素街机','#181235','#F2F38F','#9C84EE','mono','pixel'],
  ['薄荷药笺','#E2F1E9','#215346','#4F9E80','sans','cross'],
  ['柠檬汽水','#F3F78D','#3C4A1B','#E7A922','round','dots'],
  ['海蓝航线','#DBEEF4','#17445D','#4784B8','sans','waves'],
  ['咖啡账本','#EDE0D1','#4A3025','#A9784D','mono','ledger'],
  ['美术展签','#FAF9F4','#302F2B','#47719A','serif','museum'],
  ['工业标签','#D5D7D2','#222924','#F2E44E','mono','hazard'],
  ['波普拼块','#FFE3AD','#4E245E','#F17E92','sans','pop'],
  ['自然标本','#E8EBDA','#35472A','#A4B46C','serif','botanic'],
  ['霓虹夜游','#19112C','#F1ECFF','#66FFB8','mono','neon'],
] as const;
export const STUDIO_COMPOSITIONS = ['头版海报','侧栏索引','横幅分区','居中展板'] as const;
export const STUDIO_LAYOUTS: CardLayoutSpec[] = STUDIO_STYLES.flatMap((style, i) => STUDIO_COMPOSITIONS.map((composition, variant) => ({
  id: `studio-${i}-${variant}`, label: `${style[0]} · ${composition}`, desc: `${style[0]}视觉语言 / ${composition}构图`, family: 'frame', bg: style[1], fg: style[2], fgSoft: style[2], accent: style[3], accentSoft: style[3], noteColor: style[2], titleFont: style[4], decor:'none', radius:0, variant,
})));

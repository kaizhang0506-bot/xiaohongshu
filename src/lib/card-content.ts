import type { CardContent, RewriteResult } from './types';
import { formatCardText, parseCardText, plainCardText, type CardTextBlock } from './card-rich-text';

const AUTO_PAGE_CHARACTERS = 240;

/** 无参考图时按正文量推荐页数，避免短文案默认被分成过多卡片。 */
export function recommendedCardCount(body: string): number {
  const characters = plainCardText(body).replace(/\s/g, '').length;
  return Math.min(12, Math.max(3, Math.ceil(characters / AUTO_PAGE_CHARACTERS) + 1));
}

/** 仅识别纯风险提示；带其他论点的段落不会因出现“风险”二字而被当作免责声明。 */
function isDisclaimerOnly(text: string): boolean {
  if (text.replace(/\s/g, '').length > 100) return false;
  if (!/风险|不构成.*建议/.test(text)) return false;
  const remainder = text
    .replace(/(?:温馨提示|风险提示|免责声明|友情提示|提示)/g, '')
    .replace(/(?:投资|股市|市场|理财)(?:有|存在)风险/g, '')
    .replace(/(?:入市|投资|理财|决策)(?:需|须|应|请|要)?谨慎/g, '')
    .replace(/(?:以上内容|本内容|本文|文章|内容)?(?:仅供|仅为|仅限|仅是)(?:个人)?(?:交易)?(?:心得|经验|知识)?(?:交流|分享|参考|科普)/g, '')
    .replace(/不(?:构成|作为)(?:任何|具体)?(?:投资|理财|操作|买卖)?建议/g, '')
    .replace(/[\s\p{P}]/gu, '');
  return remainder.length === 0;
}

/** 按句子切分段落（保留结尾标点） */
function splitSentences(paragraph: string): string[] {
  const parts: string[] = [];
  let current = '';
  let bold = false;
  for (let index = 0; index < paragraph.length; index += 1) {
    if (paragraph.slice(index, index + 2) === '**') {
      bold = !bold; current += '**'; index += 1; continue;
    }
    const char = paragraph[index];
    current += char;
    if (!bold && /[。！？!?；;]/.test(char)) { if (current.trim()) parts.push(current.trim()); current = ''; }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length > 0 ? parts : [paragraph];
}

/**
 * 将句子装箱到 count 个分组，尽量按字符量均衡
 */
interface TextUnit extends CardTextBlock { block: number }
function isHeading(unit: TextUnit) { return unit.kind === 'heading' || unit.kind === 'subheading'; }

function joinUnits(units: TextUnit[]): CardTextBlock[] {
  const blocks: (CardTextBlock & { block: number })[] = [];
  units.forEach(unit => {
    const previous = blocks[blocks.length - 1];
    if (previous && previous.block === unit.block) previous.text += unit.text;
    else blocks.push({ ...unit });
  });
  return blocks;
}

function packSentences(sentences: TextUnit[], count: number): TextUnit[][] {
  if (count <= 0 || sentences.length === 0) return [];
  const binCount = Math.min(count, sentences.length);
  const bins: TextUnit[][] = [];
  let remainingSize = sentences.reduce((sum, sentence) => sum + sentence.text.length, 0);
  let cursor = 0;
  for (let index = 0; index < binCount; index += 1) {
    const remainingBins = binCount - index;
    const target = remainingSize / remainingBins;
    const bin: TextUnit[] = [];
    let size = 0;
    while (cursor < sentences.length) {
      const sentence = sentences[cursor];
      // 为后面的每页至少保留一句，避免“借句”兜底留下空页或打乱顺序。
      const canBreak = bin.length > 0 && !isHeading(bin[bin.length - 1]);
      if (canBreak && sentences.length - cursor === remainingBins - 1) break;
      const headingAndBodySize = sentence.text.length + (isHeading(sentence) ? sentences[cursor + 1]?.text.length ?? 0 : 0);
      if (canBreak && remainingBins > 1 && Math.abs(size - target) <= Math.abs(size + headingAndBodySize - target)) break;
      bin.push(sentence);
      size += sentence.text.length;
      remainingSize -= sentence.text.length;
      cursor += 1;
    }
    if (bin.length) bins.push(bin);
  }
  return bins;
}

/**
 * 把仿写结果分配为 count 张卡片内容：
 * 第 1 张封面 / 其余为内容页，最后一张内容页附带结尾 tags（不再单独生成结尾页）
 */
export function buildCardContents(
  result: RewriteResult,
  count: number,
  _brandName: string,
  options: { minimumSections?: number } = {},
): CardContent[] {
  const safeCount = Math.min(Math.max(Math.round(count), 3), 12);
  const titles = result.titles.filter((t) => t.trim().length > 0);
  const tags = result.tags.filter((t) => t.trim().length > 0);

  const blocks = parseCardText(result.body ?? '');
  const sentences: TextUnit[] = blocks.flatMap((block, index) => (block.kind === 'paragraph' ? splitSentences(block.text) : [block.text]).map(text => ({ ...block, text, block: index })));
  const sectionCount = safeCount - 1;
  const bins = packSentences(sentences, sectionCount);
  const minimumSections = Math.max(1, options.minimumSections ?? 1);
  if (bins.length > minimumSections && isDisclaimerOnly(bins[bins.length - 1].map(unit => plainCardText(unit.text)).join(''))) {
    const disclaimer = bins.pop()!;
    bins[bins.length - 1].push(...disclaimer);
  }
  const actualTotal = bins.length + 1;

  const contents: CardContent[] = [];

  // 封面
  contents.push({
    kind: 'cover',
    index: 0,
    total: actualTotal,
    title: titles[0] ?? '好物分享',
  });

  // 内容页（最后一张附结尾 tags）
  bins.forEach((bin, i) => {
    const pageBlocks = joinUnits(bin);
    // Use a real section label as the page title once; keep later subheadings in the body.
    const first = pageBlocks[0];
    const explicitHeading = first && (first.kind === 'heading' || first.kind === 'subheading') ? pageBlocks.shift() : undefined;
    const paragraph = formatCardText(pageBlocks);
    const isLast = i === bins.length - 1;
    contents.push({
      kind: 'section',
      index: i + 1,
      total: actualTotal,
      sectionNo: i + 1,
      // A page boundary must not promote, repeat or truncate its first sentence.
      heading: explicitHeading ? plainCardText(explicitHeading.text) : undefined,
      paragraph,
      ...(isLast && tags.length > 0 ? { tags: tags.slice(0, 8) } : {}),
    });
  });

  return contents;
}

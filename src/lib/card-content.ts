import type { CardContent, RewriteResult } from './types';

const MAX_HEADING_LEN = 16;

/** 去掉开头的列表标记（-、•、1.、① 等） */
function stripListMarker(text: string): string {
  return text
    .replace(/^[\s]*[-•*·]+\s*/, '')
    .replace(/^[\s]*\d+[.、)）]\s*/, '')
    .replace(/^[\s]*[①②③④⑤⑥⑦⑧⑨⑩]+\s*/, '')
    .trim();
}

/** 按段落切分正文 */
function splitParagraphs(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => stripListMarker(line))
    .filter((line) => line.length > 0);
}

/** 按句子切分段落（保留结尾标点） */
function splitSentences(paragraph: string): string[] {
  const parts = paragraph
    .split(/(?<=[。！？!?；;])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [paragraph];
}

/** 从一组文本中提取小标题：取第一句并截断 */
function extractHeading(text: string): string {
  const firstSentence = splitSentences(text)[0] ?? text;
  const cleaned = firstSentence.replace(/[。！？!?；;，,、\s]+$/u, '');
  if (cleaned.length <= MAX_HEADING_LEN) return cleaned;
  return `${cleaned.slice(0, MAX_HEADING_LEN)}…`;
}

/**
 * 将句子装箱到 count 个分组，尽量按字符量均衡
 */
function packSentences(sentences: string[], count: number): string[][] {
  if (count <= 0) return [];
  const total = sentences.reduce((sum, s) => sum + s.length, 0);
  const target = total / count;
  const bins: string[][] = Array.from({ length: count }, () => []);
  let binIndex = 0;
  for (const sentence of sentences) {
    const currentSize = bins[binIndex].reduce((sum, s) => sum + s.length, 0);
    const remainingBins = count - binIndex - 1;
    // 当前行已超均值且后续还有空箱子，则换行
    if (
      currentSize >= target &&
      remainingBins > 0 &&
      bins[binIndex].length > 0
    ) {
      binIndex += 1;
    }
    bins[binIndex].push(sentence);
  }
  // 兜底：把空箱子借用前一个箱子的最后一句
  for (let i = 1; i < count; i += 1) {
    if (bins[i].length === 0) {
      const donor = bins[i - 1];
      if (donor.length >= 2) {
        bins[i].push(donor.pop() as string);
      } else {
        bins[i].push(...donor.splice(0, donor.length));
      }
    }
  }
  return bins.filter((bin) => bin.length > 0);
}

/**
 * 把仿写结果分配为 count 张卡片内容：
 * 第 1 张封面 / 中间内容页 / 最后一张结尾页
 */
export function buildCardContents(
  result: RewriteResult,
  count: number,
  brandName: string,
): CardContent[] {
  const safeCount = Math.min(Math.max(Math.round(count), 3), 12);
  const titles = result.titles.filter((t) => t.trim().length > 0);
  const tags = result.tags.filter((t) => t.trim().length > 0);

  const paragraphs = splitParagraphs(result.body ?? '');
  const sentences = paragraphs.flatMap((p) => splitSentences(p));
  const sectionCount = safeCount - 2;
  const bins = packSentences(sentences, sectionCount);

  const contents: CardContent[] = [];

  // 封面
  contents.push({
    kind: 'cover',
    index: 0,
    total: safeCount,
    title: titles[0] ?? '好物分享',
    subtitle: brandName.trim() || '原创文案 · 图文卡片',
  });

  // 内容页
  bins.forEach((bin, i) => {
    const paragraph = bin.join('');
    contents.push({
      kind: 'section',
      index: i + 1,
      total: safeCount,
      sectionNo: i + 1,
      heading: extractHeading(paragraph),
      paragraph,
    });
  });

  // 结尾页
  contents.push({
    kind: 'end',
    index: safeCount - 1,
    total: safeCount,
    title: titles[1] ?? titles[0] ?? '觉得有用就点个赞吧',
    subtitle: brandName.trim() || '关注我，持续分享',
    tags: tags.slice(0, 8),
  });

  return contents;
}

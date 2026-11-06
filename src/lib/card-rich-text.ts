export type CardTextKind = 'heading' | 'subheading' | 'emphasis' | 'paragraph';
export interface CardTextBlock { kind: CardTextKind; text: string }
export const CARD_TEXT_SCALE = { heading: 1.12, subheading: 1.08, emphasis: 1 } as const;

/** Formatting is plain text plus a small, safe Markdown subset; never interpret HTML. */
export function plainCardText(text: string): string {
  return text.replace(/^#{1,6}\s+/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

/** Only explicit Markdown and short chapter labels establish a section heading. */
export function parseCardText(text: string): CardTextBlock[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.map(line => {
    const markdown = line.match(/^(#{1,6})\s+(.+)$/);
    if (markdown) return { kind: markdown[1].length >= 3 ? 'subheading' : 'heading', text: markdown[2] };
    if (/^\*\*[^*]+\*\*$/.test(line)) return { kind: 'emphasis', text: plainCardText(line) };
    const visible = plainCardText(line);
    const label = visible.replace(/^(?:[一二三四五六七八九十百]+[、.．）)]|[（(][一二三四五六七八九十百]+[）)]|第[一二三四五六七八九十百零\d]+(?:章|节|部分))\s*/, '');
    const chapterLabel = label !== visible;
    const shortLabel = label.length >= 2 && label.length <= 24 && !/[。！？!?；;]/.test(label);
    if (shortLabel && chapterLabel) {
      return { kind: 'heading', text: line };
    }
    if (visible.length >= 8 && visible.length <= 42 && /^(?:重点|记住|关键|核心|结论|提醒|送给|一句话|真正|不要|别再|先看|只有|好的机会)/.test(visible)) {
      return { kind: 'emphasis', text: line };
    }
    return { kind: 'paragraph', text: line };
  });
}

/** Carry inferred roles across pagination and decorative paper-block grouping. */
export function formatCardText(blocks: CardTextBlock[]): string {
  return blocks.map(block => block.kind === 'heading' ? `## ${block.text}` : block.kind === 'subheading' ? `### ${block.text}` : block.kind === 'emphasis' ? `**${plainCardText(block.text)}**` : block.text).join('\n\n');
}

export function prepareCardText(text: string): string {
  return formatCardText(parseCardText(text));
}

/** Keep section labels with their explanation inside one decorative paper panel. */
export function groupCardText(text: string): string[] {
  const groups: CardTextBlock[][] = [];
  for (const block of parseCardText(text)) {
    if (!groups.length || block.kind === 'heading' || block.kind === 'subheading' || block.kind === 'emphasis') groups.push([block]);
    else groups[groups.length - 1].push(block);
  }
  return groups.map(formatCardText);
}

/** Legacy HTML template adapters get the same hierarchy with escaped text only. */
export function cardTextToHtml(text: string): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
  const inline = (value: string) => escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:900">$1</strong>');
  return parseCardText(text).map(block => {
    const tag = block.kind === 'heading' ? 'h2' : block.kind === 'subheading' ? 'h3' : 'p';
    const style = block.kind === 'heading' ? `font-size:${CARD_TEXT_SCALE.heading}em;font-weight:900;line-height:1.3` : block.kind === 'subheading' ? `font-size:${CARD_TEXT_SCALE.subheading}em;font-weight:900;line-height:1.3` : block.kind === 'emphasis' ? 'font-size:1em;font-weight:900;line-height:1.5' : '';
    return `<${tag} data-text-role="${block.kind}" style="${style}">${inline(block.text)}</${tag}>`;
  }).join('');
}

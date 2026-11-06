import type { CSSProperties, ReactNode } from 'react';
import { CARD_TEXT_SCALE, parseCardText, plainCardText } from '@/lib/card-rich-text';

function inlineText(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => /^\*\*[^*]+\*\*$/.test(part)
    ? <strong key={index} style={{ fontWeight: 900 }}>{part.slice(2, -2)}</strong>
    : part);
}

/** Shared by visible cards and PNG exports; all dimensions are native card pixels. */
export function CardRichText({ text, title, style = {}, headingFont, accent, highlight, compact = false, nativeBody = false }: {
  text: string; title?: string; style?: CSSProperties; headingFont?: string; accent?: string; highlight?: string; compact?: boolean; nativeBody?: boolean;
}) {
  const blocks = parseCardText(text);
  const size = typeof style.fontSize === 'number' ? style.fontSize : 40;
  const base: CSSProperties = { margin: 0, fontSize: size, lineHeight: style.lineHeight ?? 1.5, fontFamily: style.fontFamily, fontWeight: style.fontWeight ?? 500, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', lineBreak: 'strict' };
  return <div data-card-rich-text="true" style={{ ...style, fontSize: size, display: 'flex', flexDirection: 'column', gap: compact ? 8 : 18, minWidth: 0, flexShrink: 0 }}>
    {title && <h2 data-text-role="title" style={{ ...base, fontFamily: headingFont ?? style.fontFamily, fontSize: size * CARD_TEXT_SCALE.heading, fontWeight: 900, lineHeight: 1.3, paddingTop: 8, paddingBottom: compact ? 4 : 10 }}>{plainCardText(title)}</h2>}
    {blocks.map((block, index) => {
      if (title && index === 0 && plainCardText(block.text) === plainCardText(title)) return null;
      const shared = { 'data-text-role': block.kind, 'data-native-body': nativeBody ? 'true' : undefined };
      const heading = block.kind === 'heading' || block.kind === 'subheading';
      if (heading) {
        const headingStyle: CSSProperties = { ...base, fontFamily: headingFont ?? style.fontFamily, fontSize: size * CARD_TEXT_SCALE[block.kind as 'heading' | 'subheading'], lineHeight: 1.3, fontWeight: 900, paddingTop: index ? compact ? 8 : 12 : 8, paddingBottom: compact ? 3 : 6 };
        const title = <span style={{ backgroundImage: highlight ? `linear-gradient(transparent 67%,${highlight} 67%,${highlight} 95%,transparent 95%)` : undefined, boxDecorationBreak: 'clone' }}>{inlineText(block.text)}</span>;
        return block.kind === 'heading' ? <h2 key={index} {...shared} style={headingStyle}>{title}</h2> : <h3 key={index} {...shared} style={headingStyle}>{title}</h3>;
      }
      if (block.kind === 'emphasis') return <p key={index} {...shared} style={{ ...base, fontSize: size, fontWeight: 900, padding: compact ? '5px 12px' : '12px 18px', borderLeft: accent ? `5px solid ${accent}` : undefined }}><span style={{ backgroundImage: highlight ? `linear-gradient(transparent 65%,${highlight} 65%,${highlight} 96%,transparent 96%)` : undefined, boxDecorationBreak: 'clone' }}>{inlineText(block.text)}</span></p>;
      return <p key={index} {...shared} style={base}>{inlineText(block.text)}</p>;
    })}
  </div>;
}

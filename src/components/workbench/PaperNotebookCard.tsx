import { CardRichText } from './CardRichText';
import { prepareCardText } from '@/lib/card-rich-text';
import type { CSSProperties } from 'react';
import type { CardContent } from '@/lib/types';
import { CARD_FONTS } from '@/lib/card-typography';

const GREEN = '#073d1d';
const YELLOW = '#f2c84b';
const FONT = CARD_FONTS.handwritten;

function paragraphGroups(text: string, count: number) {
  const paragraphs = text.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
  const limit = Math.max(1, Math.ceil(text.replace(/\s/g, '').length / count));
  const groups: string[][] = [[]];
  for (const paragraph of paragraphs) {
    const current = groups[groups.length - 1];
    if (current.join('').length >= limit && groups.length < count) groups.push([paragraph]);
    else current.push(paragraph);
  }
  return groups.filter(group => group.length).map(group => group.join('\n'));
}

export function PaperNotebookCard({ content, image, fontScale = 1 }: {
  content: CardContent; image?: string; fontScale?: number;
}) {
  const cover = content.kind === 'cover';
  const title = cover ? content.title ?? '' : content.heading ?? '';
  const rawText = cover ? content.subtitle ?? '' : content.paragraph ?? (content.tags ?? []).join(' · ');
  const sameAsTitle = rawText.replace(/[\s\p{P}]/gu, '') === title.replace(/[\s\p{P}]/gu, '');
  const text = sameAsTitle ? '' : prepareCardText(rawText);
  const length = text.replace(/\s/g, '').length;
  const dense = length > 280;
  const short = !image && length < 100;
  const relaxed = !image && length < 220;
  const imageHeight = length > 250 ? 320 : length > 170 ? 420 : length > 120 ? 520 : 650;
  const groups = paragraphGroups(text, dense ? 3 : image ? 3 : 5);
  const frame: CSSProperties = {
    position: 'relative', width: 1080, height: 1440, overflow: 'hidden',
    backgroundColor: '#f7efdb', color: GREEN, fontFamily: FONT, boxSizing: 'border-box',
  };
  // Natural Chinese line breaking avoids a punctuation mark stranded at a new line.
  const coverLines = title.split('\n');

  return <div style={frame} data-card-composition={cover ? 'cover' : short ? 'short' : 'body'}>
    <img src="/finished-six/paper-background.png" alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
    <div style={{ position: 'absolute', left: 108, top: 54, color: GREEN, fontSize: 40, fontWeight: 900, letterSpacing: 2 }}>财经学习手记</div>
    <div style={{ position: 'absolute', right: 65, top: 59, color: GREEN, fontSize: 25, fontWeight: 800, letterSpacing: 2 }}>{String(content.index + 1).padStart(2, '0')} / {String(content.total).padStart(2, '0')}</div>
    {cover ? <div style={{ position: 'absolute', top: image ? 170 : 250, bottom: 130, left: 108, right: 65, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 35, overflow: 'hidden' }}>
      <h1 style={{ fontFamily: CARD_FONTS.sans, fontSize: (image ? 110 : title.length > 28 ? 120 : 144) * fontScale, fontWeight: 900, lineHeight: 1.2, margin: 0, letterSpacing: -3, color: GREEN, flexShrink: 0 }}>
        {coverLines.map((line, index) => <span key={index} style={{ display: 'block', position: 'relative', marginBottom: 12, lineBreak: 'strict' }}><span style={{ padding: '0 8px', boxDecorationBreak: 'clone', backgroundImage: index % 2 === 0 ? `linear-gradient(transparent 55%,${YELLOW} 55%,${YELLOW} 90%,transparent 90%)` : undefined }}>{line}</span></span>)}
      </h1>
      {image && <img src={image} alt="完整原图素材" style={{ width: '100%', height: 400, objectFit: 'contain', flexShrink: 0 }} />}
      {text && <CardRichText style={{ margin: 0, fontSize: 42 * fontScale, fontWeight: 800, lineHeight: 1.4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', flexShrink: 0 }} text={text} accent={GREEN} highlight={YELLOW} headingFont={CARD_FONTS.sans} />}
      <div style={{ width: 260, height: 12, backgroundColor: YELLOW, borderRadius: '80% 20% 70% 20%', transform: 'rotate(-2deg)' }} />
    </div> : <div style={{ position: 'absolute', top: short ? 230 : 144, left: 108, right: 58, bottom: short ? 170 : 75, display: 'flex', flexDirection: 'column', justifyContent: relaxed ? 'center' : 'flex-start', gap: short ? 64 : relaxed ? 36 : dense ? 13 : 18, overflow: 'hidden' }}>
      {title && <div style={{ flexShrink: 0, paddingTop: 10, paddingBottom: 5 }}>
        <h2 style={{ fontFamily: CARD_FONTS.sans, fontSize: (short ? 64 : relaxed ? 50 : dense ? 36 : 42) * 1.12 * fontScale, fontWeight: 900, lineHeight: 1.3, margin: 0, color: GREEN, overflowWrap: 'anywhere', letterSpacing: 0 }}>{title}</h2>
        <div style={{ marginTop: short ? 24 : 9, height: short ? 20 : 10, width: '78%', backgroundColor: YELLOW, borderRadius: '60% 30% 50% 20%', transform: 'rotate(-1deg)' }} />
      </div>}
      {image && <img src={image} alt="完整原图素材" style={{ width: '100%', height: imageHeight, objectFit: 'contain', flexShrink: 0, margin: '2px 0 5px' }} />}
      {text && <div style={{ display: 'flex', flexDirection: 'column', gap: relaxed ? 24 : dense ? 10 : 14, flexShrink: 0 }}>
        {groups.map((group, index) => <div key={index} style={{ position: 'relative', marginLeft: 10, border: '2px solid #d9b951', backgroundColor: '#fff8e4d9', borderRadius: index % 2 === 0 ? '23px 18px 25px 21px' : '18px 25px 20px 24px', padding: dense ? '10px 18px 10px 23px' : '14px 20px 14px 25px' }}>
          {groups.length > 1 && <span style={{ position: 'absolute', top: dense ? 14 : 18, left: -23, width: 40, height: 40, border: `2px solid ${GREEN}`, borderRadius: 12, backgroundColor: '#f6d465', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, fontWeight: 900, transform: `rotate(${index % 2 === 0 ? -4 : 3}deg)` }}>{index + 1}</span>}
          <CardRichText style={{ margin: 0, fontSize: (short ? 64 : relaxed ? 50 : dense ? 36 : 42) * fontScale, fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: GREEN }} text={group} accent={GREEN} highlight={YELLOW} headingFont={CARD_FONTS.sans} />
        </div>)}
      </div>}
      {short && !!content.tags?.length && <div style={{display:'flex',flexWrap:'wrap',gap:16,marginTop:20}}>{content.tags.slice(0,4).map(tag=><span key={tag} style={{borderBottom:`3px solid ${GREEN}`,fontSize:30,padding:'12px 5px',fontWeight:700}}>#{tag.replace(/^#/, '')}</span>)}</div>}
    </div>}
    <div style={{ position: 'absolute', left: 110, right: 65, bottom: 38, display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 750, color: '#416345' }}><span>手写重点 · 慢慢读懂</span><span>学习笔记 / 仅供参考</span></div>
  </div>;
}

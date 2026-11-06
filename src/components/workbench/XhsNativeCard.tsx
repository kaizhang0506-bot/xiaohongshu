import type { CSSProperties, ReactNode } from 'react';
import type { CardContent } from '@/lib/types';
import type { NativeFamily } from '@/lib/xhs-native-types';
import { getNativeTemplate, NATIVE_TEMPLATES } from '@/lib/xhs-native-layouts';
import { CARD_FONTS } from '@/lib/card-typography';
import { CARD_TEXT_SCALE, prepareCardText, groupCardText } from '@/lib/card-rich-text';
import { CardRichText } from './CardRichText';
import { CoverImage, TitleImageCover } from './TitleImageCover';

const absolute = (style: CSSProperties): CSSProperties => ({ position: 'absolute', ...style });
const clean = (text: string) => text.replace(/[\s\p{P}]/gu, '');

/** Adjacent paragraphs share a paper block; retain their newlines and original order. */
function paragraphBlocks(text: string, maximum: number): string[] {
  const paragraphs = groupCardText(text);
  if (paragraphs.length <= maximum) return paragraphs;
  const blocks: string[][] = [];
  const target = paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0) / maximum;
  let current: string[] = [];
  let size = 0;
  paragraphs.forEach((paragraph, index) => {
    const remaining = paragraphs.length - index;
    const slots = maximum - blocks.length;
    if (current.length && slots > 1 && (size >= target || remaining === slots - 1)) {
      blocks.push(current);
      current = [];
      size = 0;
    }
    current.push(paragraph);
    size += paragraph.length;
  });
  if (current.length) blocks.push(current);
  return blocks.map(block => block.join('\n'));
}

/** Decorations stay in the outside margin; text and original images occupy a separate layer. */
function Decoration({ family }: { family: NativeFamily }) {
  const { decoration, accent, secondary, ink, paper } = family;
  let art: ReactNode;
  switch (decoration) {
    case 'rings':
      art = <>{Array.from({ length: 11 }, (_, i) => <span key={i} style={absolute({ left: -12, top: 110 + i * 112, width: 45, height: 17, border: `8px solid ${secondary}`, borderRadius: 20, background: ink })} />)}<div style={absolute({ top: 85, bottom: 75, left: 52, width: 2, background: accent, opacity: .35 })} /></>;
      break;
    case 'tape':
      art = <>{[0, 1, 2].map(i => <div key={i} style={absolute({ width: i === 1 ? 230 : 170, height: 43, top: i === 2 ? undefined : i === 0 ? 15 : 82, bottom: i === 2 ? 34 : undefined, left: i === 0 ? 105 : undefined, right: i === 0 ? undefined : 40, background: i === 1 ? secondary : accent, opacity: .55, transform: `rotate(${i % 2 ? 17 : -9}deg)`, borderLeft: `5px dotted ${paper}`, borderRight: `5px dotted ${paper}` })} />)}</>;
      break;
    case 'riso':
      art = <><div style={absolute({ right: -130, top: -120, width: 400, height: 400, borderRadius: '50%', background: accent, opacity: .2 })} /><div style={absolute({ left: -85, bottom: 25, width: 220, height: 220, border: `24px solid ${secondary}`, borderRadius: '50%', opacity: .4 })} /><svg width="160" height="240" style={absolute({ right: 10, bottom: 65 })}>{Array.from({ length: 54 }, (_, i) => <circle key={i} cx={12 + i % 6 * 26} cy={12 + Math.floor(i / 6) * 26} r={2 + Math.floor(i / 12)} fill={accent} opacity=".35" />)}</svg></>;
      break;
    case 'daisy':
      art = <>{[[1010, 100], [45, 1330]].map(([x, y], i) => <svg key={i} width="160" height="160" viewBox="0 0 160 160" style={absolute({ left: x - 80, top: y - 80 })}>{Array.from({ length: 8 }, (_, n) => <ellipse key={n} cx="80" cy="38" rx="15" ry="31" fill={secondary} transform={`rotate(${n * 45} 80 80)`} />)}<circle cx="80" cy="80" r="24" fill={accent} /></svg>)}</>;
      break;
    case 'grid':
      art = <><div style={absolute({ inset: 0, backgroundImage: `linear-gradient(${secondary} 1px,transparent 1px),linear-gradient(90deg,${secondary} 1px,transparent 1px)`, backgroundSize: '45px 45px', opacity: .22 })} />{[0, 1, 2].map(i => <span key={i} style={absolute({ right: 26, top: 240 + i * 400, fontSize: 58, color: accent, fontFamily: CARD_FONTS.sans, fontWeight: 400 })}>+</span>)}</>;
      break;
    case 'ribbon':
      art = <><div style={absolute({ left: 0, top: 88, width: 35, height: 700, background: secondary })} /><svg width="90" height="190" style={absolute({ right: 25, top: 0 })}><path d="M0 0H90V180L45 142 0 180Z" fill={accent} opacity=".45" /></svg><div style={absolute({ left: 28, right: 28, bottom: 87, height: 10, borderTop: `3px solid ${secondary}`, borderBottom: `1px solid ${secondary}` })} /></>;
      break;
    case 'stamp':
      art = <><svg width="165" height="140" viewBox="0 0 165 140" style={absolute({ right: 8, top: 70, transform: 'rotate(13deg)' })}><rect x="22" y="15" width="105" height="105" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="5 5" /><circle cx="75" cy="68" r="35" fill="none" stroke={accent} strokeWidth="3" /><path d="M0 50H150M0 65H150M0 80H150" stroke={accent} strokeWidth="2" opacity=".35" /></svg><div style={absolute({ left: 18, top: 180, bottom: 100, borderLeft: `4px dotted ${secondary}` })} /></>;
      break;
    case 'waves':
      art = <svg width="1080" height="170" viewBox="0 0 1080 170" style={absolute({ bottom: 0, left: 0 })}>{Array.from({ length: 5 }, (_, i) => <path key={i} d={`M-50 ${40 + i * 28} Q130 ${-15 + i * 28} 310 ${40 + i * 28} T670 ${40 + i * 28} T1110 ${40 + i * 28}`} fill="none" stroke={i % 2 ? secondary : accent} strokeWidth={i === 4 ? 13 : 3} opacity=".36" />)}</svg>;
      break;
    case 'dots':
      art = <>{[0, 1].map(side => <div key={side} style={absolute({ top: 140, bottom: 100, left: side ? undefined : 17, right: side ? 17 : undefined, width: 28, backgroundImage: `radial-gradient(${accent} 5px,transparent 6px)`, backgroundSize: '28px 50px', opacity: .6 })} />)}<div style={absolute({ right: 18, bottom: 28, width: 170, height: 48, borderRadius: 999, background: secondary, opacity: .3 })} /></>;
      break;
    case 'stitch':
      art = <><div style={absolute({ inset: 25, border: `3px dashed ${secondary}`, borderRadius: 30 })} /><div style={absolute({ inset: 36, border: `1px solid ${accent}`, borderRadius: 22, opacity: .35 })} /><svg width="80" height="80" style={absolute({ right: 26, bottom: 90 })}><path d="m10 10 50 50m-50 0 50-50" stroke={accent} strokeWidth="6" /></svg></>;
      break;
    case 'corners':
      art = <>{[0, 1, 2, 3].map(i => <div key={i} style={absolute({ left: i % 2 ? undefined : 24, right: i % 2 ? 24 : undefined, top: i < 2 ? 23 : undefined, bottom: i >= 2 ? 23 : undefined, width: 105, height: 90, borderTop: i < 2 ? `10px solid ${accent}` : undefined, borderBottom: i >= 2 ? `10px solid ${accent}` : undefined, borderLeft: i % 2 ? undefined : `10px solid ${accent}`, borderRight: i % 2 ? `10px solid ${accent}` : undefined })} />)}</>;
      break;
    case 'scallop':
      art = <>{[0, 1].map(side => <div key={side} style={absolute({ left: 0, right: 0, top: side ? undefined : -20, bottom: side ? -20 : undefined, height: 60, backgroundImage: `radial-gradient(circle at 30px 30px,${secondary} 25px,transparent 26px)`, backgroundSize: '60px 60px', opacity: .5 })} />)}<div style={absolute({ left: 25, right: 25, top: 42, height: 5, background: accent, opacity: .35 })} /></>;
      break;
    case 'brackets':
      art = <>{[0, 1].map(side => <div key={side} style={absolute({ top: 240, bottom: 200, left: side ? undefined : 24, right: side ? 24 : undefined, width: 25, borderTop: `7px solid ${accent}`, borderBottom: `7px solid ${accent}`, borderLeft: side ? undefined : `7px solid ${accent}`, borderRight: side ? `7px solid ${accent}` : undefined })} />)}</>;
      break;
    case 'sun':
      art = <svg width="230" height="230" viewBox="0 0 230 230" style={absolute({ right: -65, top: 20 })}><circle cx="115" cy="115" r="43" fill={accent} opacity=".45" />{Array.from({ length: 12 }, (_, i) => <path key={i} d="M115 28V55" stroke={secondary} strokeWidth="7" strokeLinecap="round" transform={`rotate(${i * 30} 115 115)`} />)}</svg>;
      break;
    case 'leaf':
      art = <svg width="130" height="440" viewBox="0 0 130 440" style={absolute({ right: -12, bottom: 40 })}><path d="M50 430Q92 230 62 10" stroke={accent} strokeWidth="4" fill="none" />{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${69 + i % 2 * 3} ${50 + i * 52}q${i % 2 ? -70 : 55} -55 ${i % 2 ? -45 : 40} 0q${i % 2 ? 10 : -15} 25 ${i % 2 ? 45 : -40} 22`} fill={secondary} opacity=".4" />)}</svg>;
      break;
    case 'calendar':
      art = <><div style={absolute({ left: 0, right: 0, top: 0, height: 29, background: accent })} />{Array.from({ length: 8 }, (_, i) => <div key={i} style={absolute({ left: 90 + i * 124, top: 15, width: 13, height: 44, borderRadius: 12, background: ink })} />)}<div style={absolute({ left: 25, bottom: 18, width: 160, height: 70, borderBottom: `5px solid ${secondary}`, borderLeft: `5px solid ${secondary}`, opacity: .6 })} /></>;
      break;
    case 'confetti':
      art = <>{Array.from({ length: 16 }, (_, i) => <div key={i} style={absolute({ left: i % 2 ? undefined : 14 + i % 3 * 9, right: i % 2 ? 12 + i % 3 * 8 : undefined, top: 150 + i * 72, width: i % 3 ? 13 : 24, height: i % 3 ? 31 : 13, background: i % 2 ? secondary : accent, transform: `rotate(${i * 31}deg)`, borderRadius: i % 4 === 0 ? 20 : 0, opacity: .7 })} />)}</>;
      break;
    case 'film':
      art = <>{[0, 1].map(side => <div key={side} style={absolute({ top: 0, bottom: 0, left: side ? undefined : 0, right: side ? 0 : undefined, width: 37, background: ink })}>{Array.from({ length: 24 }, (_, i) => <span key={i} style={absolute({ top: 14 + i * 60, left: 10, width: 17, height: 28, background: paper, borderRadius: 3 })} />)}</div>)}</>;
      break;
    case 'polaroid':
      art = <>{[0, 1].map(i => <div key={i} style={absolute({ left: i ? undefined : -50, right: i ? -40 : undefined, top: i ? undefined : 65, bottom: i ? 95 : undefined, width: 170, height: 170, border: `15px solid ${paper}`, borderBottomWidth: 40, background: secondary, boxShadow: `4px 7px 0 ${accent}`, transform: `rotate(${i ? 12 : -13}deg)`, opacity: .5 })} />)}</>;
      break;
    case 'brush':
      art = <>{[0, 1, 2].map(i => <svg key={i} width="290" height="45" viewBox="0 0 290 45" style={absolute({ right: i === 1 ? undefined : -70, left: i === 1 ? -75 : undefined, top: i < 2 ? 35 + i * 25 : undefined, bottom: i === 2 ? 50 : undefined, transform: `rotate(${i % 2 ? -8 : 4}deg)` })}><path d="m2 13 260-9 14 9-20 7 30 4-23 12L3 39 17 26Z" fill={i % 2 ? secondary : accent} opacity=".5" /></svg>)}</>;
      break;
  }
  return <div aria-hidden="true" style={absolute({ inset: 0, pointerEvents: 'none', overflow: 'hidden' })}>{art}</div>;
}

export function XhsNativeCard({ id, content, image, fontScale = 1 }: {
  id: string; content: CardContent; image?: string; fontScale?: number;
}) {
  const spec = getNativeTemplate(id) ?? NATIVE_TEMPLATES[0];
  const { family, composition } = spec;
  const { bg, paper, ink, accent, secondary } = family;
  const cover = content.kind === 'cover';
  const title = (cover ? content.title : content.heading) || '';
  if (cover) return <div data-native-template={spec.id} data-native-composition={composition} data-native-decoration={family.decoration} data-content-role="cover">
    <TitleImageCover title={title || '把重点记下来'} image={image} background={bg} ink={ink} accent={accent} secondary={secondary} paper={paper} fontFamily={CARD_FONTS[family.titleFont]} fontWeight={spec.titleWeight} fontScale={fontScale} align={spec.align} composition={composition} decoration={<Decoration family={family} />} />
  </div>;
  const raw = cover ? content.paragraph || content.subtitle || '' : content.paragraph || '';
  const text = clean(raw) === clean(title) ? '' : prepareCardText(raw);
  const length = text.replace(/\s/g, '').length;
  const short = !image && length < 110;
  const dense = length > 320 || (!!image && length > 0);
  const paragraphs = paragraphBlocks(text, dense ? composition === 'sidebar' ? 3 : 4 : length > 180 ? 6 : 8);
  const size = length > 600 ? 36 : dense ? 40 : length > 200 ? 44 : length > 110 ? 50 : length > 45 ? 58 : 70;
  const gap = dense ? 12 : short ? 34 : 24;
  const imageHeight = length > 350 ? 300 : length > 220 ? 370 : length ? 420 : 600;
  const heading: CSSProperties = { margin: 0, padding: dense ? '8px 0 4px' : '10px 0 8px', fontFamily: CARD_FONTS[family.titleFont], fontSize: size * CARD_TEXT_SCALE.heading * fontScale, fontWeight: spec.titleWeight, letterSpacing: 0, lineHeight: 1.3, overflowWrap: 'anywhere', lineBreak: 'strict', whiteSpace: 'pre-wrap', flexShrink: 0, color: ink };
  const sectionHeading = (style: CSSProperties = {}) => title ? <h2 data-text-role="title" style={{ ...heading, ...style }}>{title}</h2> : null;
  const body: CSSProperties = { margin: 0, padding: dense ? '2px 0 4px' : '6px 0 10px', fontFamily: CARD_FONTS[family.bodyFont], fontSize: size * fontScale, fontWeight: 500, lineHeight: 1.5, overflowWrap: 'anywhere', lineBreak: 'strict', whiteSpace: 'pre-wrap' };
  const column: CSSProperties = { display: 'flex', flexDirection: 'column', gap, minWidth: 0 };
  const viewport: CSSProperties = { position: 'absolute', left: 80, right: 80, top: 155, bottom: 112, padding: '26px 8px', boxSizing: 'border-box', overflow: 'hidden', ...column };
  const visual = (height = imageHeight) => image ? <div style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CoverImage key={image} src={image} alt="完整原图素材" /></div> : null;
  const tags = content.tags ?? [];
  const tagSize = tags.length > 10 ? 21 : tags.length > 5 || dense ? 24 : 27;
  const tagRow = tags.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: dense ? '4px 8px' : '6px 12px', paddingTop: dense ? 4 : 10, flexShrink: 0 }}>{tags.map((tag, i) => <p key={i} data-native-tag="true" style={{ margin: 0, fontFamily: CARD_FONTS.sans, fontSize: tagSize, lineHeight: 1.5, fontWeight: 600, borderBottom: `2px solid ${accent}`, padding: dense ? '3px 6px' : '5px 8px' }}>#{tag.replace(/^#/, '')}</p>)}</div> : null;
  const richText = (text: string, style: CSSProperties = body) => <CardRichText text={text} style={style} headingFont={CARD_FONTS[family.titleFont]} accent={accent} highlight={secondary} compact={dense} nativeBody />;
  const plainText = paragraphs.length ? <div style={{ ...column, gap: dense ? 6 : 20, flexShrink: 0 }}>{paragraphs.map((paragraph, i) => <div key={i}>{richText(paragraph)}</div>)}</div> : null;
  const numberedText = (check: boolean) => paragraphs.length ? <div style={{ ...column, gap: dense ? 8 : 20, flexShrink: 0 }}>{paragraphs.map((paragraph, i) => <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: dense ? 12 : 18, padding: dense ? '2px 12px' : '18px 23px', borderRadius: check ? 24 : 4, background: paper, border: check ? `2px solid ${secondary}` : undefined, borderLeft: check ? undefined : `5px solid ${accent}` }}><span aria-hidden="true" style={{ flexShrink: 0, marginTop: dense ? 6 : 14, width: dense ? 24 : 30, height: dense ? 25 : 30, fontFamily: CARD_FONTS.sans, fontSize: dense ? 21 : 23, fontWeight: 800, lineHeight: dense ? '25px' : '30px', textAlign: 'center', border: check ? `3px solid ${accent}` : undefined, borderRadius: check ? 7 : 0, color: ink }}>{check ? '✓' : String(i + 1).padStart(2, '0')}</span>{richText(paragraph, { ...body, flex: 1, minWidth: 0 })}</div>)}</div> : null;
  let main: ReactNode;
  switch (composition) {
    case 'headline':
      main = <div style={{ ...viewport, textAlign: spec.align, justifyContent: cover || short ? 'center' : 'flex-start', gap: cover ? 42 : gap }}>
        {title && <div style={{ position: 'relative', flexShrink: 0 }}>{sectionHeading()}<div style={{ width: '26%', height: 5, borderRadius: 20, background: accent, margin: spec.align === 'center' ? '6px auto' : '6px 0' }} /></div>}
        {visual()}{plainText}{tagRow}
      </div>;
      break;
    case 'sidebar':
      main = <><div style={absolute({ top: 140, bottom: 105, left: 62, width: 145, background: accent, borderRadius: '55px 7px 7px 7px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '35px 0', boxSizing: 'border-box' })}><span style={{ writingMode: 'vertical-rl', fontSize: 36, letterSpacing: 10, fontFamily: CARD_FONTS[family.titleFont], color: paper, fontWeight: 800 }}>阅读笔记</span><span style={{ fontSize: 64, color: paper, fontWeight: 900, fontFamily: CARD_FONTS.sans }}>{String(content.index + 1).padStart(2, '0')}</span></div>
        <div style={{ ...viewport, left: dense ? 225 : 247, right: dense ? 67 : 70, padding: dense ? '18px 6px' : viewport.padding, justifyContent: short || cover ? 'center' : 'flex-start' }}>{sectionHeading({ borderBottom: `3px solid ${accent}` })}{visual()}{numberedText(false)}{tagRow}</div></>;
      break;
    case 'collage':
      main = <div style={{ ...viewport, left: 87, right: 87, justifyContent: cover || short ? 'center' : 'flex-start', gap: dense ? 19 : 35 }}>
        {title && <div style={{ position: 'relative', background: paper, padding: dense ? '10px 28px' : '18px 31px', boxShadow: `13px 14px 0 ${secondary}`, borderRadius: '5px 23px 6px 13px', marginRight: 20, flexShrink: 0 }}><span aria-hidden="true" style={absolute({ left: 42, top: -16, width: 138, height: 34, background: accent, opacity: .65, transform: 'rotate(-5deg)' })} />{sectionHeading()}</div>}
        {image && <div style={{ marginLeft: 30, marginRight: 5, padding: 12, border: `3px solid ${secondary}`, borderBottomWidth: 15, flexShrink: 0 }}>{visual(imageHeight - 24)}</div>}
        {paragraphs.map((paragraph, i) => <div key={i} style={{ marginLeft: i % 2 ? 28 : 0, marginRight: i % 2 ? 0 : 28, padding: dense ? '5px 18px' : '18px 25px', background: paper, borderRadius: i % 2 ? '22px 4px 17px 4px' : '4px 17px 4px 20px', borderLeft: `6px solid ${i % 2 ? secondary : accent}`, boxShadow: `5px 6px 0 ${secondary}`, flexShrink: 0 }}>{richText(paragraph)}</div>)}{tagRow}
      </div>;
      break;
    case 'checklist':
      main = <div style={{ ...viewport, justifyContent: short || cover ? 'center' : 'flex-start', gap: dense ? 17 : 29 }}>
        {title && <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexShrink: 0 }}><span aria-hidden="true" style={{ flexShrink: 0, width: 48, height: 48, lineHeight: '48px', textAlign: 'center', fontSize: 32, marginTop: 8, color: paper, background: accent, borderRadius: 14 }}>✓</span>{sectionHeading({ flex: 1, minWidth: 0 })}</div>}
        {visual()}{numberedText(true)}{tagRow}
      </div>;
      break;
    case 'editorial':
      main = <div style={{ ...viewport, top: 148, gap: 24 }}>
        <div style={{ display: 'flex', gap: 17, alignItems: 'center', flexShrink: 0 }}><span style={{ fontFamily: CARD_FONTS[family.titleFont], fontSize: 76, color: accent, lineHeight: 1.3 }}>{String(content.index + 1).padStart(2, '0')}</span><div style={{ height: 3, background: ink, flex: 1 }} /><span style={{ fontSize: 24, fontFamily: CARD_FONTS.sans, letterSpacing: 5 }}>图文手记</span></div>
        {sectionHeading({ borderBottom: `4px double ${ink}`, paddingBottom: 12 })}<div style={{ display: 'grid', gridTemplateColumns: image ? '0.9fr 1.1fr' : '1fr', gap: 34, alignItems: short ? 'center' : 'start', flex: 1, minHeight: 0, paddingTop: 16 }}>
          {image && <div style={{ paddingRight: 16, borderRight: `2px solid ${secondary}`, alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}>{visual(Math.max(imageHeight, 580))}</div>}
          <div style={{ ...column, gap: dense ? 8 : 26, paddingTop: short ? 50 : 4 }}>{paragraphs.map((paragraph, i) => <div key={i}>{richText(paragraph, { ...body, fontSize: (image ? Math.min(size, 42) : size) * fontScale, paddingBottom: dense ? 5 : 22, borderBottom: `1px solid ${secondary}` })}</div>)}{tagRow}</div>
        </div>
      </div>;
      break;
  }
  return <div data-native-template={spec.id} data-native-composition={composition} data-native-decoration={family.decoration} data-content-role={content.kind} style={{ position: 'relative', width: 1080, height: 1440, overflow: 'hidden', boxSizing: 'border-box', background: bg, color: ink, fontFamily: CARD_FONTS[family.bodyFont] }}>
    <Decoration family={family} />
    <div style={absolute({ top: 57, left: 81, right: 80, display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', fontSize: 27, lineHeight: 1.5, fontFamily: CARD_FONTS.sans, fontWeight: 700 })}><span>{family.name} / 图文笔记</span><span>{String(content.index + 1).padStart(2, '0')} / {String(content.total).padStart(2, '0')}</span></div>
    {main}
    <div style={absolute({ bottom: 40, left: 82, right: 80, paddingTop: 13, borderTop: `2px solid ${secondary}`, display: 'flex', justifyContent: 'space-between', fontSize: 23, lineHeight: 1.5, fontFamily: CARD_FONTS.sans })}><span>{cover ? '向左滑动，继续阅读 →' : '把重点，慢慢读懂'}</span><span>原创图文 · {String(spec.number).padStart(3, '0')}</span></div>
  </div>;
}

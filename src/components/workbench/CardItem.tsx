'use client';

import { CardRichText } from './CardRichText';
import { cardTextToHtml } from '@/lib/card-rich-text';

import { getTemplateById } from '@/components/rednote-templates/registry';

import { useCardTextFit } from './useCardTextFit';
import { FiveStyleCard } from './FiveStyleCard';
import { StudioCard } from './StudioCard';
import { PaperNotebookCard } from './PaperNotebookCard';
import { XhsNativeCard } from './XhsNativeCard';
import { CoverImage, TitleImageCover } from './TitleImageCover';
import type { CardContent, CardLayoutId } from '@/lib/types';
import { CARD_LAYOUTS, getCardLayout, type LayoutDecor } from '@/lib/layouts';
import { CARD_FONTS } from '@/lib/card-typography';

const SANS = CARD_FONTS.sans;
const SERIF = CARD_FONTS.serif;
const MONO =
  `'JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'Courier New', ${CARD_FONTS.sans}`;

interface CardTheme {
  bg: string;
  fg: string;
  fgSoft: string;
  accent: string;
  accentSoft: string;
  sans: string;
  serif: string;
  /** 等宽字体（终端/像素等风格用，缺省回退无衬线） */
  mono?: string;
  noteColor: string;
  /** 标题字体（参数化模板用） */
  titleFamily?: string;
  /** 标题字重 */
  titleWeight?: number;
  /** 标题字距（px） */
  titleSpacing?: number;
  /** 标题斜体 */
  titleItalic?: boolean;
  /** 版式变体（0-3） */
  variant?: number;
  /** 卡片圆角（参数化模板用） */
  radius?: number;
  /** 装饰样式（参数化模板用） */
  decor?: LayoutDecor;
  /** 参数化版式：文本对齐 */
  align?: 'left' | 'center' | 'right';
  /** 参数化版式：封面标题垂直位置 */
  titlePos?: 'top' | 'mid' | 'bottom';
  /** 参数化版式：强调块位置 */
  accentStyle?: 'topbar' | 'leftblock' | 'sidebar' | 'cornerbox' | 'dotrow' | 'underline';
  /** 参数化版式：编号样式 */
  numberStyle?: 'ghost' | 'box' | 'pill' | 'outline' | 'none';
  /** 参数化版式：分隔线样式 */
  dividerStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  /** 参数化版式：整体构图（上下堆叠 / 左右分栏 / 顶部色带） */
  composition?: 'stack' | 'split' | 'bandtop';
  /** 全局字号缩放倍数 */
  fontScale?: number;
}

function themeOf(layout: CardLayoutId): CardTheme {
  const spec = getCardLayout(layout);
  return {
    bg: spec.bg,
    fg: spec.fg,
    fgSoft: spec.fgSoft,
    accent: spec.accent,
    accentSoft: spec.accentSoft,
    sans: SANS,
    serif: SERIF,
    mono: MONO,
    noteColor: spec.noteColor,
    titleFamily: spec.titleFont === 'serif' ? SERIF : spec.titleFont === 'mono' ? MONO : SANS,
    titleWeight: spec.titleWeight ?? 900,
    titleSpacing: spec.titleSpacing ?? 0,
    titleItalic: spec.titleStyle === 'italic',
    variant: spec.variant ?? 0,
    radius: spec.radius,
    decor: spec.decor,
    align: spec.align,
    titlePos: spec.titlePos,
    accentStyle: spec.accentStyle,
    numberStyle: spec.numberStyle,
    dividerStyle: spec.dividerStyle,
    composition: spec.composition,
  };
}

/** 手工调校的 16 套版式族：走各自独立渲染分支；其余走参数化渲染 */
const HANDCRAFTED: ReadonlySet<string> = new Set<string>([
  'minimal',
  'magazine',
  'journal',
  'pop',
  'dark',
  'polaroid',
  'terminal',
  'newspaper',
  'sakura',
  'mint',
  'blueprint',
  'sticky',
  'ink',
  'sunset',
  'taro',
  'pixel',
]);

function titleFontSize(title: string): number {
  const len = title.length;
  if (len <= 8) return 122;
  if (len <= 12) return 104;
  if (len <= 16) return 90;
  return 78;
}

function bodyFontSize(text: string, base: number): number {
  const len = text.length;
  if (len <= 90) return base;
  if (len <= 150) return base - 4;
  if (len <= 210) return base - 8;
  return base - 12;
}

function pageLabel(content: CardContent): string {
  return `${String(content.index + 1).padStart(2, '0')} / ${String(
    content.total,
  ).padStart(2, '0')}`;
}

/** 内容页收尾 tags 行：仅最后一张内容页（生成端附带 tags）渲染 */
function EndTagRow({ tags, theme }: { tags?: string[]; theme: CardTheme }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 26px', marginTop: 44, alignItems: 'center' }}>
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} style={{ fontSize: 24, fontWeight: 700, color: theme.fgSoft, letterSpacing: 1 }}>
          {`#${tag}`}
        </span>
      ))}
    </div>
  );
}

export interface CardItemProps {
  content: CardContent;
  layout: CardLayoutId;
  brandName?: string;
  /** AI 生成的配图（dataURL）：封面全幅铺底，内容页/结尾页走「上图下文」照片卡片 */
  image?: string;
  /** 从参考整屏截图裁出的原图表/图片，叠加到新文案卡片中 */
  referenceVisual?: string;
  editedPage?: string;
  /** 全局字号缩放到倍数（1 = 标准），用于调整文字占比 */
  fontScale?: number;
}

export function CardItem({ content, layout, brandName, image, referenceVisual, editedPage, fontScale = 1 }: CardItemProps) {
  const fitRef = useCardTextFit(JSON.stringify([content, layout, image, referenceVisual, editedPage, fontScale]), layout.startsWith('rednote-') ? fontScale : 1, content.kind);
  const spec = getCardLayout(layout);
  const theme = { ...themeOf(layout), fontScale };
  const family: CardLayoutId = spec.family;
  const generic = !HANDCRAFTED.has(spec.id);
  const visualIndex = Math.max(0, CARD_LAYOUTS.findIndex(item => item.id === spec.id));
  const pattern = visualIndex % 7;
  const paperTexture = pattern === 0 ? 'none' : pattern === 1 ? `repeating-linear-gradient(0deg, transparent 0 77px, ${theme.accentSoft} 78px 80px)` : pattern === 2 ? `radial-gradient(${theme.accentSoft} 3px, transparent 4px)` : pattern === 3 ? `linear-gradient(135deg, transparent 72%, ${theme.accentSoft} 72%)` : pattern === 4 ? `linear-gradient(90deg, transparent 49.7%, ${theme.accentSoft} 50%, transparent 50.3%)` : pattern === 5 ? `repeating-linear-gradient(135deg, transparent 0 38px, ${theme.accentSoft} 39px 41px)` : `radial-gradient(circle at 100% 0%, ${theme.accentSoft} 0 25%, transparent 25.2%)`;
  const brand = brandName?.trim() || '原创笔记';
  const note = 'AI 生成 · 仅供参考';
  /** 用户原图优先：保留了截图素材时一律用原图，不做任何 AI 重绘/美化 */
  const usingReference = !!referenceVisual;
  const effectiveImage = referenceVisual ?? image;

  const root: React.CSSProperties = {
    width: 1080,
    height: 1440,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.bg,
    backgroundImage: generic ? paperTexture : undefined,
    backgroundSize: pattern === 2 ? '48px 48px' : undefined,
    fontFamily: theme.sans,
    color: theme.fg,
    flexShrink: 0,
  };
  if (layout.startsWith('xhs-native-')) return <div ref={fitRef} style={{width:1080,height:1440}}><XhsNativeCard id={layout} content={content} image={effectiveImage} fontScale={fontScale}/></div>;
  if (content.kind === 'cover' && !spec.customTemplate) return <div ref={fitRef} style={{ width: 1080, height: 1440 }}>
    <TitleImageCover title={content.title || '把重点记下来'} image={effectiveImage} background={theme.bg} ink={theme.fg} accent={theme.accent} secondary={theme.accentSoft} paper={theme.bg} fontFamily={theme.titleFamily ?? theme.sans} fontWeight={theme.titleWeight} fontScale={fontScale} align={theme.align} backgroundStyle={{ backgroundImage: root.backgroundImage, backgroundSize: root.backgroundSize }} />
  </div>;
  if (layout.startsWith('xhs-five-')) return <div ref={fitRef} style={{width:1080,height:1440}}><FiveStyleCard content={content} image={effectiveImage} layout={layout} fontScale={fontScale}/></div>;
  if (layout === 'xhs-paper-notebook') return <div ref={fitRef} style={{width:1080,height:1440}}><PaperNotebookCard content={content} image={effectiveImage} fontScale={fontScale}/></div>;
  if (layout.startsWith('studio-')) return <div ref={fitRef} style={{width:1080,height:1440}}><StudioCard id={layout} content={content} image={effectiveImage} fontScale={fontScale}/></div>;

  if (spec.customTemplate) {
    const custom = spec.customTemplate;
    const title = content.kind === 'cover' ? content.title : content.kind === 'section' ? content.heading : '记住这几点';
    const text = content.kind === 'cover' ? '' : content.kind === 'section' ? content.paragraph : (content.tags ?? []).join(' · ');
    return <div ref={fitRef} style={{ ...root, backgroundColor: 'transparent', backgroundImage: `url("${custom.image}")`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', color: custom.color, fontFamily: custom.font === 'serif' ? SERIF : custom.font === 'mono' ? MONO : SANS }}>
      <div style={{ position: 'absolute', left: `${custom.x}%`, top: `${custom.y}%`, width: `${custom.width}%`, height: `${custom.height}%`, overflow: 'hidden', display: content.kind === 'cover' ? 'grid' : 'flex', gridTemplateRows: effectiveImage ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', flexDirection: 'column', gap: 28, textAlign: custom.align }}>
        {title && (content.kind === 'cover' ? <div style={{ minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}><h1 style={{ fontSize: 154 * fontScale, fontWeight: 900, lineHeight: 1.16, margin: 0, overflowWrap: 'anywhere', textWrap: 'balance', width: '100%' }}>{title}</h1></div> : <h1 style={{ fontSize: 64 * fontScale, fontWeight: 900, lineHeight: 1.3, margin: 0, overflowWrap: 'anywhere' }}>{title}</h1>)}
        {effectiveImage && (content.kind === 'cover' ? <div style={{ minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CoverImage key={effectiveImage} src={effectiveImage} boxWidth={custom.width * 10.8} boxHeight={Math.max(1, (custom.height * 14.4 - 28) / 2)} /></div> : <img src={effectiveImage} alt="原图素材" style={{ width: '100%', height: '38%', minHeight: 0, objectFit: 'contain', flexShrink: 0 }} />)}
        {text && <CardRichText style={{ fontSize: 44 * fontScale, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} text={text} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />}
      </div>
    </div>;
  }

  const rednoteTemplate = layout.startsWith('rednote-') ? getTemplateById(layout.slice(8)) : undefined;
  if (rednoteTemplate) {
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
    const text = content.kind === 'section' ? content.paragraph ?? '' : content.kind === 'cover' ? content.subtitle ?? '' : '';
    const title = content.kind === 'cover' ? content.title ?? '' : content.kind === 'section' ? content.heading ?? '' : '记住这几点';
    const templateImage = effectiveImage;
    const textHtml = cardTextToHtml(text);
    const safeContent = templateImage
      ? `<img alt="原图素材，完整保留" src="${escapeHtml(templateImage)}" style="display:block;width:100%;height:230px;object-fit:contain;margin:0 auto 12px;background:transparent;border:0;border-radius:0;padding:0" />${textHtml}`
      : textHtml;
    return <div ref={fitRef} style={root}><div className={`native-template native-${rednoteTemplate.id} native-${content.kind}`} style={{ width: 414, height: 552, transform: 'scale(2.6086956522)', transformOrigin: 'top left' }}>{rednoteTemplate.render({ title, content: safeContent, tags: content.tags ?? [], pageInfo: { current: content.index + 1, total: content.total }, listStartIndex: 1, totalCharCount: text.length })}</div></div>;
  }
  if (content.kind === 'cover') {
    return (
      <div ref={fitRef} style={root}>
        {usingReference ? (
          <ReferenceCover content={content} theme={theme} brand={brand} note={note} image={effectiveImage as string} />
        ) : effectiveImage ? (
          <PhotoCover content={content} theme={theme} brand={brand} note={note} image={effectiveImage} />
        ) : generic ? (
          <GenericCover content={content} theme={theme} brand={brand} note={note} />
        ) : (
          <Cover content={content} theme={theme} layout={family} brand={brand} note={note} />
        )}
      </div>
    );
  }
  if (content.kind === 'section') {
    return (
      <div ref={fitRef} style={root}>
        {usingReference ? (
          <ReferenceSection content={content} theme={theme} brand={brand} note={note} image={effectiveImage as string} />
        ) : effectiveImage ? (
          <PhotoSection content={content} theme={theme} brand={brand} note={note} image={effectiveImage} />
        ) : generic ? (
          <GenericSection content={content} theme={theme} brand={brand} note={note} />
        ) : (
          <Section content={content} theme={theme} layout={family} brand={brand} note={note} />
        )}
      </div>
    );
  }
  return (
    <div ref={fitRef} style={root}>
      {usingReference ? (
        <ReferenceEnd content={content} theme={theme} brand={brand} note={note} image={effectiveImage as string} />
      ) : effectiveImage ? (
        <PhotoEnd content={content} theme={theme} brand={brand} note={note} image={effectiveImage} />
      ) : generic ? (
        <GenericEnd content={content} theme={theme} brand={brand} note={note} />
      ) : (
        <End content={content} theme={theme} layout={family} brand={brand} note={note} />
      )}
    </div>
  );
}

/* ------------------------------ 封面 ------------------------------ */

/**
 * AI 配图封面：全幅插画 + 底部渐变压暗，白色标题。
 * 各排版模板共用此结构，仅强调色随主题变化，保证截图兼容（纯内联样式）。
 */
function PhotoCover({
  content,
  theme,
  brand,
  note,
  image,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
  image: string;
}) {
  const title = content.title ?? '好物分享';
  const subtitle = content.subtitle ?? '原创文案';
  const size = titleFontSize(title);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: theme.bg,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.08) 26%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.90) 100%)',
        }}
      />
      {/* 顶部品牌胶囊 */}
      <div style={{ position: 'absolute', top: 84, left: 90, right: 90 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 30px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.55)',
            backgroundColor: 'rgba(0,0,0,0.26)',
          }}
        >
          <div style={{ width: 18, height: 18, backgroundColor: theme.accent, borderRadius: 4 }} />
          <span style={{ fontSize: 26, letterSpacing: 6, color: '#FFFFFF', fontWeight: 500 }}>
            {brand}
          </span>
        </div>
      </div>
      {/* 底部标题区 */}
      <div style={{ position: 'absolute', left: 90, right: 90, bottom: 96 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 34 }}>
          <div style={{ width: 88, height: 12, backgroundColor: theme.accent }} />
          <span style={{ fontSize: 28, letterSpacing: 6, color: 'rgba(255,255,255,0.85)' }}>
            {subtitle}
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: size,
            fontWeight: theme.titleWeight ?? 900,
            lineHeight: 1.28,
            color: '#FFFFFF',
            textShadow: '0 4px 26px rgba(0,0,0,0.62)',
          }}
        >
          {title}
        </h1>
        <div
          style={{
            marginTop: 44,
            paddingTop: 28,
            borderTop: '1px solid rgba(255,255,255,0.32)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          <span>{note}</span>
          <span>{`01 / ${String(content.total).padStart(2, '0')}`}</span>
        </div>
      </div>
    </>
  );
}

/**
 * AI 配图内容页：上半幅实拍照片 + 下半幅主题色文字区。
 * 16 套排版共用的通用结构（仅取主题色），避免逐套改造 Section 布局；
 * 纯内联样式 + hex/rgb，html2canvas 截图兼容。
 */
function PhotoSection({
  content,
  theme,
  brand,
  note,
  image,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
  image: string;
}) {
  const paragraph = content.paragraph ?? '';
  const no = String(content.sectionNo ?? 1).padStart(2, '0');
  const size = bodyFontSize(paragraph, 34);

  return (
    <>
      {/* 顶部照片带 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 600,
          backgroundImage: `url("${image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: theme.bg,
        }}
      />
      {/* 照片 → 文字区的渐变过渡 */}
      <div
        style={{
          position: 'absolute',
          top: 460,
          left: 0,
          right: 0,
          height: 140,
          background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${theme.bg} 100%)`,
        }}
      />
      {/* 文字区 */}
      <div style={{ position: 'absolute', top: 620, left: 90, right: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span
            style={{
              backgroundColor: theme.accent,
              color: '#FFFFFF',
              fontSize: 26,
              fontWeight: 800,
              padding: '8px 22px',
              borderRadius: 999,
              letterSpacing: 2,
            }}
          >
            {`PART ${no}`}
          </span>
          <div style={{ flex: 1, height: 2, backgroundColor: theme.accentSoft }} />
        </div>
        <CardRichText style={{ margin: '36px 0 0', fontSize: size, lineHeight: 1.82, color: theme.fg }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
        <EndTagRow tags={content.tags} theme={theme} />
      </div>
      {/* 底部信息 */}
      <div style={{ position: 'absolute', bottom: 60, left: 90, right: 90 }}>
        <div style={{ height: 2, backgroundColor: theme.accentSoft, marginBottom: 20 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: theme.fgSoft }}>
          <span>{brand}</span>
          <span>{pageLabel(content)}</span>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
      </div>
    </>
  );
}

/**
 * AI 配图结尾页：上半幅照片 + 下半幅致谢与标签区（通用结构，取主题色）。
 */
function PhotoEnd({
  content,
  theme,
  brand,
  note,
  image,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
  image: string;
}) {
  const title = content.title ?? '觉得有用就点个赞吧';
  const subtitle = content.subtitle ?? '关注我，持续分享';
  const tags = content.tags ?? [];

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 560,
          backgroundImage: `url("${image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: theme.bg,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 420,
          left: 0,
          right: 0,
          height: 140,
          background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${theme.bg} 100%)`,
        }}
      />
      <div style={{ position: 'absolute', top: 600, left: 90, right: 90 }}>
        <p style={{ margin: 0, fontSize: 28, letterSpacing: 10, color: theme.accent, fontWeight: 700 }}>
          FIN ·
        </p>
        <h2
          style={{
            margin: '26px 0 0',
            fontSize: 68,
            fontWeight: theme.titleWeight ?? 900,
            lineHeight: 1.32,
            color: theme.fg,
          }}
        >
          {title}
        </h2>
        <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                border: `2px solid ${theme.accentSoft}`,
                borderRadius: 999,
                padding: '12px 28px',
                fontSize: 28,
                color: theme.fg,
              }}
            >
              {`#${tag}`}
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 60, left: 90, right: 90 }}>
        <div style={{ height: 2, backgroundColor: theme.accentSoft, marginBottom: 20 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: theme.fgSoft }}>
          <span>{subtitle}</span>
          <span>{pageLabel(content)}</span>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 18, color: theme.noteColor }}>
          {`${brand} · ${note}`}
        </p>
      </div>
    </>
  );
}

/* ------------------- 用户原始素材渲染（与原图保持一致） ------------------- */

/** 完整等比显示素材；透明留空，不添加白色衬纸或裁切图片边角。 */
function ReferenceFigure({
  image,
  height,
  top,
}: {
  image: string;
  height: number;
  top: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 70,
        right: 70,
        height,
        backgroundColor: 'transparent',
        backgroundImage: `url("${image}")`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        border: 0,
        borderRadius: 0,
      }}
    />
  );
}

/**
 * 用户素材封面：原图表完整展示在上部，底部主题色区承载新标题。
 * 不做 cover 裁切、不叠黑渐变，保证图表与原图一致。
 */
function ReferenceCover({
  content,
  theme,
  brand,
  note,
  image,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
  image: string;
}) {
  const title = content.title ?? '好物分享';
  const subtitle = content.subtitle ?? '原创文案';
  const size = titleFontSize(title);

  return (
    <>
      <ReferenceFigure image={image} top={70} height={760} />
      {/* 底部文字区（主题色背景） */}
      <div style={{ position: 'absolute', top: 880, left: 90, right: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 20, height: 20, backgroundColor: theme.accent, borderRadius: 5 }} />
          <span style={{ fontSize: 26, letterSpacing: 6, color: theme.fgSoft, fontWeight: 500 }}>
            {brand}
          </span>
        </div>
        <h1
          style={{
            margin: '34px 0 0',
            fontSize: size,
            fontWeight: theme.titleWeight ?? 900,
            lineHeight: 1.28,
            color: theme.fg,
          }}
        >
          {title}
        </h1>
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 88, height: 12, backgroundColor: theme.accent }} />
          <span style={{ fontSize: 28, letterSpacing: 6, color: theme.fgSoft }}>
            {subtitle}
          </span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 90, left: 90, right: 90 }}>
        <div
          style={{
            paddingTop: 28,
            borderTop: '1px solid rgba(26,24,20,0.14)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            color: theme.fgSoft,
          }}
        >
          <span>{note}</span>
          <span>{`01 / ${String(content.total).padStart(2, '0')}`}</span>
        </div>
      </div>
    </>
  );
}

/** 用户素材内容页：原图表完整展示 + 下部新文字（标题 + 正文） */
function ReferenceSection({
  content,
  theme,
  brand,
  note,
  image,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
  image: string;
}) {
  const paragraph = content.paragraph ?? '';
  const no = String(content.sectionNo ?? 1).padStart(2, '0');
  const size = bodyFontSize(paragraph, 32);

  return (
    <>
      <ReferenceFigure image={image} top={60} height={640} />
      {/* 文字区 */}
      <div style={{ position: 'absolute', top: 740, left: 90, right: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span
            style={{
              backgroundColor: theme.accent,
              color: '#FFFFFF',
              fontSize: 26,
              fontWeight: 800,
              padding: '8px 22px',
              borderRadius: 999,
              letterSpacing: 2,
            }}
          >
            {`PART ${no}`}
          </span>
          <div style={{ flex: 1, height: 2, backgroundColor: theme.accentSoft }} />
        </div>
        <CardRichText style={{ margin: '36px 0 0', fontSize: size, lineHeight: 1.78, color: theme.fg }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
        <EndTagRow tags={content.tags} theme={theme} />
      </div>
      {/* 底部信息 */}
      <div style={{ position: 'absolute', bottom: 60, left: 90, right: 90 }}>
        <div style={{ height: 2, backgroundColor: theme.accentSoft, marginBottom: 20 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: theme.fgSoft }}>
          <span>{brand}</span>
          <span>{pageLabel(content)}</span>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
      </div>
    </>
  );
}

/** 用户素材结尾页：原图表完整展示 + 下部致谢与标签 */
function ReferenceEnd({
  content,
  theme,
  brand,
  note,
  image,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
  image: string;
}) {
  const title = content.title ?? '觉得有用就点个赞吧';
  const subtitle = content.subtitle ?? '关注我，持续分享';
  const tags = content.tags ?? [];

  return (
    <>
      <ReferenceFigure image={image} top={60} height={560} />
      <div style={{ position: 'absolute', top: 660, left: 90, right: 90 }}>
        <p style={{ margin: 0, fontSize: 28, letterSpacing: 10, color: theme.accent, fontWeight: 700 }}>
          FIN ·
        </p>
        <h2
          style={{
            margin: '26px 0 0',
            fontSize: 68,
            fontWeight: theme.titleWeight ?? 900,
            lineHeight: 1.32,
            color: theme.fg,
          }}
        >
          {title}
        </h2>
        <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                border: `2px solid ${theme.accentSoft}`,
                borderRadius: 999,
                padding: '12px 28px',
                fontSize: 28,
                color: theme.fg,
              }}
            >
              {`#${tag}`}
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 60, left: 90, right: 90 }}>
        <div style={{ height: 2, backgroundColor: theme.accentSoft, marginBottom: 20 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: theme.fgSoft }}>
          <span>{subtitle}</span>
          <span>{pageLabel(content)}</span>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 18, color: theme.noteColor }}>
          {`${brand} · ${note}`}
        </p>
      </div>
    </>
  );
}

function Cover({
  content,
  theme,
  layout,
  brand,
  note,
}: {
  content: CardContent;
  theme: CardTheme;
  layout: CardLayoutId;
  brand: string;
  note: string;
}) {
  const title = content.title ?? '好物分享';
  const subtitle = content.subtitle ?? '原创文案';
  const size = titleFontSize(title);

  if (layout === 'minimal') {
    return (
      <>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 18, backgroundColor: theme.accent }} />
        <div style={{ position: 'absolute', top: 88, left: 100, right: 90, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 24, height: 24, backgroundColor: theme.accent }} />
          <span style={{ fontSize: 28, letterSpacing: 8, color: theme.fgSoft, fontWeight: 500 }}>{brand}</span>
        </div>
        <div style={{ position: 'absolute', top: 330, left: 100, right: 90 }}>
          <h1 style={{ margin: 0, fontSize: size, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.3, color: theme.fg }}>{title}</h1>
          <div style={{ marginTop: 46, width: 180, height: 10, backgroundColor: theme.accent }} />
        </div>
        <div style={{ position: 'absolute', left: 100, right: 90, bottom: 88 }}>
          <div style={{ height: 2, backgroundColor: 'rgba(17,17,17,0.12)', marginBottom: 30 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26, color: theme.fgSoft }}>
            <span>{subtitle}</span>
            <span>{`01 / ${String(content.total).padStart(2, '0')}`}</span>
          </div>
          <p style={{ margin: '18px 0 0', fontSize: 20, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'magazine') {
    return (
      <>
        <div style={{ position: 'absolute', inset: 46, border: `1px solid ${theme.accentSoft}`, borderStyle: 'solid', borderColor: 'rgba(160,131,72,0.5)' }} />
        <div style={{ position: 'absolute', top: 128, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 28, letterSpacing: 20, color: theme.accent, fontFamily: theme.serif }}>NOTES</p>
          <div style={{ margin: '26px auto 0', width: 120, height: 1, backgroundColor: theme.accent }} />
        </div>
        <div style={{ position: 'absolute', top: 420, left: 130, right: 130, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: size, fontWeight: 700, lineHeight: 1.45, color: theme.fg, fontFamily: theme.serif }}>{title}</h1>
        </div>
        <div style={{ position: 'absolute', top: 960, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 30, color: theme.fgSoft, fontFamily: theme.serif }}>{subtitle}</p>
        </div>
        <div style={{ position: 'absolute', bottom: 118, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ margin: '0 auto 14px', width: 300, height: 1, backgroundColor: 'rgba(160,131,72,0.6)' }} />
          <div style={{ margin: '0 auto 26px', width: 180, height: 3, backgroundColor: theme.accent }} />
          <p style={{ margin: 0, fontSize: 24, letterSpacing: 8, color: theme.fgSoft }}>{`${brand} · VOL.01`}</p>
          <p style={{ margin: '14px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'journal') {
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: 64,
            left: 390,
            width: 300,
            height: 58,
            backgroundColor: '#FCD5CE',
            transform: 'rotate(-4deg)',
            borderRadius: 8,
            opacity: 0.92,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 220,
            bottom: 250,
            left: 74,
            right: 74,
            backgroundColor: '#FFFFFF',
            borderRadius: 36,
            border: '3px dashed #E5B8B0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 66px',
          }}
        >
          <p style={{ margin: 0, fontSize: 26, letterSpacing: 10, color: theme.accent, fontWeight: 500 }}>· 手账笔记 ·</p>
          <h1 style={{ margin: '44px 0 0', fontSize: size - 14, fontWeight: 800, lineHeight: 1.5, color: theme.fg, textAlign: 'center' }}>{title}</h1>
          <div style={{ marginTop: 52, display: 'flex', gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: i === 1 ? theme.accent : '#FCE9C8' }} />
            ))}
          </div>
          <p style={{ margin: '40px 0 0', fontSize: 28, color: theme.fgSoft }}>{subtitle}</p>
        </div>
        <div style={{ position: 'absolute', bottom: 130, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 26, color: theme.fgSoft }}>{`${brand} · 01/${String(content.total).padStart(2, '0')}`}</p>
          <p style={{ margin: '14px 0 0', fontSize: 19, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'pop') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, backgroundColor: theme.fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 90px' }}>
          <span style={{ fontSize: 34, letterSpacing: 10, color: '#FFFFFF', fontWeight: 800 }}>{brand}</span>
          <span style={{ width: 34, height: 34, backgroundColor: theme.accent }} />
        </div>
        <div style={{ position: 'absolute', top: 380, left: 90, right: 90 }}>
          <h1 style={{ margin: 0, fontSize: size, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.28, color: theme.fg }}>{title}</h1>
          <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
            <div style={{ width: 200, height: 28, backgroundColor: theme.accent }} />
            <div style={{ width: 60, height: 28, backgroundColor: theme.fg }} />
          </div>
        </div>
        <div style={{ position: 'absolute', top: 1080, left: 90 }}>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: theme.fg }}>{subtitle}</p>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 150, backgroundColor: theme.fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 90px' }}>
          <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.8)' }}>{note}</span>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#FFD93D' }}>{`01 / ${String(content.total).padStart(2, '0')}`}</span>
        </div>
      </>
    );
  }

  if (layout === 'dark') {
    return (
      <>
        <div style={{ position: 'absolute', inset: 48, border: '1px solid rgba(201,169,106,0.45)' }} />
        <div style={{ position: 'absolute', top: 130, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 26, letterSpacing: 16, color: theme.accent }}>ORIGINAL NOTES</p>
          <div style={{ margin: '30px auto 0', width: 64, height: 1, backgroundColor: theme.accent }} />
        </div>
        <div style={{ position: 'absolute', top: 430, left: 150, right: 150, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: size - 6, fontWeight: 600, lineHeight: 1.5, color: theme.fg, fontFamily: theme.serif }}>{title}</h1>
          <div style={{ marginTop: 56, marginInline: 'auto', width: 180, height: 2, backgroundColor: theme.accent }} />
        </div>
        <div style={{ position: 'absolute', top: 980, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 30, color: theme.fgSoft, fontFamily: theme.serif }}>{subtitle}</p>
        </div>
        <div style={{ position: 'absolute', bottom: 118, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 24, letterSpacing: 6, color: theme.accent }}>{`${brand} · 01 / ${String(content.total).padStart(2, '0')}`}</p>
          <p style={{ margin: '14px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  return <CoverX content={content} theme={theme} layout={layout} brand={brand} note={note} />;
}

/* ------------------------------ 内容页 ------------------------------ */

function Section({
  content,
  theme,
  layout,
  brand,
  note,
}: {
  content: CardContent;
  theme: CardTheme;
  layout: CardLayoutId;
  brand: string;
  note: string;
}) {
  const paragraph = content.paragraph ?? '';
  const no = String(content.sectionNo ?? 1).padStart(2, '0');

  if (layout === 'minimal') {
    const size = bodyFontSize(paragraph, 40);
    return (
      <>
        <p style={{ position: 'absolute', top: 30, right: 70, margin: 0, fontSize: 250, fontWeight: theme.titleWeight ?? 900, color: 'rgba(17,17,17,0.06)', lineHeight: 1 }}>{no}</p>
        <div style={{ position: 'absolute', top: 210, left: 90, right: 90 }}>
          <CardRichText style={{ margin: 0, fontSize: size, lineHeight: 1.92, color: '#2E2B26' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
          <EndTagRow tags={content.tags} theme={theme} />
        </div>
        <div style={{ position: 'absolute', bottom: 88, left: 90, right: 90 }}>
          <div style={{ height: 2, backgroundColor: 'rgba(17,17,17,0.12)', marginBottom: 26 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: theme.fgSoft }}>
            <span>{brand}</span>
            <span>{pageLabel(content)}</span>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'magazine') {
    const size = bodyFontSize(paragraph, 38);
    return (
      <>
        <div style={{ position: 'absolute', top: 100, left: 110, right: 110, display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 40, color: theme.accent, fontFamily: theme.serif }}>{`No.${no}`}</span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(160,131,72,0.5)' }} />
        </div>
        <div style={{ position: 'absolute', top: 240, left: 110, right: 110 }}>
          <CardRichText style={{ margin: 0, fontSize: size, lineHeight: 2.05, color: '#2C2822', fontFamily: theme.serif, textAlign: 'justify' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
          <EndTagRow tags={content.tags} theme={theme} />
        </div>
        <div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 26, color: theme.fgSoft, fontFamily: theme.serif }}>{`— ${no} —`}</p>
          <p style={{ margin: '12px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'journal') {
    const size = bodyFontSize(paragraph, 38);
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: 120,
            right: 110,
            width: 180,
            height: 44,
            backgroundColor: '#FCE9C8',
            transform: 'rotate(5deg)',
            borderRadius: 8,
            opacity: 0.95,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 170,
            bottom: 180,
            left: 74,
            right: 74,
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            border: '3px dashed #E5B8B0',
            padding: '72px 62px',
          }}
        >
          <p style={{ margin: 0, fontSize: 26, letterSpacing: 6, color: theme.accent, fontWeight: 500 }}>{`NOTE ${no}`}</p>
          <div style={{ marginTop: 30, width: 100, borderBottom: '3px dashed #F3CFA9' }} />
          <CardRichText style={{ margin: '34px 0 0', fontSize: size, lineHeight: 2.0, color: '#5A4F44' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
          <EndTagRow tags={content.tags} theme={theme} />
        </div>
        <div style={{ position: 'absolute', bottom: 96, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 24, color: theme.fgSoft }}>{`♥ ${pageLabel(content)} · ${brand}`}</p>
          <p style={{ margin: '12px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'pop') {
    const size = bodyFontSize(paragraph, 40);
    return (
      <>
        <p style={{ position: 'absolute', top: 40, right: 80, margin: 0, fontSize: 210, fontWeight: theme.titleWeight ?? 900, color: theme.accent, lineHeight: 1 }}>{no}</p>
        <div
          style={{
            position: 'absolute',
            top: 300,
            left: 90,
            right: 90,
            bottom: 200,
            backgroundColor: '#FFFFFF',
            border: '6px solid #111111',
            padding: '56px 52px',
          }}
        >
          <CardRichText style={{ margin: 0, fontSize: size, lineHeight: 1.9, color: '#111111' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
          <EndTagRow tags={content.tags} theme={theme} />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: theme.fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 90px' }}>
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.82)' }}>{note}</span>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#FFD93D' }}>{`${pageLabel(content)} · ${brand}`}</span>
        </div>
      </>
    );
  }

  if (layout === 'dark') {
    const size = bodyFontSize(paragraph, 38);
    return (
      <>
        <div style={{ position: 'absolute', top: 96, left: 110 }}>
          <p style={{ margin: 0, fontSize: 150, color: theme.accent, fontFamily: theme.serif, lineHeight: 1 }}>{no}</p>
          <div style={{ marginTop: 18, width: 220, height: 1, backgroundColor: 'rgba(201,169,106,0.55)' }} />
        </div>
        <div style={{ position: 'absolute', top: 360, left: 110, right: 110 }}>
          <CardRichText style={{ margin: 0, fontSize: size, lineHeight: 2.0, color: 'rgba(242,237,227,0.88)', fontFamily: theme.serif, textAlign: 'justify' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
          <EndTagRow tags={content.tags} theme={theme} />
        </div>
        <div style={{ position: 'absolute', bottom: 96, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 24, letterSpacing: 4, color: theme.accent }}>{`${pageLabel(content)} · ${brand}`}</p>
          <p style={{ margin: '12px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  return <SectionX content={content} theme={theme} layout={layout} brand={brand} note={note} />;
}

/* ------------------------------ 结尾页 ------------------------------ */

function End({
  content,
  theme,
  layout,
  brand,
  note,
}: {
  content: CardContent;
  theme: CardTheme;
  layout: CardLayoutId;
  brand: string;
  note: string;
}) {
  const title = content.title ?? '觉得有用就点个赞吧';
  const subtitle = content.subtitle ?? '关注我，持续分享';
  const tags = content.tags ?? [];

  const tagStyle = (base: React.CSSProperties): React.CSSProperties => base;

  if (layout === 'minimal') {
    return (
      <>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 18, backgroundColor: theme.accent }} />
        <div style={{ position: 'absolute', top: 150, left: 100, right: 90 }}>
          <p style={{ margin: 0, fontSize: 30, color: theme.fgSoft, letterSpacing: 6 }}>FIN ·</p>
          <h2 style={{ margin: '34px 0 0', fontSize: 84, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.35, color: theme.fg }}>{title}</h2>
        </div>
        <div style={{ position: 'absolute', top: 520, left: 100, right: 90, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {tags.map((tag) => (
            <span key={tag} style={tagStyle({ display: 'inline-block', border: '2px solid rgba(17,17,17,0.16)', borderRadius: 999, padding: '16px 34px', fontSize: 32, color: theme.fg })}>{`#${tag}`}</span>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 88, left: 100, right: 90 }}>
          <div style={{ height: 2, backgroundColor: 'rgba(17,17,17,0.12)', marginBottom: 30 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: theme.fgSoft }}>
            <span>{subtitle}</span>
            <span>{pageLabel(content)}</span>
          </div>
          <p style={{ margin: '18px 0 0', fontSize: 20, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'magazine') {
    return (
      <>
        <div style={{ position: 'absolute', inset: 46, border: '1px solid rgba(160,131,72,0.5)' }} />
        <div style={{ position: 'absolute', top: 170, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 28, letterSpacing: 20, color: theme.accent, fontFamily: theme.serif }}>FIN</p>
          <h2 style={{ margin: '44px 0 0', fontSize: 76, fontWeight: 700, color: theme.fg, fontFamily: theme.serif, lineHeight: 1.4 }}>{title}</h2>
          <div style={{ margin: '48px auto 0', width: 120, height: 2, backgroundColor: theme.accent }} />
        </div>
        <div style={{ position: 'absolute', top: 620, left: 130, right: 130, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22 }}>
          {tags.map((tag) => (
            <span key={tag} style={tagStyle({ display: 'inline-block', border: '1px solid rgba(160,131,72,0.55)', borderRadius: 999, padding: '16px 36px', fontSize: 32, color: theme.fg, fontFamily: theme.serif })}>{`#${tag}`}</span>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 118, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 28, color: theme.fgSoft, fontFamily: theme.serif }}>{subtitle}</p>
          <p style={{ margin: '14px 0 0', fontSize: 22, color: theme.fgSoft }}>{`${brand} · ${pageLabel(content)}`}</p>
          <p style={{ margin: '14px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'journal') {
    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 390,
            width: 300,
            height: 58,
            backgroundColor: '#FCE9C8',
            transform: 'rotate(3deg)',
            borderRadius: 8,
            opacity: 0.92,
          }}
        />
        <div style={{ position: 'absolute', top: 200, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 26, letterSpacing: 8, color: theme.accent, fontWeight: 500 }}>· THE END ·</p>
          <h2 style={{ margin: '36px 0 0', fontSize: 74, fontWeight: 800, color: theme.fg, lineHeight: 1.4 }}>{title}</h2>
        </div>
        <div style={{ position: 'absolute', top: 560, left: 90, right: 90, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
          {tags.map((tag, i) => (
            <span
              key={tag}
              style={tagStyle({
                display: 'inline-block',
                backgroundColor: i % 2 === 0 ? '#FCD5CE' : '#FCE9C8',
                borderRadius: 999,
                padding: '18px 38px',
                fontSize: 34,
                color: theme.fg,
              })}
            >{`#${tag}`}</span>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 130, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 30, color: theme.fgSoft }}>{subtitle}</p>
          <p style={{ margin: '16px 0 0', fontSize: 24, color: theme.fgSoft }}>{`${pageLabel(content)} · ${brand}`}</p>
          <p style={{ margin: '14px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  if (layout === 'pop') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, backgroundColor: theme.fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 90px' }}>
          <span style={{ fontSize: 34, letterSpacing: 10, color: '#FFFFFF', fontWeight: 800 }}>{brand}</span>
          <span style={{ width: 34, height: 34, backgroundColor: theme.accent }} />
        </div>
        <div style={{ position: 'absolute', top: 300, left: 90, right: 90 }}>
          <span style={{ display: 'inline-block', backgroundColor: theme.accent, color: '#FFFFFF', fontSize: 64, fontWeight: theme.titleWeight ?? 900, padding: '18px 40px', lineHeight: 1.35 }}>{title}</span>
        </div>
        <div style={{ position: 'absolute', top: 640, left: 90, right: 90, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {tags.map((tag) => (
            <span key={tag} style={tagStyle({ display: 'inline-block', backgroundColor: theme.fg, color: '#FFD93D', borderRadius: 999, padding: '16px 34px', fontSize: 32, fontWeight: 700 })}>{`#${tag}`}</span>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 150, backgroundColor: theme.fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 90px' }}>
          <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.8)' }}>{note}</span>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#FFD93D' }}>{pageLabel(content)}</span>
        </div>
      </>
    );
  }

  if (layout === 'dark') {
    return (
      <>
        <div style={{ position: 'absolute', inset: 48, border: '1px solid rgba(201,169,106,0.45)' }} />
        <div style={{ position: 'absolute', top: 180, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 28, letterSpacing: 22, color: theme.accent, fontFamily: theme.serif }}>THANKS</p>
          <h2 style={{ margin: '52px 0 0', fontSize: 72, fontWeight: 600, color: theme.fg, fontFamily: theme.serif, lineHeight: 1.45 }}>{title}</h2>
          <div style={{ margin: '52px auto 0', width: 140, height: 1, backgroundColor: theme.accent }} />
        </div>
        <div style={{ position: 'absolute', top: 640, left: 130, right: 130, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22 }}>
          {tags.map((tag) => (
            <span key={tag} style={tagStyle({ display: 'inline-block', border: '1px solid rgba(201,169,106,0.6)', borderRadius: 999, padding: '16px 36px', fontSize: 30, color: theme.fg, fontFamily: theme.serif })}>{`#${tag}`}</span>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 118, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 28, color: theme.fgSoft, fontFamily: theme.serif }}>{subtitle}</p>
          <p style={{ margin: '16px 0 0', fontSize: 22, color: theme.fgSoft }}>{`${brand} · ${pageLabel(content)}`}</p>
          <p style={{ margin: '14px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
        </div>
      </>
    );
  }

  return <EndX content={content} theme={theme} layout={layout} brand={brand} note={note} />;
}

/* ---------------------- 扩展排版模板（11 套） ---------------------- */

type ExtLayout = Exclude<
  CardLayoutId,
  'minimal' | 'magazine' | 'journal' | 'pop' | 'dark'
>;

interface ExtProps {
  content: CardContent;
  theme: CardTheme;
  layout: ExtLayout;
  brand: string;
  note: string;
}

function CoverX({ content, theme, layout, brand, note }: ExtProps) {
  const title = content.title ?? '好物分享';
  const subtitle = content.subtitle ?? '原创文案';
  const size = titleFontSize(title);
  const total = String(content.total).padStart(2, '0');
  const mono = theme.mono ?? theme.sans;

  switch (layout) {
    case 'polaroid':
      return (
        <>
          <div style={{ position: 'absolute', top: 90, left: 100, right: 100, bottom: 330, backgroundColor: '#FFFFFF', borderRadius: 14, boxShadow: '0 18px 44px rgba(43,40,34,0.18)', padding: 26 }}>
            <div style={{ width: '100%', height: '100%', backgroundColor: '#F3EFE6', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ margin: 0, fontSize: 26, letterSpacing: 12, color: theme.fgSoft }}>{brand}</p>
              <h1 style={{ margin: '44px 0 0', fontSize: size - 12, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.42, color: theme.fg, textAlign: 'center', padding: '0 60px' }}>{title}</h1>
              <div style={{ marginTop: 50, display: 'flex', gap: 12 }}>
                {[theme.accent, '#2B2822', '#C9C2B2'].map((c, i) => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 130, left: 100, right: 100, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 34, color: theme.fg, fontFamily: theme.serif, fontStyle: 'italic' }}>{subtitle}</p>
            <p style={{ margin: '18px 0 0', fontSize: 21, color: theme.noteColor }}>{`${note} · 01 / ${total}`}</p>
          </div>
        </>
      );

    case 'terminal':
      return (
        <>
          <div style={{ position: 'absolute', top: 70, left: 90, right: 90, backgroundColor: '#171726', borderRadius: '16px 16px 0 0', border: '2px solid #262640', borderBottom: 'none', padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#FF5F56' }} />
            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#27C93F' }} />
            <span style={{ marginLeft: 14, fontSize: 22, color: 'rgba(215,245,221,0.5)', fontFamily: mono }}>{`${brand}@notes:~`}</span>
          </div>
          <div style={{ position: 'absolute', top: 140, left: 90, right: 90, bottom: 220, backgroundColor: '#10101B', border: '2px solid #262640', borderRadius: '0 0 16px 16px', padding: '48px 44px' }}>
            <p style={{ margin: 0, fontSize: 26, color: theme.accent, fontFamily: mono }}>{'$ cat note.txt'}</p>
            <h1 style={{ margin: '32px 0 0', fontSize: size - 20, fontWeight: 700, lineHeight: 1.5, color: theme.fg, fontFamily: mono }}>{title}</h1>
            <p style={{ margin: '36px 0 0', fontSize: 26, color: 'rgba(215,245,221,0.72)', fontFamily: mono }}>{`// ${subtitle}`}</p>
            <p style={{ margin: '30px 0 0', fontSize: 24, color: theme.accent, fontFamily: mono }}>$ _</p>
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, color: 'rgba(215,245,221,0.5)', fontFamily: mono }}>{`${note} · 01 / ${total}`}</p>
          </div>
        </>
      );

    case 'newspaper':
      return (
        <>
          <div style={{ position: 'absolute', top: 84, left: 90, right: 90, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 56, fontWeight: theme.titleWeight ?? 900, letterSpacing: 16, color: theme.fg, fontFamily: theme.serif }}>{brand}</p>
            <div style={{ marginTop: 22, borderTop: `4px solid ${theme.fg}`, borderBottom: `1px solid ${theme.fg}`, height: 7 }} />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 22, color: theme.fgSoft, fontFamily: theme.serif }}>
              <span>{subtitle}</span>
              <span>{'原创笔记 · 第 1 版'}</span>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 470, left: 90, right: 90 }}>
            <h1 style={{ margin: 0, fontSize: size - 4, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.42, color: theme.fg, fontFamily: theme.serif, textAlign: 'center' }}>{title}</h1>
            <div style={{ marginTop: 44, marginInline: 'auto', width: 120, height: 8, backgroundColor: theme.accent }} />
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 90, right: 90 }}>
            <div style={{ borderTop: `1px solid ${theme.fg}`, borderBottom: `4px solid ${theme.fg}`, height: 6, marginBottom: 26 }} />
            <p style={{ margin: 0, textAlign: 'center', fontSize: 22, color: theme.noteColor, fontFamily: theme.serif }}>{`${note} · 01 / ${total}`}</p>
          </div>
        </>
      );

    case 'sakura':
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FFE9F2 0%, #FFD6E6 62%, #FFC7DD 100%)' }} />
          <div style={{ position: 'absolute', top: 130, left: 110, right: 110, bottom: 270, backgroundColor: '#FFFFFF', borderRadius: 48, boxShadow: '0 24px 60px rgba(255,95,151,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 60px' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 44 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: i % 2 === 0 ? theme.accent : '#FFD6E6' }} />
              ))}
            </div>
            <h1 style={{ margin: 0, fontSize: size - 8, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.4, color: theme.fg, textAlign: 'center' }}>{title}</h1>
            <div style={{ marginTop: 46, width: 64, height: 8, borderRadius: 999, backgroundColor: theme.accent }} />
            <p style={{ margin: '40px 0 0', fontSize: 28, color: theme.fgSoft }}>{subtitle}</p>
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 26, color: theme.fg }}>{`♥ ${brand} · 01 / ${total}`}</p>
            <p style={{ margin: '12px 0 0', fontSize: 19, color: theme.noteColor }}>{note}</p>
          </div>
        </>
      );

    case 'mint':
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #E9FAF1 0%, #DCF3E8 100%)' }} />
          <div style={{ position: 'absolute', top: 96, left: 96, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50% 50% 50% 6px', backgroundColor: theme.accent }} />
            <span style={{ fontSize: 28, letterSpacing: 8, color: theme.fgSoft, fontWeight: 700 }}>{brand}</span>
          </div>
          <div style={{ position: 'absolute', top: 300, left: 96, right: 96 }}>
            <h1 style={{ margin: 0, fontSize: size, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.36, color: theme.fg }}>{title}</h1>
            <div style={{ marginTop: 40, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 120, height: 12, borderRadius: 999, backgroundColor: theme.accent }} />
              <div style={{ width: 36, height: 12, borderRadius: 999, backgroundColor: '#B7E8D2' }} />
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 220, left: 96, right: 96, backgroundColor: '#FFFFFF', borderRadius: 36, padding: '44px 48px', boxShadow: '0 20px 50px rgba(15,163,107,0.16)' }}>
            <p style={{ margin: 0, fontSize: 30, color: theme.fg, fontWeight: 700 }}>{subtitle}</p>
            <p style={{ margin: '18px 0 0', fontSize: 22, color: theme.fgSoft }}>{note}</p>
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 24, color: theme.fgSoft }}>{`01 / ${total}`}</p>
          </div>
        </>
      );

    case 'blueprint':
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(234,243,255,0.07) 0px, rgba(234,243,255,0.07) 1px, transparent 1px, transparent 64px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(234,243,255,0.07) 0px, rgba(234,243,255,0.07) 1px, transparent 1px, transparent 64px)' }} />
          <div style={{ position: 'absolute', inset: 56, border: '3px solid rgba(234,243,255,0.85)', borderRadius: 4 }} />
          <div style={{ position: 'absolute', inset: 74, border: '1px solid rgba(234,243,255,0.4)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', top: 130, left: 112, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 28, height: 28, border: '2px solid #FFD447' }} />
            <span style={{ fontSize: 26, letterSpacing: 8, color: theme.accent, fontWeight: 700 }}>{`${brand} · PLAN`}</span>
          </div>
          <div style={{ position: 'absolute', top: 430, left: 112, right: 112 }}>
            <h1 style={{ margin: 0, fontSize: size - 6, fontWeight: 800, lineHeight: 1.45, color: theme.fg }}>{title}</h1>
            <div style={{ marginTop: 46, display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 160, height: 4, backgroundColor: theme.accent }} />
              <span style={{ fontSize: 24, color: 'rgba(234,243,255,0.6)' }}>{`FIG.01 / ${total}`}</span>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 130, left: 112, right: 112 }}>
            <p style={{ margin: 0, fontSize: 28, color: 'rgba(234,243,255,0.75)' }}>{subtitle}</p>
            <p style={{ margin: '16px 0 0', fontSize: 20, color: theme.noteColor }}>{note}</p>
          </div>
        </>
      );

    case 'sticky':
      return (
        <>
          <div style={{ position: 'absolute', top: 150, left: 110, right: 110, bottom: 250, backgroundColor: '#FFF3A8', transform: 'rotate(-1.6deg)', borderRadius: 10, boxShadow: '0 22px 46px rgba(61,53,36,0.2)', padding: '70px 64px' }}>
            <p style={{ margin: 0, fontSize: 30, color: '#8A7B3A', fontFamily: theme.serif, fontStyle: 'italic' }}>{`To-do · ${subtitle}`}</p>
            <h1 style={{ margin: '44px 0 0', fontSize: size - 12, fontWeight: 800, lineHeight: 1.45, color: theme.fg, fontFamily: theme.serif }}>{title}</h1>
            <div style={{ marginTop: 50, borderBottom: '3px dashed rgba(61,53,36,0.25)' }} />
            <p style={{ margin: '32px 0 0', fontSize: 26, color: theme.fgSoft, fontFamily: theme.serif }}>{brand}</p>
          </div>
          <div style={{ position: 'absolute', top: 118, left: 480, width: 150, height: 52, backgroundColor: 'rgba(255,255,255,0.55)', transform: 'rotate(-4deg)', border: '1px solid rgba(255,255,255,0.7)' }} />
          <div style={{ position: 'absolute', bottom: 130, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 26, color: theme.fgSoft, fontFamily: theme.serif }}>{`01 / ${total} · ${note}`}</p>
          </div>
        </>
      );

    case 'ink':
      return (
        <>
          <div style={{ position: 'absolute', top: 110, right: 110, width: 92, height: 92, backgroundColor: theme.accent, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 44, color: '#FFF6EC', fontWeight: 700 }}>{'记'}</span>
          </div>
          <div style={{ position: 'absolute', top: 150, left: 110 }}>
            <p style={{ margin: 0, fontSize: 30, letterSpacing: 14, color: theme.fgSoft, fontFamily: theme.serif }}>{brand}</p>
          </div>
          <div style={{ position: 'absolute', top: 700, left: 110, right: 130 }}>
            <h1 style={{ margin: 0, fontSize: size - 6, fontWeight: 700, lineHeight: 1.55, color: theme.fg, fontFamily: theme.serif }}>{title}</h1>
            <div style={{ marginTop: 46, width: 100, height: 2, backgroundColor: theme.fg }} />
            <p style={{ margin: '40px 0 0', fontSize: 28, color: theme.fgSoft, fontFamily: theme.serif }}>{subtitle}</p>
          </div>
          <div style={{ position: 'absolute', bottom: 120, right: 110 }}>
            <p style={{ margin: 0, fontSize: 20, color: theme.noteColor, fontFamily: theme.serif, textAlign: 'right' }}>{`${note} · 01 / ${total}`}</p>
          </div>
        </>
      );

    case 'sunset':
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FF9A5A 0%, #E85A68 52%, #8A3060 100%)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 40, width: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ width: 20, height: 34, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.16)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 40, width: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ width: 20, height: 34, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.16)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 170, left: 120, right: 120 }}>
            <p style={{ margin: 0, fontSize: 28, letterSpacing: 10, color: 'rgba(255,255,255,0.82)' }}>{`SUNSET · ${brand}`}</p>
          </div>
          <div style={{ position: 'absolute', top: 450, left: 120, right: 120 }}>
            <h1 style={{ margin: 0, fontSize: size, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.35, color: '#FFFFFF', textShadow: '0 4px 24px rgba(90,20,50,0.45)' }}>{title}</h1>
            <div style={{ marginTop: 44, width: 150, height: 10, borderRadius: 999, backgroundColor: theme.accent }} />
            <p style={{ margin: '38px 0 0', fontSize: 30, color: 'rgba(255,255,255,0.85)' }}>{subtitle}</p>
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 120, right: 120, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: 'rgba(255,255,255,0.7)' }}>
            <span>{note}</span>
            <span>{`01 / ${total}`}</span>
          </div>
        </>
      );

    case 'taro':
      return (
        <>
          <div style={{ position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ display: 'inline-block', padding: '14px 36px', borderRadius: 999, backgroundColor: '#FFFFFF', fontSize: 26, letterSpacing: 6, color: theme.accent, fontWeight: 700 }}>{brand}</span>
          </div>
          <div style={{ position: 'absolute', top: 320, left: 100, right: 100, backgroundColor: '#FFFFFF', borderRadius: 56, padding: '90px 70px', boxShadow: '0 26px 60px rgba(126,87,194,0.2)' }}>
            <h1 style={{ margin: 0, fontSize: size - 6, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.42, color: theme.fg, textAlign: 'center' }}>{title}</h1>
            <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 16 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: i === 1 ? theme.accent : '#EBDDF8' }} />
              ))}
            </div>
            <p style={{ margin: '44px 0 0', fontSize: 30, color: theme.fgSoft, textAlign: 'center' }}>{subtitle}</p>
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 25, color: theme.fgSoft }}>{`${note} · 01 / ${total}`}</p>
          </div>
        </>
      );

    case 'pixel': {
      const teal = '#4ECDC4';
      return (
        <>
          <div style={{ position: 'absolute', inset: 70, border: `10px solid ${theme.accent}` }} />
          <div style={{ position: 'absolute', inset: 104, border: `4px solid ${teal}` }} />
          <div style={{ position: 'absolute', top: 132, left: 132, display: 'flex', flexWrap: 'wrap', gap: 6, width: 50 }}>
            {[theme.accent, teal, teal, theme.accent].map((col, i) => (
              <div key={i} style={{ width: 22, height: 22, backgroundColor: col }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 220, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 30, letterSpacing: 12, color: teal, fontWeight: 800 }}>{`PLAYER: ${brand}`}</p>
          </div>
          <div style={{ position: 'absolute', top: 480, left: 150, right: 150, textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: size - 4, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.4, color: theme.fg, textShadow: '6px 6px 0 rgba(78,205,196,0.35)' }}>{title}</h1>
          </div>
          <div style={{ position: 'absolute', top: 1010, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ display: 'inline-block', backgroundColor: theme.accent, color: '#141428', fontSize: 34, fontWeight: theme.titleWeight ?? 900, padding: '14px 34px' }}>{subtitle}</span>
          </div>
          <div style={{ position: 'absolute', bottom: 140, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 24, color: theme.noteColor }}>{`PRESS START · ${note} · 01 / ${total}`}</p>
          </div>
        </>
      );
    }
  }
}

function SectionX({ content, theme, layout, brand, note }: ExtProps) {
  const paragraph = content.paragraph ?? '';
  const no = String(content.sectionNo ?? 1).padStart(2, '0');
  const mono = theme.mono ?? theme.sans;

  switch (layout) {
    case 'polaroid': {
      const size = bodyFontSize(paragraph, 38);
      return (
        <>
          <div style={{ position: 'absolute', top: 90, left: 100, right: 100, bottom: 230, backgroundColor: '#FFFFFF', borderRadius: 14, boxShadow: '0 18px 44px rgba(43,40,34,0.16)', padding: '64px 56px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontSize: 26, color: '#FFFFFF', backgroundColor: theme.accent, borderRadius: 999, padding: '10px 24px', fontWeight: 700 }}>{`PHOTO ${no}`}</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(43,40,34,0.14)' }} />
            </div>
            <CardRichText style={{ margin: '40px 0 0', fontSize: size, lineHeight: 1.95, color: '#3D382F' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 24, color: theme.fgSoft, fontFamily: theme.serif, fontStyle: 'italic' }}>{`${brand} · ${pageLabel(content)}`}</p>
            <p style={{ margin: '10px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
          </div>
        </>
      );
    }

    case 'terminal': {
      const size = bodyFontSize(paragraph, 36);
      return (
        <>
          <div style={{ position: 'absolute', top: 70, left: 90, right: 90, bottom: 200, backgroundColor: '#10101B', border: '2px solid #262640', borderRadius: 16, padding: '44px 42px' }}>
            <p style={{ margin: 0, fontSize: 24, color: theme.accent, fontFamily: mono }}>{`$ grep "part-${no}" note.txt`}</p>
            <div style={{ marginTop: 32, height: 2, backgroundColor: 'rgba(61,220,132,0.3)' }} />
            <CardRichText style={{ margin: '32px 0 0', fontSize: size, lineHeight: 1.95, color: 'rgba(215,245,221,0.85)', fontFamily: mono }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
            <p style={{ margin: '30px 0 0', fontSize: 24, color: theme.accent, fontFamily: mono }}>$ _</p>
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, color: 'rgba(215,245,221,0.5)', fontFamily: mono }}>{`${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );
    }

    case 'newspaper': {
      const size = bodyFontSize(paragraph, 37);
      return (
        <>
          <div style={{ position: 'absolute', top: 90, left: 90, right: 90 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: `4px solid ${theme.fg}`, paddingTop: 18 }}>
              <span style={{ fontSize: 34, color: theme.accent, fontFamily: theme.serif, fontWeight: 700 }}>{`第 ${no} 版`}</span>
              <span style={{ fontSize: 22, color: theme.fgSoft, fontFamily: theme.serif }}>{brand}</span>
            </div>
            <div style={{ marginTop: 34, width: 100, height: 6, backgroundColor: theme.accent }} />
            <CardRichText style={{ margin: '36px 0 0', fontSize: size, lineHeight: 2.0, color: '#2E2818', fontFamily: theme.serif, textAlign: 'justify' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 100, left: 90, right: 90 }}>
            <div style={{ borderTop: `1px solid ${theme.fg}`, borderBottom: `4px solid ${theme.fg}`, height: 6, marginBottom: 22 }} />
            <p style={{ margin: 0, textAlign: 'center', fontSize: 21, color: theme.noteColor, fontFamily: theme.serif }}>{`${note} · ${pageLabel(content)}`}</p>
          </div>
        </>
      );
    }

    case 'sakura': {
      const size = bodyFontSize(paragraph, 38);
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FFE9F2 0%, #FFD6E6 62%, #FFC7DD 100%)' }} />
          <div style={{ position: 'absolute', top: 100, left: 100, right: 100, bottom: 220, backgroundColor: '#FFFFFF', borderRadius: 44, padding: '70px 60px', boxShadow: '0 24px 60px rgba(255,95,151,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 30, color: theme.accent, fontWeight: 900 }}>{'♥'}</span>
              <span style={{ fontSize: 27, color: theme.fgSoft, letterSpacing: 4 }}>{`NOTE ${no}`}</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,95,151,0.3)' }} />
            </div>
            <CardRichText style={{ margin: '40px 0 0', fontSize: size, lineHeight: 2.0, color: '#5C3A4C' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 24, color: theme.fg }}>{`${brand} · ${pageLabel(content)}`}</p>
            <p style={{ margin: '10px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
          </div>
        </>
      );
    }

    case 'mint': {
      const size = bodyFontSize(paragraph, 38);
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #E9FAF1 0%, #DCF3E8 100%)' }} />
          <div style={{ position: 'absolute', top: 100, left: 96, right: 96, bottom: 220, backgroundColor: '#FFFFFF', borderRadius: 40, padding: '64px 58px', boxShadow: '0 20px 50px rgba(15,163,107,0.14)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50% 50% 50% 6px', backgroundColor: theme.accent }} />
              <span style={{ fontSize: 26, color: theme.accent, fontWeight: 700, letterSpacing: 4 }}>{`PART ${no}`}</span>
            </div>
            <CardRichText style={{ margin: '44px 0 0', fontSize: size, lineHeight: 2.0, color: '#1E4237' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 24, color: theme.fgSoft }}>{`${brand} · ${pageLabel(content)}`}</p>
            <p style={{ margin: '10px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
          </div>
        </>
      );
    }

    case 'blueprint': {
      const size = bodyFontSize(paragraph, 37);
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(234,243,255,0.07) 0px, rgba(234,243,255,0.07) 1px, transparent 1px, transparent 64px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(234,243,255,0.07) 0px, rgba(234,243,255,0.07) 1px, transparent 1px, transparent 64px)' }} />
          <div style={{ position: 'absolute', inset: 56, border: '3px solid rgba(234,243,255,0.85)', borderRadius: 4 }} />
          <div style={{ position: 'absolute', top: 120, left: 112, right: 112 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 22, height: 22, border: '2px solid #FFD447' }} />
              <span style={{ fontSize: 26, color: theme.accent, fontWeight: 700, letterSpacing: 4 }}>{`FIG.${no} / ${String(content.total).padStart(2, '0')}`}</span>
            </div>
            <div style={{ marginTop: 36, width: 140, height: 3, backgroundColor: theme.accent }} />
            <CardRichText style={{ margin: '36px 0 0', fontSize: size, lineHeight: 2.0, color: 'rgba(234,243,255,0.9)', textAlign: 'justify' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 112, right: 112, display: 'flex', justifyContent: 'space-between', fontSize: 22, color: theme.noteColor }}>
            <span>{`${brand} · ${pageLabel(content)}`}</span>
            <span>{note}</span>
          </div>
        </>
      );
    }

    case 'sticky': {
      const size = bodyFontSize(paragraph, 38);
      return (
        <>
          <div style={{ position: 'absolute', top: 110, left: 100, right: 100, bottom: 220, backgroundColor: '#FFF3A8', transform: 'rotate(-1.2deg)', borderRadius: 10, boxShadow: '0 22px 46px rgba(61,53,36,0.2)', padding: '64px 58px' }}>
            <p style={{ margin: 0, fontSize: 26, color: '#8A7B3A', fontFamily: theme.serif, fontStyle: 'italic' }}>{`Step ${no} · ${brand}`}</p>
            <div style={{ marginTop: 36, borderBottom: '3px dashed rgba(61,53,36,0.22)' }} />
            <CardRichText style={{ margin: '32px 0 0', fontSize: size, lineHeight: 2.0, color: '#4A4128', fontFamily: theme.serif }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', top: 78, left: 470, width: 140, height: 48, backgroundColor: 'rgba(255,255,255,0.55)', transform: 'rotate(-4deg)', border: '1px solid rgba(255,255,255,0.7)' }} />
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 24, color: theme.fgSoft, fontFamily: theme.serif }}>{`${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );
    }

    case 'ink': {
      const size = bodyFontSize(paragraph, 38);
      return (
        <>
          <p style={{ position: 'absolute', top: 60, right: 100, margin: 0, fontSize: 260, fontWeight: 700, color: 'rgba(38,34,26,0.05)', lineHeight: 1, fontFamily: theme.serif }}>{no}</p>
          <div style={{ position: 'absolute', top: 170, left: 110 }}>
            <p style={{ margin: 0, fontSize: 28, letterSpacing: 10, color: theme.accent, fontFamily: theme.serif }}>{`${brand} · 其${no}`}</p>
            <div style={{ marginTop: 26, width: 90, height: 2, backgroundColor: theme.accent }} />
          </div>
          <div style={{ position: 'absolute', top: 350, left: 110, right: 130 }}>
            <CardRichText style={{ margin: 0, fontSize: size, lineHeight: 2.1, color: '#38332A', fontFamily: theme.serif, textAlign: 'justify' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 110, right: 110 }}>
            <p style={{ margin: 0, fontSize: 20, color: theme.noteColor, fontFamily: theme.serif, textAlign: 'right' }}>{`${note} · ${pageLabel(content)}`}</p>
          </div>
        </>
      );
    }

    case 'sunset': {
      const size = bodyFontSize(paragraph, 38);
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FF9A5A 0%, #E85A68 52%, #8A3060 100%)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 40, width: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ width: 20, height: 34, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.16)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 40, width: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ width: 20, height: 34, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.16)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 110, left: 120, right: 120, bottom: 210, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 36, padding: '64px 56px' }}>
            <p style={{ margin: 0, fontSize: 26, letterSpacing: 8, color: '#C2495D', fontWeight: 700 }}>{`REEL ${no}`}</p>
            <CardRichText style={{ margin: '44px 0 0', fontSize: size, lineHeight: 2.0, color: '#6B3D50' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 120, right: 120, display: 'flex', justifyContent: 'space-between', fontSize: 22, color: 'rgba(255,255,255,0.72)' }}>
            <span>{`${brand} · ${note}`}</span>
            <span>{pageLabel(content)}</span>
          </div>
        </>
      );
    }

    case 'taro': {
      const size = bodyFontSize(paragraph, 38);
      return (
        <>
          <div style={{ position: 'absolute', top: 100, left: 100, right: 100, bottom: 220, backgroundColor: '#FFFFFF', borderRadius: 48, padding: '70px 62px', boxShadow: '0 24px 55px rgba(126,87,194,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 26, color: '#FFFFFF', fontWeight: 800 }}>{no}</span>
              </div>
              <div style={{ flex: 1, height: 2, backgroundColor: '#EBDDF8', borderRadius: 999 }} />
            </div>
            <CardRichText style={{ margin: '48px 0 0', fontSize: size, lineHeight: 2.0, color: '#4C3F6E' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 24, color: theme.fgSoft }}>{`${brand} · ${pageLabel(content)}`}</p>
            <p style={{ margin: '10px 0 0', fontSize: 18, color: theme.noteColor }}>{note}</p>
          </div>
        </>
      );
    }

    case 'pixel': {
      const size = bodyFontSize(paragraph, 38);
      const teal = '#4ECDC4';
      return (
        <>
          <div style={{ position: 'absolute', inset: 70, border: `10px solid ${theme.accent}` }} />
          <div style={{ position: 'absolute', inset: 104, border: `4px solid ${teal}` }} />
          <div style={{ position: 'absolute', top: 130, left: 130, display: 'flex', flexWrap: 'wrap', gap: 6, width: 50 }}>
            {[theme.accent, teal, teal, theme.accent].map((col, i) => (
              <div key={i} style={{ width: 22, height: 22, backgroundColor: col }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 210, left: 150, right: 150 }}>
            <span style={{ display: 'inline-block', backgroundColor: teal, color: '#141428', fontSize: 28, fontWeight: theme.titleWeight ?? 900, padding: '8px 22px' }}>{`STAGE ${no}`}</span>
          </div>
          <div style={{ position: 'absolute', top: 380, left: 150, right: 150, bottom: 200, border: `4px solid ${theme.accent}`, padding: '40px 38px' }}>
            <CardRichText style={{ margin: 0, fontSize: size, lineHeight: 1.95, color: theme.fg }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
            <EndTagRow tags={content.tags} theme={theme} />
          </div>
          <div style={{ position: 'absolute', bottom: 135, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, color: theme.noteColor }}>{`${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );
    }
  }
}

function EndX({ content, theme, layout, brand, note }: ExtProps) {
  const title = content.title ?? '觉得有用就点个赞吧';
  const subtitle = content.subtitle ?? '关注我，持续分享';
  const tags = content.tags ?? [];
  const mono = theme.mono ?? theme.sans;

  const renderTags = (style: React.CSSProperties): React.ReactNode =>
    tags.map((tag) => (
      <span key={tag} style={{ display: 'inline-block', ...style }}>{`#${tag}`}</span>
    ));

  switch (layout) {
    case 'polaroid':
      return (
        <>
          <div style={{ position: 'absolute', top: 150, left: 100, right: 100, bottom: 300, backgroundColor: '#FFFFFF', borderRadius: 14, boxShadow: '0 18px 44px rgba(43,40,34,0.16)', padding: 26 }}>
            <div style={{ width: '100%', height: '100%', backgroundColor: '#F3EFE6', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 56px' }}>
              <p style={{ margin: 0, fontSize: 26, letterSpacing: 10, color: theme.accent, fontWeight: 700 }}>{'THE END'}</p>
              <h2 style={{ margin: '40px 0 0', fontSize: 72, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.4, color: theme.fg, textAlign: 'center' }}>{title}</h2>
              <p style={{ margin: '36px 0 0', fontSize: 28, color: theme.fgSoft, fontFamily: theme.serif, fontStyle: 'italic' }}>{subtitle}</p>
              <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
                {renderTags({ border: '2px solid rgba(43,40,34,0.18)', borderRadius: 999, padding: '12px 26px', fontSize: 26, color: theme.fg, fontFamily: theme.serif, fontStyle: 'italic' })}
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 130, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, color: theme.noteColor, fontFamily: theme.serif, fontStyle: 'italic' }}>{`${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );

    case 'terminal':
      return (
        <>
          <div style={{ position: 'absolute', top: 100, left: 90, right: 90, bottom: 240, backgroundColor: '#10101B', border: '2px solid #262640', borderRadius: 16, padding: '48px 44px' }}>
            <p style={{ margin: 0, fontSize: 26, color: theme.accent, fontFamily: mono }}>{'$ cat thanks.txt'}</p>
            <h2 style={{ margin: '36px 0 0', fontSize: 68, fontWeight: 700, color: theme.fg, fontFamily: mono, lineHeight: 1.45 }}>{title}</h2>
            <p style={{ margin: '32px 0 0', fontSize: 26, color: 'rgba(215,245,221,0.72)', fontFamily: mono }}>{`// ${subtitle}`}</p>
            <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {renderTags({ border: `1px solid ${theme.accent}`, borderRadius: 6, padding: '10px 20px', fontSize: 24, color: theme.accent, fontFamily: mono })}
            </div>
            <p style={{ margin: '40px 0 0', fontSize: 24, color: theme.accent, fontFamily: mono }}>{'$ exit 0 _'}</p>
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, color: 'rgba(215,245,221,0.5)', fontFamily: mono }}>{`${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );

    case 'newspaper':
      return (
        <>
          <div style={{ position: 'absolute', top: 120, left: 90, right: 90, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 30, letterSpacing: 22, color: theme.accent, fontFamily: theme.serif }}>{'FIN · 完'}</p>
            <div style={{ marginTop: 26, marginInline: 'auto', width: 200, height: 4, backgroundColor: theme.fg }} />
            <h2 style={{ margin: '56px 0 0', fontSize: 74, fontWeight: theme.titleWeight ?? 900, color: theme.fg, fontFamily: theme.serif, lineHeight: 1.4 }}>{title}</h2>
          </div>
          <div style={{ position: 'absolute', top: 600, left: 120, right: 120, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18 }}>
            {renderTags({ border: '1px solid rgba(23,18,8,0.45)', padding: '14px 30px', fontSize: 28, color: theme.fg, fontFamily: theme.serif })}
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 90, right: 90 }}>
            <div style={{ borderTop: `1px solid ${theme.fg}`, borderBottom: `4px solid ${theme.fg}`, height: 6, marginBottom: 22 }} />
            <p style={{ margin: 0, textAlign: 'center', fontSize: 24, color: theme.fgSoft, fontFamily: theme.serif }}>{`${subtitle} · ${brand} · ${pageLabel(content)}`}</p>
            <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 19, color: theme.noteColor, fontFamily: theme.serif }}>{note}</p>
          </div>
        </>
      );

    case 'sakura':
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FFE9F2 0%, #FFD6E6 62%, #FFC7DD 100%)' }} />
          <div style={{ position: 'absolute', top: 150, left: 110, right: 110, bottom: 240, backgroundColor: '#FFFFFF', borderRadius: 48, boxShadow: '0 24px 60px rgba(255,95,151,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 50px' }}>
            <p style={{ margin: 0, fontSize: 28, color: theme.accent, fontWeight: 900 }}>{'♥ THE END ♥'}</p>
            <h2 style={{ margin: '40px 0 0', fontSize: 70, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.4, color: theme.fg, textAlign: 'center' }}>{title}</h2>
            <p style={{ margin: '32px 0 0', fontSize: 27, color: theme.fgSoft }}>{subtitle}</p>
            <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
              {renderTags({ backgroundColor: '#FFDCE9', borderRadius: 999, padding: '14px 30px', fontSize: 27, color: theme.fg })}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 23, color: theme.noteColor }}>{`${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );

    case 'mint':
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #E9FAF1 0%, #DCF3E8 100%)' }} />
          <div style={{ position: 'absolute', top: 150, left: 96, right: 96, bottom: 240, backgroundColor: '#FFFFFF', borderRadius: 44, padding: '80px 60px', boxShadow: '0 20px 50px rgba(15,163,107,0.16)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50% 50% 50% 6px', backgroundColor: theme.accent, marginBottom: 40 }} />
            <h2 style={{ margin: 0, fontSize: 70, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.4, color: theme.fg, textAlign: 'center' }}>{title}</h2>
            <p style={{ margin: '32px 0 0', fontSize: 28, color: theme.fgSoft }}>{subtitle}</p>
            <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
              {renderTags({ backgroundColor: '#E0F5EB', borderRadius: 999, padding: '14px 30px', fontSize: 27, color: theme.fg })}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 23, color: theme.noteColor }}>{`${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );

    case 'blueprint':
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(234,243,255,0.07) 0px, rgba(234,243,255,0.07) 1px, transparent 1px, transparent 64px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(234,243,255,0.07) 0px, rgba(234,243,255,0.07) 1px, transparent 1px, transparent 64px)' }} />
          <div style={{ position: 'absolute', inset: 56, border: '3px solid rgba(234,243,255,0.85)', borderRadius: 4 }} />
          <div style={{ position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 28, letterSpacing: 14, color: theme.accent, fontWeight: 700 }}>{'PROJECT END'}</p>
            <h2 style={{ margin: '48px 0 0', fontSize: 68, fontWeight: 800, lineHeight: 1.45, color: theme.fg }}>{title}</h2>
            <div style={{ marginTop: 40, marginInline: 'auto', width: 150, height: 4, backgroundColor: theme.accent }} />
            <p style={{ margin: '36px 0 0', fontSize: 28, color: 'rgba(234,243,255,0.75)' }}>{subtitle}</p>
          </div>
          <div style={{ position: 'absolute', top: 660, left: 130, right: 130, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            {renderTags({ border: '2px solid rgba(255,212,71,0.7)', padding: '14px 30px', fontSize: 27, color: theme.fg })}
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, color: theme.noteColor }}>{`${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );

    case 'sticky':
      return (
        <>
          <div style={{ position: 'absolute', top: 130, left: 100, right: 100, bottom: 240, backgroundColor: '#FFF3A8', transform: 'rotate(-1.4deg)', borderRadius: 10, boxShadow: '0 22px 46px rgba(61,53,36,0.2)', padding: '70px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ margin: 0, fontSize: 28, color: '#8A7B3A', fontFamily: theme.serif, fontStyle: 'italic' }}>{'DONE! · 全部写完啦'}</p>
            <h2 style={{ margin: '42px 0 0', fontSize: 66, fontWeight: 800, lineHeight: 1.45, color: theme.fg, fontFamily: theme.serif, textAlign: 'center' }}>{title}</h2>
            <div style={{ marginTop: 44, width: 200, borderBottom: '3px dashed rgba(61,53,36,0.25)' }} />
            <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
              {renderTags({ border: '2px dashed rgba(61,53,36,0.35)', borderRadius: 999, padding: '12px 26px', fontSize: 26, color: theme.fg, fontFamily: theme.serif })}
            </div>
            <p style={{ margin: '40px 0 0', fontSize: 26, color: theme.fgSoft, fontFamily: theme.serif }}>{`${subtitle} · ${brand}`}</p>
          </div>
          <div style={{ position: 'absolute', top: 96, left: 470, width: 140, height: 48, backgroundColor: 'rgba(255,255,255,0.55)', transform: 'rotate(-4deg)', border: '1px solid rgba(255,255,255,0.7)' }} />
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, color: theme.noteColor, fontFamily: theme.serif }}>{`${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );

    case 'ink':
      return (
        <>
          <div style={{ position: 'absolute', top: 110, right: 110, width: 92, height: 92, backgroundColor: theme.accent, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 44, color: '#FFF6EC', fontWeight: 700 }}>{'记'}</span>
          </div>
          <div style={{ position: 'absolute', top: 160, left: 110 }}>
            <p style={{ margin: 0, fontSize: 30, letterSpacing: 14, color: theme.fgSoft, fontFamily: theme.serif }}>{brand}</p>
          </div>
          <div style={{ position: 'absolute', top: 520, left: 110, right: 130, textAlign: 'left' }}>
            <h2 style={{ margin: 0, fontSize: 66, fontWeight: 700, lineHeight: 1.5, color: theme.fg, fontFamily: theme.serif }}>{title}</h2>
            <div style={{ marginTop: 44, width: 90, height: 2, backgroundColor: theme.accent }} />
            <p style={{ margin: '36px 0 0', fontSize: 28, color: theme.fgSoft, fontFamily: theme.serif }}>{subtitle}</p>
          </div>
          <div style={{ position: 'absolute', top: 900, left: 110, right: 110, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {renderTags({ border: '1px solid rgba(38,34,26,0.3)', padding: '12px 26px', fontSize: 25, color: theme.fg, fontFamily: theme.serif })}
          </div>
          <div style={{ position: 'absolute', bottom: 120, right: 110 }}>
            <p style={{ margin: 0, fontSize: 20, color: theme.noteColor, fontFamily: theme.serif, textAlign: 'right' }}>{`${note} · ${pageLabel(content)}`}</p>
          </div>
        </>
      );

    case 'sunset':
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #FF9A5A 0%, #E85A68 52%, #8A3060 100%)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 40, width: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ width: 20, height: 34, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.16)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 40, width: 26, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ width: 20, height: 34, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.16)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', top: 220, left: 120, right: 120, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 28, letterSpacing: 14, color: theme.accent }}>{'REEL END'}</p>
            <h2 style={{ margin: '44px 0 0', fontSize: 72, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.4, color: '#FFFFFF', textShadow: '0 4px 24px rgba(90,20,50,0.45)' }}>{title}</h2>
            <p style={{ margin: '34px 0 0', fontSize: 28, color: 'rgba(255,255,255,0.85)' }}>{subtitle}</p>
          </div>
          <div style={{ position: 'absolute', top: 800, left: 120, right: 120, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            {renderTags({ backgroundColor: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 999, padding: '14px 30px', fontSize: 27, color: '#FFFFFF' })}
          </div>
          <div style={{ position: 'absolute', bottom: 120, left: 120, right: 120, display: 'flex', justifyContent: 'space-between', fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>
            <span>{`${brand} · ${note}`}</span>
            <span>{pageLabel(content)}</span>
          </div>
        </>
      );

    case 'taro':
      return (
        <>
          <div style={{ position: 'absolute', top: 150, left: 100, right: 100, bottom: 240, backgroundColor: '#FFFFFF', borderRadius: 56, padding: '80px 70px', boxShadow: '0 26px 60px rgba(126,87,194,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 40 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: i === 1 ? theme.accent : '#EBDDF8' }} />
              ))}
            </div>
            <h2 style={{ margin: 0, fontSize: 68, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.42, color: theme.fg, textAlign: 'center' }}>{title}</h2>
            <p style={{ margin: '32px 0 0', fontSize: 28, color: theme.fgSoft }}>{subtitle}</p>
            <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
              {renderTags({ backgroundColor: '#F0E9FA', borderRadius: 999, padding: '14px 30px', fontSize: 27, color: theme.fg })}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 23, color: theme.noteColor }}>{`${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );

    case 'pixel': {
      const teal = '#4ECDC4';
      return (
        <>
          <div style={{ position: 'absolute', inset: 70, border: `10px solid ${theme.accent}` }} />
          <div style={{ position: 'absolute', inset: 104, border: `4px solid ${teal}` }} />
          <div style={{ position: 'absolute', top: 160, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ display: 'inline-block', backgroundColor: teal, color: '#141428', fontSize: 30, fontWeight: theme.titleWeight ?? 900, padding: '10px 26px' }}>{'GAME CLEAR'}</span>
            <h2 style={{ margin: '56px 0 0', fontSize: 66, fontWeight: theme.titleWeight ?? 900, lineHeight: 1.4, color: theme.fg, textShadow: '5px 5px 0 rgba(78,205,196,0.35)' }}>{title}</h2>
            <p style={{ margin: '34px 0 0', fontSize: 27, color: 'rgba(243,243,233,0.75)' }}>{subtitle}</p>
          </div>
          <div style={{ position: 'absolute', top: 800, left: 140, right: 140, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
            {renderTags({ backgroundColor: theme.accent, color: '#141428', fontWeight: 800, padding: '12px 24px', fontSize: 26 })}
          </div>
          <div style={{ position: 'absolute', bottom: 140, left: 0, right: 0, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 23, color: theme.noteColor }}>{`PRESS ▶ ${brand} · ${pageLabel(content)} · ${note}`}</p>
          </div>
        </>
      );
    }
  }
}

/* ------------------- 参数化排版模板（84 套组合） ------------------- */

/**
 * 通用渲染：只依赖 theme（配色 / 字体 / 圆角 / 装饰），
 * 因此 6 种版式族 × 14 组配色 = 84 套模板共用同一份代码，纯内联样式保证截图兼容。
 */

function DecorLayer({ theme }: { theme: CardTheme }) {
  const decor = theme.decor ?? 'none';
  if (decor === 'dots') {
    const dots: number[] = Array.from({ length: 96 }, (_: unknown, i: number) => i);
    return (
      <div style={{ position: 'absolute', inset: 0, opacity: 0.28 }}>
        {dots.map((i: number) => {
          const x = 60 + (i % 12) * 86;
          const y = 60 + Math.floor(i / 12) * 168;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: theme.fgSoft,
              }}
            />
          );
        })}
      </div>
    );
  }
  if (decor === 'frame') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 48,
          border: `3px solid ${theme.accent}`,
          borderRadius: Math.max(8, (theme.radius ?? 20) - 6),
        }}
      />
    );
  }
  if (decor === 'ribbon') {
    return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 26, backgroundColor: theme.accent }} />;
  }
  if (decor === 'band') {
    return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 18, backgroundColor: theme.accent, opacity: 0.85 }} />;
  }
  return null;
}

type AlignT = 'left' | 'center' | 'right';

function alignOf(v?: string): AlignT {
  return v === 'center' ? 'center' : v === 'right' ? 'right' : 'left';
}

function itemsOf(a: AlignT): 'flex-start' | 'center' | 'flex-end' {
  return a === 'center' ? 'center' : a === 'right' ? 'flex-end' : 'flex-start';
}

function Divider({ d, theme, width }: { d?: string; theme: CardTheme; width: number }) {
  const s = d ?? 'solid';
  if (s === 'none') return null;
  if (s === 'dashed') return <div style={{ width, borderTop: `5px dashed ${theme.accent}`, marginTop: 26 }} />;
  if (s === 'dotted') return <div style={{ width, borderTop: `6px dotted ${theme.accent}`, marginTop: 26 }} />;
  if (s === 'double') return <div style={{ width, height: 6, borderTop: `3px solid ${theme.accent}`, borderBottom: `3px solid ${theme.accent}`, marginTop: 26 }} />;
  return <div style={{ width, height: 7, backgroundColor: theme.accent, marginTop: 26 }} />;
}

function NumberBadge({ theme, text }: { theme: CardTheme; text: string }) {
  const s = theme.numberStyle ?? 'none';
  if (s === 'none') return null;
  const family = theme.mono ?? theme.sans;
  const pos = { position: 'absolute' as const, top: 92, right: 96 };
  if (s === 'ghost') {
    return <span style={{ ...pos, fontSize: 260, lineHeight: 1, color: theme.accent, opacity: 0.1, fontFamily: theme.titleFamily ?? theme.sans, fontWeight: theme.titleWeight ?? 900 }}>{text}</span>;
  }
  if (s === 'box') {
    return (
      <div style={{ ...pos, width: 136, height: 136, backgroundColor: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
        <span style={{ fontSize: 66, color: '#FFFFFF', fontFamily: family, fontWeight: 900 }}>{text}</span>
      </div>
    );
  }
  if (s === 'pill') {
    return (
      <div style={{ ...pos, padding: '12px 34px', backgroundColor: theme.accent, borderRadius: 999 }}>
        <span style={{ fontSize: 42, color: '#FFFFFF', fontFamily: family, fontWeight: 900 }}>{text}</span>
      </div>
    );
  }
  return (
    <div style={{ ...pos, width: 136, height: 136, border: `4px solid ${theme.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
      <span style={{ fontSize: 62, color: theme.accent, fontFamily: family, fontWeight: 900 }}>{text}</span>
    </div>
  );
}

function AccentLayer({ theme }: { theme: CardTheme }) {
  const s = theme.accentStyle ?? 'topbar';
  if (s === 'leftblock') return <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 50, backgroundColor: theme.accent }} />;
  if (s === 'sidebar') return <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 50, backgroundColor: theme.accent }} />;
  if (s === 'cornerbox') return <div style={{ position: 'absolute', top: 0, right: 0, width: 320, height: 320, backgroundColor: theme.accentSoft }} />;
  if (s === 'dotrow') return <div style={{ position: 'absolute', top: 46, left: 0, right: 0, height: 16, backgroundImage: `radial-gradient(${theme.accent} 4px, transparent 4px)`, backgroundSize: '30px 16px', backgroundRepeat: 'repeat-x' }} />;
  if (s === 'underline') return null;
  return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 42, backgroundColor: theme.accent }} />;
}

/**
 * 二合一「已换字整图」的模板化渲染：按整体构图（stack/split/bandtop）+ 强调块 + 分隔线 + 对齐
 * 把换字后的整张图片装进不同版式，避免不同模板只换底色。
 */
function EditedPage({ content, theme, brand, image }: { content: CardContent; theme: CardTheme; brand: string; image: string }) {
  const k = theme.fontScale ?? 1;
  const comp = theme.composition ?? 'stack';
  const family = theme.titleFamily ?? theme.sans;
  const mono = theme.mono ?? theme.sans;
  const pageNo = `${content.index + 1} / ${content.total}`;
  const numberText = String(content.index + 1).padStart(2, '0');
  const d = theme.dividerStyle ?? 'solid';
  const borderStyle = d === 'dashed' ? 'dashed' : d === 'dotted' ? 'dotted' : 'solid';
  const border = `4px ${borderStyle} ${theme.accent}`;

  if (comp === 'split') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 300, backgroundColor: theme.accent, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '80px 24px' }}>
          <span style={{ fontSize: 28, letterSpacing: 4, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.4 }}>{brand}</span>
          <span style={{ fontSize: Math.round(120 * k), lineHeight: 1, fontWeight: 900, color: '#FFFFFF', fontFamily: family }}>{numberText}</span>
        </div>
        <div style={{ position: 'absolute', top: 70, bottom: 70, left: 360, right: 70 }}>
          <img src={image} alt="已换字图片" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{ position: 'absolute', right: 70, bottom: 24, fontSize: 22, color: theme.fgSoft, fontFamily: mono }}>{pageNo}</span>
      </>
    );
  }

  if (comp === 'bandtop') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 190, backgroundColor: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 76px' }}>
          <span style={{ fontSize: 34, letterSpacing: 6, color: '#FFFFFF' }}>{brand}</span>
          <span style={{ fontSize: 32, color: '#FFFFFF', fontFamily: mono }}>{pageNo}</span>
        </div>
        <div style={{ position: 'absolute', top: 220, bottom: 60, left: 60, right: 60, border, borderRadius: theme.radius, backgroundColor: theme.bg }}>
          <img src={image} alt="已换字图片" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </>
    );
  }

  // stack：强调块 + 边框（线型随模板变化）+ 页脚
  return (
    <>
      <DecorLayer theme={theme} />
      <AccentLayer theme={theme} />
      <div style={{ position: 'absolute', left: 68, right: 68, top: 120, display: 'flex', justifyContent: 'space-between', fontSize: 25, color: theme.fg, fontFamily: family }}>
        <span>{brand}</span>
        <span style={{ color: theme.fgSoft }}>{numberText}</span>
      </div>
      <div style={{ position: 'absolute', inset: '180px 68px 110px', border, borderRadius: theme.radius, padding: 20, backgroundColor: theme.bg }}>
        <img src={image} alt="已换字图片" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ position: 'absolute', left: 68, right: 68, bottom: 48, display: 'flex', justifyContent: 'space-between', fontSize: 23, color: theme.fgSoft }}>
        <span>财经科普 · 仅供参考</span>
        <span>{pageNo}</span>
      </div>
    </>
  );
}

function GenericCover({
  content,
  theme,
  brand,
  note,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
}) {
  const title = content.title ?? '财经科普';
  const subtitle = content.subtitle ?? '原创笔记';
  const k = theme.fontScale ?? 1;
  const size = Math.round(titleFontSize(title) * k);
  const family = theme.titleFamily ?? theme.sans;
  const mono = theme.mono ?? theme.sans;
  const tAlign = alignOf(theme.align);
  const items = itemsOf(tAlign);
  const titlePos = theme.titlePos ?? 'mid';
  const comp = theme.composition ?? 'stack';
  const pageNo = `01 / ${String(content.total).padStart(2, '0')}`;
  const numberText = String((content.index ?? 0) + 1).padStart(2, '0');
  const titleCss = {
    margin: 0,
    fontSize: size,
    lineHeight: 1.24,
    color: theme.fg,
    fontFamily: family,
    fontWeight: theme.titleWeight ?? 900,
    letterSpacing: theme.titleSpacing ?? 0,
    fontStyle: theme.titleItalic ? ('italic' as const) : ('normal' as const),
    textAlign: tAlign,
  };
  const foot = (
    <div style={{ position: 'absolute', bottom: 96, left: 104, right: 104, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: theme.noteColor }}>
      <span>{note}</span>
      <span style={{ fontFamily: mono }}>{pageNo}</span>
    </div>
  );

  if (comp === 'split') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: [300, 350, 400, 450][theme.variant ?? 0], backgroundColor: theme.accent, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <span style={{ fontSize: Math.round(170 * k), lineHeight: 1, fontWeight: 900, color: '#FFFFFF', fontFamily: family }}>{numberText}</span>
          <span style={{ fontSize: 26, letterSpacing: 8, color: '#FFFFFF', opacity: 0.9 }}>{brand}</span>
        </div>
        <div style={{ position: 'absolute', top: 200, bottom: 200, left: [366, 416, 466, 516][theme.variant ?? 0], right: 96, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: items }}>
          <h1 style={titleCss}>{title}</h1>
          <Divider d={theme.dividerStyle} theme={theme} width={168} />
          <p style={{ margin: '30px 0 0', fontSize: Math.round(34 * k), lineHeight: 1.6, color: theme.fgSoft, textAlign: tAlign }}>{subtitle}</p>
        </div>
        {foot}
      </>
    );
  }

  if (comp === 'bandtop') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: [330, 390, 440, 500][theme.variant ?? 0], backgroundColor: theme.accent, display: 'flex', alignItems: 'center', padding: '0 96px' }}>
          <h1 style={{ ...titleCss, color: '#FFFFFF', fontSize: Math.min(size, Math.round(96 * k)) }}>{title}</h1>
        </div>
        <div style={{ position: 'absolute', top: [390, 450, 500, 560][theme.variant ?? 0], left: 104, right: 104 }}>
          <p style={{ margin: 0, fontSize: Math.round(26 * k), letterSpacing: 6, color: theme.accent, fontWeight: 700 }}>{brand}</p>
          <Divider d={theme.dividerStyle} theme={theme} width={168} />
          <p style={{ margin: '26px 0 0', fontSize: Math.round(36 * k), lineHeight: 1.6, color: theme.fgSoft }}>{subtitle}</p>
        </div>
        {foot}
      </>
    );
  }

  return (
    <>
      <AccentLayer theme={theme} />
      <NumberBadge theme={theme} text={numberText} />
      <div style={{ position: 'absolute', top: 120, left: 104, right: 104, display: 'flex', justifyContent: items, paddingRight: items === 'flex-end' ? 210 : 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: theme.accent }} />
          <span style={{ fontSize: 26, letterSpacing: 6, color: theme.fgSoft, textTransform: 'uppercase' }}>{brand}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 320, bottom: 200, left: 104, right: 104, display: 'flex', flexDirection: 'column', justifyContent: titlePos === 'top' ? 'flex-start' : titlePos === 'bottom' ? 'flex-end' : 'center', alignItems: items }}>
        <h1 style={titleCss}>{title}</h1>
        <Divider d={theme.dividerStyle} theme={theme} width={168} />
        <p style={{ margin: '30px 0 0', fontSize: Math.round(36 * k), lineHeight: 1.6, color: theme.fgSoft, textAlign: tAlign }}>{subtitle}</p>
      </div>
      {foot}
    </>
  );
}

function GenericSection({
  content,
  theme,
  brand,
  note,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
}) {
  const paragraph = content.paragraph ?? '';
  const k = theme.fontScale ?? 1;
  const size = Math.round(bodyFontSize(paragraph, 36) * k);
  const family = theme.titleFamily ?? theme.sans;
  const mono = theme.mono ?? theme.sans;
  const tAlign = alignOf(theme.align);
  const items = itemsOf(tAlign);
  const label = pageLabel(content);
  const numberText = String(content.sectionNo ?? 1).padStart(2, '0');
  const comp = theme.composition ?? 'stack';
  const foot = (
    <div style={{ position: 'absolute', bottom: 92, left: 104, right: 104, display: 'flex', justifyContent: 'space-between', fontSize: 22, color: theme.noteColor }}>
      <span>{note}</span>
      <span style={{ fontFamily: mono }}>{label}</span>
    </div>
  );

  if (comp === 'split') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: [280, 320, 360, 400][theme.variant ?? 0], backgroundColor: theme.accent, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <span style={{ fontSize: Math.round(150 * k), lineHeight: 1, fontWeight: 900, color: '#FFFFFF', fontFamily: family }}>{numberText}</span>
          <span style={{ fontSize: 24, letterSpacing: 6, color: '#FFFFFF', opacity: 0.9 }}>{brand}</span>
        </div>
        <div style={{ position: 'absolute', top: 150, bottom: 130, left: [350, 390, 430, 470][theme.variant ?? 0], right: 96, display: 'flex', flexDirection: 'column', alignItems: items, justifyContent: 'flex-start' }}>
          <Divider d={theme.dividerStyle} theme={theme} width={148} />
          <CardRichText style={{ margin: '40px 0 0', fontSize: size, lineHeight: 1.9, color: theme.fg, whiteSpace: 'pre-wrap', textAlign: tAlign }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
          <EndTagRow tags={content.tags} theme={theme} />
        </div>
        {foot}
      </>
    );
  }

  if (comp === 'bandtop') {
    return (
      <>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 190, backgroundColor: theme.accent, display: 'flex', alignItems: 'center', justifyContent: items, padding: '0 96px' }}>
          <span style={{ fontSize: 26, letterSpacing: 6, color: '#FFFFFF', fontWeight: 700 }}>{`${brand} · ${label}`}</span>
        </div>
        <div style={{ position: 'absolute', top: 270, left: 104, right: 104, bottom: 130 }}>
          <Divider d={theme.dividerStyle} theme={theme} width={148} />
          <CardRichText style={{ margin: '34px 0 0', fontSize: size, lineHeight: 1.9, color: theme.fg, whiteSpace: 'pre-wrap' }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
          <EndTagRow tags={content.tags} theme={theme} />
        </div>
        {foot}
      </>
    );
  }

  return (
    <>
      <AccentLayer theme={theme} />
      <NumberBadge theme={theme} text={numberText} />
      <div style={{ position: 'absolute', top: 116, left: 104, right: 104, display: 'flex', justifyContent: items, alignItems: 'center', gap: 14, paddingRight: items === 'flex-end' ? 210 : 0 }}>
        <span style={{ width: 28, height: 6, backgroundColor: theme.accent }} />
        <span style={{ fontSize: 24, letterSpacing: 4, color: theme.fgSoft }}>{`${brand} · ${label}`}</span>
      </div>
      <div style={{ position: 'absolute', top: 250, bottom: 168, left: 104, right: 104, display: 'flex', flexDirection: 'column', alignItems: items }}>
        <Divider d={theme.dividerStyle} theme={theme} width={148} />
        <CardRichText style={{ margin: '36px 0 0', fontSize: size, lineHeight: 1.9, color: theme.fg, whiteSpace: 'pre-wrap', textAlign: tAlign }} text={paragraph} title={content.heading} accent={theme.accent} headingFont={theme.titleFamily ?? theme.sans} />
        <EndTagRow tags={content.tags} theme={theme} />
      </div>
      {foot}
    </>
  );
}

function GenericEnd({
  content,
  theme,
  brand,
  note,
}: {
  content: CardContent;
  theme: CardTheme;
  brand: string;
  note: string;
}) {
  const tags = content.tags ?? [];
  const k = theme.fontScale ?? 1;
  const family = theme.titleFamily ?? theme.sans;
  const mono = theme.mono ?? theme.sans;
  const tAlign = alignOf(theme.align);
  const items = itemsOf(tAlign);
  const radiusPill = theme.numberStyle === 'pill' ? 999 : theme.radius ?? 10;

  return (
    <>
      <AccentLayer theme={theme} />
      <NumberBadge theme={theme} text={String(content.total).padStart(2, '0')} />
      <div style={{ position: 'absolute', top: 380, bottom: 210, left: 104, right: 104, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: items }}>
        <h2 style={{ margin: 0, fontSize: Math.round(84 * k), lineHeight: 1.2, color: theme.fg, fontFamily: family, fontWeight: theme.titleWeight ?? 900, letterSpacing: theme.titleSpacing ?? 0, fontStyle: theme.titleItalic ? 'italic' : 'normal', textAlign: tAlign }}>记住这几点</h2>
        <Divider d={theme.dividerStyle} theme={theme} width={168} />
        <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: items }}>
          {tags.slice(0, 8).map((tag: string) => (
            <span key={tag} style={{ padding: '14px 26px', borderRadius: radiusPill, backgroundColor: theme.accentSoft, color: theme.fg, fontSize: Math.round(27 * k) }}>{`#${tag}`}</span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 96, left: 104, right: 104, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: theme.noteColor }}>
        <span>{brand}</span>
        <span style={{ fontFamily: mono }}>{note}</span>
      </div>
    </>
  );
}








'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export function CoverImage({ src, boxWidth, boxHeight, alt = '封面完整原图' }: { src: string; boxWidth?: number; boxHeight?: number; alt?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [available, setAvailable] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const update = () => {
      const width = parent.clientWidth, height = parent.clientHeight;
      if (width && height) setAvailable(previous => previous?.width === width && previous?.height === height ? previous : { width, height });
    };
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    update();
    return () => observer.disconnect();
  }, []);
  // html2canvas does not implement object-fit. Export the same explicit contained
  // dimensions that the preview uses, so charts are never stretched to the box.
  const scale = size ? Math.min((boxWidth ?? available?.width ?? 952) / size.width, (boxHeight ?? available?.height ?? 654) / size.height) : 1;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt} onLoad={event => {
      const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
      if (width && height) setSize({ width, height });
    }} style={{ display: 'block', width: size ? size.width * scale : '100%', height: size ? size.height * scale : '100%', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', background: 'transparent' }} />
  );
}

/** Cover copy is a title only. Prose and tags stay on the content pages. */
export function TitleImageCover({ title, image, background, ink, accent, secondary, paper, fontFamily, fontWeight = 900, fontScale = 1, align = 'left', composition = 'headline', decoration, backgroundStyle }: {
  title: string;
  image?: string;
  background: string;
  ink: string;
  accent: string;
  secondary: string;
  paper: string;
  fontFamily: string;
  fontWeight?: number;
  fontScale?: number;
  align?: CSSProperties['textAlign'];
  composition?: 'headline' | 'sidebar' | 'collage' | 'checklist' | 'editorial';
  decoration?: ReactNode;
  backgroundStyle?: CSSProperties;
}) {
  const size = title.length <= 10 ? 174 : title.length <= 20 ? 154 : title.length <= 30 ? 132 : 108;
  const titleFrame: CSSProperties = composition === 'collage'
    ? { background: paper, borderRadius: '8px 32px 8px 20px', boxShadow: `12px 12px 0 ${secondary}`, padding: '30px 38px' }
    : composition === 'sidebar'
      ? { borderLeft: `16px solid ${accent}`, padding: '24px 36px' }
      : composition === 'checklist'
        ? { border: `7px solid ${accent}`, borderRadius: 38, padding: '26px 32px' }
        : composition === 'editorial'
          ? { borderTop: `8px double ${accent}`, borderBottom: `8px double ${accent}`, padding: '26px 8px' }
          : { padding: '20px 8px' };
  return (
    <div data-cover-layout={image ? 'title-image-halves' : 'title-only'} style={{ position: 'relative', width: 1080, height: 1440, overflow: 'hidden', background, color: ink, ...backgroundStyle }}>
      {decoration}
      <div style={{ position: 'absolute', inset: '52px 64px', display: 'grid', gridTemplateRows: image ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 28 }}>
        <div data-cover-zone="title" style={{ ...titleFrame, display: 'flex', alignItems: 'center', minWidth: 0, minHeight: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
          <h1 style={{ margin: 0, width: '100%', fontFamily, fontWeight, fontSize: size * fontScale, lineHeight: 1.16, letterSpacing: 0, textAlign: align, overflowWrap: 'anywhere', lineBreak: 'strict', whiteSpace: 'pre-wrap', textWrap: 'balance' }}>
            <span style={composition === 'headline' ? { backgroundImage: `linear-gradient(transparent 72%, ${secondary} 72%, ${secondary} 94%, transparent 94%)`, boxDecorationBreak: 'clone' } : undefined}>{title}</span>
          </h1>
        </div>
        {image && <div data-cover-zone="image" style={{ minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Preserve the entire figure, including axes and annotations. */}
          <CoverImage key={image} src={image} />
        </div>}
      </div>
    </div>
  );
}

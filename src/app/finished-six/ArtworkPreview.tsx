'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function ArtworkPreview({ children, label, index, total, onClose, onNavigate }: {
  children: ReactNode; label: string; index: number; total: number;
  onClose: () => void; onNavigate: (index: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 900 });
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const element = dialog.current;
    element?.showModal();
    return () => {
      window.removeEventListener('resize', update);
      document.body.style.overflow = previousOverflow;
      element?.close();
    };
  }, []);
  const fit = Math.min((viewport.width - 40) / 1080, (viewport.height - 150) / 1440, 1);
  const scale = fit * zoom;
  const control = { padding: '9px 13px', borderRadius: 9, border: '1px solid #625f59', background: '#292825', color: '#fff', cursor: 'pointer' };
  return <dialog ref={dialog} aria-label="成品大图预览" onCancel={onClose}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); onNavigate(index - 1); }
      if (event.key === 'ArrowRight' && index < total - 1) { event.preventDefault(); onNavigate(index + 1); }
    }}
    style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', maxWidth: 'none', maxHeight: 'none', margin: 0, padding: 0, border: 0, background: '#141413f5', color: '#fff' }}>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 }}>
        <span style={{ marginRight: 12 }}>{label} · {index + 1} / {total}</span>
        <button style={control} disabled={index === 0} onClick={() => onNavigate(index - 1)}>上一张</button>
        <button style={control} disabled={index === total - 1} onClick={() => onNavigate(index + 1)}>下一张</button>
        <button style={control} onClick={() => setZoom(1)}>适应屏幕</button>
        <button style={control} aria-label="缩小图片" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))}>−</button>
        <span aria-live="polite">{Math.round(scale * 100)}%</span>
        <button style={control} aria-label="放大图片" disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + .5))}>＋</button>
        <button autoFocus style={control} onClick={onClose}>关闭预览</button>
      </div>
      <p style={{ margin: '0 12px 10px', textAlign: 'center', fontSize: 13, color: '#d6d2cb' }}>点击图片继续放大；放大后可滚动查看。Esc 关闭，左右方向键切换。</p>
      <div style={{ overflow: 'auto', flex: 1, padding: '8px 20px 24px' }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        <button aria-label="切换图片放大倍率" onClick={() => setZoom(value => value === 1 ? 2 : 1)} style={{ position: 'relative', display: 'block', width: 1080 * scale, height: 1440 * scale, margin: '0 auto', padding: 0, border: 0, overflow: 'hidden', textAlign: 'left', cursor: zoom === 1 ? 'zoom-in' : 'zoom-out' }}>
          <div style={{ width: 1080, height: 1440, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>{children}</div>
        </button>
      </div>
    </div>
  </dialog>;
}

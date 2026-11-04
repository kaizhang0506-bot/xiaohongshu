'use client';

import { useEffect, useState } from 'react';
import type { CardLayoutSpec } from '@/lib/layouts';
import { getCardLayout, registerCustomLayouts } from '@/lib/layouts';

const STORE = 'xhs-uploaded-templates-v1';
export function CustomTemplateUploader({ onChange, onSelect }: { onChange: (items: CardLayoutSpec[]) => void; onSelect: (id: string) => void }) {
  const [items, setItems] = useState<CardLayoutSpec[]>([]);
  const [draft, setDraft] = useState<CardLayoutSpec | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const saved: CardLayoutSpec[] = JSON.parse(localStorage.getItem(STORE) || '[]');
      const valid = Array.isArray(saved) ? saved.filter(s => s.id?.startsWith('uploaded-') && /^data:image\/(png|jpeg|webp);base64,/.test(s.customTemplate?.image || '')) : [];
      registerCustomLayouts(valid); setItems(valid); onChange(valid);
    } catch { setError('本地模板读取失败，请重新上传。'); }
  }, [onChange]);
  const persist = (next: CardLayoutSpec[]) => {
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
      registerCustomLayouts(next); setItems(next); onChange(next); setError(''); return true;
    } catch { setError('浏览器存储空间不足，请删除部分自定义模板后再保存。'); return false; }
  };
  const upload = async (file: File) => {
    setError(''); setBusy(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('请上传 PNG、JPG 或 WebP 图片。');
      if (file.size > 15 * 1024 * 1024) throw new Error('图片请小于 15MB。');
      const url = URL.createObjectURL(file);
      try {
        const img = new Image(); img.src = url; await img.decode();
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1440 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setDraft({ ...getCardLayout('minimal'), id: `uploaded-${crypto.randomUUID()}`, label: file.name.replace(/\.[^.]+$/, ''), desc: '自定义背景模板', customTemplate: { image: canvas.toDataURL('image/webp', .85), x: 10, y: 15, width: 80, height: 70, color: '#222222', font: 'sans', align: 'left' } });
      } finally { URL.revokeObjectURL(url); }
    } catch (e) { setError(e instanceof Error ? e.message : '图片读取失败'); }
    finally { setBusy(false); }
  };
  const region = draft?.customTemplate;
  return <div className="space-y-3 rounded-xl border border-dashed border-gray-300 p-4">
    <div className="flex flex-wrap items-center gap-3"><strong className="text-sm">自定义模板</strong><label className="cursor-pointer rounded-full bg-black px-4 py-2 text-xs text-white">{busy ? '正在读取…' : '上传模板图片'}<input aria-label="上传模板图片" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} /></label></div>
    <p className="text-xs text-gray-500">支持 PNG / JPG / WebP，推荐 3:4 空白底图。图片完整作为背景保留，可调整文字区域；已有文字不会自动擦除。模板保存在当前浏览器。</p>
    {draft && region && <div className="flex flex-wrap gap-4">
      <div style={{ width: 180, height: 240, position: 'relative', background: `url("${region.image}") center / contain no-repeat`, border: '1px solid #ddd' }}><div style={{ position: 'absolute', left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%`, border: '1px dashed #ff2e4d', color: region.color, textAlign: region.align, fontFamily: region.font === 'serif' ? 'SimSun,serif' : region.font === 'mono' ? 'monospace' : 'sans-serif', fontSize: 16 }}>标题示例<br /><span style={{ fontSize: 12 }}>正文会自动适配这个区域</span></div></div>
      <div className="max-w-xs space-y-2 text-xs"><label className="block">名称 <input aria-label="模板名称" className="border p-1" value={draft.label} maxLength={40} onChange={e => setDraft({ ...draft, label: e.target.value })} /></label>
        {(['x', 'y', 'width', 'height'] as const).map((key, i) => <label key={key} className="block">{['左边距', '上边距', '文字区宽度', '文字区高度'][i]} {region[key]}% <input aria-label={['左边距', '上边距', '文字区宽度', '文字区高度'][i]} type="range" min={key === 'width' || key === 'height' ? 20 : 0} max={key === 'x' ? 100 - region.width : key === 'y' ? 100 - region.height : key === 'width' ? 100 - region.x : 100 - region.y} value={region[key]} onChange={e => setDraft({ ...draft, customTemplate: { ...region, [key]: Number(e.target.value) } })} /></label>)}
        <label>文字颜色 <input aria-label="模板文字颜色" type="color" value={region.color} onChange={e => setDraft({ ...draft, customTemplate: { ...region, color: e.target.value } })} /></label>
        <select aria-label="模板字体" value={region.font} onChange={e => setDraft({ ...draft, customTemplate: { ...region, font: e.target.value as typeof region.font } })}><option value="sans">黑体</option><option value="serif">宋体</option><option value="mono">等宽</option></select>
        <select aria-label="模板文字对齐" value={region.align} onChange={e => setDraft({ ...draft, customTemplate: { ...region, align: e.target.value as typeof region.align } })}><option value="left">左对齐</option><option value="center">居中</option></select>
        <div className="flex gap-2"><button type="button" className="rounded bg-[#ff2e4d] px-3 py-2 text-white" onClick={() => { if (!draft.label.trim()) { setError('请填写模板名称'); return; } if (persist([...items, draft])) { onSelect(draft.id); setDraft(null); } }}>保存并使用</button><button type="button" onClick={() => setDraft(null)}>取消</button></div>
      </div>
    </div>}
    <div className="flex flex-wrap gap-2">{items.map(item => <div key={item.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs"><img src={item.customTemplate!.image} alt="" className="h-12 w-9 object-contain" /><button type="button" onClick={() => onSelect(item.id)}>使用：{item.label}</button><button type="button" aria-label={`删除模板${item.label}`} onClick={() => persist(items.filter(s => s.id !== item.id))}>删除</button></div>)}</div>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
  </div>;
}

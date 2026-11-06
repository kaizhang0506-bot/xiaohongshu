'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardItem } from '@/components/workbench/CardItem';
import { CardDeck, ScaledCard, type CardDeckExportHandle } from '@/components/workbench/CardDeck';
import { ImageUploader } from '@/components/workbench/ImageUploader';
import { ArtworkPreview } from '../finished-six/ArtworkPreview';
import { NATIVE_COMPOSITIONS, NATIVE_FAMILIES, NATIVE_TEMPLATES } from '@/lib/xhs-native-layouts';
import { STUDIO_LAYOUTS, STUDIO_STYLES } from '@/lib/studio-layouts';
import type { ImageItem } from '@/lib/image-utils';
import type { CardContent, RewriteResult } from '@/lib/types';

const SAMPLE_TITLE = '看懂背后的逻辑\n再做自己的判断';
const SAMPLE_BODY = '## 先核实信息来源\n看到一个结果，先核对来源与日期。短期变化不等于长期趋势，单个案例也不能代表全部。\n\n### 再看适用条件\n把事实、推测和个人选择分开，记录判断依据，再明确哪些变化会让结论失效。\n\n**真正值得记住的，是判断依据。**\n先理解，再比较；把问题留在笔记里，持续复盘。';
const PAGE_SIZE = 12;
// Adjacent previews show different visual families and compositions at a glance.
const DISPLAY_TEMPLATES = Array.from({length: NATIVE_TEMPLATES.length}, (_, index) =>
  NATIVE_TEMPLATES[(index % NATIVE_FAMILIES.length) * NATIVE_COMPOSITIONS.length +
    (Math.floor(index / NATIVE_FAMILIES.length) + index % NATIVE_FAMILIES.length) % NATIVE_COMPOSITIONS.length]);

export default function TemplateGallery() {
  const [collection, setCollection] = useState<'native' | 'studio'>('native');
  const [family, setFamily] = useState('all');
  const [composition, setComposition] = useState('all');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<'cover' | 'section' | 'short'>('cover');
  const [page, setPage] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState(SAMPLE_TITLE.replace('\n', '，'));
  const [draftBody, setDraftBody] = useState(SAMPLE_BODY);
  const [result, setResult] = useState<RewriteResult>({ titles: [SAMPLE_TITLE], body: SAMPLE_BODY, tags: ['学习笔记', '干货整理', '收藏复习'], rewriteNotes: '' });
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [message, setMessage] = useState('');
  const exportHandle = useRef<CardDeckExportHandle | null>(null);
  const registerDeck = useCallback((_id: string, handle: CardDeckExportHandle | null) => { exportHandle.current = handle; }, []);
  const referenceImages = useMemo(() => images.map(image => image.dataUrl), [images]);
  const fullImages = useMemo(() => images.map(image => image.fullDataUrl || image.dataUrl), [images]);
  const templates = useMemo(() => collection === 'native'
    ? DISPLAY_TEMPLATES.filter(template => (family === 'all' || template.family.id === family) && (composition === 'all' || template.composition === composition) && `${template.name} ${template.description}`.includes(search.trim())).map(template => ({id: template.id, name: template.name, description: template.description}))
    : STUDIO_LAYOUTS.filter(template => (family === 'all' || template.id.split('-')[1] === family) && `${template.label} ${template.desc}`.includes(search.trim())).map(template => ({id: template.id, name: template.label, description: template.desc})), [collection, family, composition, search]);
  const pageCount = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = templates.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const active = NATIVE_TEMPLATES.find(template => template.id === activeId);
  const oldActive = STUDIO_LAYOUTS.find(template => template.id === activeId);
  const activeName = active?.name ?? oldActive?.label ?? '';
  const previewIndex = templates.findIndex(template => template.id === previewId);
  const sample: CardContent = kind === 'cover'
    ? {kind: 'cover', index: 0, total: 3, title: SAMPLE_TITLE, subtitle: '把信息整理清楚，把重点留在自己的笔记里。', tags: ['学习笔记', '干货收藏', '每日复盘']}
    : kind === 'short'
      ? {kind: 'end', index: 2, total: 3, heading: '把重点记下来', paragraph: '慢一点，看清楚，再做决定。', tags: ['收藏复习', '独立判断']}
      : {kind: 'section', index: 1, total: 3, heading: '先看事实，再整理思路', paragraph: SAMPLE_BODY.slice(0, SAMPLE_BODY.lastIndexOf('\n\n')), tags: ['学习笔记']};

  useEffect(() => {
    if (activeId) document.getElementById('local-template-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeId]);

  async function downloadZip() {
    if (!exportHandle.current || zipBusy || imageProcessing) return;
    setZipBusy(true); setMessage('正在打包高清图片…');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const folder = zip.folder(activeName)!;
      const pages = await exportHandle.current.exportPages();
      for (const item of pages) folder.file(item.fileName, item.blob);
      const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
      const link = document.createElement('a'); link.href = url; link.download = `${activeName}_${pages.length}张.zip`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage(`已打包 ${pages.length} 张高清 PNG，未调用生图模型。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '打包失败，请重试'); }
    finally { setZipBusy(false); }
  }

  return <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6">
    <header className="rounded-3xl border border-[#E7DDCA] bg-[#FFF9E9] p-6 sm:p-8">
      <span className="rounded-full bg-[#E5EFD9] px-3 py-1 text-xs font-bold text-[#345238]">新增 100 套 · 直接套用 · 无需生图</span>
      <h1 className="mt-4 text-3xl font-black text-[#1A1814] sm:text-4xl">小红书本地模板库</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6B655C]">20 种笔记风格 × 5 种构图。封面、正文和结尾配成整套，字体、背景与装饰已经内置。选择模板，粘贴现成文案，就能直接排版和下载。</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm"><Link href="/" className="font-bold text-[#D12E48]">返回仿写工作台 →</Link><a href="#template-list" className="font-bold text-[#345238]">浏览全部模板 ↓</a></div>
    </header>

    <section id="local-template-editor" className="scroll-mt-20">
      {activeId && <div className="space-y-5 rounded-3xl border border-[#DCD4C6] bg-[#FFFDF9] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">直接套版 · {activeName}</h2><a href="#template-list" className="rounded-full border border-[#D9D1C3] bg-white px-4 py-2 text-sm font-bold">返回模板库 ↑</a></div>
        <p className="text-sm text-[#6B655C]">这里直接排版你填写的文字；上传的图表和照片作为原图素材保留。</p>
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-4">
            <label className="block text-sm font-bold">封面标题<input aria-label="直接套版标题" maxLength={120} value={draftTitle} onChange={event => setDraftTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DDD4C5] bg-white p-3 font-normal" /></label>
            <label className="block text-sm font-bold">正文<textarea aria-label="直接套版正文" maxLength={12000} rows={12} value={draftBody} onChange={event => setDraftBody(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DDD4C5] bg-white p-3 font-normal leading-7" /></label>
            <button type="button" disabled={!draftTitle.trim() || !draftBody.trim() || zipBusy} onClick={() => {setResult({titles:[draftTitle.trim()],body:draftBody.trim(),tags:[],rewriteNotes:''});setMessage('已按当前模板排版。');}} className="w-full rounded-full bg-[#FF2E4D] px-5 py-3 font-bold text-white disabled:opacity-50">直接应用文案</button>
            <ImageUploader purpose="layout" images={images} onChange={setImages} onProcessingChange={setImageProcessing} disabled={zipBusy} />
            <label className="block text-sm font-bold">更换模板<select aria-label="直接套版模板" value={activeId} disabled={zipBusy} onChange={event => setActiveId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DDD4C5] bg-white p-3 font-normal">{NATIVE_TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}{oldActive && <option value={oldActive.id}>{oldActive.label}</option>}</select></label>
            <button type="button" onClick={() => void downloadZip()} disabled={zipBusy || imageProcessing} className="w-full rounded-full bg-[#1A1814] px-5 py-3 font-bold text-white disabled:opacity-50">{imageProcessing ? '正在处理原图…' : zipBusy ? '正在打包…' : '下载这一套（ZIP）'}</button>
            <p role="status" className="text-sm text-[#6B655C]">{message || '1080 × 1440 高清 PNG · 自动适配文字与原图'}</p>
          </div>
          <fieldset disabled={imageProcessing || zipBusy} className="min-w-0"><CardDeck key={activeId} result={result} layout={activeId} brandName="" referenceImages={referenceImages} referenceFullImages={fullImages} referenceMode="full" deckKey={activeId} registerDeck={registerDeck} /></fieldset>
        </div>
      </div>}
    </section>

    <section id="template-list" className="scroll-mt-20 space-y-5">
      <div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto text-xl font-bold">选择喜欢的排版</h2><select aria-label="模板集合" value={collection} onChange={event => {setCollection(event.target.value as typeof collection);setFamily('all');setComposition('all');setPage(0);}} className="rounded-xl border border-[#DDD4C5] bg-white p-2.5 text-sm"><option value="native">新增小红书 100 套</option><option value="studio">原有 100 套</option></select><select aria-label="页面类型" value={kind} onChange={event => setKind(event.target.value as typeof kind)} className="rounded-xl border border-[#DDD4C5] bg-white p-2.5 text-sm"><option value="cover">封面</option><option value="section">正文与完整原图</option><option value="short">短句与结尾</option></select></div>
      <div className="flex flex-wrap gap-3"><select aria-label="风格筛选" value={family} onChange={event => {setFamily(event.target.value);setPage(0);}} className="rounded-xl border border-[#DDD4C5] bg-white p-2.5 text-sm"><option value="all">全部风格</option>{collection === 'native' ? NATIVE_FAMILIES.map(item => <option key={item.id} value={item.id}>{item.name}</option>) : STUDIO_STYLES.map((item,index) => <option key={index} value={String(index)}>{item[0]}</option>)}</select>{collection === 'native' && <select aria-label="构图筛选" value={composition} onChange={event => {setComposition(event.target.value);setPage(0);}} className="rounded-xl border border-[#DDD4C5] bg-white p-2.5 text-sm"><option value="all">全部构图</option>{NATIVE_COMPOSITIONS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<input aria-label="搜索模板" value={search} placeholder="搜索风格或模板名称" onChange={event => {setSearch(event.target.value);setPage(0);}} className="min-w-48 flex-1 rounded-xl border border-[#DDD4C5] bg-white px-3 py-2.5 text-sm" /></div>
      <p role="status" className="text-sm text-[#6B655C]">共 {templates.length} 套 · 第 {currentPage + 1} / {pageCount} 页 · 点击图片可放大</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map(template => <article key={template.id} data-testid={`template-${template.id}`} className="flex flex-col gap-3 rounded-2xl border border-[#E5DDCF] bg-white p-3 shadow-sm">
          <button type="button" aria-label={`放大预览 ${template.name}`} onClick={() => setPreviewId(template.id)} className="block w-full overflow-hidden rounded-lg text-left"><ScaledCard><CardItem layout={template.id} content={sample} referenceVisual={kind === 'section' ? '/finished-six/chart-1.png' : undefined} /></ScaledCard></button>
          <h3 className="text-sm font-bold">{template.name}</h3><p className="line-clamp-2 min-h-9 text-xs leading-5 text-[#777064]">{template.description}</p>
          <button type="button" onClick={() => {setActiveId(template.id);setMessage('');}} className="mt-auto rounded-full bg-[#1A1814] px-4 py-2.5 text-sm font-bold text-white">直接套用</button>
        </article>)}
      </div>
      {templates.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-[#777064]">没有找到匹配的模板，试试其他关键词。</p>}
      <div className="flex items-center justify-center gap-4"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded-full border bg-white px-5 py-2 disabled:opacity-40">上一页</button><span className="text-sm">{currentPage + 1} / {pageCount}</span><button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="rounded-full border bg-white px-5 py-2 disabled:opacity-40">下一页</button></div>
    </section>
    {previewId && previewIndex >= 0 && <ArtworkPreview label={templates[previewIndex].name} index={previewIndex} total={templates.length} onClose={() => setPreviewId(null)} onNavigate={index => setPreviewId(templates[index].id)}><CardItem layout={previewId} content={sample} referenceVisual={kind === 'section' ? '/finished-six/chart-1.png' : undefined} /></ArtworkPreview>}
  </div>;
}

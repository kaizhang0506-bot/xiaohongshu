'use client';

import { useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { CardItem } from '@/components/workbench/CardItem';
import type { CardContent } from '@/lib/types';
import rawCards from './data.json';
import independentVersions from './versions.json';
import { ArtworkPreview } from './ArtworkPreview';

type FinishedCard = { content: CardContent; image?: string };
const cards = rawCards as FinishedCard[];
type ExportPage = { label: string; fileName: string; card?: FinishedCard; generatedCover?: string };
const pages: ExportPage[] = [
  { label: '封面', fileName: '01_封面.png', generatedCover: '/finished-six/cover.png' },
  ...cards.map((card, index) => ({ label: `内容第 ${index + 1} 张`, fileName: `${String(index + 2).padStart(2, '0')}_内容${String(index + 1).padStart(2, '0')}.png`, card })),
];
const styles = [
  { id: 'xhs-paper-notebook', name: '小红书奶油手写笔记' },
  { id: 'xhs-five-newspaper', name: '复古财经报刊' },
  { id: 'xhs-five-blueprint', name: '蓝色研究笔记' },
  { id: 'xhs-five-scrapbook', name: '粉色剪贴' },
  { id: 'xhs-five-magazine', name: '橙黑杂志' },
];
const button: CSSProperties = {
  padding: '11px 18px', border: '1px solid #d8d3cb', borderRadius: 12,
  backgroundColor: '#ffffff', color: '#1a1814', fontSize: 14, fontWeight: 700,
  cursor: 'pointer',
};

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function asPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('图片导出失败，请重试')),
    'image/png',
  ));
}

const nextPaint = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

function FinishedArtwork({ page, layout }: { page: ExportPage; layout: string }) {
  if (page.generatedCover) return <div data-text-fit="ready" style={{ width: 1080, height: 1440, backgroundColor: '#f7efdb' }}><img alt="小红书成品封面" src={layout.startsWith('xhs-five-') ? `/finished-six/${layout.replace('xhs-five-','')}-cover.png` : page.generatedCover} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} /></div>;
  if (!page.card) return null;
  const versionIndex = styles.findIndex(style => style.id === layout);
  const card = independentVersions[versionIndex].pages[page.card.content.index] as FinishedCard;
  return <CardItem layout={layout} content={card.content} referenceVisual={card.image} />;
}

export default function FinishedSixPage() {
  const [layout, setLayout] = useState(styles[0].id);
  const [busy, setBusy] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [status, setStatus] = useState('点击图片可放大查看；可下载单张或打包整套。');
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const styleName = styles.find(style => style.id === layout)?.name ?? styles[0].name;

  async function capture(index: number, styleIndex = styles.findIndex(s => s.id === layout)) {
    const element = exportRefs.current[styleIndex * pages.length + index];
    if (!element) throw new Error(`第 ${index + 1} 张尚未准备好`);
    await document.fonts.ready;
    await Promise.all(Array.from(element.querySelectorAll('img')).map(async image => {
      await image.decode();
      if (!image.naturalWidth) throw new Error(`第 ${index + 1} 张的原图加载失败`);
    }));
    await nextPaint();
    await nextPaint();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const fit = element.querySelector<HTMLElement>('[data-text-fit]');
      if (fit?.dataset.textFit === 'overflow') throw new Error(`第 ${index + 1} 张文字超出排版空间，请切换样式后再下载`);
      if (fit?.dataset.textFit === 'ready') break;
      if (attempt === 29) throw new Error(`第 ${index + 1} 张的文字排版尚未完成，请稍后重试`);
      await nextPaint();
    }
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(element, {
      backgroundColor: null, useCORS: true, logging: false,
      scale: 1, width: 1080, height: 1440,
      onclone: documentClone => {
        documentClone.documentElement.style.backgroundColor = '#faf7f1';
        documentClone.documentElement.style.color = '#1a1814';
        documentClone.body.style.backgroundColor = '#faf7f1';
        documentClone.body.style.color = '#1a1814';
      },
    });
  }

  async function exportImages(kind: 'single' | 'zip' | 'contact' | 'all', index = 0, exportLayout = layout) {
    const styleIndex = styles.findIndex(style => style.id === exportLayout);
    const styleName = styles[styleIndex].name;
    if (busy) return;
    setBusy(true);
    try {
      if (kind === 'all') {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for(let si=0;si<styles.length;si++) {
          const folder=zip.folder('小红书五套排版/'+String(si+1).padStart(2,'0')+'_'+styles[si].name)!;
          for(let pi=0;pi<pages.length;pi++) {
            setStatus('正在导出第 '+(si+1)+' 套，第 '+(pi+1)+' / '+pages.length+' 张…');
            folder.file(pages[pi].fileName,await asPng(await capture(pi,si)));
          }
        }
        saveBlob(await zip.generateAsync({type:'blob'}),`小红书五套排版_${styles.length * pages.length}张.zip`);
      } else if (kind === 'single') {
        setStatus(`正在导出第 ${index + 1} 张…`);
        saveBlob(await asPng(await capture(index, styleIndex)), `${styleName}_${pages[index].fileName}`);
      } else {
        const rendered: HTMLCanvasElement[] = [];
        for (let i = 0; i < pages.length; i += 1) {
          setStatus(`正在导出 ${i + 1} / ${pages.length} 张…`);
          rendered.push(await capture(i, styleIndex));
        }
        if (kind === 'zip') {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          const folder = zip.folder(styleName);
          if (!folder) throw new Error('创建图片文件夹失败');
          for (let i = 0; i < rendered.length; i += 1) {
            folder.file(pages[i].fileName, await asPng(rendered[i]));
          }
          saveBlob(await zip.generateAsync({ type: 'blob' }), `小红书成品_${styleName}_${pages.length}张.zip`);
        } else {
          const sheet = document.createElement('canvas');
          sheet.width = 1080;
          sheet.height = Math.ceil(rendered.length / 2) * 720;
          const context = sheet.getContext('2d');
          if (!context) throw new Error('无法创建预览画布');
          context.fillStyle = '#f7efdb';
          context.fillRect(0, 0, sheet.width, sheet.height);
          rendered.forEach((canvas, i) => context.drawImage(canvas, (i % 2) * 540, Math.floor(i / 2) * 720, 540, 720));
          saveBlob(await asPng(sheet), `小红书成品_${styleName}_${pages.length}图总览.png`);
        }
      }
      setStatus('已生成下载文件。单张图片为 1080 × 1440 高清 PNG。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导出失败，请重试');
    } finally {
      setBusy(false);
    }
  }

  return <main style={{ minHeight: '100vh', padding: '36px 24px 64px', backgroundColor: '#faf7f1', color: '#1a1814' }}>
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <nav style={{ display: 'flex', gap: 22, fontSize: 14, marginBottom: 28 }}>
        <Link href="/" style={{ color: '#9a3647' }}>返回工作台</Link>
        <a href="/template-gallery" style={{ color: '#9a3647' }}>查看 100 套模板</a>
      </nav>
      <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 900 }}>小红书五套成品 · 每套封面 + {cards.length} 张内容页</h1>
      <p style={{ margin: '0 0 24px', lineHeight: 1.8, color: '#6b655c' }}>奶油手帐、复古报刊、蓝色研究、粉色剪贴、橙黑杂志，共 {styles.length * pages.length} 张。五套正文已分别仿写，原意一致、表达各不相同；每套搭配对应排版，图表完整保留原图。</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" disabled={busy} onClick={() => void exportImages('all')} style={{...button,backgroundColor:'#1a1814',color:'#ffffff'}}>下载全部五套（{styles.length * pages.length} 张 ZIP）</button>
      </div>
      <p role="status" aria-live="polite" style={{ fontSize: 13, color: '#6b655c', minHeight: 22, margin: '0 0 28px' }}>{status}</p>
      <nav id="style-navigation" aria-label="五套成品导航" style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:24,scrollMarginTop:90}}>{styles.map((style,si)=><a key={style.id} href={'#set-'+si} style={button}>{si+1}. {style.name}</a>)}</nav>
      {styles.map((style, si) => <section key={style.id} id={'set-'+si} aria-label={'第 '+(si+1)+' 套 '+style.name} style={{scrollMarginTop:90, paddingTop:24,marginBottom:48,borderTop:'2px solid #d8d3cb'}}>
        <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:16}}><h2 style={{fontSize:24,fontWeight:900,margin:0}}>第 {si+1} / 5 套 · {style.name}</h2><a href="#style-navigation" style={button}>↑ 返回模板导航</a></div>
        <div style={{display:'flex',gap:12,marginBottom:20}}><button type="button" disabled={busy} style={button} onClick={()=>void exportImages('zip',0,style.id)}>下载第 {si+1} 套（{pages.length} 张 ZIP）</button><button type="button" disabled={busy} style={button} onClick={()=>void exportImages('contact',0,style.id)}>下载第 {si+1} 套总览</button></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center' }}>
        {pages.map((page, index) => <section key={`${style.id}-${index}`} style={{ width: 270 }}>
          <button type="button" aria-label={`放大查看${page.label}`} onClick={() => { setLayout(style.id); setPreviewIndex(index); }} style={{ display: 'block', border: 0, padding: 0, cursor: 'zoom-in', textAlign: 'left', width: 270, height: 360, overflow: 'hidden', boxShadow: '0 5px 22px #1a181416' }}>
            <div style={{ transform: 'scale(.25)', transformOrigin: 'top left', width: 1080, height: 1440 }}>
              <FinishedArtwork page={page} layout={style.id} />
            </div>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ fontSize: 13, color: '#6b655c' }}>{page.label}</span>
            <button type="button" disabled={busy} onClick={() => void exportImages('single', index, style.id)} style={{ ...button, padding: '7px 13px', fontSize: 12, opacity: busy ? 0.6 : 1 }}>下载{page.label} PNG</button>
          </div>
        </section>)}
      </div>
      <div style={{textAlign:"right",marginTop:24}}><a href="#style-navigation" style={button}>↑ 返回模板导航</a></div>
      </section>)}
    </div>
    {previewIndex !== null && <ArtworkPreview label={pages[previewIndex].label} index={previewIndex} total={pages.length} onClose={() => setPreviewIndex(null)} onNavigate={setPreviewIndex}>
      <FinishedArtwork page={pages[previewIndex]} layout={layout} />
    </ArtworkPreview>}
    <div aria-hidden="true" style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none', color: '#1a1814', backgroundColor: '#ffffff' }}>
      {styles.flatMap((style, si) => pages.map((page, index) => <div key={`${style.id}-export-${index}`} data-testid={`finished-card-${si}-${index}`} ref={element => { exportRefs.current[si * pages.length + index] = element; }} style={{ width: 1080, height: 1440, color: '#1a1814' }}>
        <FinishedArtwork page={page} layout={style.id} />
      </div>))}
    </div>
  </main>;
}


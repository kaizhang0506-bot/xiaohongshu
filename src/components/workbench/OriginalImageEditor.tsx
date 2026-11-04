'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';
import type { ImageItem } from '@/lib/image-utils';
import { readSseStream } from '@/lib/stream-client';
import { loadDeepseekKey, loadDeepseekBaseUrl } from '@/lib/storage';
import { findTextAboveChart, detectFlatTextRegions } from '@/lib/text-region';

type Point = { x: number; y: number };
type Rect = Point & { width: number; height: number };
type Runner = () => Promise<string | null>;
type TextReplacement = { rect: Rect | null; text: string; fontSize: number; bold: boolean; foreground: string; lineHeight: number };

/** Expand a model's approximate box to blank pixel boundaries before erasing. */
function completeTextBounds(image: HTMLImageElement, rect: Rect, isolateAbove = true): Rect {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法检查原文字边界');
  ctx.drawImage(image, 0, 0);
  const w = canvas.width, h = canvas.height;
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const isolatedText = isolateAbove ? findTextAboveChart(pixels, w, h, rect) : null;
  if (isolatedText) return isolatedText;
  let left = Math.floor(rect.x * w), top = Math.floor(rect.y * h);
  let right = Math.min(w - 1, Math.ceil((rect.x + rect.width) * w));
  let bottom = Math.min(h - 1, Math.ceil((rect.y + rect.height) * h));
  const colors = new Map<number, number>();
  for (let y = top; y <= bottom; y += 2) for (let x = left; x <= right; x += 2) {
    const i = (y * w + x) * 4;
    const key = ((pixels[i] >> 4) << 8) | ((pixels[i + 1] >> 4) << 4) | (pixels[i + 2] >> 4);
    colors.set(key, (colors.get(key) ?? 0) + 1);
  }
  const [key, count] = [...colors].sort((a, b) => b[1] - a[1])[0];
  const total = [...colors.values()].reduce((a, b) => a + b, 0);
  if (count / total < 0.55) throw new Error('识别区域底色复杂，请手动框选纯色文字区，避免误擦图表');
  const bg = [((key >> 8) & 15) * 16 + 8, ((key >> 4) & 15) * 16 + 8, (key & 15) * 16 + 8];
  const ink = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return Math.abs(pixels[i] - bg[0]) + Math.abs(pixels[i + 1] - bg[1]) + Math.abs(pixels[i + 2] - bg[2]) > 100;
  };
  const dirtyVertical = (x: number) => { for (let y = top; y <= bottom; y++) if (ink(x, y)) return true; return false; };
  const dirtyHorizontal = (y: number) => { for (let x = left; x <= right; x++) if (ink(x, y)) return true; return false; };
  const expand = (start: number, direction: number, limit: number, max: number, dirty: (n: number) => boolean) => {
    let blank = 0, value = start;
    for (let step = 0; step < limit; step++) {
      if (value < 0 || value > max) return Math.max(0, Math.min(max, value));
      blank = dirty(value) ? 0 : blank + 1;
      if (blank >= 4) return value;
      value += direction;
    }
    throw new Error('文字边界仍与其他内容相连，请扩大手动选框；已保留原图');
  };
  left = expand(left, -1, Math.ceil(w * 0.12), w - 1, dirtyVertical);
  right = expand(right, 1, Math.ceil(w * 0.12), w - 1, dirtyVertical);
  top = expand(top, -1, Math.ceil(h * 0.06), h - 1, dirtyHorizontal);
  bottom = expand(bottom, 1, Math.ceil(h * 0.06), h - 1, dirtyHorizontal);
  return { x: left / w, y: top / h, width: (right - left) / w, height: (bottom - top) / h };
}

/** 把正文按顺序切成与图片数量一致的段落，尽量按句读均衡 */
function splitParagraphs(body: string, count: number): string[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((part: string) => part.trim())
    .filter(Boolean);
  const units =
    paragraphs.length >= count ? paragraphs : (body.match(/[^。！？\n]+[。！？\n]*/gu) ?? [body]);
  const sections: string[][] = Array.from({ length: count }, () => [] as string[]);
  let cursor = 0;
  let remaining = units.reduce((sum: number, part: string) => sum + part.length, 0);
  for (let page = 0; page < count; page += 1) {
    const target = remaining / (count - page);
    let length = 0;
    while (cursor < units.length) {
      if (page < count - 1 && length > 0 && (length >= target || units.length - cursor <= count - page - 1)) break;
      const part = units[cursor];
      cursor += 1;
      sections[page].push(part);
      length += part.length;
    }
    remaining -= length;
  }
  return sections.map((parts: string[]) => parts.join('\n\n'));
}

/**
 * 把合成图的「纯色背景」抠成透明，只保留文字与图表/图片。
 * 做法：取画布四边环带采样，聚出占比最高的两种底色（页白 + 卡片底色），
 * 再把全图与这两种底色接近的像素 alpha 置 0。这样套用卡片模板时，
 * 模板自身的背景会透出来，不再带着截图里那块黄色/白色背景。
 * 文字笔画、图表线条与色块与底色差异大，会被保留。
 */
function removeFlatBackground(source: HTMLCanvasElement): string {
  const width = source.width;
  const height = source.height;
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source.toDataURL('image/png');
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return source.toDataURL('image/png');
  }
  const data = imageData.data;
  const sample = (x: number, y: number): [number, number, number] => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const samples: Array<[number, number, number]> = [];
  const stepX = Math.max(1, Math.floor(width / 80));
  const stepY = Math.max(1, Math.floor(height / 80));
  for (let x = 2; x < width - 2; x += stepX) {
    samples.push(sample(x, 2));
    samples.push(sample(x, height - 3));
  }
  for (let y = 2; y < height - 2; y += stepY) {
    samples.push(sample(2, y));
    samples.push(sample(width - 3, y));
  }
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (const [r, g, b] of samples) {
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const value = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    value.count += 1;
    value.r += r;
    value.g += g;
    value.b += b;
    buckets.set(key, value);
  }
  const total = samples.length || 1;
  const backgrounds = [...buckets.values()]
    .filter((value) => value.count / total >= 0.06)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((value) => ({ r: value.r / value.count, g: value.g / value.count, b: value.b / value.count }));
  if (backgrounds.length === 0) return source.toDataURL('image/png');
  const tolerance = 34;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    for (const bg of backgrounds) {
      if (Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b) <= tolerance) {
        data[i + 3] = 0;
        break;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return source.toDataURL('image/png');
}


export function OriginalImageEditor({ images, body, onOutputs }: { images: ImageItem[]; body: string; onOutputs?: (outputs: Record<number, string>) => void }) {
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Record<number, string>>({});
  /** 供卡片套模板用的「透明底」版本：只保留文字与图表，背景交给模板 */
  const [cardResults, setCardResults] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchIndex, setBatchIndex] = useState<number | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState('');
  const runners = useRef<Map<number, Runner>>(new Map());

  useEffect(() => { onOutputs?.(cardResults); }, [cardResults, onOutputs]);

  const sections = useMemo(() => splitParagraphs(body, images.length), [body, images.length]);

  /** 每张图把自己的执行函数注册给父级，供「一键全部换字」顺序调用 */
  const register = useCallback((index: number, runner: Runner | null) => {
    if (runner) runners.current.set(index, runner);
    else runners.current.delete(index);
  }, []);

  const handlePageResult = useCallback((index: number, url: string | null, message: string) => {
    setResults((prev: Record<number, string>) => {
      const next = { ...prev };
      if (url) next[index] = url;
      else delete next[index];
      return next;
    });
    setErrors((prev: Record<number, string>) => {
      const next = { ...prev };
      if (url) delete next[index];
      else next[index] = message;
      return next;
    });
  }, []);

  /** 卡片专用：接收透明底版本 */
  const handleCardResult = useCallback((index: number, url: string | null) => {
    setCardResults((prev: Record<number, string>) => {
      const next = { ...prev };
      if (url) next[index] = url;
      else delete next[index];
      return next;
    });
  }, []);

  const runAll = useCallback(async () => {
    setBatchBusy(true);
    setZipError('');
    const nextResults: Record<number, string> = {};
    const nextErrors: Record<number, string> = {};
    for (let i = 0; i < images.length; i += 1) {
      setBatchIndex(i);
      setActive(i);
      const runner = runners.current.get(i);
      if (!runner) {
        nextErrors[i] = '页面未就绪，请刷新后重试';
        continue;
      }
      try {
        const url = await runner();
        if (url) nextResults[i] = url;
        else nextErrors[i] = '未生成，请检查该张的选区或文案';
      } catch (cause: unknown) {
        nextErrors[i] = cause instanceof Error ? cause.message : '生成失败';
      }
      setResults({ ...nextResults });
      setErrors({ ...nextErrors });
    }
    setBatchIndex(null);
    setBatchBusy(false);
  }, [images.length]);

  const downloadAll = useCallback(async () => {
    const entries = images
      .map((image: ImageItem, i: number) => ({ index: i, url: results[i] }))
      .filter((item: { index: number; url: string }) => Boolean(item.url));
    if (entries.length === 0) {
      setZipError('还没有生成结果，请先点「一键全部换字」');
      return;
    }
    setZipBusy(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const entry of entries) {
        const response = await fetch(entry.url);
        zip.file(`原图换字_第${String(entry.index + 1).padStart(2, '0')}张.png`, await response.blob());
      }
      zip.file(
        '导出说明.txt',
        [
          '原图换字导出说明',
          '',
          `共 ${entries.length} 张，每张只替换文字区域，图表与其它像素保持原样。`,
          ...entries.map((entry: { index: number; url: string }) => `第 ${entry.index + 1} 张：原图换字_第${String(entry.index + 1).padStart(2, '0')}张.png`),
        ].join('\n'),
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `原图换字_${entries.length}张.zip`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setZipError('打包下载失败，请重试');
    } finally {
      setZipBusy(false);
    }
  }, [images, results]);

  /** 把所有已生成的结果纵向拼成一张长图 */
  const downloadAllLong = useCallback(async () => {
    const urls = images
      .map((_image: ImageItem, i: number) => results[i])
      .filter((url: string): url is string => Boolean(url));
    if (urls.length === 0) {
      setZipError('还没有生成结果，请先点「一键全部换字」');
      return;
    }
    setZipBusy(true);
    try {
      const loaded = await Promise.all(
        urls.map(
          (url: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () => reject(new Error('图片读取失败'));
              img.src = url;
            }),
        ),
      );
      const gap = 40;
      const width = Math.max(...loaded.map((img: HTMLImageElement) => img.naturalWidth));
      const height = loaded.reduce((sum: number, img: HTMLImageElement) => sum + img.naturalHeight, 0) + gap * (loaded.length - 1);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('画布创建失败');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      let y = 0;
      for (const img of loaded) {
        ctx.drawImage(img, Math.round((width - img.naturalWidth) / 2), y);
        y += img.naturalHeight + gap;
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('导出失败');
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `原图换字_${urls.length}张长图.png`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      setZipError('');
    } catch {
      setZipError('长图导出失败，请重试');
    } finally {
      setZipBusy(false);
    }
  }, [images, results]);

  const doneCount = Object.keys(results).length;

  return (
    <div className="mt-5">
      <h3 className="font-bold">一图一段 · 按正文顺序分配</h3>
      <p className="mt-2 text-sm text-[#6B655C]">
        每张图片独立保存替换文字、选区与预览。可一键把全部图片都换掉，也可以逐张微调。
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(26,24,20,0.08)] bg-[#FAF7F1] p-3">
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={batchBusy || images.length === 0}
          className="rounded-full bg-[#FF2E4D] px-5 py-2.5 text-sm font-bold text-white shadow-[0_2px_10px_rgba(255,46,77,0.25)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
        >
          {batchBusy
            ? `正在逐张换字… ${batchIndex === null ? '' : `${batchIndex + 1}/${images.length}`}`
            : `一键全部换字（${images.length} 张）`}
        </button>
        <button
          type="button"
          onClick={() => void downloadAll()}
          disabled={zipBusy || doneCount === 0}
          className="rounded-full border border-[#1A1814] px-4 py-2.5 text-sm font-bold text-[#1A1814] transition-colors duration-150 hover:bg-[#1A1814] hover:text-[#FAF7F1] disabled:opacity-40"
        >
          {zipBusy ? '正在打包…' : `打包下载全部（${doneCount} 张 ZIP）`}
        </button>
        <span className="text-[11px] text-[#6B655C]">
          {`已完成 ${doneCount}/${images.length} 张；失败的那张会保留原图并提示原因`}
        </span>
        {zipError ? <span className="text-[11px] font-medium text-[#E01335]">{zipError}</span> : null}
      </div>

      <div className="my-3 flex flex-wrap gap-2">
        {images.map((image: ImageItem, i: number) => (
          <button
            type="button"
            key={image.id}
            onClick={() => setActive(i)}
            className={`relative rounded-full border px-3 py-2 text-sm ${active === i ? 'border-[#FF2E4D] text-[#FF2E4D]' : 'border-[rgba(26,24,20,0.14)] text-[#6B655C]'}`}
          >
            {`原图 ${i + 1} · ${sections[i].length} 字`}
            {results[i] ? (
              <span className="ml-1 text-[10px] font-black text-[#12A150]">已完成</span>
            ) : errors[i] ? (
              <span className="ml-1 text-[10px] font-black text-[#E01335]">待处理</span>
            ) : null}
          </button>
        ))}
      </div>

      {images.map((image: ImageItem, i: number) => (
        <div key={`${image.id}:${body}`} hidden={active !== i}>
          <ImagePageEditor
            image={image}
            pageIndex={i}
            body={sections[i]}
            pageNumber={i + 1}
            onRegister={register}
            onResult={handlePageResult}
            onCardResult={handleCardResult}
            onDownloadAll={() => void downloadAll()}
            onDownloadLong={() => void downloadAllLong()}
            zipBusy={zipBusy}
            readyCount={doneCount}
          />
        </div>
      ))}
    </div>
  );
}

interface ImagePageEditorProps {
  image: ImageItem;
  pageIndex: number;
  body: string;
  pageNumber: number;
  onRegister: (index: number, runner: Runner | null) => void;
  onResult: (index: number, url: string | null, message: string) => void;
  /** 卡片专用透明底结果 */
  onCardResult: (index: number, url: string | null) => void;
  /** 下载整套（ZIP） */
  onDownloadAll: () => void;
  /** 下载整套长图 */
  onDownloadLong: () => void;
  zipBusy: boolean;
  readyCount: number;
}

function ImagePageEditor({
  image,
  pageIndex,
  body,
  pageNumber,
  onRegister,
  onResult,
  onCardResult,
  onDownloadAll,
  onDownloadLong,
  zipBusy,
  readyCount,
}: ImagePageEditorProps) {
  const [text, setText] = useState(body);
  const [rect, setRect] = useState<Rect | null>(null);
  const [background, setBackground] = useState('#fffff5');
  const [foreground, setForeground] = useState('#352a12');
  const [autoBackground, setAutoBackground] = useState(true);
  const [fontSize, setFontSize] = useState(48);
  const [bold, setBold] = useState(false);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [output, setOutput] = useState('');
  const [smartRegions, setSmartRegions] = useState<TextReplacement[]>([]);
  const [activeRegion, setActiveRegion] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [smartBusy, setSmartBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const start = useRef<Point | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const requestId = useRef(0);
  const src = image.originalDataUrl ?? image.fullDataUrl ?? image.dataUrl;
  const invalidate = () => {
    setOutput('');
    setError('');
    onResult(pageIndex, null, '');
  };

  const point = (event: PointerEvent<HTMLDivElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const generate = (options?: TextReplacement | TextReplacement[]): string | null => {
    const manual = { rect, text, fontSize, bold, foreground, lineHeight };
    const targets = options ? (Array.isArray(options) ? options : [options]) : smartRegions.length ? smartRegions.map((r, i) => i === activeRegion ? manual : r) : [manual];
    if (!options && smartRegions.length) setSmartRegions(targets);
    const target = targets[0];
    const imageEl = imageRef.current;
    if (!imageEl?.complete || !imageEl.naturalWidth || !target.rect || target.rect.width < 0.01 || target.rect.height < 0.01) {
      setError('请在原图上拖动，框住需要替换的整段文字。');
      return null;
    }
    if (!target.text.trim()) {
      setError('请填写替换文字。');
      return null;
    }
    setBusy(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imageEl.naturalWidth;
      canvas.height = imageEl.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('浏览器无法创建画布');
      ctx.drawImage(imageEl, 0, 0);
      for (const target of targets) {
      if (!target.rect || !target.text.trim()) throw new Error('文字区域识别不完整，原图已保留');
      const x = Math.round(target.rect.x * canvas.width);
      const y = Math.round(target.rect.y * canvas.height);
      const width = Math.min(canvas.width - x, Math.round(target.rect.width * canvas.width));
      const height = Math.min(canvas.height - y, Math.round(target.rect.height * canvas.height));
      const padding = Math.max(2, Math.round(width * 0.02));
      let lines: string[] = [];
      let size = target.fontSize;
      const minimumSize = Math.min(
        target.fontSize,
        Math.max(12, Math.round(canvas.width * 0.022), Math.floor(target.fontSize * 0.7)),
      );
      for (; size >= minimumSize; size -= 1) {
        ctx.font = `${target.bold ? 700 : 400} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;
        lines = [];
        for (const paragraph of target.text.split('\n')) {
          let line = '';
          for (const char of paragraph) {
            if (ctx.measureText(line + char).width > width - padding * 2) {
              if (line) lines.push(line);
              line = char;
            } else {
              line += char;
            }
          }
          lines.push(line);
        }
        if (lines.length * size * target.lineHeight <= height - padding * 2) break;
      }
      if (
        size < minimumSize ||
        lines.length * size * target.lineHeight > height - padding * 2 ||
        Array.from(target.text).some((char: string) => ctx.measureText(char).width > width - padding * 2)
      ) {
        throw new Error('本页文字仍超出安全文字区，原文已保留。可点「AI 适配本段」生成更短版本，或增加图片重新分段；不会覆盖图表或强行缩成小字。');
      }
      let fill = background;
      if (autoBackground) {
        const pixels = ctx.getImageData(x, y, width, height).data;
        const colors = new Map<number, { count: number; r: number; g: number; b: number }>();
        for (let i = 0; i < pixels.length; i += 16) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
          const value = colors.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
          value.count += 1;
          value.r += r;
          value.g += g;
          value.b += b;
          colors.set(key, value);
        }
        const dominant = [...colors.values()].sort((a, b) => b.count - a.count)[0];
        if (dominant) {
          fill = `rgb(${Math.round(dominant.r / dominant.count)}, ${Math.round(dominant.g / dominant.count)}, ${Math.round(dominant.b / dominant.count)})`;
        }
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = target.foreground;
      ctx.textBaseline = 'top';
      lines.forEach((line: string, row: number) => {
        ctx.fillText(line, x + padding, y + padding + row * size * target.lineHeight);
      });
      ctx.restore();
      }
      // 预览/下载用：完整合成图（保留原图背景，贴合原图观感）
      const url = canvas.toDataURL('image/png');
      // 卡片套模板用：抠掉纯色背景，只留文字与图表，让模板背景透出
      const cardUrl = removeFlatBackground(canvas);
      setOutput(url);
      onCardResult(pageIndex, cardUrl);
      onResult(pageIndex, url, '');
      return url;
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : '生成失败，请重试';
      setError(message);
      onResult(pageIndex, null, message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const smartEdit = async (): Promise<string | null> => {
    if (!imageRef.current?.naturalWidth) {
      setError('请等待原图加载完成');
      return null;
    }
    const id = requestId.current + 1;
    requestId.current = id;
    setSmartBusy(true);
    setOutput('');
    setError('');
    setProgress('正在识别文字区域和排版…');
    try {
      const sourceImage = imageRef.current;
      const detectionCanvas = document.createElement('canvas');
      detectionCanvas.width = sourceImage.naturalWidth; detectionCanvas.height = sourceImage.naturalHeight;
      const detectionContext = detectionCanvas.getContext('2d')!;
      detectionContext.drawImage(sourceImage, 0, 0);
      const localRegions = detectFlatTextRegions(detectionContext.getImageData(0, 0, detectionCanvas.width, detectionCanvas.height).data, detectionCanvas.width, detectionCanvas.height);
      const response = await fetch('/api/smart-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: image.dataUrl, body: body, regions: localRegions, apiKey: loadDeepseekKey(), baseUrl: loadDeepseekBaseUrl() }),
      });
      const raw = await readSseStream(response, (value: string) => {
        if (id === requestId.current) setProgress(`正在适配短文案与字号… 已接收 ${value.length} 字`);
      });
      if (id !== requestId.current) return null;
      type Region = { rect: Rect; sourceText: string; text: string; fontRatio?: number; bold?: boolean; foreground?: string; lineHeight?: number };
      const data = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as { safe?: boolean; reason?: string; regions?: Region[] };
      if (!data.safe) throw new Error(data.reason || '未识别到可安全替换的文字区，请手动框选');
      if (!data.regions?.length || data.regions.length > 16) throw new Error('识别结果不完整，请重试');
      if (localRegions.length && data.regions.length !== localRegions.length) throw new Error('部分文字区尚未识别完整，请重新识别');
      const replacements: TextReplacement[] = data.regions.map((region, regionIndex) => {
        const r = region.rect;
        if (!r || ![r.x,r.y,r.width,r.height].every(Number.isFinite) || r.x < 0 || r.y < 0 || r.width < .01 || r.height < .01 || r.x+r.width>1 || r.y+r.height>1 || typeof region.text !== 'string' || !region.text.trim() || region.text.length>1200) throw new Error('识别结果不完整，请重试');
        const count = (value: string) => Array.from(value.replace(/\s/gu, '')).length;
        if (typeof region.sourceText !== 'string' || count(region.sourceText) !== count(region.text)) throw new Error('新旧文字字数未对齐，原图已保留，请重试');
        return { rect: localRegions[regionIndex] ?? completeTextBounds(imageRef.current!, r, true), text: region.text,
          fontSize: Math.round(imageRef.current!.naturalWidth * Math.max(.015, Math.min(.12, Number(region.fontRatio)||.045))),
          bold: region.bold === true, foreground: /^#[0-9a-f]{6}$/i.test(region.foreground ?? '') ? region.foreground! : '#352a12', lineHeight: Math.max(1.1,Math.min(1.8,Number(region.lineHeight)||1.5)) };
      });
      for (let i=0;i<replacements.length;i++) for(let j=i+1;j<replacements.length;j++) {
        const a=replacements[i].rect!, b=replacements[j].rect!;
        if (Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x) && Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)) throw new Error('识别文字区有重叠，已保留原图，请重试');
      }
      setSmartRegions(replacements); setActiveRegion(0);
      const first = replacements[0];
      setRect(first.rect); setText(first.text); setFontSize(first.fontSize); setBold(first.bold); setForeground(first.foreground); setLineHeight(first.lineHeight);
      const url = generate(replacements);
      setProgress(url ? '整页 ' + replacements.length + ' 个文字区已全部换字，新旧字数一致。可选择各区域继续调整。' : '文字合成未完成，原图已保留。');
      return url;
    } catch (cause: unknown) {
      if (id === requestId.current) {
        const message = cause instanceof Error ? cause.message : '智能换字失败';
        setError(message);
        setProgress('');
        onResult(pageIndex, null, message);
      }
      return null;
    } finally {
      if (id === requestId.current) setSmartBusy(false);
    }
  };

  const smartEditRef = useRef(smartEdit);
  smartEditRef.current = smartEdit;

  useEffect(() => {
    onRegister(pageIndex, async () => smartEditRef.current());
    return () => onRegister(pageIndex, null);
  }, [onRegister, pageIndex]);

  return (
    <section className="mt-5 rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-5">
      <h3 className="text-lg font-bold">{`第 ${pageNumber} 张 · 替换本段文字`}</h3>
      <details className="my-3 rounded-lg bg-[#FAF7F1] p-3 text-sm">
        <summary>{'查看本页分配的正文（保留原文）'}</summary>
        <p className="mt-2 whitespace-pre-wrap">{body || '这张图没有分配到正文，可自行填写。'}</p>
      </details>
      <p className="mt-2 text-sm text-[#6B655C]">
        在图片上拖动框住旧文案，再点击生成。只覆盖框内区域，框外像素保持不变。适用于纯色文字底；请勿把图表框进去。
      </p>
      <div className="my-4 flex flex-wrap gap-2">
        {output ? <img src={output} alt="本页生成结果缩略图" className="h-10 w-10 rounded border object-cover" /> : null}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <div
            className="relative touch-none select-none overflow-hidden rounded-lg border border-black/10"
            onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
              setSmartRegions([]);
              if (event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              start.current = point(event);
              setRect({ ...start.current, width: 0, height: 0 });
              invalidate();
            }}
            onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
              if (!start.current) return;
              const end = point(event);
              setRect({
                x: Math.min(start.current.x, end.x),
                y: Math.min(start.current.y, end.y),
                width: Math.abs(end.x - start.current.x),
                height: Math.abs(end.y - start.current.y),
              });
            }}
            onPointerUp={() => {
              start.current = null;
            }}
            onPointerCancel={() => {
              start.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={src}
              alt="拖动框选需要替换的文字"
              draggable={false}
              className="block h-auto w-full"
              onError={() => setError('原图加载失败，请重新上传')}
            />
            {rect ? (
              <div
                className="pointer-events-none absolute border-2 border-[#FF2E4D] bg-[#FF2E4D]/10"
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.width * 100}%`,
                  height: `${rect.height * 100}%`,
                }}
              />
            ) : null}
          </div>
          <button
            type="button"
            className="mt-2 text-sm underline"
            onClick={() => {
              setRect(null);
              setSmartRegions([]);
              invalidate();
            }}
          >
            清除选区
          </button>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-bold">
            替换文字
            {smartRegions.length > 1 && <select aria-label="选择文字区域" className="ml-2 border rounded p-1 text-sm" value={activeRegion} onChange={e => {
              const index = Number(e.target.value);
              setSmartRegions(prev => prev.map((r, i) => i === activeRegion ? { rect, text, fontSize, bold, foreground, lineHeight } : r));
              const region = smartRegions[index];
              setActiveRegion(index); setRect(region.rect); setText(region.text); setFontSize(region.fontSize); setBold(region.bold); setForeground(region.foreground); setLineHeight(region.lineHeight);
            }}>{smartRegions.map((r, i) => <option key={i} value={i}>区域 {i + 1}（{Array.from(r.text.replace(/\s/gu, '')).length}字）</option>)}</select>}
            <textarea
              value={text}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                setText(event.target.value);
                invalidate();
              }}
              className="mt-2 min-h-48 w-full rounded-xl border border-black/15 p-3 font-normal"
            />
          </label>
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              className="rounded-full border px-3 py-2"
              onClick={() => {
                setText('1 2 3 4');
                invalidate();
              }}
            >
              试用 1 2 3 4
            </button>
            <button
              type="button"
              className="rounded-full border px-3 py-2"
              onClick={() => {
                setText(body);
                invalidate();
              }}
            >
              恢复本页段落
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label>
              <input
                type="checkbox"
                checked={autoBackground}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setAutoBackground(event.target.checked);
                  invalidate();
                }}
              />
              {' 自动匹配原图底色'}
            </label>
            <label>
              {'字号（原图像素）'}
              <input
                aria-label="字号"
                type="number"
                min={8}
                max={200}
                value={fontSize}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setFontSize(Math.max(8, Math.min(200, Number(event.target.value) || 8)));
                  invalidate();
                }}
                className="ml-2 w-20 rounded border p-1"
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={bold}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setBold(event.target.checked);
                  invalidate();
                }}
              />
              {' 粗体'}
            </label>
            <label>
              {'行距'}
              <select
                value={lineHeight}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  setLineHeight(Number(event.target.value));
                  invalidate();
                }}
                className="ml-2 rounded border p-1"
              >
                <option value={1.2}>1.2</option>
                <option value={1.5}>1.5</option>
                <option value={1.8}>1.8</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-[#6B655C]">
            短标题区域请填短文案。自动底色适合纯色背景，不会修复纹理；字号与粗细可按原图调整。
          </p>
          <div className="flex gap-4 text-sm">
            <label>
              {'手动底色（关闭自动匹配后生效）'}
              <input
                aria-label="区域底色"
                type="color"
                value={background}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setBackground(event.target.value);
                  invalidate();
                }}
              />
            </label>
            <label>
              {'文字颜色'}
              <input
                aria-label="文字颜色"
                type="color"
                value={foreground}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setForeground(event.target.value);
                  invalidate();
                }}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || smartBusy}
            onClick={() => void smartEdit()}
            className="w-full rounded-full bg-[#FF2E4D] px-5 py-3 font-bold text-white disabled:opacity-40"
          >
            {smartBusy ? 'AI 正在识别并生成…' : 'AI 智能换字 · 原图不动'}
          </button>
          <button
            type="button"
            disabled={busy || smartBusy || !rect}
            onClick={() => generate()}
            className="w-full rounded-full bg-[#1A1814] px-5 py-3 font-bold text-white disabled:opacity-40"
          >
            {busy ? '正在生成…' : '手动生成图文卡片 · 只换文字'}
          </button>
          {progress ? <p className="text-xs text-[#6B655C]">{progress}</p> : null}
          {error ? (
            <p role="alert" className="text-sm text-[#E01335]">
              {error}
            </p>
          ) : null}
          {output ? (
            <div className="space-y-3">
              <p className="text-sm font-bold">生成结果（原尺寸 PNG）</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={output} alt="只替换选中文字的生成结果" className="h-auto w-full rounded-lg border" />
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={output}
                  download={`原图换字-${pageNumber}.png`}
                  className="inline-block rounded-full bg-[#FF2E4D] px-5 py-2 font-bold text-white"
                >
                  下载这一张
                </a>
                <button
                  type="button"
                  onClick={onDownloadAll}
                  disabled={zipBusy || readyCount === 0}
                  className="rounded-full border border-[#1A1814] px-5 py-2 font-bold text-[#1A1814] transition-colors duration-150 hover:bg-[#1A1814] hover:text-[#FAF7F1] disabled:opacity-40"
                >
                  {zipBusy ? '正在打包…' : `下载整套（${readyCount} 张 ZIP）`}
                </button>
                <button
                  type="button"
                  onClick={onDownloadLong}
                  disabled={zipBusy || readyCount === 0}
                  className="rounded-full border border-[rgba(26,24,20,0.2)] px-5 py-2 font-bold text-[#6B655C] transition-colors duration-150 hover:border-[#1A1814] hover:text-[#1A1814] disabled:opacity-40"
                >
                  下载整套长图
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}


'use client';
import { loadDeepseekKey, loadDeepseekBaseUrl } from '@/lib/storage';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Camera,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  X,
} from 'lucide-react';
import { CardItem } from './CardItem';
import { buildCardContents } from '@/lib/card-content';
import {
  DEFAULT_IMAGE_MODEL_ID,
  getImageModel,
  IMAGE_MODELS,
} from '@/lib/model';
import {
  loadImageModelId,
  saveImageModelId,
} from '@/lib/storage';
import type { CardContent, CardLayoutId, RewriteResult } from '@/lib/types';

const CARD_W = 1080;
const CARD_H = 1440;
const MIN_CARD_COUNT = 3;
const MAX_CARD_COUNT = 12;

/**
 * 从整屏参考截图中提取下方视觉素材（图表/照片），去掉顶部旧文案区。
 * 做法：按行/列统计"着墨率"（与背景色差异明显的像素占比），
 * 文字行着墨率低（几个百分点），图表/照片行着墨率高（几十个百分点），
 * 取最大连续高着墨区域作为素材范围，按原图 1:1 像素裁出（PNG 无损），
 * 保证卡片里的图表与原图逐像素一致，不缩放、不重绘、不裁切内容。
 */
/**
 * 从整屏参考截图中提取下方视觉素材（图表/照片），去掉顶部旧文案区。
 * 做法：先统计全图众数色作为"纸面底色"，再按行/列统计着墨率——
 * 文字行着墨率低（几个百分点），图表/照片行着墨率高（几十个百分点），
 * 取最大连续高着墨区域作为素材范围，按原图 1:1 像素裁出（PNG 无损）。
 * 任何异常都退化到"保留整图"，绝不返回空，确保卡片里永远是原图而不是 AI 生成的图。
 */
function extractReferenceVisual(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const fallback = () => resolve(src);
      try {
        // 分析用小图（提速），最终从原图裁切，保证像素一致
        const maxW = 900;
        const scale = Math.min(1, maxW / image.width);
        const w = Math.max(1, Math.round(image.width * scale));
        const h = Math.max(1, Math.round(image.height * scale));
        const probe = document.createElement('canvas');
        probe.width = w;
        probe.height = h;
        const probeCtx = probe.getContext('2d', { willReadFrequently: true });
        if (!probeCtx) {
          fallback();
          return;
        }
        probeCtx.drawImage(image, 0, 0, w, h);
        const { data } = probeCtx.getImageData(0, 0, w, h);

        // 底色 = 全图众数色（对黑边/状态栏截图更稳，避免四角取平均失真）
        const buckets = new Map<number, number>();
        for (let y = 0; y < h; y += 3) {
          for (let x = 0; x < w; x += 3) {
            const i = (y * w + x) * 4;
            const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
            buckets.set(key, (buckets.get(key) ?? 0) + 1);
          }
        }
        let bestKey = 0;
        let bestCount = -1;
        buckets.forEach((value, key) => {
          if (value > bestCount) {
            bestCount = value;
            bestKey = key;
          }
        });
        const br = ((bestKey >> 8) & 15) * 16 + 8;
        const bg = ((bestKey >> 4) & 15) * 16 + 8;
        const bb = (bestKey & 15) * 16 + 8;
        const isInk = (index: number) =>
          Math.abs(data[index] - br) + Math.abs(data[index + 1] - bg) + Math.abs(data[index + 2] - bb) > 90;

        /** 列出所有连续满足阈值的区间 */
        const bandsOf = (ratios: Float32Array, min: number): Array<{ start: number; end: number; len: number }> => {
          const bands: Array<{ start: number; end: number; len: number }> = [];
          let start = -1;
          for (let i = 0; i < ratios.length; i += 1) {
            if (ratios[i] >= min) {
              if (start < 0) start = i;
            } else if (start >= 0) {
              bands.push({ start, end: i - 1, len: i - start });
              start = -1;
            }
          }
          if (start >= 0) bands.push({ start, end: ratios.length - 1, len: ratios.length - start });
          return bands;
        };

        /**
         * 选素材区间：截图结构固定为「上文案、下图片」，
         * 因此只在偏下区域挑最长的高着墨区间，避免把顶部密集文字误判成图片。
         */
        const pickBand = (
          ratios: Float32Array,
          min: number,
          minStartRatio: number,
          minLenRatio: number,
        ): { start: number; end: number } => {
          const total = ratios.length;
          const bands = bandsOf(ratios, min).filter(
            (band) => band.start >= total * minStartRatio && band.len >= total * minLenRatio,
          );
          if (bands.length === 0) return { start: 0, end: -1 };
          bands.sort((a, b) => b.len - a.len);
          return { start: bands[0].start, end: bands[0].end };
        };

        const stepX = Math.max(1, Math.floor(w / 400));
        let sampledX = 0;
        for (let x = 0; x < w; x += stepX) sampledX += 1;
        const darkBase = br + bg + bb < 180;

        // 信号一：行着墨率（文字行、图片行都有墨，用于兜底）
        const rowInk = new Float32Array(h);
        // 信号二：行色彩种类数——文字只有「底色 + 字色」一两种，图表/照片颜色丰富，
        // 这个信号在浅底和深底截图上都成立，是区分「文字区 / 图片区」的主判据
        const rowColors = new Float32Array(h);
        const bgKey = ((br >> 4) << 8) | ((bg >> 4) << 4) | (bb >> 4);
        for (let y = 0; y < h; y += 1) {
          let inkCount = 0;
          const seen = new Set<number>();
          const rowOffset = y * w;
          for (let x = 0; x < w; x += stepX) {
            const i = (rowOffset + x) * 4;
            if (isInk(i)) inkCount += 1;
            const key = ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5);
            if (key !== bgKey) seen.add(key);
          }
          rowInk[y] = inkCount / sampledX;
          rowColors[y] = seen.size;
        }

        // 纸面底色：取文案区（顶部 8%~45%）的众数色，代表「笔记页背景」，
        // 图片区（图表/照片）会大面积覆盖它不是这个颜色的像素
        const pageBuckets = new Map<number, number>();
        for (let y = Math.round(h * 0.08); y < Math.round(h * 0.45); y += 2) {
          for (let x = 0; x < w; x += 3) {
            const i = (y * w + x) * 4;
            const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
            pageBuckets.set(key, (pageBuckets.get(key) ?? 0) + 1);
          }
        }
        let pageKey = bgKey;
        let pageCount = -1;
        pageBuckets.forEach((value, key) => {
          if (value > pageCount) {
            pageCount = value;
            pageKey = key;
          }
        });
        const pr = ((pageKey >> 8) & 15) * 16 + 8;
        const pg = ((pageKey >> 4) & 15) * 16 + 8;
        const pb = (pageKey & 15) * 16 + 8;
        const isOffPage = (index: number) =>
          Math.abs(data[index] - pr) + Math.abs(data[index + 1] - pg) + Math.abs(data[index + 2] - pb) > 90;

        // 主判据：整行几乎都「不是纸面底色」= 图片区（文字行有大量底色留白，比例上不去）
        const rowCovered = new Float32Array(h);
        for (let y = 0; y < h; y += 1) {
          let count = 0;
          const rowOffset = y * w;
          for (let x = 0; x < w; x += stepX) {
            if (isOffPage((rowOffset + x) * 4)) count += 1;
          }
          rowCovered[y] = count / sampledX;
        }

        const coveredBand = pickBand(rowCovered, 0.5, 0.05, 0.12);

        // 顶部是否真的有「文字区」：着墨率低（大量底色留白）+ 色彩单调
        let hasTextTop = false;
        for (let y = Math.round(h * 0.05); y < Math.round(h * 0.45); y += 1) {
          if (rowInk[y] >= 0.02 && rowInk[y] <= 0.35 && rowColors[y] <= 6) {
            hasTextTop = true;
            break;
          }
        }

        const colorBand = pickBand(rowColors, 5, 0.12, 0.15);
        const inkBand = pickBand(rowInk, darkBase ? 0.1 : 0.16, 0.12, 0.15);
        const hasVisualBand = coveredBand.end - coveredBand.start >= h * 0.12
          || colorBand.end - colorBand.start >= h * 0.15
          || inkBand.end - inkBand.start >= h * 0.15;
        const averageInk = rowInk.reduce((sum, value) => sum + value, 0) / h;
        // 没有连续图片区域、只有稀疏文字的页面，不再回退为整张截图。
        // null 表示已确认没有图片素材，与尚未完成检测的 undefined 区分。
        if (!hasVisualBand && (hasTextTop || averageInk < 0.18)) {
          resolve(null);
          return;
        }
        let top = 0;
        let bottom = h - 1;
        if (coveredBand.end - coveredBand.start >= h * 0.12) {
          top = Math.max(0, coveredBand.start - Math.round(h * 0.004));
          bottom = Math.min(h - 1, coveredBand.end + Math.round(h * 0.004));
        } else if (colorBand.end - colorBand.start >= h * 0.15) {
          top = Math.max(0, colorBand.start - Math.round(h * 0.005));
          bottom = Math.min(h - 1, colorBand.end);
        } else if (inkBand.end - inkBand.start >= h * 0.15) {
          top = Math.max(0, inkBand.start - Math.round(h * 0.005));
          bottom = Math.min(h - 1, inkBand.end);
        } else {
          // 整屏就是一张图（没有文案），整张保留
          top = 0;
        }

        const bandH = bottom - top + 1;
        const stepY = Math.max(1, Math.floor(bandH / 400));
        let sampledY = 0;
        for (let y = top; y <= bottom; y += stepY) sampledY += 1;
        const colInk = new Float32Array(w);
        for (let x = 0; x < w; x += 1) {
          let count = 0;
          for (let y = top; y <= bottom; y += stepY) {
            if (isInk((y * w + x) * 4)) count += 1;
          }
          colInk[x] = count / Math.max(1, sampledY);
        }
        const colCovered = new Float32Array(w);
        for (let x = 0; x < w; x += 1) {
          let count = 0;
          for (let y = top; y <= bottom; y += stepY) {
            if (isOffPage((y * w + x) * 4)) count += 1;
          }
          colCovered[x] = count / Math.max(1, sampledY);
        }
        const coveredCol = pickBand(colCovered, 0.4, 0, 0.3);
        const colBand =
          coveredCol.end - coveredCol.start >= w * 0.3
            ? coveredCol
            : pickBand(colInk, darkBase ? 0.08 : 0.12, 0, 0.35);
        let left = 0;
        let right = w - 1;
        if (colBand.end - colBand.start >= w * 0.35) {
          left = Math.max(0, colBand.start - Math.round(w * 0.005));
          right = Math.min(w - 1, colBand.end);
        }

        // 映射回原图坐标，1:1 像素裁切（不重采样）
        const kx = image.width / w;
        const ky = image.height / h;
        const sx = Math.round(left * kx);
        const sy = Math.round(top * ky);
        const sw = Math.max(1, Math.round((right - left + 1) * kx));
        const sh = Math.max(1, Math.round((bottom - top + 1) * ky));

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const context = canvas.getContext('2d');
        if (!context) {
          fallback();
          return;
        }
        context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
        // 优先无损 PNG；超大图退回高质量 JPEG，保证一定能拿到结果
        let out = '';
        try {
          out = canvas.toDataURL('image/png');
        } catch {
          out = '';
        }
        if (!out || out.length < 64) {
          try {
            out = canvas.toDataURL('image/jpeg', 0.95);
          } catch {
            out = '';
          }
        }
        resolve(out && out.length > 64 ? out : src);
      } catch {
        fallback();
      }
    };
    image.onerror = () => resolve(src);
    image.src = src;
  });
}

interface CardDeckProps {
  result: RewriteResult;
  editedPages?: string[];
  layout: CardLayoutId;
  brandName: string;
  /** 工作台上传的参考图（dataURL），用于 AI 配图锁定主体 / 直接作为封面 */
  referenceImages?: string[];
  /** 与 referenceImages 一一对应的高清副本（长边≤2560）：提取素材与封面展示用 */
  referenceFullImages?: string[];
  /** 多套模板批量打包时用于标识这一套 */
  deckKey?: string;
  /** 把导出句柄交给父级（批量 ZIP 下载用） */
  registerDeck?: (key: string, handle: CardDeckExportHandle | null) => void;
  /** 全局字号缩放倍数（1 = 标准） */
  fontScale?: number;
}

/** 单套模板的导出句柄：逐页 PNG + 整组长图 */
export interface CardDeckExportHandle {
  exportPages: () => Promise<Array<{ fileName: string; blob: Blob }>>;
  exportStitched: () => Promise<Blob>;
}

/** 按容器宽度等比缩放渲染 1080x1440 卡片 */
function ScaledCard({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / CARD_W);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
    >
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('导出失败'));
    }, 'image/png');
  });
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

const EMPTY_REFERENCE_IMAGES: string[] = [];

export function CardDeck({
  result,
  layout,
  brandName,
  referenceImages = EMPTY_REFERENCE_IMAGES,
  referenceFullImages = EMPTY_REFERENCE_IMAGES,
  deckKey,
  registerDeck,
  editedPages,
  fontScale = 1,
}: CardDeckProps) {
  const [count, setCount] = useState(6);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [groupBusy, setGroupBusy] = useState(false);
  /** 每张卡片的配图（卡片序号 → dataURL），整组生成 */
  const [cardImages, setCardImages] = useState<Record<number, string>>({});
  const [illustrating, setIllustrating] = useState(false);
  const [illustrateProgress, setIllustrateProgress] = useState({
    done: 0,
    total: 0,
  });
  const [illustrateError, setIllustrateError] = useState<string | null>(null);
  const [imageModelId, setImageModelId] = useState(DEFAULT_IMAGE_MODEL_ID);
  /** 参考截图中提取出的视觉素材，作为封面/内容页底图复用 */
  const [referenceVisual, setReferenceVisual] = useState<string | null>(null);
  const [pageVisuals, setPageVisuals] = useState<Array<string | null>>([]);
  const [referenceVisualBusy, setReferenceVisualBusy] = useState(false);
  /** 原图取用方式：crop = 自动裁出的图表区域（默认）；full = 整张截图 */
  const [visualMode, setVisualMode] = useState<'crop' | 'full'>('crop');

  /** 当前选中的配图模型 */
  const imageModel = getImageModel(imageModelId);
  const imageCount = Object.keys(cardImages).length;

  useEffect(() => {
    setImageModelId(loadImageModelId());
  }, []);

  /** 素材提取源：优先高清副本，无则回退压缩版 */
  const visualSource = referenceFullImages[0] || referenceImages[0];

  useEffect(() => {
    let cancelled = false;
    const sources = referenceImages.map((src, index) => referenceFullImages[index] || src);
    setPageVisuals([]);
    void Promise.all(sources.map(async src => {
      try { return await extractReferenceVisual(src); } catch { return src; }
    })).then(visuals => { if (!cancelled) setPageVisuals(visuals); });
    return () => { cancelled = true; };
  }, [referenceImages, referenceFullImages]);

  const visualForPage = (index: number) => {
    if (index === 0) return undefined;
    const sourceIndex = index - 1;
    if (sourceIndex >= referenceImages.length) return undefined;
    if (visualMode === 'full') return referenceFullImages[sourceIndex] || referenceImages[sourceIndex];
    // 未识别完时不抢先嵌入整页，文字页也不回退成图片。
    return pageVisuals[sourceIndex] ?? undefined;
  };

  /** 卡片实际使用的原图：默认自动裁出的图表区域，可一键切换为整张截图 */
  const effectiveReference =
    visualMode === 'full' ? (visualSource ?? null) : referenceVisual;

  /** 有参考截图时自动保留下方图表/照片（无需手动点击）；换图自动重裁 */
  useEffect(() => {
    setVisualMode('crop');
    if (!visualSource) {
      setReferenceVisual(null);
      return;
    }
    let cancelled = false;
    setReferenceVisualBusy(true);
    void extractReferenceVisual(visualSource)
      .then((visual) => {
        if (!cancelled) setReferenceVisual(visual);
      })
      .catch(() => {
        if (!cancelled) setReferenceVisual(null);
      })
      .finally(() => {
        if (!cancelled) setReferenceVisualBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visualSource]);

  const contents = useMemo(
    () => {
      const pages = buildCardContents(result, Math.max(count, referenceImages.length + 2), brandName);
      while (pages.length - 2 < referenceImages.length) {
        pages.splice(pages.length - 1, 0, {
          kind: 'section', index: 0, total: 0,
          heading: '原图素材', paragraph: '',
        });
      }
      return pages.map((page, index) => ({ ...page, index, total: pages.length }));
    },
    [result, count, brandName, referenceImages.length],
  );

  /** 文案或卡片数量变化后，旧配图与新内容错位，直接清空 */
  useEffect(() => {
    setCardImages({});
    setIllustrateError(null);
  }, [result, count]);

  /** 为单张卡片生成配图（按页面角色定制构图），成功后就地生效 */
  const illustrateOne = useCallback(
    async (index: number, content: (typeof contents)[number]) => {
      const title = result.titles[0]?.trim() ?? '';
      const summary = [result.body.slice(0, 80), ...result.tags.slice(0, 5)]
        .filter(Boolean)
        .join('，');
      const res = await fetch('/api/illustrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          body: result.body,
          tags: result.tags,
          layout,
          modelId: imageModelId,
          relayKey: loadDeepseekKey(),
          relayBaseUrl: loadDeepseekBaseUrl(),
          refImages: referenceImages,
          pageRole:
            content.kind === 'cover'
              ? 'cover'
              : content.kind === 'end'
                ? 'end'
                : 'content',
          pageTitle:
            content.kind === 'section' ? content.heading : content.title,
          pageText:
            content.kind === 'section'
              ? content.paragraph
              : content.kind === 'end'
                ? (content.tags ?? []).join('、')
                : result.body.slice(0, 200),
        }),
      });
      const data = (await res.json()) as { image?: string; error?: string };
      if (!res.ok || !data.image) {
        throw new Error(data.error ?? '配图生成失败');
      }
      setCardImages((prev) => ({ ...prev, [index]: data.image as string }));
    },
    [result, layout, imageModelId, referenceImages],
  );

  /** 整组配图：封面 + 全部内容页 + 结尾页，3 路并发生成，逐张生效 */
  const handleIllustrate = useCallback(async () => {
    const title = result.titles[0]?.trim();
    if (!title || illustrating) return;
    setIllustrating(true);
    setIllustrateError(null);
    setCardImages({});
    const queue = contents.map((content, index) => ({ content, index }));
    setIllustrateProgress({ done: 0, total: queue.length });
    let cursor = 0;
    let failed = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const item = queue[cursor];
        cursor += 1;
        try {
          await illustrateOne(item.index, item.content);
        } catch {
          failed += 1;
        } finally {
          setIllustrateProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      }
    };
    try {
      await Promise.all(
        Array.from({ length: Math.min(3, queue.length) }, () => worker()),
      );
      if (failed === queue.length) {
        setIllustrateError('配图生成失败，请稍后重试');
      } else if (failed > 0) {
        setIllustrateError(`${failed} 张配图失败，再点一次可重新生成整组`);
      }
    } finally {
      setIllustrating(false);
    }
  }, [result, contents, illustrating, illustrateOne]);

  const hiddenRefs = useRef<(HTMLDivElement | null)[]>([]);

  const captureCard = useCallback(async (index: number) => {
    const { default: html2canvas } = await import('html2canvas');
    const el = hiddenRefs.current[index];
    if (!el) throw new Error(`卡片 ${index + 1} 尚未渲染`);
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (el.querySelector('[data-text-fit="overflow"]')) throw new Error(`第 ${index + 1} 张文字超出模板空间，请增加卡片页数后再导出`);
    return html2canvas(el, {
      backgroundColor: null,
      logging: false,
      useCORS: true,
      scale: 1,
      width: CARD_W,
      height: CARD_H,
    });
  }, []);

  const handleDownloadCard = useCallback(
    async (index: number) => {
      setBusyIndex(index);
      try {
        const canvas = await captureCard(index);
        downloadCanvas(canvas, `xhs-card-${String(index + 1).padStart(2, '0')}.png`);
      } finally {
        setBusyIndex(null);
      }
    },
    [captureCard],
  );

  const buildStitched = useCallback(async (): Promise<HTMLCanvasElement> => {
    const canvases = await Promise.all(contents.map((_, i) => captureCard(i)));
    const gap = 48;
    const width = CARD_W;
    const height =
      canvases.reduce((sum, c) => sum + c.height, 0) + gap * (canvases.length - 1);
    const stitch = document.createElement('canvas');
    stitch.width = width;
    stitch.height = height;
    const ctx = stitch.getContext('2d');
    if (!ctx) throw new Error('画布创建失败');
    ctx.fillStyle = '#FAF7F1';
    ctx.fillRect(0, 0, width, height);
    let y = 0;
    for (const c of canvases) {
      ctx.drawImage(c, 0, y);
      y += c.height + gap;
    }
    return stitch;
  }, [captureCard, contents]);

  const handleDownloadGroup = useCallback(async () => {
    setGroupBusy(true);
    try {
      const stitch = await buildStitched();
      downloadCanvas(stitch, `xhs-cards-${contents.length}p.png`);
    } finally {
      setGroupBusy(false);
    }
  }, [buildStitched, contents.length]);

  /** 逐页 PNG + 整组长图，供父级打 ZIP */
  useEffect(() => {
    if (!registerDeck) return;
    const key = deckKey ?? layout;
    const handle: CardDeckExportHandle = {
      exportPages: async () => {
        const pages: Array<{ fileName: string; blob: Blob }> = [];
        for (let i = 0; i < contents.length; i += 1) {
          const canvas = await captureCard(i);
          pages.push({
            fileName: `${String(i + 1).padStart(2, '0')}_${pages.length === 0 ? '封面' : i === contents.length - 1 ? '结尾页' : '内容页'}.png`,
            blob: await canvasToBlob(canvas),
          });
        }
        return pages;
      },
      exportStitched: async () => canvasToBlob(await buildStitched()),
    };
    registerDeck(key, handle);
    return () => registerDeck(key, null);
  }, [registerDeck, deckKey, layout, captureCard, buildStitched, contents.length]);

  return (
    <section className="rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-bold text-[#1A1814]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF2E4D]" aria-hidden />
          图文卡片
          <span className="text-[11px] font-normal text-[#9A948B]">
            1080×1440 · 3:4 · {contents.length} 张
          </span>
        </p>
        {editedPages && editedPages.length > 0 ? (
          <span className="text-[11px] font-normal text-[#9A948B]">
            文字重排模式 · 按模板重新排版文案 · 原图换字结果单独保留
          </span>
        ) : (
        <label className="flex items-center gap-2 rounded-full border border-[rgba(26,24,20,0.1)] bg-[#FAF7F1] px-3 py-1.5 text-[12px] font-medium text-[#6B655C]">
          组图张数
          <select
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            aria-label="选择生成的组图张数"
            className="rounded-full border border-[rgba(26,24,20,0.14)] bg-white px-2.5 py-1 text-[12px] font-bold text-[#1A1814] outline-none focus:border-[#FF2E4D]"
          >
            {Array.from(
              { length: MAX_CARD_COUNT - MIN_CARD_COUNT + 1 },
              (_, index) => MIN_CARD_COUNT + index,
            ).map((option) => (
              <option key={option} value={option}>
                {option} 张
              </option>
            ))}
          </select>
        </label>
        )}
      </div>

      {/* AI 配图工具栏（二合一模式隐藏） */}
      {(!editedPages || editedPages.length === 0) && (
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[rgba(26,24,20,0.08)] bg-[#FAF7F1] px-3 py-2.5">
        <button
          type="button"
          onClick={() => void handleIllustrate()}
          disabled={illustrating || !!effectiveReference}
          title={effectiveReference ? '已启用截图原图，卡片直接复用原图；如需 AI 配图请先点「已自动保留原图」移除' : 'AI 生成整组配图'}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1814] px-3.5 py-1.5 text-[12px] font-bold text-white transition-all duration-150 hover:bg-[#33302A] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {illustrating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" aria-hidden />
          )}
          {illustrating
            ? `正在配图 ${illustrateProgress.done}/${illustrateProgress.total}…`
            : 'AI 生成整组配图'}
        </button>
        {imageCount > 0 && !illustrating && (
          <button
            type="button"
            onClick={() => setCardImages({})}
            className="inline-flex items-center gap-1 rounded-full border border-[rgba(26,24,20,0.14)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#6B655C] transition-colors duration-150 hover:border-[#FF2E4D]/50 hover:text-[#E01335]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            移除全部配图
          </button>
        )}
        <select
          aria-label="配图模型"
          value={imageModelId}
          onChange={(e) => {
            setImageModelId(e.target.value);
            saveImageModelId(e.target.value);
          }}
          disabled={illustrating}
          title={`配图模型：${imageModel.label}（${imageModel.id}）`}
          className="h-8 rounded-full border border-[rgba(26,24,20,0.14)] bg-white px-2.5 text-[12px] font-medium text-[#1A1814] outline-none transition-colors duration-150 focus:border-[#FF2E4D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {IMAGE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.note ? `${m.label} · ${m.note}` : m.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-[#9A948B]">
          {effectiveReference
            ? '当前为「原图模式」：卡片直接复用截图里的图表/照片，只替换文字，不做任何 AI 重绘'
            : illustrating
              ? `逐页读取内容构图，由 ${imageModel.label} 生成实拍照片，逐张生效`
              : imageCount > 0
                ? `已配图 ${imageCount}/${contents.length} 张（封面+内容页+结尾页）· 再点一次重新生成 · ${imageModel.label}`
                : `每张卡片按各自内容单独构图，画面无文字 · ${imageModel.label}（${imageModel.id}）`}
        </span>
        {effectiveReference && (
          <img
            src={effectiveReference}
            alt="卡片将使用的原图素材"
            title="卡片直接使用这张图，只替换文字"
            className="h-9 w-9 rounded-md border border-[rgba(26,24,20,0.12)] bg-white object-contain"
          />
        )}
        {referenceVisual && visualSource && (
          <button
            type="button"
            onClick={() => setVisualMode(visualMode === 'full' ? 'crop' : 'full')}
            className="inline-flex items-center gap-1 rounded-full border border-[rgba(26,24,20,0.14)] bg-white px-2.5 py-1 text-[11px] font-medium text-[#6B655C] transition-colors duration-150 hover:border-[#1A1814] hover:text-[#1A1814]"
          >
            {visualMode === 'full' ? '改用图表区域' : '改用整张截图'}
          </button>
        )}
        {referenceImages.length > 0 && (
          <button
            type="button"
            disabled={referenceVisualBusy}
            onClick={() => {
              if (referenceVisual) {
                setReferenceVisual(null);
                return;
              }
              if (!visualSource) return;
              setReferenceVisualBusy(true);
              void extractReferenceVisual(visualSource)
                .then((visual) => setReferenceVisual(visual))
                .finally(() => setReferenceVisualBusy(false));
            }}
            className="inline-flex items-center gap-1 rounded-full border border-[#FF2E4D]/35 bg-white px-3 py-1.5 text-[12px] font-bold text-[#E01335] transition-colors duration-150 hover:bg-[#FFF1F3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {referenceVisualBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden />}
            {referenceVisual ? '已自动保留原图表（点击移除）' : referenceVisualBusy ? '正在提取图表…' : '保留截图里的图表/图片'}
          </button>
        )}
        {illustrateError && (
          <span className="text-[11px] font-medium text-[#E01335]">
            {illustrateError}
          </span>
        )}
      </div>
      )}

      {(!editedPages || editedPages.length === 0) && referenceImages.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-[#6B655C]">
            参考图直接作封面（点击应用）：
          </span>
          {referenceImages.map((src, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setCardImages((prev) => ({
                  ...prev,
                  0: referenceFullImages[index] ?? src,
                }));
                setIllustrateError(null);
              }}
              title={`使用参考图 ${index + 1} 作为封面`}
              aria-label={`使用参考图 ${index + 1} 作为封面`}
              className="h-10 w-10 overflow-hidden rounded-lg border border-[rgba(26,24,20,0.14)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#FF2E4D]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`参考图 ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
          <span className="text-[11px] text-[#9A948B]">
            AI 生成封面照片时也会参考这些图锁定主体
          </span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {contents.map((content, index) => (
          <div key={index} className="group/card">
            <button
              type="button"
              onClick={() => setPreviewIndex(index)}
              className="card-thumb block w-full cursor-zoom-in rounded-xl border border-[rgba(26,24,20,0.1)] text-left"
              aria-label={`预览第 ${index + 1} 张卡片`}
            >
              <ScaledCard>
                <CardItem
                  content={content}
                  editedPage={editedPages?.[content.index]}
                  layout={layout}
                  brandName={brandName}
                  image={cardImages[index]}
                  referenceVisual={visualForPage(content.index)}
                  fontScale={fontScale}
                />
              </ScaledCard>
            </button>
            <div className="mt-2 flex items-center justify-between px-0.5">
              <span className="text-[11px] font-medium text-[#9A948B]">
                {content.kind === 'cover' && '封面'}
                {content.kind === 'section' && `内容 ${content.sectionNo}`}
                {content.kind === 'end' && '结尾'}
              </span>
              <button
                type="button"
                onClick={() => void handleDownloadCard(index)}
                disabled={busyIndex !== null}
                className="inline-flex items-center gap-1 rounded-full border border-[rgba(26,24,20,0.12)] bg-white px-2.5 py-1 text-[11px] font-medium text-[#6B655C] transition-colors duration-150 hover:border-[#FF2E4D]/50 hover:text-[#E01335] disabled:opacity-50"
              >
                {busyIndex === index ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-3 w-3" aria-hidden />
                )}
                下载
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleDownloadGroup()}
        disabled={groupBusy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF2E4D] px-5 py-3 text-[14px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E01335] hover:shadow-[0_6px_18px_rgba(255,46,77,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {groupBusy ? (
          <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden />
        ) : (
          <Camera className="h-4.5 w-4.5" aria-hidden />
        )}
        {groupBusy ? '正在生成长图…' : '整组截图（长图）'}
      </button>

      {/* 隐藏的全尺寸渲染容器（用于截图） */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: -20000,
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        {contents.map((content, index) => (
          <div
            key={index}
            ref={(el) => {
              hiddenRefs.current[index] = el;
            }}
          >
            <CardItem
              content={content}
                  editedPage={editedPages?.[content.index]}
              layout={layout}
              brandName={brandName}
              image={cardImages[index]}
              referenceVisual={visualForPage(content.index)}
              fontScale={fontScale}
            />
          </div>
        ))}
      </div>

      {/* 预览弹层 */}
      {previewIndex !== null && contents[previewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`第 ${previewIndex + 1} 张卡片预览`}
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="flex max-h-full w-full max-w-[420px] flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[78vh] w-full overflow-y-auto">
              <button
                type="button"
                className="card-thumb block w-full cursor-zoom-in"
                onClick={() => setPreviewIndex(null)}
                aria-label="关闭预览"
              >
                <ScaledCard>
                  <CardItem
                    content={contents[previewIndex]}
                    editedPage={editedPages?.[previewIndex]}
                    layout={layout}
                    brandName={brandName}
                    image={cardImages[previewIndex]}
                    referenceVisual={visualForPage(previewIndex)}
                    fontScale={fontScale}
                  />
                </ScaledCard>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadCard(previewIndex)}
                disabled={busyIndex !== null}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#1A1814] transition-colors duration-150 hover:bg-[#F1ECE1] disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden />
                下载本张
              </button>
              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[13px] font-bold text-white backdrop-blur transition-colors duration-150 hover:bg-white/20"
              >
                <Eye className="h-4 w-4" aria-hidden />
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}



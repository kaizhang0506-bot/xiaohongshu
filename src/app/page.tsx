'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Brain, ChevronDown, Feather, FileUp, Loader2, PenLine, ScanText, Sparkles } from 'lucide-react';
import { ImageUploader } from '@/components/workbench/ImageUploader';
import { CustomizableSection } from '@/components/workbench/CustomizableSection';
import { ResultPanel } from '@/components/workbench/ResultPanel';
import { CardDeck } from '@/components/workbench/CardDeck';
import { OriginalImageEditor } from '@/components/workbench/OriginalImageEditor';
import { VIRAL_PRESETS, viralPrompt } from '@/lib/viral-presets';
import { CustomTemplateUploader } from '@/components/workbench/CustomTemplateUploader';
import type { ImageItem } from '@/lib/image-utils';
import { getCardLayout, type CardLayoutSpec } from '@/lib/layouts';
import { NATIVE_TEMPLATES } from '@/lib/xhs-native-layouts';
import { BATCH_PREVIEW_SIZE, REWRITE_COUNTS, buildRewriteBatchContext, normalizeRewriteCount } from '@/lib/rewrite-batch';
import type { CardDeckExportHandle } from '@/components/workbench/CardDeck';
import {
  findOption,
  LENGTH_OPTIONS,
  LAYOUT_OPTIONS,
  STRUCTURE_OPTIONS,
  STYLE_OPTIONS,
} from '@/lib/options';
import type {
  CardLayoutId,
  CustomOption,
  CustomOptionPayload,
  CustomOptionStores,
  HistoryItem,
  RewriteResult,
} from '@/lib/types';
import { customIdOf, isCustomValue } from '@/lib/types';
import {
  loadCustomOptions,
  loadCustomPrompt,
  loadDeepThinking,
  loadRefModelId,
  loadSettings,
  loadTextModelId,
  saveCustomOptions,
  saveCustomPrompt,
  saveDeepThinking,
  saveHistoryItem,
  saveRefModelId,
  saveTextModelId,
  updateHistoryResult,
} from '@/lib/storage';
import { parseRewriteResult, streamExtract, streamReference, streamRewrite } from '@/lib/stream-client';
import {
  DEFAULT_TEXT_MODEL_ID,
  getTextModel,
  TEXT_MODELS,
} from '@/lib/model';

type GenerateStatus = 'idle' | 'generating' | 'done' | 'error';

const DEFAULT_STYLE = 'insight';
const DEFAULT_STRUCTURE = 'good-share';
const DEFAULT_LENGTH = 'concise';
const DEFAULT_BATCH_LAYOUTS: CardLayoutId[] = [0, 6, 12, 18, 24].map(index => NATIVE_TEMPLATES[index].id);

/** 每套独立文案对应一个不同模板，优先保留用户已经选择的模板。 */
function layoutsForCount(current: CardLayoutId[], count: number): CardLayoutId[] {
  return [...new Set([...current, ...DEFAULT_BATCH_LAYOUTS, ...LAYOUT_OPTIONS.map(option => option.id)])].slice(0, count);
}

export default function WorkbenchPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const referenceImages = useMemo(() => images.map(image => image.dataUrl), [images]);
  const referenceFullImages = useMemo(() => images.map(image => image.fullDataUrl || image.dataUrl), [images]);
  const [referenceText, setReferenceText] = useState('');
  const [style, setStyle] = useState<string>(DEFAULT_STYLE);
  const [structure, setStructure] = useState<string>(DEFAULT_STRUCTURE);
  const [length, setLength] = useState<string>(DEFAULT_LENGTH);
  const [rewriteCount, setRewriteCount] = useState(5);
  /** 当前任务的目标套数；修改下一次套数时，不改变已生成的结果。 */
  const [batchCount, setBatchCount] = useState(5);
  const [previewPage, setPreviewPage] = useState(0);
  const previewStart = previewPage * BATCH_PREVIEW_SIZE;
  const [layouts, setLayouts] = useState<CardLayoutId[]>(DEFAULT_BATCH_LAYOUTS);
  const [customLayouts, setCustomLayouts] = useState<CardLayoutSpec[]>([]);
  const handleCustomLayouts = useCallback((items: CardLayoutSpec[]) => {
    setCustomLayouts(items);
    setLayouts(prev => {
      const next = prev.filter(id => !id.startsWith('uploaded-') || items.some(item => item.id === id));
      return layoutsForCount(next, prev.length);
    });
  }, []);
  const useCustomLayout = useCallback((id: string) => setLayouts(prev=>prev.includes(id) ? prev : [id,...prev.slice(1)]), []);
  /** 默认模板 = 第一套选中项（历史记录/兼容用） */
  const layout = layouts[0] ?? 'minimal';
  const templateCount = layouts.length;
  /** 各套模板的导出句柄（批量 ZIP 下载用） */
  const [versions, setVersions] = useState<RewriteResult[]>([]);
  const deckHandles = useRef<Map<string, CardDeckExportHandle>>(new Map());
  const [exportDeck, setExportDeck] = useState<{ spec: CardLayoutSpec; result: RewriteResult } | null>(null);
  const exportWaiter = useRef<((handle: CardDeckExportHandle) => void) | null>(null);
  const registerExportDeck = useCallback((_key: string, handle: CardDeckExportHandle | null) => {
    if (handle) exportWaiter.current?.(handle);
  }, []);
  const [zipBusyKey, setZipBusyKey] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const registerDeck = useCallback((key: string, handle: CardDeckExportHandle | null) => {
    if (handle) deckHandles.current.set(key, handle);
    else deckHandles.current.delete(key);
  }, []);

  /** 把若干套模板打成 ZIP：每套一个文件夹（含逐页 PNG + 整组长图） */
  const downloadTemplatesZip = useCallback(async (specs: CardLayoutSpec[], zipName: string) => {
    setZipBusyKey(zipName);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const safeName = (name: string) => name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 80) || '图文卡片';
      const rootName = safeName(zipName.replace(/\.zip$/i, ''));
      const rootFolder = zip.folder(rootName)!;
      const notes: string[] = ['图文卡片导出说明', ''];
      let order = 0;
      for (const spec of specs) {
        let handle = deckHandles.current.get(spec.id);
        if (!handle) {
          const version = versions[layouts.indexOf(spec.id)];
          if (!version) throw new Error('这条文案尚未生成完成');
          handle = await new Promise<CardDeckExportHandle>((resolve, reject) => {
            const timeout = window.setTimeout(() => { exportWaiter.current = null; reject(new Error('模板准备超时，请重试')); }, 30000);
            exportWaiter.current = ready => { window.clearTimeout(timeout); exportWaiter.current = null; resolve(ready); };
            setExportDeck({ spec, result: version });
          });
        }
        order += 1;
        const folderName = `${String(order).padStart(2, '0')}_${safeName(spec.label)}`;
        const folder = rootFolder.folder(folderName);
        if (!folder) continue;
        const pages = await handle.exportPages();
        for (const page of pages) folder.file(page.fileName, page.blob);
        folder.file('整组长图.png', await handle.exportStitched(pages));
        notes.push(`${folderName}：${spec.desc}（共 ${pages.length} 张）`);
      }
      if (order === 0) {
        setZipError('暂无可导出的模板，请先生成卡片');
        return;
      }
      notes.push('', '每个文件夹对应一套排版模板，内含逐页 PNG 与整组长图。');
      rootFolder.file('导出说明.txt', notes.join('\n'));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipName;
      link.click();
      URL.revokeObjectURL(url);
      setZipError(null);
    } catch {
      setZipError('打包下载失败，请重试');
    } finally {
      exportWaiter.current = null;
      setExportDeck(null);
      setZipBusyKey(null);
    }
  }, [versions, layouts]);
  const [customOptions, setCustomOptions] = useState<CustomOptionStores>({
    styles: [],
    structures: [],
    lengths: [],
  });
  const [customPrompt, setCustomPrompt] = useState('');
  const [viralPreset, setViralPreset] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  /** 深度思考模式：模型先推理再作答（速度变慢，质量更稳） */
  const [deepThinking, setDeepThinking] = useState(false);

  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [generationNumber, setGenerationNumber] = useState(0);
  const [error, setError] = useState('');
  const [showCards, setShowCards] = useState(false);
  /** 图文卡片全局字号缩放（1 = 标准），用于调整文字占比 */
  const [cardFontScale, setCardFontScale] = useState(1);
  /** 图文产出方式：第一步：原图换字/ 排版卡片（走 16 套模板） */
  const [editedOutputs, setEditedOutputs] = useState<Record<number, string>>({});
  const [cardMode, setCardMode] = useState<'original' | 'template'>('original');
  const handleEditedOutputs = useCallback((outputs: Record<number, string>) => {
    setEditedOutputs(outputs);
    setCardMode('original');
  }, []);
  useEffect(() => {
    setCardMode('original');
    setEditedOutputs({});
  }, [images, result?.body]);
  const [brandName, setBrandName] = useState('');
  const [textModelId, setTextModelId] = useState(DEFAULT_TEXT_MODEL_ID);
  // 参考文案 AI 生成
  const [refGenerating, setRefGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [topic, setTopic] = useState('');
  const [refError, setRefError] = useState('');
  /** 参考文案生成独立模型（读图归读图，与仿写模型解耦） */
  const [refModelId, setRefModelId] = useState(DEFAULT_TEXT_MODEL_ID);

  const cardsRef = useRef<HTMLDivElement>(null);
  /** 参考文案文件上传输入框 */
  const refFileInputRef = useRef<HTMLInputElement>(null);
  /** 参考文案文件上传结果提示（成功/失败） */
  const [refFileMsg, setRefFileMsg] = useState('');
  /** 当前选中的文案模型（含读图能力标记） */
  const textModel = getTextModel(textModelId);
  /** 当前模型能否发送参考图（托管多模态标记） */
  const canSendImages = textModel.supportsImage;
  /** 参考文案生成所用模型（独立于仿写模型） */
  const refModel = getTextModel(refModelId);
  /** 参考模型能否发送参考图 */
  const refCanSendImages = refModel.supportsImage;

  useEffect(() => {
    setBrandName(loadSettings().brandName);
    setTextModelId(loadTextModelId());
    setRefModelId(loadRefModelId());
    const storedPrompt = loadCustomPrompt();
    setCustomPrompt(storedPrompt);
    if (storedPrompt.trim()) setShowCustomPrompt(true);
    setDeepThinking(loadDeepThinking());
    const stored = loadCustomOptions();
    setCustomOptions(stored);
    // 选中值指向已不存在的自定义项时（如被清理）回退默认
    if (isCustomValue(style)) {
      const id = customIdOf(style);
      if (!stored.styles.some((o) => o.id === id)) setStyle(DEFAULT_STYLE);
    }
    if (isCustomValue(structure)) {
      const id = customIdOf(structure);
      if (!stored.structures.some((o) => o.id === id))
        setStructure(DEFAULT_STRUCTURE);
    }
    if (isCustomValue(length)) {
      const id = customIdOf(length);
      if (!stored.lengths.some((o) => o.id === id)) setLength(DEFAULT_LENGTH);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 持久化自定义选项并更新本地状态 */
  const persistCustomOptions = (next: CustomOptionStores) => {
    setCustomOptions(next);
    saveCustomOptions(next);
  };

  /** 新增某类自定义选项并立即选用 */
  const addCustomOption =
    (kind: 'styles' | 'structures' | 'lengths') => (option: CustomOption) => {
      const next: CustomOptionStores = {
        ...customOptions,
        [kind]: [...customOptions[kind], option],
      };
      persistCustomOptions(next);
      const chipId = `custom:${option.id}`;
      if (kind === 'styles') setStyle(chipId);
      if (kind === 'structures') setStructure(chipId);
      if (kind === 'lengths') setLength(chipId);
    };

  /** 删除自定义选项；若正被选中则回退对应默认预设 */
  const deleteCustomOption =
    (kind: 'styles' | 'structures' | 'lengths') => (chipId: string) => {
      const id = customIdOf(chipId);
      const next: CustomOptionStores = {
        ...customOptions,
        [kind]: customOptions[kind].filter((o) => o.id !== id),
      };
      persistCustomOptions(next);
      if (kind === 'styles' && style === chipId) setStyle(DEFAULT_STYLE);
      if (kind === 'structures' && structure === chipId)
        setStructure(DEFAULT_STRUCTURE);
      if (kind === 'lengths' && length === chipId) setLength(DEFAULT_LENGTH);
    };

  /** 从自定义列表解析选中值为请求载荷（非自定义项返回 undefined） */
  const resolveCustom =
    (kind: 'styles' | 'structures' | 'lengths') =>
    (value: string): CustomOptionPayload | undefined => {
      if (!isCustomValue(value)) return undefined;
      const found = customOptions[kind].find(
        (o) => o.id === customIdOf(value),
      );
      return found ? { label: found.label, desc: found.desc } : undefined;
    };

  const canGenerate =
    status !== 'generating' &&
    zipBusyKey === null &&
    !refGenerating &&
    (referenceText.trim().length > 0 || images.length > 0);

  /** AI 自动生成参考文案：按主题（或已上传参考图）流式写入输入框；使用独立的参考模型 */
  /** 上传本地爆款文案文件（.txt/.md），内容读入参考文案框 */
  const handleRefFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 200 * 1024) {
      setRefFileMsg('文件超过 200KB，请精简后再传');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result.trim() : '';
      if (!text) {
        setRefFileMsg('文件内容为空');
        return;
      }
      setReferenceText(text.slice(0, 12000));
      setRefFileMsg(`已读入「${file.name}」（${text.length} 字）`);
    };
    reader.onerror = () => setRefFileMsg('文件读取失败，请重试');
    reader.readAsText(file, 'utf-8');
  };

  const handleGenerateReference = async () => {
    if (refGenerating || status === 'generating') return;
    const trimmed = topic.trim();
    if (!trimmed && images.length === 0) {
      setRefError('请输入创作主题，或先上传参考图');
      return;
    }
    if (images.length > 0 && !refCanSendImages && !trimmed) {
      setRefError('参考生成模型不支持读图，请输入主题或切换支持读图的模型');
      return;
    }
    setRefGenerating(true);
    setRefError('');
    setReferenceText('');
    try {
      await streamReference(
        {
          topic: trimmed,
          images: refCanSendImages ? images.map((img) => img.dataUrl) : [],
          modelId: refModel.id,
        },
        setReferenceText,
      );
      setShowTopicInput(false);
    } catch (e) {
      setRefError(e instanceof Error ? e.message : '生成失败，请稍后重试');
    } finally {
      setRefGenerating(false);
    }
  };

  /** 从已上传参考图中转录文字，填入参考文案（使用参考文案生成模型） */
  const handleExtractText = async () => {
    if (extracting || refGenerating) return;
    if (images.length === 0) {
      setRefError('请先上传参考图，再提取图中文字');
      return;
    }
    if (!refCanSendImages) {
      setRefError('当前参考模型不支持读图，请切换支持读图的模型');
      return;
    }
    setExtracting(true);
    setRefError('');
    setReferenceText('');
    try {
      await streamExtract(
        {
          images: images.map((img) => img.dataUrl),
          modelId: refModel.id,
        },
        (text) => setReferenceText(text),
      );
    } catch (err) {
      setRefError(err instanceof Error ? err.message : '提取失败，请稍后重试');
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const requestedCount = normalizeRewriteCount(rewriteCount);
    setPreviewPage(0);
    setBatchCount(requestedCount);
    setGenerationNumber(0);
    setLayouts(current => layoutsForCount(current, requestedCount));
    setStatus('generating');
    setStreamText('');
    setResult(null); setVersions([]);
    setError('');
    setShowCards(false);

    // 三个维度：预设 id 直传，自定义项转为 'custom' + 载荷
    const customStyle = resolveCustom('styles')(style);
    const customStructure = resolveCustom('structures')(structure);
    const customLength = resolveCustom('lengths')(length);
    const styleId = customStyle ? 'custom' : style;
    const structureId = customStructure ? 'custom' : structure;
    const lengthId = customLength ? 'custom' : length;

    // 历史参数显示名（自定义项优先用用户编写名）
    const styleLabel = customStyle?.label ?? findOption(STYLE_OPTIONS, styleId).label;
    const structureLabel =
      customStructure?.label ??
      findOption(STRUCTURE_OPTIONS, structureId).label;
    const lengthLabel = customLength?.label ?? findOption(LENGTH_OPTIONS, lengthId).label;

    try {
      const generated: RewriteResult[] = [];
      for(let version=0;version<requestedCount;version++){
      setGenerationNumber(version+1);setStreamText('');
      const fullText = await streamRewrite(
        {
          // Extracted/manual reference text is authoritative; originals stay local for card rendering.
          images: canSendImages && !referenceText.trim() ? images.map((img) => img.dataUrl) : [],
          referenceText,
          style: styleId,
          structure: structureId,
          length: lengthId,
          customStyle,
          customStructure,
          customLength,
          modelId: textModel.id,
          batchContext: buildRewriteBatchContext(version, requestedCount, generated, viralPrompt(viralPreset)),
          customPrompt: customPrompt.trim() || undefined,
          deepThinking,
          settings: loadSettings(),
        },
        setStreamText,
      );
      const parsed = parseRewriteResult(fullText);
      if(!parsed.body?.trim() || generated.some(v=>v.body.replace(/\s/g,'')===parsed.body.replace(/\s/g,''))) throw new Error('返回文案为空或重复，请重试');
      generated.push(parsed);setVersions([...generated]);

      const historyItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        params: {
          style: styleId,
          structure: structureId,
          length: lengthId,
          layout,
          hadImages: images.length > 0,
          modelLabel: textModel.label,
          styleLabel,
          structureLabel,
          lengthLabel,
        },
        referenceText: referenceText.slice(0, 500),
        result: parsed,
      };
      saveHistoryItem(historyItem);
      }
      setResult(generated[0]);setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试');
      setStatus('error');
    }
  };

  const handleGenerateCards = () => {
    if (versions.length !== batchCount) return;
    setShowCards(true);
    window.requestAnimationFrame(() => {
      cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleTitleChange = (titleIndex: number, title: string) => {
    if (!result || zipBusyKey !== null || !title.trim()) return;
    const versionIndex = versions.indexOf(result);
    if (versionIndex < 0 || titleIndex < 0 || titleIndex >= result.titles.length) return;
    const updated = { ...result, titles: result.titles.map((current, index) => index === titleIndex ? title.trim() : current) };
    setVersions(current => current.map((version, index) => index === versionIndex ? updated : version));
    setResult(updated);
    updateHistoryResult(result, updated);
  };

  return (
    <div className="paper-texture mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* 左侧：参数表单 */}
        <div className="space-y-6 lg:col-span-5">
          <div className="space-y-5 rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-5 lg:sticky lg:top-24">
            <div className="space-y-2">
              <p className="text-[13px] font-bold text-[#1A1814]">
                参考图片
                <span className="ml-1.5 text-[11px] font-normal text-[#9A948B]">
                  可选，最多 10 张（如数据图表、工具截图、爆款笔记截图、财经场景实拍）
                </span>
              </p>
              <ImageUploader images={images} onChange={setImages} disabled={status === 'generating'} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="reference-text"
                  className="block text-[13px] font-bold text-[#1A1814]"
                >
                  参考文案
                  <span className="ml-1.5 text-[11px] font-normal text-[#9A948B]">
                    粘贴 / 上传爆款原文，或从参考图提取文字，或让 AI 先写一篇
                  </span>
                </label>
                <div className="flex shrink-0 items-center gap-1.5">
                  <input
                    ref={refFileInputRef}
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    className="hidden"
                    onChange={handleRefFileChange}
                  />
                  <button
                    type="button"
                    onClick={handleExtractText}
                    disabled={
                      status === 'generating' ||
                      refGenerating ||
                      extracting ||
                      images.length === 0
                    }
                    title={
                      images.length === 0
                        ? '先上传参考图，再提取图中文字'
                        : !refCanSendImages
                          ? '当前参考模型不支持读图，请切换模型'
                          : '转录已上传截图中的笔记文字到下方输入框'
                    }
                    className="flex items-center gap-1 rounded-lg border border-dashed border-[rgba(26,24,20,0.22)] bg-[#FAF7F1]/60 px-2.5 py-1 text-[11px] font-bold text-[#6B655C] transition-all duration-150 hover:border-[#FF2E4D] hover:bg-[#FFF0F2] hover:text-[#E01335] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {extracting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <ScanText className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {extracting ? '提取中…' : '提取图中文字'}
                  </button>
                  <button
                    type="button"
                    onClick={() => refFileInputRef.current?.click()}
                    disabled={status === 'generating' || refGenerating}
                    className="flex items-center gap-1 rounded-lg border border-dashed border-[rgba(26,24,20,0.22)] bg-[#FAF7F1]/60 px-2.5 py-1 text-[11px] font-bold text-[#6B655C] transition-all duration-150 hover:border-[#FF2E4D] hover:bg-[#FFF0F2] hover:text-[#E01335] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileUp className="h-3.5 w-3.5" aria-hidden />
                    上传
                  </button>
                  {!showTopicInput && (
                  <button
                    type="button"
                    onClick={() => setShowTopicInput(true)}
                    disabled={status === 'generating' || refGenerating}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-[rgba(26,24,20,0.22)] bg-[#FAF7F1]/60 px-2.5 py-1 text-[11px] font-bold text-[#6B655C] transition-all duration-150 hover:border-[#FF2E4D] hover:bg-[#FFF0F2] hover:text-[#E01335] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    AI 生成
                  </button>
                  )}
                </div>
              </div>

              {showTopicInput && (
                <div className="space-y-2 rounded-xl border border-[rgba(255,46,77,0.35)] bg-[#FAF7F1] p-2.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => {
                        setTopic(e.target.value);
                        setRefError('');
                      }}
                      maxLength={50}
                      placeholder="财经主题，如「通货膨胀」「基金定投」「征信修复」"
                      disabled={refGenerating}
                      className="min-w-0 flex-1 rounded-lg border border-[rgba(26,24,20,0.14)] bg-white px-3 py-2 text-[13px] text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D] disabled:opacity-60"
                    />
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateReference}
                        disabled={refGenerating || status === 'generating'}
                        className="flex items-center gap-1 rounded-lg bg-[#FF2E4D] px-3 py-2 text-[12px] font-bold text-white transition-all duration-150 hover:bg-[#E01335] hover:shadow-[0_2px_8px_rgba(255,46,77,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {refGenerating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {refGenerating ? '生成中…' : '生成参考文案'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTopicInput(false);
                          setRefError('');
                        }}
                        disabled={refGenerating}
                        className="rounded-lg border border-[rgba(26,24,20,0.14)] bg-white px-2.5 py-2 text-[12px] font-bold text-[#6B655C] transition-colors duration-150 hover:border-[rgba(26,24,20,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        收起
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[11px] font-medium text-[#9A948B]">
                      生成用模型
                    </span>
                    <select
                      value={refModelId}
                      onChange={(e) => {
                        setRefModelId(e.target.value);
                        saveRefModelId(e.target.value);
                        setRefError('');
                      }}
                      disabled={refGenerating}
                      title="参考文案 AI 生成独立使用的模型（读图能力按此模型判断），与仿写模型互不影响"
                      className="min-w-0 flex-1 appearance-none rounded-lg border border-[rgba(26,24,20,0.14)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#1A1814] outline-none transition-colors duration-150 focus:border-[#FF2E4D] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {TEXT_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}（{m.note}）
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label htmlFor="extract-model" className="text-[12px] font-bold text-[#6B655C]">识别模型</label>
                <select id="extract-model" value={refModelId} onChange={e => {
                  setRefModelId(e.target.value); saveRefModelId(e.target.value); setRefError('');
                }} disabled={extracting || refGenerating || status === 'generating'} className="min-w-0 flex-1 rounded-lg border border-[rgba(26,24,20,0.14)] bg-white px-2.5 py-2 text-[12px]" title="用于提取图片文字及生成参考文案，独立于下方仿写模型">
                  {TEXT_MODELS.filter(m=>m.supportsImage).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <span className="text-[11px] text-[#9A948B]">仅列出支持读图的模型，与仿写模型独立</span>
              </div>
              {refError && (
                <p className="flex items-start gap-1.5 rounded-lg bg-[#FFF0F2] px-2.5 py-2 text-[11px] font-medium leading-relaxed text-[#E01335]">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  {refError}
                </p>
              )}

              <textarea
                id="reference-text"
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                disabled={status === 'generating' || refGenerating || extracting}
                rows={6}
                placeholder={
                  refGenerating
                    ? 'AI 正在撰写参考笔记，完成后可手动修改…'
                    : extracting
                      ? '正在逐张转录截图中的笔记文字…'
                      : '粘贴财经科普类爆款原文（或点右上角「提取图中文字」转录截图、「上传」读入 txt/md 文件），AI 将学习其结构与调性，产出表达完全原创的仿写内容…'
                }
                className="w-full resize-y rounded-xl border border-[rgba(26,24,20,0.14)] bg-[#FAF7F1] px-3.5 py-3 text-[14px] leading-relaxed text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D] focus:bg-white disabled:cursor-not-allowed"
              />
              {refFileMsg && (
                <p className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#6B655C]">
                  <span>{refFileMsg}</span>
                  <button
                    type="button"
                    onClick={() => setRefFileMsg('')}
                    className="shrink-0 text-[#B0A99D] transition-colors hover:text-[#6B655C]"
                  >
                    知道了
                  </button>
                </p>
              )}
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-4 space-y-2">
              <label className="block text-sm font-bold" htmlFor="viral-preset">图文策划预设</label>
              <select id="viral-preset" className="w-full rounded-lg border p-2 text-sm" value={viralPreset} onChange={e => {
                setViralPreset(e.target.value);
                const preset = VIRAL_PRESETS.find(item => item.id === e.target.value);
                if (preset) { setStructure(preset.structure); }
              }}><option value="">不使用预设，按下方设置</option>{VIRAL_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
              <p className="text-xs text-[#6B655C]">选择后推荐对应结构与模板，仍可自行调整；下一次生成时生效。</p>
              {viralPreset && <p className="text-xs leading-relaxed">{VIRAL_PRESETS.find(item => item.id === viralPreset)?.brief}</p>}
              <a className="text-xs underline text-[#6B655C]" href="https://github.com/JimLiu/baoyu-skills/tree/main/skills/baoyu-xhs-images" target="_blank" rel="noreferrer">策划方法参考：baoyu-xhs-images（MIT）。本功能使用网站现有排版引擎。</a>
            </div>
            <CustomizableSection
              label="仿写风格"
              kindName="风格"
              presets={STYLE_OPTIONS}
              customs={customOptions.styles}
              value={style}
              onChange={setStyle}
              onAdd={addCustomOption('styles')}
              onDelete={deleteCustomOption('styles')}
              disabled={status === 'generating'}
              exampleName="冷静研究员"
              exampleDesc="数据说话，克制冷静，像专业研究员做财经科普，几乎不用感叹号"
            />
            <CustomizableSection
              label="文案结构模板"
              kindName="结构"
              presets={STRUCTURE_OPTIONS}
              customs={customOptions.structures}
              value={structure}
              onChange={setStructure}
              onAdd={addCustomOption('structures')}
              onDelete={deleteCustomOption('structures')}
              disabled={status === 'generating'}
              exampleName="热点解读型"
              exampleDesc="热点事件切入，拆解背后的金融原理，讲对普通人的影响，给行动建议"
            />
            <CustomizableSection
              label="输出长度"
              kindName="长度"
              presets={LENGTH_OPTIONS}
              customs={customOptions.lengths}
              value={length}
              onChange={setLength}
              onAdd={addCustomOption('lengths')}
              onDelete={deleteCustomOption('lengths')}
              disabled={status === 'generating'}
              exampleName="超短文案"
              exampleDesc="约 60-100 字，一段成文，只保留最核心的财经观点"
            />
            <div className="space-y-2">
              <label
                htmlFor="text-model"
                className="block text-[13px] font-bold text-[#1A1814]"
              >
                文案模型
                <span className="ml-1.5 text-[11px] font-normal text-[#9A948B]">
                  {process.env.NEXT_PUBLIC_AI_TEST_PROVIDER === 'relay' ? '本次测试使用已授权的兼容接口' : '扣子托管通道'}
                </span>
              </label>
              <select
                id="text-model"
                value={textModelId}
                onChange={(e) => {
                  setTextModelId(e.target.value);
                  saveTextModelId(e.target.value);
                }}
                disabled={status === 'generating'}
                className="w-full appearance-none rounded-xl border border-[rgba(26,24,20,0.14)] bg-[#FAF7F1] px-3.5 py-2.5 text-[13px] font-medium text-[#1A1814] outline-none transition-colors duration-150 focus:border-[#FF2E4D] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {TEXT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}（{m.note}）
                  </option>
                ))}
              </select>
              <div className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[rgba(26,24,20,0.1)] bg-[#FAF7F1]">
                  <button
                    type="button"
                    onClick={() => setShowCustomPrompt((v) => !v)}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F1ECE1]"
                  >
                  <PenLine className="h-3.5 w-3.5 shrink-0 text-[#FF2E4D]" aria-hidden />
                  <span className="text-[12px] font-bold text-[#1A1814]">自定义提示词</span>
                  <span className="flex-1 truncate text-[10px] text-[#9A948B]">
                    {customPrompt.trim() ? '已填写，生成时生效' : '给模型追加写作要求（可选）'}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-[#9A948B] transition-transform duration-200 ${showCustomPrompt ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {showCustomPrompt && (
                  <div className="border-t border-[rgba(26,24,20,0.08)] px-3.5 py-3">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => {
                        setCustomPrompt(e.target.value);
                        saveCustomPrompt(e.target.value);
                      }}
                      rows={3}
                      maxLength={500}
                      disabled={status === 'generating'}
                      placeholder={'例如：标题多用数字对比；开头两句必须抓人；正文少用专业术语；结尾加一句行动号召…'}
                      className="w-full resize-y rounded-lg border border-[rgba(26,24,20,0.14)] bg-white px-3 py-2.5 text-[12px] leading-relaxed text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B9B3A9] focus:border-[#FF2E4D] disabled:opacity-60"
                    />
                    <p className="mt-1.5 text-[10px] leading-relaxed text-[#9A948B]">
                      附加指令注入仿写提示词，在不违反财经合规红线的前提下生效；自动保存在本浏览器，最多 500 字
                    </p>
                  </div>
                )}
                </div>
                <button
                  type="button"
                  title={deepThinking ? '深度思考已开启：模型先推理再作答，速度变慢' : '深度思考已关闭：默认快速作答'}
                  onClick={() => {
                    setDeepThinking((v) => {
                      const next = !v;
                      saveDeepThinking(next);
                      return next;
                    });
                  }}
                  disabled={status === 'generating'}
                  className={`flex w-[86px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 transition-all duration-150 disabled:opacity-60 ${
                    deepThinking
                      ? 'border-[#FF2E4D] bg-[#FF2E4D] text-white shadow-[0_2px_10px_rgba(255,46,77,0.3)]'
                      : 'border-[rgba(26,24,20,0.1)] bg-[#FAF7F1] text-[#6B655C] hover:bg-[#F1ECE1]'
                  }`}
                >
                  <Brain className="h-4 w-4" aria-hidden />
                  <span className="text-[11px] font-bold leading-none">深度思考</span>
                  <span className={`text-[9px] font-medium leading-none ${deepThinking ? 'text-white/85' : 'text-[#9A948B]'}`}>
                    {deepThinking ? '已开启' : '已关闭'}
                  </span>
                </button>
              </div>
              {images.length > 0 && !canSendImages && (
                <p className="flex items-start gap-1.5 rounded-lg bg-[#FFF7E6] px-2.5 py-2 text-[11px] font-medium leading-relaxed text-[#8C6D1F]">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="flex-1">
                    当前模型不支持图片输入，{images.length} 张参考图将被忽略；如需读图请切换支持读图的模型
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="rewrite-count" className="block text-[13px] font-bold text-[#1A1814]">仿写数量</label>
              <select
                id="rewrite-count"
                value={rewriteCount}
                disabled={status === 'generating'}
                onChange={event => setRewriteCount(normalizeRewriteCount(Number(event.target.value)))}
                aria-describedby="rewrite-count-hint"
                className="w-full rounded-xl border border-[rgba(26,24,20,0.14)] bg-[#FAF7F1] px-3.5 py-2.5 text-[13px] font-medium text-[#1A1814] outline-none focus:border-[#FF2E4D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {REWRITE_COUNTS.map(count => <option key={count} value={count}>{count} 条</option>)}
              </select>
              <p id="rewrite-count-hint" className="text-[11px] leading-relaxed text-[#9A948B]">可选 1–100 条，按顺序逐条独立仿写，完成后分别搭配不同模板。数量越多，生成时间越长。</p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF2E4D] px-5 py-3.5 text-[15px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E01335] hover:shadow-[0_8px_20px_rgba(255,46,77,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {status === 'generating' ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-5 w-5" aria-hidden />
                )}
                {status === 'generating' ? `正在仿写 ${generationNumber} / ${batchCount} 条…` : `仿写 ${rewriteCount} 条独立文案`}
              </button>
              {!canGenerate && status !== 'generating' && (
                <p className="text-center text-[11px] text-[#9A948B]">
                  填写参考文案或上传参考图后即可生成
                </p>
              )}
              <p
                className="text-center text-[11px] text-[#9A948B]"
                title={`当前文案模型：${textModel.label}（${textModel.id}）`}
              >
                当前文案模型：{textModel.label}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧：结果区 */}
        <div className="space-y-6 lg:col-span-7">
          {status === 'idle' && <EmptyState />}

          {status === 'generating' && (
            <section className="rounded-2xl border border-[rgba(26,24,20,0.1)] bg-[#1A1814] p-5 shadow-[0_2px_12px_rgba(26,24,20,0.12)]">
              <p className="flex items-center gap-2 text-[13px] font-bold text-[#F2EDE3]">
                <Loader2 className="h-4 w-4 animate-spin text-[#FF2E4D]" aria-hidden />
                {textModel.label} 正在仿写，稍等片刻…
              </p>
              <div className="mt-4 max-h-72 overflow-y-auto rounded-xl bg-[#24211C] p-4">
                <p className="stream-cursor whitespace-pre-wrap break-all font-mono text-[12px] leading-relaxed text-[#B9B2A4]">
                  {streamText || '正在建立连接…'}
                </p>
              </div>
            </section>
          )}

          {status === 'error' && (
            <section className="rounded-2xl border border-[#F3C9CF] bg-[#FFF0F2] p-5">
              <p className="flex items-center gap-2 text-[14px] font-bold text-[#C01E3C]">
                <AlertCircle className="h-4.5 w-4.5" aria-hidden />
                生成失败
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#8A4B57]">{error}</p>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                className="mt-4 rounded-lg bg-[#FF2E4D] px-4 py-2 text-[13px] font-bold text-white transition-colors duration-150 hover:bg-[#E01335]"
              >
                重新生成
              </button>
            </section>
          )}

          {status === 'generating' && <p role="status">正在仿写第 {generationNumber} / {batchCount} 条，完成后再排版。</p>}
          {status === 'done' && result && (
            <>
<div className="bg-white p-4 rounded-xl"><h2>第一步：检查 {versions.length} 条仿写文案，再选择排版</h2>{versions.map((_,i)=><button key={i} type="button" className="border rounded p-2 m-1" onClick={()=>setResult(versions[i])}>文案 {i+1}</button>)}</div>
              <ResultPanel
                key={versions.indexOf(result)}
                result={result}
                onGenerateCards={handleGenerateCards}
                onTitleChange={handleTitleChange}
                titleEditingDisabled={zipBusyKey !== null}
              />
              {showCards && (
                <div ref={cardsRef} className="scroll-mt-24">
                  {versions.length === batchCount && (
                  <>
<div className="space-y-4 rounded-2xl bg-white p-5 mb-5">
            <CustomTemplateUploader onChange={handleCustomLayouts} onSelect={useCustomLayout} />
<h3 className="font-bold">第二步：{versions.length} 条文案分别搭配 {versions.length} 种模板</h3>
{versions.slice(previewStart, previewStart + BATCH_PREVIEW_SIZE).map((_,offset)=>{const index=previewStart+offset;return <label key={index} className="flex gap-3">文案 {index+1}<select disabled={zipBusyKey !== null} aria-label={'文案 '+(index+1)+' 的模板'} value={layouts[index]} onChange={event=>{const next=[...layouts];const existing=next.indexOf(event.target.value);if(existing>=0)next[existing]=next[index];next[index]=event.target.value;setLayouts(next);}}>{[...customLayouts,...LAYOUT_OPTIONS].map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>;})}
<p>{versions.length} 条独立文案各配一种模板，已用模板会交换位置。</p>
{versions.length > BATCH_PREVIEW_SIZE && <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={previewPage === 0 || zipBusyKey !== null} onClick={()=>setPreviewPage(page=>page-1)} className="rounded border px-3 py-1 disabled:opacity-40">上一批</button><span>查看第 {previewStart+1}–{Math.min(previewStart+BATCH_PREVIEW_SIZE,versions.length)} 条 / 共 {versions.length} 条</span><button type="button" disabled={previewStart+BATCH_PREVIEW_SIZE>=versions.length || zipBusyKey !== null} onClick={()=>setPreviewPage(page=>page+1)} className="rounded border px-3 py-1 disabled:opacity-40">下一批</button><p className="w-full text-xs text-[#9A948B]">每批预览 10 条，打包下载仍包含全部文案对应的模板。</p></div>}
</div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void downloadTemplatesZip(
                          layouts.map((id: CardLayoutId) => getCardLayout(id)),
                          `图文卡片_${templateCount}套模板.zip`,
                        );
                      }}
                      disabled={zipBusyKey !== null}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1814] px-4 py-2 text-[12px] font-bold text-[#FAF7F1] transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
                    >
                      {zipBusyKey === `图文卡片_${templateCount}套模板.zip`
                        ? '正在打包…'
                        : `打包下载这 ${templateCount} 套（ZIP）`}
                    </button>
                    <span className="text-[11px] text-[#9A948B]">
                      一个总文件夹，内按模板分子文件夹，分别保存逐页 PNG 与整组长图
                    </span>
                    {zipError ? <span className="text-[11px] font-medium text-[#FF2E4D]">{zipError}</span> : null}
                    <span className="mx-1 h-4 w-px bg-[rgba(26,24,20,0.12)]" aria-hidden />
                    <span className="text-[11px] text-[#9A948B]">字号</span>
                    <div className="inline-flex overflow-hidden rounded-full border border-[rgba(26,24,20,0.14)]">
                      {[
                        { label: '小', value: 0.85 },
                        { label: '标准', value: 1 },
                        { label: '大', value: 1.18 },
                        { label: '特大', value: 1.35 },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          disabled={zipBusyKey !== null}
                          onClick={() => setCardFontScale(item.value)}
                          className={`px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
                            Math.abs(cardFontScale - item.value) < 0.001
                              ? 'bg-[#1A1814] text-[#FAF7F1]'
                              : 'text-[#6B655C] hover:text-[#1A1814]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {layouts.slice(previewStart, previewStart + BATCH_PREVIEW_SIZE).map((id: CardLayoutId) => getCardLayout(id)).map((spec, offset) => {const deckIndex=previewStart+offset;return (
                    <div key={spec.id} className={deckIndex > 0 ? 'mt-6 border-t border-[rgba(26,24,20,0.08)] pt-6' : undefined}>
                      {templateCount > 1 && (
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12px] font-bold text-[#1A1814]">
                            {`模板 ${deckIndex + 1}/${templateCount} · ${spec.label}`}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              void downloadTemplatesZip([spec], `${spec.label}_图文卡片.zip`);
                            }}
                            disabled={zipBusyKey !== null}
                            className="inline-flex items-center gap-1 rounded-full border border-[rgba(26,24,20,0.14)] px-3 py-1 text-[11px] font-medium text-[#6B655C] transition-colors duration-150 hover:border-[#1A1814] hover:text-[#1A1814] disabled:opacity-50"
                          >
                            {zipBusyKey === `${spec.label}_图文卡片.zip` ? '正在打包…' : '下载这一套（ZIP）'}
                          </button>
                        </div>
                      )}
                      <CardDeck
                        result={versions[deckIndex]}
                        referenceImages={referenceImages}
                        referenceFullImages={referenceFullImages}
                        layout={spec.id}
                        brandName={brandName}
                        deckKey={spec.id}
                        registerDeck={registerDeck}
                        fontScale={cardFontScale}
                      />
                    </div>
                  );})}
                  </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {exportDeck && <div aria-hidden="true" style={{position:'fixed',left:-60000,top:0,width:1080,pointerEvents:'none'}}><CardDeck key={exportDeck.spec.id} result={exportDeck.result} referenceImages={referenceImages} referenceFullImages={referenceFullImages} layout={exportDeck.spec.id} brandName={brandName} deckKey={exportDeck.spec.id} registerDeck={registerExportDeck} fontScale={cardFontScale} /></div>}
    </div>
  );
}

function EmptyState() {
  const steps = [
    { step: '1', title: '准备素材', desc: '上传 1-10 张参考图，粘贴财经科普类参考文案' },
    { step: '2', title: '选择参数', desc: '风格 / 结构 / 长度 / 排版模板' },
    { step: '3', title: '生成与导出', desc: 'AI 仿写 → 一键复制 → 图文卡片' },
  ];

  return (
    <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(26,24,20,0.18)] bg-white/60 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0F2] text-[#FF2E4D]">
        <Feather className="h-7 w-7" aria-hidden />
      </span>
      <h2 className="mt-4 text-[18px] font-bold text-[#1A1814]">
        从一篇好笔记出发，写出你的原创
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[#6B655C]">
        学习参考素材的结构与调性，产出表达完全原创的小红书文案，并一键生成 3:4 图文卡片。
      </p>
      <ol className="mt-7 grid w-full max-w-md gap-2.5 sm:grid-cols-3">
        {steps.map(({ step, title, desc }) => (
          <li
            key={step}
            className="rounded-xl border border-[rgba(26,24,20,0.08)] bg-white p-3.5 text-left"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1814] text-[12px] font-bold text-white">
              {step}
            </span>
            <p className="mt-2 text-[13px] font-bold text-[#1A1814]">{title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#9A948B]">{desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}


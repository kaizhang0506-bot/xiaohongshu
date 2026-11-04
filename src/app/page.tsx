'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Brain, ChevronDown, Feather, FileUp, Loader2, PenLine, ScanText, Sparkles } from 'lucide-react';
import { ImageUploader } from '@/components/workbench/ImageUploader';
import { OptionGroup } from '@/components/workbench/OptionGroup';
import { CustomizableSection } from '@/components/workbench/CustomizableSection';
import { ResultPanel } from '@/components/workbench/ResultPanel';
import { CardDeck } from '@/components/workbench/CardDeck';
import { OriginalImageEditor } from '@/components/workbench/OriginalImageEditor';
import { CustomTemplateUploader } from '@/components/workbench/CustomTemplateUploader';
import type { ImageItem } from '@/lib/image-utils';
import { getCardLayout, pickLayouts, type CardLayoutSpec } from '@/lib/layouts';
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
  loadDeepseekBaseUrl,
  loadDeepseekKey,
  loadDeepseekModelId,
  loadDeepseekVision,
  loadRefModelId,
  loadSettings,
  loadTextModelId,
  saveCustomOptions,
  saveCustomPrompt,
  saveDeepThinking,
  saveDeepseekVision,
  saveHistoryItem,
  saveRefModelId,
  saveTextModelId,
} from '@/lib/storage';
import { parseRewriteResult, streamExtract, streamReference, streamRewrite } from '@/lib/stream-client';
import {
  DEFAULT_TEXT_MODEL_ID,
  getTextModel,
  isDeepseekModel,
  TEXT_MODELS,
} from '@/lib/model';
import { DEEPSEEK_PRESET, DEEPSEEK_PRESET_VISION } from '@/lib/deepseek-preset';

type GenerateStatus = 'idle' | 'generating' | 'done' | 'error';

const DEFAULT_STYLE = 'insight';
const DEFAULT_STRUCTURE = 'good-share';
const DEFAULT_LENGTH = 'follow';

export default function WorkbenchPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const referenceImages = useMemo(() => images.map(image => image.dataUrl), [images]);
  const referenceFullImages = useMemo(() => images.map(image => image.fullDataUrl || image.dataUrl), [images]);
  const [referenceText, setReferenceText] = useState('');
  const [style, setStyle] = useState<string>(DEFAULT_STYLE);
  const [structure, setStructure] = useState<string>(DEFAULT_STRUCTURE);
  const [length, setLength] = useState<string>(DEFAULT_LENGTH);
  /** 已选排版模板（多选，按选择顺序，最多 10 套） */
  const [layouts, setLayouts] = useState<CardLayoutId[]>(['minimal']);
  const [customLayouts, setCustomLayouts] = useState<CardLayoutSpec[]>([]);
  const handleCustomLayouts = useCallback((items: CardLayoutSpec[]) => {
    setCustomLayouts(items);
    setLayouts(prev => {
      const next = prev.filter(id => !id.startsWith('uploaded-') || items.some(item => item.id === id));
      return next.length ? next : ['minimal'];
    });
  }, []);
  const useCustomLayout = useCallback((id: string) => setLayouts([id]), []);
  /** 默认模板 = 第一套选中项（历史记录/兼容用） */
  const layout = layouts[0] ?? 'minimal';
  const templateCount = layouts.length;
  const [layoutLimitHit, setLayoutLimitHit] = useState(false);

  /** 多选：点一次加入，再点取消（至少保留 1 套，最多 10 套）。仅改选择，不触发页面重排/自动滚动 */
  const toggleLayout = useCallback((id: CardLayoutId) => {
    setLayouts((prev: CardLayoutId[]) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        setLayoutLimitHit(false);
        return prev.filter((item: CardLayoutId) => item !== id);
      }
      if (prev.length >= 10) {
        setLayoutLimitHit(true);
        return prev;
      }
      setLayoutLimitHit(false);
      return [...prev, id];
    });
  }, []);

  /** 套数快捷按钮：不足则按当前末位顺延补足，超出则截断。仅改选择，不触发页面重排/自动滚动 */
  const setLayoutCount = useCallback((count: number) => {
    setLayouts((prev: CardLayoutId[]) => {
      if (prev.length >= count) return prev.slice(0, count);
      const base = prev[prev.length - 1] ?? 'minimal';
      const fill = pickLayouts(base, count - prev.length + 1).filter(
        (spec: CardLayoutSpec) => !prev.includes(spec.id),
      );
      return [...prev, ...fill.map((spec: CardLayoutSpec) => spec.id)].slice(0, count);
    });
    setLayoutLimitHit(false);
    setZipError(null);
  }, []);
  /** 各套模板的导出句柄（批量 ZIP 下载用） */
  const deckHandles = useRef<Map<string, CardDeckExportHandle>>(new Map());
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
        const handle = deckHandles.current.get(spec.id);
        if (!handle) throw new Error('部分模板尚未准备好');
        order += 1;
        const folderName = `${String(order).padStart(2, '0')}_${safeName(spec.label)}`;
        const folder = rootFolder.folder(folderName);
        if (!folder) continue;
        const pages = await handle.exportPages();
        for (const page of pages) folder.file(page.fileName, page.blob);
        folder.file('整组长图.png', await handle.exportStitched());
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
      setZipBusyKey(null);
    }
  }, []);
  const [customOptions, setCustomOptions] = useState<CustomOptionStores>({
    styles: [],
    structures: [],
    lengths: [],
  });
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  /** 深度思考模式：模型先推理再作答（速度变慢，质量更稳） */
  const [deepThinking, setDeepThinking] = useState(false);

  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<RewriteResult | null>(null);
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
  }, [images, result]);
  const [brandName, setBrandName] = useState('');
  const [textModelId, setTextModelId] = useState(DEFAULT_TEXT_MODEL_ID);
  /** DeepSeek 自有 Key（仅 DeepSeek 模型需要，设置页配置） */
  const [deepseekKey, setDeepseekKey] = useState('');
  /** DeepSeek 兼容接口地址（空 = 官方默认） */
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState('');
  /** DeepSeek 通道模型 ID（空 = 默认 deepseek-chat） */
  const [deepseekModelId, setDeepseekModelId] = useState('');
  /** DeepSeek 通道模型是否支持读图（设置页声明） */
  const [deepseekVision, setDeepseekVision] = useState(false);
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
  /** 选中 DeepSeek 但未配置 Key（服务端有预配置时不视为缺 Key） */
  const deepseekNoKey =
    isDeepseekModel(textModel) && !deepseekKey && !DEEPSEEK_PRESET;
  /** 当前模型能否发送参考图（托管多模态，或 DeepSeek 通道声明读图） */
  const canSendImages =
    textModel.supportsImage ||
    (isDeepseekModel(textModel) && (deepseekVision || DEEPSEEK_PRESET_VISION));
  /** 参考文案生成所用模型（独立于仿写模型） */
  const refModel = getTextModel(refModelId);
  /** 参考模型能否发送参考图 */
  const refCanSendImages =
    refModel.supportsImage ||
    (isDeepseekModel(refModel) && (deepseekVision || DEEPSEEK_PRESET_VISION));
  /** 参考模型选 DeepSeek 但未配置 Key */
  const refNoKey =
    isDeepseekModel(refModel) && !deepseekKey && !DEEPSEEK_PRESET;

  useEffect(() => {
    setBrandName(loadSettings().brandName);
    setTextModelId(loadTextModelId());
    setDeepseekKey(loadDeepseekKey());
    setDeepseekBaseUrl(loadDeepseekBaseUrl());
    setDeepseekModelId(loadDeepseekModelId());
    setDeepseekVision(loadDeepseekVision());
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
    !refGenerating &&
    !deepseekNoKey &&
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
    if (refNoKey) {
      setRefError('参考生成模型选了 DeepSeek：请先在「设置」页填写 API Key，或切换其他模型');
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
          deepseekKey: isDeepseekModel(refModel) ? deepseekKey : undefined,
          deepseekBaseUrl: isDeepseekModel(refModel)
            ? deepseekBaseUrl
            : undefined,
          deepseekModelId: isDeepseekModel(refModel)
            ? deepseekModelId
            : undefined,
          deepseekVision: isDeepseekModel(refModel) ? deepseekVision : undefined,
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
          deepseekKey: isDeepseekModel(refModel) ? deepseekKey : undefined,
          deepseekBaseUrl: isDeepseekModel(refModel)
            ? deepseekBaseUrl
            : undefined,
          deepseekModelId: isDeepseekModel(refModel)
            ? deepseekModelId
            : undefined,
          deepseekVision: isDeepseekModel(refModel) ? deepseekVision : undefined,
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
    setStatus('generating');
    setStreamText('');
    setResult(null);
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
      const fullText = await streamRewrite(
        {
          images: canSendImages ? images.map((img) => img.dataUrl) : [],
          referenceText,
          style: styleId,
          structure: structureId,
          length: lengthId,
          customStyle,
          customStructure,
          customLength,
          modelId: textModel.id,
          deepseekKey: isDeepseekModel(textModel) ? deepseekKey : undefined,
          deepseekBaseUrl: isDeepseekModel(textModel)
            ? deepseekBaseUrl
            : undefined,
          deepseekModelId: isDeepseekModel(textModel)
            ? deepseekModelId
            : undefined,
          deepseekVision: isDeepseekModel(textModel) ? deepseekVision : undefined,
          customPrompt: customPrompt.trim() || undefined,
          deepThinking,
          settings: loadSettings(),
        },
        setStreamText,
      );
      const parsed = parseRewriteResult(fullText);
      setResult(parsed);
      setStatus('done');

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
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试');
      setStatus('error');
    }
  };

  const handleGenerateCards = () => {
    if (!result) return;
    setShowCards(true);
    window.requestAnimationFrame(() => {
      cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
                  {deepseekNoKey
                    ? '已选 DeepSeek：请先到「设置」页填写 API Key'
                    : '展示名与实际调用一致，可自行切换'}
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
                    {isDeepseekModel(textModel) ? (
                      <>
                        已选 DeepSeek 但未开启读图，{images.length} 张参考图将被忽略；若你的模型支持多模态，可
                        <button
                          type="button"
                          onClick={() => {
                            saveDeepseekVision(true);
                            setDeepseekVision(true);
                          }}
                          className="mx-1 inline-flex items-center rounded-md border border-[#8C6D1F]/40 bg-white/80 px-1.5 py-0.5 font-bold text-[#8C6D1F] transition-colors duration-150 hover:border-[#8C6D1F] hover:bg-white"
                        >
                          立即开启读图
                        </button>
                        （一次即可，设置页可随时关闭）
                      </>
                    ) : (
                      <>
                        当前模型不支持图片输入，{images.length} 张参考图将被忽略；如需读图请切换支持读图的模型
                      </>
                    )}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                title={deepseekNoKey ? '请先在「设置」页填写 DeepSeek API Key' : undefined}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF2E4D] px-5 py-3.5 text-[15px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E01335] hover:shadow-[0_8px_20px_rgba(255,46,77,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {status === 'generating' ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-5 w-5" aria-hidden />
                )}
                {status === 'generating' ? 'AI 仿写中…' : '生成仿写文案'}
              </button>
              {!canGenerate && status !== 'generating' && (
                <p className="text-center text-[11px] text-[#9A948B]">
                  {deepseekNoKey
                    ? '请先在「设置」页配置 DeepSeek API Key 后再生成'
                    : '填写参考文案或上传参考图后即可生成'}
                </p>
              )}
              <p
                className="text-center text-[11px] text-[#9A948B]"
                title={`当前文案模型：${textModel.label}（${textModel.id}）`}
              >
                当前文案模型：{textModel.label}
                {deepseekNoKey ? '（待配置 Key）' : ''}
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

          {status === 'done' && result && (
            <>
              <ResultPanel
                result={result}
                onGenerateCards={handleGenerateCards}
              />
              {showCards && (
                <div ref={cardsRef} className="scroll-mt-24">
                  {images.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(26,24,20,0.08)] bg-white px-3 py-2.5">
                      <span className="text-[12px] font-bold text-[#1A1814]">制作步骤：先换字，再套模板</span>
                      <button
                        type="button"
                        onClick={() => setCardMode('original')}
                        className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors duration-150 ${cardMode === 'original' ? 'border-[#FF2E4D] bg-[#FFF1F3] text-[#E01335]' : 'border-[rgba(26,24,20,0.14)] text-[#6B655C] hover:border-[#1A1814]'}`}
                      >
                        第一步：原图换字
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardMode('template')}
                        disabled={Object.keys(editedOutputs).length !== images.length}
                        title={Object.keys(editedOutputs).length !== images.length ? '请先完成全部图片换字，并逐张检查' : '确认所有图片无误后进入排版'}
                        className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors duration-150 ${cardMode === 'template' ? 'border-[#FF2E4D] bg-[#FFF1F3] text-[#E01335]' : 'border-[rgba(26,24,20,0.14)] text-[#6B655C] hover:border-[#1A1814]'}`}
                      >
                        确认第一步无误，进入排版（{Object.keys(editedOutputs).length}/{images.length}）
                      </button>
                    </div>
                  )}
                  {images.length > 0 && (
                    <div hidden={cardMode !== 'original'}>
                      <OriginalImageEditor key={images.map((img: ImageItem) => img.id).join(',') + result.body} images={images} body={result.body} onOutputs={handleEditedOutputs} />
                    </div>
                  )}
                  {images.length > 0 && cardMode === 'template' && Object.keys(editedOutputs).length !== images.length && <p className="my-4 rounded-xl bg-white p-4 text-sm">请先完成第一步的全部图片换字（{Object.keys(editedOutputs).length}/{images.length}），检查所有图片无误后，点击确认按钮进入排版。</p>}
                  {(images.length === 0 || (cardMode === 'template' && Object.keys(editedOutputs).length === images.length)) && (
                  <>
<div className="space-y-4 rounded-2xl bg-white p-5 mb-5">
            <CustomTemplateUploader onChange={handleCustomLayouts} onSelect={useCustomLayout} />
            <OptionGroup
              label="第二步：选择排版模板（可多选）"
              options={[...customLayouts.map(item => ({ id: item.id, label: item.label, desc: item.desc })), ...LAYOUT_OPTIONS]}
              value={layout}
              onChange={toggleLayout}
              selectedIds={layouts}
              onToggle={toggleLayout}
              visual
              dense
              disabled={false}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-medium text-[#6B655C]">快捷套数</span>
              {[1, 2, 4, 6, 8, 10].map((count: number) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setLayoutCount(count)}
                  className={`rounded-full border px-3 py-1 text-[12px] font-bold transition-colors duration-150 ${templateCount === count ? 'border-[#1A1814] bg-[#1A1814] text-[#FAF7F1]' : 'border-[rgba(26,24,20,0.14)] text-[#6B655C] hover:border-[#1A1814] hover:text-[#1A1814]'}`}
                >
                  {`${count} 套`}
                </button>
              ))}
              <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-[#FF2E4D] px-3 py-1 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(255,46,77,0.28)]">
                <span className="text-[13px] font-black">{LAYOUT_OPTIONS.length}</span>
                <span>套专业排版模板</span>
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#6B655C]">
              {`已选 ${layouts.length} 套${layouts.length > 1 ? `（${layouts.map((id: string) => customLayouts.find(item => item.id === id)?.label ?? LAYOUT_OPTIONS.find((opt) => opt.id === id)?.label ?? id).join('、')}）` : ''}，点模板可增删，最多 10 套`}
              {layoutLimitHit ? ' · 已达 10 套上限' : ''}
            </p>
            {images.length > 0 && (
              <p className="text-[11px] leading-relaxed text-[#9A948B]">
                已确认第一步结果。现在选择字体与版式；如需重新修改，请返回第一步，修改后重新确认。
              </p>
            )}
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
                  {layouts.map((id: CardLayoutId) => getCardLayout(id)).map((spec, deckIndex) => (
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
                        result={result}
                        referenceImages={referenceImages}
                        referenceFullImages={referenceFullImages}
                        layout={spec.id}
                        brandName={brandName}
                        deckKey={spec.id}
                        registerDeck={registerDeck}
                        fontScale={cardFontScale}
                        editedPages={images.length > 0 ? images.map((_: ImageItem, i: number) => editedOutputs[i]).filter((v): v is string => !!v) : undefined}
                      />
                    </div>
                  ))}
                  </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
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


'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, History, Image as ImageIcon, Trash2 } from 'lucide-react';
import { CopyButton } from '@/components/workbench/CopyButton';
import { deleteHistoryItem, loadHistory } from '@/lib/storage';
import {
  findOption,
  LENGTH_OPTIONS,
  STRUCTURE_OPTIONS,
  STYLE_OPTIONS,
} from '@/lib/options';
import type { HistoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function HistoryCard({
  item,
  onDelete,
}: {
  item: HistoryItem;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // 自定义选项的显示名优先（params.style 为 'custom' 时预设映射不可用）
  const styleLabel =
    item.params.styleLabel ?? findOption(STYLE_OPTIONS, item.params.style).label;
  const structureLabel =
    item.params.structureLabel ??
    findOption(STRUCTURE_OPTIONS, item.params.structure).label;
  const lengthLabel =
    item.params.lengthLabel ??
    findOption(LENGTH_OPTIONS, item.params.length).label;
  const allText = [
    ...item.result.titles.map((t, i) => `【标题${i + 1}】${t}`),
    '',
    `【正文】\n${item.result.body}`,
    '',
    `【标签】\n${item.result.tags.map((t) => `#${t}`).join(' ')}`,
  ].join('\n');

  return (
    <article className="overflow-hidden rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white shadow-[0_2px_12px_rgba(26,24,20,0.05)]">
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[#1A1814]">
              {item.result.titles[0] ?? '（无标题）'}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#9A948B]">
              <span>{formatTime(item.createdAt)}</span>
              <span aria-hidden>·</span>
              <span>{styleLabel}</span>
              <span aria-hidden>·</span>
              <span>{structureLabel}</span>
              <span aria-hidden>·</span>
              <span>{lengthLabel}</span>
              {item.params.modelLabel && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FAF7F1] px-1.5 py-px text-[11px] font-medium text-[#6B655C]">
                  {item.params.modelLabel}
                </span>
              )}
              {item.params.hadImages && (
                <span className="inline-flex items-center gap-0.5">
                  <ImageIcon className="h-3 w-3" aria-hidden />
                  参考图
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <CopyButton text={allText} label="复制" />
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              aria-label="删除该记录"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(26,24,20,0.12)] bg-white text-[#9A948B] transition-colors duration-150 hover:border-[#FF2E4D]/50 hover:text-[#E01335]"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 self-start text-[12px] font-medium text-[#6B655C] transition-colors duration-150 hover:text-[#E01335]"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
          {expanded ? '收起详情' : '查看详情'}
        </button>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-out',
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 pt-1">
              <div>
                <p className="text-[12px] font-bold text-[#6B655C]">标题方案</p>
                <ul className="mt-1.5 space-y-1">
                  {item.result.titles.map((title, i) => (
                    <li key={`${i}-${title}`} className="text-[13px] text-[#33302A]">
                      <span className="mr-1.5 font-bold text-[#E01335]">{i + 1}.</span>
                      {title}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#6B655C]">正文</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-[1.8] text-[#33302A]">
                  {item.result.body}
                </p>
              </div>
              {item.result.tags.length > 0 && (
                <div>
                  <p className="text-[12px] font-bold text-[#6B655C]">话题标签</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.result.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#FFE1E6] bg-[#FFF0F2] px-2.5 py-0.5 text-[11px] font-medium text-[#E01335]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[12px] font-bold text-[#6B655C]">改写说明</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-[1.8] text-[#8A8171]">
                  {item.result.rewriteNotes}
                </p>
              </div>
              {item.referenceText && (
                <div>
                  <p className="text-[12px] font-bold text-[#6B655C]">参考原文（节选）</p>
                  <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-[#9A948B]">
                    {item.referenceText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(loadHistory());
    setLoaded(true);
  }, []);

  const handleDelete = (id: string) => {
    deleteHistoryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="h-40 animate-pulse rounded-2xl bg-white/70" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-bold text-[#1A1814]">
          <History className="h-5 w-5 text-[#FF2E4D]" aria-hidden />
          历史记录
          <span className="text-[12px] font-normal text-[#9A948B]">
            共 {items.length} 条 · 仅保存在本地浏览器
          </span>
        </h1>
      </div>

      {items.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(26,24,20,0.18)] bg-white/60 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1ECE1] text-[#9A948B]">
            <History className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 text-[15px] font-bold text-[#1A1814]">还没有生成记录</p>
          <p className="mt-1.5 text-[13px] text-[#9A948B]">
            去工作台完成第一次仿写，结果会自动保存在这里。
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <HistoryCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

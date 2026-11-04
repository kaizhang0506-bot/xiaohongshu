'use client';

import { Layers } from 'lucide-react';
import { CopyButton } from './CopyButton';
import type { RewriteResult } from '@/lib/types';

interface ResultPanelProps {
  result: RewriteResult;
  onGenerateCards: () => void;
  generatingCards?: boolean;
}

function BlockHeader({
  label,
  hint,
  copyText,
  onCopied,
}: {
  label: string;
  hint?: string;
  copyText?: string;
  onCopied?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-[13px] font-bold text-[#1A1814]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF2E4D]" aria-hidden />
        {label}
        {hint && (
          <span className="text-[11px] font-normal text-[#9A948B]">{hint}</span>
        )}
      </p>
      {copyText !== undefined && (
        <CopyButton text={copyText} onCopied={onCopied} />
      )}
    </div>
  );
}

export function ResultPanel({
  result,
  onGenerateCards,
  generatingCards = false,
}: ResultPanelProps) {
  const tagsText = result.tags.map((t) => `#${t}`).join(' ');
  const allText = [
    ...result.titles.map((t, i) => `【标题${i + 1}】${t}`),
    '',
    `【正文】\n${result.body}`,
    '',
    `【标签】\n${tagsText}`,
  ].join('\n');

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <section className="animate-fade-up rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-5">
        <BlockHeader
          label="标题方案"
          hint={`${result.titles.length} 个`}
          copyText={result.titles.join('\n')}
        />
        <ul className="mt-3 space-y-2">
          {result.titles.map((title, index) => (
            <li
              key={`${index}-${title}`}
              className="group flex items-start justify-between gap-2 rounded-xl bg-[#FAF7F1] px-3 py-2.5"
            >
              <p className="text-[14px] font-bold leading-relaxed text-[#1A1814]">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FF2E4D]/10 text-[11px] font-bold text-[#E01335]">
                  {index + 1}
                </span>
                {title}
              </p>
              <CopyButton text={title} label="" className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" />
            </li>
          ))}
        </ul>
      </section>

      {/* 正文 */}
      <section className="animate-fade-up rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-5">
        <BlockHeader label="正文" copyText={result.body} />
        <div className="mt-3 whitespace-pre-wrap rounded-xl bg-[#FAF7F1] px-4 py-3.5 text-[14px] leading-[1.9] text-[#33302A]">
          {result.body}
        </div>
      </section>

      {/* 标签 */}
      {result.tags.length > 0 && (
        <section className="animate-fade-up rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-5">
          <BlockHeader
            label="话题标签"
            hint={`${result.tags.length} 个`}
            copyText={tagsText}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#FFE1E6] bg-[#FFF0F2] px-3 py-1 text-[12px] font-medium text-[#E01335]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 改写说明 */}
      <section className="animate-fade-up rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-5">
        <BlockHeader label="改写说明" copyText={result.rewriteNotes} />
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#F5F1E8] px-4 py-3.5 text-[13px] leading-[1.9] text-[#5C564C]">
          {result.rewriteNotes}
        </p>
      </section>

      {/* 操作区 */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={onGenerateCards}
          disabled={generatingCards}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1A1814] px-5 py-3 text-[14px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2E2A24] hover:shadow-[0_6px_18px_rgba(26,24,20,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Layers className="h-4.5 w-4.5" aria-hidden />
          {generatingCards ? '正在生成卡片…' : '生成图文卡片'}
        </button>
        <CopyButton
          text={allText}
          label="复制全部内容"
          className="rounded-xl border-[rgba(26,24,20,0.16)] px-5 py-3 text-[13px] font-bold text-[#1A1814] hover:border-[#FF2E4D]/60 hover:text-[#E01335] sm:w-auto"
        />
      </div>
    </div>
  );
}

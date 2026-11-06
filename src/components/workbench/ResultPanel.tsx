'use client';

import { useState } from 'react';
import { Layers, PenLine } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { CardRichText } from './CardRichText';
import { plainCardText } from '@/lib/card-rich-text';
import type { RewriteResult } from '@/lib/types';

interface ResultPanelProps {
  result: RewriteResult;
  onGenerateCards: () => void;
  generatingCards?: boolean;
  onTitleChange: (index: number, title: string) => void;
  titleEditingDisabled?: boolean;
}

function EditableTitle({ title, index, disabled, onSave }: {
  title: string;
  index: number;
  disabled: boolean;
  onSave: (title: string) => void;
}) {
  const [draft, setDraft] = useState(title);
  return (
    <input
      aria-label={`修改标题 ${index + 1}`}
      value={draft}
      disabled={disabled}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (!next) { setDraft(title); return; }
        setDraft(next);
        if (next !== title) onSave(next);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      placeholder="请输入标题"
      className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[14px] font-bold leading-relaxed text-[#1A1814] outline-none transition-colors hover:border-[#DED8CF] focus:border-[#FF2E4D] focus:bg-white disabled:opacity-60"
    />
  );
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
  onTitleChange,
  titleEditingDisabled = false,
}: ResultPanelProps) {
  const tagsText = result.tags.map((t) => `#${t}`).join(' ');
  const allText = [
    ...result.titles.map((t, i) => `【标题${i + 1}】${t}`),
    '',
    `【正文】\n${plainCardText(result.body)}`,
    '',
    `【标签】\n${tagsText}`,
  ].join('\n');

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <section className="animate-fade-up rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-5">
        <BlockHeader
          label="标题方案"
          hint={`${result.titles.length} 个 · 可直接修改`}
          copyText={result.titles.join('\n')}
        />
        <ul className="mt-3 space-y-2">
          {result.titles.map((title, index) => (
            <li
              key={index}
              className="group flex items-center gap-2 rounded-xl bg-[#FAF7F1] px-3 py-2.5"
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF2E4D]/10 text-[11px] font-bold text-[#E01335]">{index + 1}</span>
              <EditableTitle key={`${index}-${title}`} title={title} index={index} disabled={titleEditingDisabled} onSave={value => onTitleChange(index, value)} />
              <PenLine className="h-3.5 w-3.5 shrink-0 text-[#9A948B]" aria-hidden />
              <CopyButton text={title} label="" className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-[#9A948B]">修改后按回车或点击其他位置保存；第 1 个标题用于卡片封面。</p>
      </section>

      {/* 正文 */}
      <section className="animate-fade-up rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-5">
        <BlockHeader label="正文" copyText={plainCardText(result.body)} />
        <div className="mt-3 whitespace-pre-wrap rounded-xl bg-[#FAF7F1] px-4 py-3.5 text-[14px] leading-[1.9] text-[#33302A]">
          <CardRichText text={result.body} style={{ fontSize: 14, lineHeight: 1.9 }} accent="#FF2E4D" highlight="#FFE58A" compact />
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

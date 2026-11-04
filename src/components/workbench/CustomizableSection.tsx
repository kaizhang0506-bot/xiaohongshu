'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { OptionDef } from '@/lib/options';
import type { CustomOption } from '@/lib/types';
import { OptionGroup } from './OptionGroup';

interface CustomizableSectionProps {
  /** 分组标题，如「仿写风格」 */
  label: string;
  /** 追加按钮与表单里的语境词，如「风格」 */
  kindName: string;
  presets: OptionDef<string>[];
  customs: CustomOption[];
  /** 预设 id 或 'custom:<id>' */
  value: string;
  onChange: (value: string) => void;
  /** 新增自定义选项（持久化 + 选用由调用方决定） */
  onAdd: (option: CustomOption) => void;
  /** 删除自定义选项（入参为 'custom:<id>'） */
  onDelete: (chipId: string) => void;
  disabled?: boolean;
  exampleName: string;
  exampleDesc: string;
}

const LABEL_MIN = 2;
const LABEL_MAX = 12;
const DESC_MIN = 5;
const DESC_MAX = 100;

function makeCustomId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * 选项组 + 自定义编辑器：
 * 预设选项与自定义选项合并展示，自定义项带删除入口，底部提供内联添加表单
 */
export function CustomizableSection({
  label,
  kindName,
  presets,
  customs,
  value,
  onChange,
  onAdd,
  onDelete,
  disabled = false,
  exampleName,
  exampleDesc,
}: CustomizableSectionProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');

  const merged: OptionDef<string>[] = [
    ...presets.map((p) => ({ ...p, isCustom: false })),
    ...customs.map((c) => ({
      id: `custom:${c.id}`,
      label: c.label,
      desc: c.desc,
      isCustom: true,
    })),
  ];

  const reset = () => {
    setName('');
    setDesc('');
    setError('');
  };

  const submit = () => {
    const n = name.trim();
    const d = desc.trim();
    if (n.length < LABEL_MIN || n.length > LABEL_MAX) {
      setError(`名称需 ${LABEL_MIN}-${LABEL_MAX} 个字`);
      return;
    }
    if (d.length < DESC_MIN || d.length > DESC_MAX) {
      setError(`描述需 ${DESC_MIN}-${DESC_MAX} 个字`);
      return;
    }
    if (
      presets.some((p) => p.label === n) ||
      customs.some((c) => c.label === n)
    ) {
      setError('名称与现有选项重复，请换一个');
      return;
    }
    onAdd({ id: makeCustomId(), label: n, desc: d });
    reset();
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      <OptionGroup
        label={label}
        options={merged}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onDeleteCustom={onDelete}
      />

      {adding ? (
        <div className="space-y-2 rounded-xl border border-[rgba(255,46,77,0.35)] bg-[#FAF7F1] p-3">
          <p className="text-[12px] font-bold text-[#1A1814]">
            编写你自己的{kindName}
            <span className="ml-1.5 font-normal text-[#9A948B]">
              名称 + 描述会直接作为 AI 指令
            </span>
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            maxLength={LABEL_MAX}
            placeholder={`名称（${LABEL_MIN}-${LABEL_MAX} 字），如「${exampleName}」`}
            className="w-full rounded-lg border border-[rgba(26,24,20,0.14)] bg-white px-3 py-2 text-[13px] text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D]"
          />
          <textarea
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value);
              setError('');
            }}
            maxLength={DESC_MAX}
            rows={2}
            placeholder={`描述（${DESC_MIN}-${DESC_MAX} 字），如「${exampleDesc}」`}
            className="w-full resize-y rounded-lg border border-[rgba(26,24,20,0.14)] bg-white px-3 py-2 text-[12px] leading-relaxed text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D]"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium leading-snug text-[#E01335]">
              {error || `${desc.trim().length}/${DESC_MAX}`}
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setAdding(false);
                }}
                className="rounded-lg border border-[rgba(26,24,20,0.14)] bg-white px-3 py-1.5 text-[12px] font-bold text-[#6B655C] transition-colors duration-150 hover:border-[rgba(26,24,20,0.3)]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={disabled}
                className="flex items-center gap-1 rounded-lg bg-[#FF2E4D] px-3 py-1.5 text-[12px] font-bold text-white transition-all duration-150 hover:bg-[#E01335] hover:shadow-[0_2px_8px_rgba(255,46,77,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                添加并选用
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[rgba(26,24,20,0.22)] bg-[#FAF7F1]/60 py-2 text-[12px] font-bold text-[#6B655C] transition-all duration-150 hover:border-[#FF2E4D] hover:bg-[#FFF0F2] hover:text-[#E01335] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          自定义{kindName}，自己编写
        </button>
      )}
    </div>
  );
}

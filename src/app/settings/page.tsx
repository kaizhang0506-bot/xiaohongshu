'use client';

import { useEffect, useState } from 'react';
import { Check, Settings2 } from 'lucide-react';
import { loadSettings, saveSettings } from '@/lib/storage';
import type { AppSettings } from '@/lib/types';

const FIELDS: {
  key: keyof AppSettings;
  label: string;
  placeholder: string;
  hint: string;
  multiline?: boolean;
}[] = [
  {
    key: 'brandName',
    label: '品牌名',
    placeholder: '例如：财商研究所',
    hint: '生成时会在标题、正文或标签中自然融入你的品牌名',
  },
  {
    key: 'targetAudience',
    label: '目标人群',
    placeholder: '例如：刚工作的理财小白、关注存钱的职场新人',
    hint: '帮助 AI 调整语言风格与案例场景，更贴合你的读者',
  },
  {
    key: 'forbiddenWords',
    label: '禁止词',
    placeholder: '多个词用逗号分隔，例如：稳赚,保本,躺赚,翻倍',
    hint: '这些词将严格禁止出现在任何生成内容中（收益承诺类词语强烈建议加入）',
    multiline: true,
  },
  {
    key: 'toneHint',
    label: '常用语气',
    placeholder: '例如：亲切但克制，少用感叹号，避免夸张',
    hint: '描述你偏好的表达习惯，AI 会尽量遵循',
    multiline: true,
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  if (!settings) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="h-64 animate-pulse rounded-2xl bg-white/70" />
      </div>
    );
  }

  const handleChange = (key: keyof AppSettings, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const handleSave = () => {
    if (!settings) return;
    saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-[18px] font-bold text-[#1A1814]">
          <Settings2 className="h-5 w-5 text-[#FF2E4D]" aria-hidden />
          生成设置
        </h1>
        <p className="mt-1.5 text-[13px] text-[#6B655C]">
          以下偏好会在每次生成时自动注入 AI 提示词，保存后立即生效。全部文案与配图模型均由扣子托管直连，无需配置任何 API Key。
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-5 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-6">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label
              htmlFor={`setting-${field.key}`}
              className="block text-[13px] font-bold text-[#1A1814]"
            >
              {field.label}
              <span className="ml-1.5 text-[11px] font-normal text-[#9A948B]">
                可选
              </span>
            </label>
            {field.multiline ? (
              <textarea
                id={`setting-${field.key}`}
                value={settings[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                rows={2}
                placeholder={field.placeholder}
                className="w-full resize-y rounded-xl border border-[rgba(26,24,20,0.14)] bg-[#FAF7F1] px-3.5 py-2.5 text-[14px] leading-relaxed text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D] focus:bg-white"
              />
            ) : (
              <input
                id={`setting-${field.key}`}
                type="text"
                value={settings[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-[rgba(26,24,20,0.14)] bg-[#FAF7F1] px-3.5 py-2.5 text-[14px] text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D] focus:bg-white"
              />
            )}
            <p className="text-[11px] leading-relaxed text-[#9A948B]">{field.hint}</p>
          </div>
        ))}

        <button
          type="button"
          onClick={handleSave}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-white transition-all duration-200 sm:w-auto ${
            saved
              ? 'bg-[#3E9B5F]'
              : 'bg-[#1A1814] hover:-translate-y-0.5 hover:bg-[#2E2A24] hover:shadow-[0_6px_18px_rgba(26,24,20,0.18)]'
          }`}
        >
          {saved && <Check className="h-4.5 w-4.5" aria-hidden />}
          {saved ? '已保存' : '保存设置'}
        </button>
      </div>

      <p className="text-center text-[11px] text-[#9A948B]">
        设置仅保存在本地浏览器（localStorage），不会上传到服务器。
      </p>
    </div>
  );
}

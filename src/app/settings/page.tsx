'use client';

import { useEffect, useState } from 'react';
import { Check, Settings2 } from 'lucide-react';
import {
  loadDeepseekBaseUrl,
  loadDeepseekKey,
  loadDeepseekModelId,
  loadDeepseekVision,
  loadSettings,
  saveDeepseekBaseUrl,
  saveDeepseekKey,
  saveDeepseekModelId,
  saveDeepseekVision,
  saveSettings,
} from '@/lib/storage';
import {
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL_ID,
} from '@/lib/model';
import { DEEPSEEK_PRESET, DEEPSEEK_PRESET_VISION } from '@/lib/deepseek-preset';
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
  const [deepseekKey, setDeepseekKey] = useState('');
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState('');
  const [deepseekModelId, setDeepseekModelId] = useState('');
  const [deepseekVision, setDeepseekVision] = useState(false);
  const [deepseekSaved, setDeepseekSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setDeepseekKey(loadDeepseekKey());
    setDeepseekBaseUrl(loadDeepseekBaseUrl());
    setDeepseekModelId(loadDeepseekModelId());
    setDeepseekVision(loadDeepseekVision());
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

  const handleSaveDeepseekKey = () => {
    saveDeepseekKey(deepseekKey);
    saveDeepseekBaseUrl(deepseekBaseUrl);
    saveDeepseekModelId(deepseekModelId);
    saveDeepseekVision(deepseekVision);
    setDeepseekSaved(true);
    window.setTimeout(() => setDeepseekSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-[18px] font-bold text-[#1A1814]">
          <Settings2 className="h-5 w-5 text-[#FF2E4D]" aria-hidden />
          生成设置
        </h1>
        <p className="mt-1.5 text-[13px] text-[#6B655C]">
          以下偏好会在每次生成时自动注入 AI 提示词，保存后立即生效。
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

      <div className="space-y-3 rounded-2xl border border-[rgba(26,24,20,0.08)] bg-white p-5 shadow-[0_2px_12px_rgba(26,24,20,0.05)] sm:p-6">
        <div>
          <h2 className="text-[14px] font-bold text-[#1A1814]">DeepSeek 接口配置（自有 Key 直连）</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[#6B655C]">
            填写后即可在文案模型中选择「DeepSeek Chat」，后端将<span className="font-semibold text-[#1A1814]">真实调用 DeepSeek 接口</span>，
            界面显示与实际引擎一致。官方 Key 请在 platform.deepseek.com 获取；也支持 OpenAI 兼容的中转站（填写对应的 API 地址与模型 ID）。
          </p>
          {DEEPSEEK_PRESET && (
            <p className="mt-2 rounded-lg bg-[#EEF7F0] px-2.5 py-2 text-[11px] font-medium leading-relaxed text-[#2F7A48]">
              服务端已预配置 DeepSeek 通道，无需填写即可直接使用{DEEPSEEK_PRESET_VISION ? '，且已默认开启读图' : ''}；此处填写并保存后将覆盖预配置。
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="setting-deepseek-key" className="text-[12px] font-medium text-[#6B655C]">
            API Key
          </label>
          <input
            id="setting-deepseek-key"
            type="password"
            autoComplete="off"
            value={deepseekKey}
            onChange={(e) => setDeepseekKey(e.target.value)}
            maxLength={120}
            placeholder="sk-..."
            className="w-full rounded-xl border border-[rgba(26,24,20,0.14)] bg-[#FAF7F1] px-3.5 py-2.5 text-[14px] text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D] focus:bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="setting-deepseek-base-url" className="text-[12px] font-medium text-[#6B655C]">
            API 地址（可选，默认官方）
          </label>
          <input
            id="setting-deepseek-base-url"
            type="text"
            autoComplete="off"
            value={deepseekBaseUrl}
            onChange={(e) => setDeepseekBaseUrl(e.target.value)}
            maxLength={200}
            placeholder={DEFAULT_DEEPSEEK_BASE_URL}
            className="w-full rounded-xl border border-[rgba(26,24,20,0.14)] bg-[#FAF7F1] px-3.5 py-2.5 text-[14px] text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D] focus:bg-white"
          />
          <p className="text-[11px] leading-relaxed text-[#9A948B]">
            使用中转站时填写其 Base URL（如 https://oapi.example.cn/v1），留空则调用 DeepSeek 官方接口。
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="setting-deepseek-model-id" className="text-[12px] font-medium text-[#6B655C]">
            模型 ID（可选，默认 {DEFAULT_DEEPSEEK_MODEL_ID}）
          </label>
          <input
            id="setting-deepseek-model-id"
            type="text"
            autoComplete="off"
            value={deepseekModelId}
            onChange={(e) => setDeepseekModelId(e.target.value)}
            maxLength={64}
            placeholder={DEFAULT_DEEPSEEK_MODEL_ID}
            className="w-full rounded-xl border border-[rgba(26,24,20,0.14)] bg-[#FAF7F1] px-3.5 py-2.5 text-[14px] text-[#1A1814] outline-none transition-colors duration-150 placeholder:text-[#B0A99D] focus:border-[#FF2E4D] focus:bg-white"
          />
          <p className="text-[11px] leading-relaxed text-[#9A948B]">
            中转站按其已开通的模型清单填写（如 deepseek-v4.1-flash-1017）；官方渠道留空即可。
          </p>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[rgba(26,24,20,0.1)] bg-[#FAF7F1] px-3.5 py-3 transition-colors duration-150 hover:border-[rgba(26,24,20,0.2)]">
          <input
            type="checkbox"
            checked={deepseekVision}
            onChange={(e) => setDeepseekVision(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#FF2E4D]"
          />
          <span className="text-[12px] leading-relaxed text-[#6B655C]">
            <span className="font-semibold text-[#1A1814]">该模型支持读图（多模态）</span>
            <br />
            开启后，选中 DeepSeek 时参考图会一并发送给模型分析。仅当你配置的模型确实支持图片输入时开启（官方 deepseek-chat 为纯文本，请勿开启）。
          </span>
        </label>
        <p className="text-[11px] leading-relaxed text-[#9A948B]">
          以上配置仅保存在你的浏览器本地，仅在工作台服务端转发给目标接口使用，不会上传到其他任何地方；Key 留空则不启用 DeepSeek 通道。
        </p>
        <button
          type="button"
          onClick={handleSaveDeepseekKey}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-white transition-all duration-200 sm:w-auto ${
            deepseekSaved
              ? 'bg-[#3E9B5F]'
              : 'bg-[#1A1814] hover:-translate-y-0.5 hover:bg-[#2E2A24] hover:shadow-[0_6px_18px_rgba(26,24,20,0.18)]'
          }`}
        >
          {deepseekSaved && <Check className="h-4.5 w-4.5" aria-hidden />}
          {deepseekSaved ? '已保存' : '保存配置'}
        </button>
      </div>

      <p className="text-center text-[11px] text-[#9A948B]">
        设置仅保存在本地浏览器（localStorage），不会上传到服务器。
      </p>
    </div>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import './card-fonts.css';
import './rednote-templates.css';
import { AppHeader } from '@/components/AppHeader';
import { DisclaimerBar } from '@/components/DisclaimerBar';
import { TEXT_MODELS } from '@/lib/model';

export const metadata: Metadata = {
  title: {
    default: '财经科普仿写工作台',
    template: '%s | 财经科普仿写工作台',
  },
  description:
    '财经科普赛道专用：参考图片与文案，选择风格、结构与排版模板，AI 生成原创小红书财经科普文案与 3:4 图文卡片。生成内容仅供科普参考，不构成投资建议。',
  keywords: [
    '财经科普',
    '理财文案',
    '小红书文案',
    '文案仿写',
    '图文卡片',
    'AI 写作',
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#FAF7F1] text-[#1A1814] antialiased">
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <DisclaimerBar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[rgba(26,24,20,0.08)] py-5">
            <p className="mx-auto max-w-6xl px-4 text-center text-[12px] leading-relaxed text-[#9A948B] sm:px-6">
              文案仿写可选 {TEXT_MODELS.length} 款模型；模板直接排版，无需生图模型。
              <br className="sm:hidden" />
              <span className="mx-1.5 hidden sm:inline" aria-hidden>
                ·
              </span>
              本工具为创作辅助 MVP，生成内容仅供参考；历史记录与设置仅保存在本地浏览器。
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}


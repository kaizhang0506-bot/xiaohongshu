'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenText, Settings2, Sparkles, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: '工作台', icon: Sparkles },
  { href: '/template-gallery', label: '小红书模板库', icon: LayoutGrid },
  { href: '/finished-six', label: '成品预览', icon: BookOpenText },
  { href: '/history', label: '历史记录', icon: BookOpenText },
  { href: '/settings', label: '设置', icon: Settings2 },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(26,24,20,0.08)] bg-[rgba(250,247,241,0.92)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF2E4D] text-white shadow-sm">
            <Sparkles className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[15px] font-bold tracking-tight text-[#1A1814]">
              财经科普仿写工作台
            </span>
            <span className="hidden text-[11px] text-[#6B655C] sm:block">
              财经素材 → 原创科普 → 图文卡片
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="主导航">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200',
                  active
                    ? 'bg-[#1A1814] text-white shadow-sm'
                    : 'text-[#6B655C] hover:bg-[#F1ECE1] hover:text-[#1A1814]',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

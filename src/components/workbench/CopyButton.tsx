'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { copyText } from '@/lib/stream-client';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  onCopied?: () => void;
}

export function CopyButton({
  text,
  label = '复制',
  className,
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(26,24,20,0.12)] bg-white px-2.5 py-1 text-[11px] font-medium text-[#6B655C] transition-colors duration-150 hover:border-[#FF2E4D]/50 hover:text-[#E01335]',
        copied && 'border-[#1A1814]/15 bg-[#1A1814] text-white hover:text-white',
        className,
      )}
      aria-live="polite"
    >
      {copied ? (
        <Check className="h-3 w-3" aria-hidden />
      ) : (
        <Copy className="h-3 w-3" aria-hidden />
      )}
      {copied ? '已复制' : label}
    </button>
  );
}

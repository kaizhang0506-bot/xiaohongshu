import { ShieldAlert } from 'lucide-react';

export function DisclaimerBar() {
  return (
    <div className="border-b border-[#F3E3B9] bg-[#FFF9E6]">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-[12px] leading-relaxed text-[#8A6A1F] sm:px-6">
        <ShieldAlert
          className="h-4 w-4 shrink-0"
          aria-hidden
        />
        <span>
          生成内容仅供财经知识科普与创作参考，不构成任何投资建议；请自行核查数据与政策时效性，发布前请自行核查内容与素材版权，因使用生成内容产生的责任由用户自行承担。
        </span>
      </p>
    </div>
  );
}

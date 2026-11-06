'use client';

import { X } from 'lucide-react';
import type { OptionDef } from '@/lib/options';
import { cn } from '@/lib/utils';
import { StudioCard } from './StudioCard';
import { PaperNotebookCard } from './PaperNotebookCard';
import { XhsNativeCard } from './XhsNativeCard';

interface OptionGroupProps<T extends string> {
  label: string;
  options: OptionDef<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 是否显示排版模板的迷你视觉预览 */
  visual?: boolean;
  /** 紧凑模式：大选项集（如 16 套排版模板）用 4 列小卡 */
  dense?: boolean;
  disabled?: boolean;
  /** 删除自定义选项（传入选项 id 'custom:<id>'，仅 isCustom 项显示入口） */
  onDeleteCustom?: (id: T) => void;
  /** 多选模式：当前已选 id 列表（按选择顺序，UI 显示序号） */
  selectedIds?: T[];
  /** 多选模式点击回调（传 id 由父级切换） */
  onToggle?: (id: T) => void;
}

export function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  visual = false,
  dense = false,
  disabled = false,
  onDeleteCustom,
  selectedIds,
  onToggle,
}: OptionGroupProps<T>) {
  const multi = typeof onToggle === 'function';
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-bold text-[#1A1814]">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          'grid gap-2',
          options.length > 24 && 'max-h-[430px] overflow-y-auto pr-1',
          dense
            ? 'grid-cols-2 sm:grid-cols-4'
            : options.length === 3
              ? 'grid-cols-3'
              : 'grid grid-cols-2 sm:grid-cols-3',
        )}
      >
        {options.map((option) => {
          const selectedIndex = multi ? (selectedIds ?? []).indexOf(option.id) : -1;
          const active = multi ? selectedIndex >= 0 : option.id === value;
          const deletable = option.isCustom && !!onDeleteCustom;
          return (
            <div key={option.id} className="relative">
              <button
                type="button"
                role={multi ? 'checkbox' : 'radio'}
                aria-checked={active}
                disabled={disabled}
                onClick={() => (multi && onToggle ? onToggle(option.id) : onChange(option.id))}
                className={cn(
                  'flex h-full w-full flex-col gap-1 rounded-xl border p-2.5 text-left transition-all duration-200',
                  active
                    ? 'border-[#FF2E4D] bg-[#FFF0F2] shadow-[0_2px_10px_rgba(255,46,77,0.10)]'
                    : 'border-[rgba(26,24,20,0.12)] bg-white hover:-translate-y-0.5 hover:border-[#FF2E4D]/50 hover:shadow-sm',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <span
                  className={cn(
                    'text-[13px] font-bold leading-none',
                    active ? 'text-[#E01335]' : 'text-[#1A1814]',
                  )}
                >
                  {option.label}
                  {option.isCustom && (
                    <span className="ml-1.5 inline-block rounded-full bg-[#FFE58A] px-1.5 py-0.5 align-baseline text-[9px] font-bold leading-none text-[#1A1814]">
                      自定义
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-snug text-[#6B655C]">
                  {option.desc}
                </span>
                {visual && option.id.startsWith('xhs-native-') && <div aria-hidden style={{width:108,height:144,overflow:'hidden',alignSelf:'center',pointerEvents:'none'}}><div style={{transform:'scale(.1)',transformOrigin:'top left'}}><XhsNativeCard id={option.id} content={{kind:'cover',index:0,total:3,title:'看懂逻辑，再做判断',subtitle:'把值得收藏的重点，写进自己的学习笔记。',tags:['学习手记','干货分享']}} /></div></div>}
                {visual && option.id.startsWith('studio-') && <div style={{width:108,height:144,overflow:'hidden',alignSelf:'center',pointerEvents:'none'}}><div style={{transform:'scale(.1)',transformOrigin:'top left'}}><StudioCard id={option.id} content={{kind:'cover',index:0,total:3,title:'看懂逻辑\n再做判断',subtitle:'用清晰的文字，记录每一个关键观点。'}} /></div></div>}
                {visual && option.id === 'xhs-paper-notebook' && <div style={{width:108,height:144,overflow:'hidden',alignSelf:'center',pointerEvents:'none'}}><div style={{transform:'scale(.1)',transformOrigin:'top left'}}><PaperNotebookCard content={{kind:'cover',index:0,total:3,title:'看懂逻辑\n再做判断',subtitle:'把重点记下来'}} /></div></div>}
                {visual && option.visual && !option.id.startsWith('xhs-native-') && !option.id.startsWith('studio-') && option.id !== 'xhs-paper-notebook' && (
                  <span
                    aria-hidden
                    className={cn(
                      'relative mt-1 block w-full overflow-hidden rounded-md border border-[rgba(26,24,20,0.06)]',
                      dense ? 'h-8' : 'h-10',
                    )}
                    style={{ backgroundColor: option.visual.bg }}
                  >
                    {(() => {
                      const { fg, accent, decor, family, accentStyle, numberStyle, dividerStyle, align, composition } = option.visual;
                      if (composition === 'split') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '38%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', top: '38%', left: '48%', width: '40%', height: 2, backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '54%', left: '48%', width: '30%', height: 2, backgroundColor: fg, opacity: 0.6 }} />
                          </>
                        );
                      }
                      if (composition === 'bandtop') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', bottom: '34%', left: '16%', width: '44%', height: 2, backgroundColor: fg, opacity: 0.7 }} />
                            <span style={{ position: 'absolute', bottom: '20%', left: '16%', width: '30%', height: 2, backgroundColor: fg, opacity: 0.45 }} />
                          </>
                        );
                      }
                      if (accentStyle) {
                        const isCenter = align === 'center';
                        const isRight = align === 'right';
                        const lineLeft = isCenter ? '28%' : isRight ? '48%' : '16%';
                        const lineW = isCenter ? '44%' : '38%';
                        return (
                          <>
                            {accentStyle === 'topbar' && <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '16%', backgroundColor: accent }} />}
                            {accentStyle === 'leftblock' && <span style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '12%', backgroundColor: accent }} />}
                            {accentStyle === 'sidebar' && <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '12%', backgroundColor: accent }} />}
                            {accentStyle === 'cornerbox' && <span style={{ position: 'absolute', top: 0, right: 0, width: '42%', height: '42%', backgroundColor: accent, opacity: 0.2 }} />}
                            {accentStyle === 'dotrow' && <span style={{ position: 'absolute', top: '12%', left: 0, right: 0, height: '12%', backgroundImage: `radial-gradient(${accent} 1.4px, transparent 1.4px)`, backgroundSize: '5px 5px', backgroundRepeat: 'repeat-x' }} />}
                            {accentStyle === 'underline' && <span style={{ position: 'absolute', bottom: '16%', left: '16%', right: '16%', height: 2, backgroundColor: accent, opacity: 0.7 }} />}
                            {numberStyle && numberStyle !== 'none' && (
                              <span style={{ position: 'absolute', top: '10%', right: '10%', width: 10, height: 10, borderRadius: numberStyle === 'pill' ? 999 : 2, backgroundColor: numberStyle === 'outline' ? 'transparent' : accent, border: numberStyle === 'outline' ? `1.5px solid ${accent}` : 'none', opacity: numberStyle === 'ghost' ? 0.4 : 1 }} />
                            )}
                            <span style={{ position: 'absolute', top: '40%', left: lineLeft, width: lineW, height: 2, backgroundColor: fg }} />
                            {dividerStyle && dividerStyle !== 'none' && (
                              <span style={{ position: 'absolute', top: '54%', left: lineLeft, width: lineW, height: dividerStyle === 'double' ? 4 : 2, backgroundColor: dividerStyle === 'dashed' || dividerStyle === 'dotted' ? 'transparent' : fg, borderTop: dividerStyle === 'dashed' ? `1.5px dashed ${fg}` : dividerStyle === 'dotted' ? `1.5px dotted ${fg}` : 'none', opacity: 0.7 }} />
                            )}
                          </>
                        );
                      }
                      if (decor === 'frame') {
                        return (
                          <>
                            <span style={{ position: 'absolute', inset: 3, border: `1.5px solid ${fg}`, borderRadius: 2, opacity: 0.85 }} />
                            <span style={{ position: 'absolute', top: '42%', left: '22%', height: 2, width: '34%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', top: '62%', left: '22%', height: 2, width: '22%', backgroundColor: fg, opacity: 0.6 }} />
                          </>
                        );
                      }
                      if (decor === 'ribbon') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '38%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', top: '14%', left: '14%', height: 2, width: '40%', backgroundColor: '#FFFFFF', opacity: 0.9 }} />
                            <span style={{ position: 'absolute', bottom: '26%', left: '14%', height: 2, width: '56%', backgroundColor: fg }} />
                          </>
                        );
                      }
                      if (decor === 'ticket') {
                        return (
                          <>
                            <span style={{ position: 'absolute', inset: 3, border: `1.5px dashed ${accent}`, borderRadius: 3, backgroundColor: accent, opacity: 0.14 }} />
                            <span style={{ position: 'absolute', top: '50%', left: '16%', height: 2, width: '52%', backgroundColor: fg, transform: 'translateY(-50%)' }} />
                            <span style={{ position: 'absolute', top: '74%', left: '16%', height: 1, width: '70%', borderTop: `1.5px dashed ${accent}` }} />
                          </>
                        );
                      }
                      if (decor === 'dots') {
                        return (
                          <>
                            <span style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${fg} 1.3px, transparent 1.3px)`, backgroundSize: '6px 6px', opacity: 0.35 }} />
                            <span style={{ position: 'absolute', top: '42%', left: '18%', height: 2, width: '50%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '62%', left: '18%', height: 2, width: '30%', backgroundColor: accent }} />
                          </>
                        );
                      }
                      if (decor === 'band') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', top: '60%', left: '16%', height: 2, width: '40%', backgroundColor: '#FFFFFF', opacity: 0.9 }} />
                          </>
                        );
                      }
                      if (decor === 'label') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: '16%', left: '14%', height: 6, width: '34%', backgroundColor: accent, borderRadius: 2, transform: 'rotate(-6deg)' }} />
                            <span style={{ position: 'absolute', bottom: '24%', left: '16%', height: 2, width: '52%', backgroundColor: fg }} />
                          </>
                        );
                      }
                      if (family === 'pop') {
                        return (
                          <>
                            <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', top: '22%', left: '16%', height: 3, width: '48%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '68%', left: '16%', height: 2, width: '36%', backgroundColor: '#FFFFFF' }} />
                          </>
                        );
                      }
                      if (family === 'terminal' || family === 'pixel' || family === 'blueprint') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '16%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', top: '38%', left: '14%', height: 2, width: '50%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '58%', left: '14%', height: 2, width: '34%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', top: '78%', left: '14%', height: 2, width: '20%', backgroundColor: fg, opacity: 0.55 }} />
                          </>
                        );
                      }
                      if (family === 'newspaper') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: '15%', left: '12%', right: '12%', height: 2, backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '23%', left: '12%', right: '12%', height: 1, backgroundColor: fg, opacity: 0.6 }} />
                            <span style={{ position: 'absolute', top: '42%', left: '12%', height: 3, width: '56%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '64%', left: '12%', height: 2, width: '42%', backgroundColor: accent }} />
                          </>
                        );
                      }
                      if (family === 'polaroid') {
                        return (
                          <>
                            <span style={{ position: 'absolute', inset: 3, border: '2px solid rgba(255,255,255,0.85)', borderRadius: 2 }} />
                            <span style={{ position: 'absolute', top: '42%', left: '20%', height: 2, width: '60%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '62%', left: '20%', height: 2, width: '34%', backgroundColor: accent }} />
                          </>
                        );
                      }
                      if (family === 'journal' || family === 'sticky') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: '16%', left: '16%', height: 6, width: '34%', backgroundColor: accent, borderRadius: 2, transform: 'rotate(-6deg)' }} />
                            <span style={{ position: 'absolute', top: '54%', left: '16%', height: 2, width: '54%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '72%', left: '16%', height: 2, width: '36%', backgroundColor: fg, opacity: 0.55 }} />
                          </>
                        );
                      }
                      if (family === 'magazine' || family === 'ink' || family === 'dark') {
                        return (
                          <>
                            <span style={{ position: 'absolute', top: '28%', left: '16%', height: 2, width: '38%', backgroundColor: accent }} />
                            <span style={{ position: 'absolute', top: '44%', left: '16%', height: 3, width: '60%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '66%', left: '16%', height: 2, width: '30%', backgroundColor: accent }} />
                          </>
                        );
                      }
                      if (family === 'sakura' || family === 'mint' || family === 'sunset' || family === 'taro') {
                        return (
                          <>
                            <span style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${fg} 1.3px, transparent 1.3px)`, backgroundSize: '6px 6px', opacity: 0.3 }} />
                            <span style={{ position: 'absolute', top: '42%', left: '18%', height: 2, width: '50%', backgroundColor: fg }} />
                            <span style={{ position: 'absolute', top: '62%', left: '18%', height: 2, width: '30%', backgroundColor: accent }} />
                          </>
                        );
                      }
                      return (
                        <>
                          <span style={{ position: 'absolute', top: '32%', left: '14%', height: 3, width: '58%', backgroundColor: fg }} />
                          <span style={{ position: 'absolute', top: '54%', left: '14%', height: 2, width: '40%', backgroundColor: fg, opacity: 0.7 }} />
                          <span style={{ position: 'absolute', top: '74%', left: '14%', height: 2, width: '24%', backgroundColor: accent }} />
                        </>
                      );
                    })()}
                  </span>
                )}
              </button>
              {deletable && (
                <button
                  type="button"
                  aria-label={`删除自定义选项 ${option.label}`}
                  title="删除该自定义选项"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustom(option.id);
                  }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(26,24,20,0.10)] bg-white text-[#9A948B] shadow-sm transition-colors duration-150 hover:border-[#FF2E4D] hover:text-[#E01335] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

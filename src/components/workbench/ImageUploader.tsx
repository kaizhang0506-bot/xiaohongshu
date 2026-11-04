'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageItem } from '@/lib/image-utils';
import { compressImageFile } from '@/lib/image-utils';

const MAX_IMAGES = 10;

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  disabled?: boolean;
}

export function ImageUploader({
  images,
  onChange,
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  // 防止用户把文件拖到页面其他位置时，浏览器直接打开图片导致工作内容丢失
  useEffect(() => {
    const preventNavOpen = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', preventNavOpen);
    window.addEventListener('drop', preventNavOpen);
    return () => {
      window.removeEventListener('dragover', preventNavOpen);
      window.removeEventListener('drop', preventNavOpen);
    };
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files).filter((f) =>
        f.type.startsWith('image/'),
      );
      const room = Math.max(0, MAX_IMAGES - images.length);
      if (incoming.length === 0) {
        showNotice('仅支持 JPG / PNG / WebP / GIF 图片文件');
        return;
      }
      if (room === 0) {
        showNotice(`最多 ${MAX_IMAGES} 张参考图，已达上限`);
        return;
      }
      setLoading(true);
      try {
        const accepted = incoming.slice(0, room);
        const compressed: ImageItem[] = [];
        for (const file of accepted) {
          const item = await compressImageFile(file, 1024, 0.82);
          compressed.push(item);
        }
        onChange([...images, ...compressed]);
        if (incoming.length > room) {
          showNotice(
            `一次最多补足 ${room} 张，已添加前 ${accepted.length} 张`,
          );
        }
      } finally {
        setLoading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [images, onChange, showNotice],
  );

  const removeAt = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const isFull = images.length >= MAX_IMAGES;

  // 拖拽事件挂在整个上传区（含缩略图），用计数器消除子元素间的抖动
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    // 仅响应文件拖入（拖拽选中文本等不触发）
    if (!e.dataTransfer.types.includes('Files')) return;
    dragDepth.current += 1;
    setDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    if (disabled) return;
    if (isFull) {
      showNotice(`最多 ${MAX_IMAGES} 张参考图，已达上限`);
      return;
    }
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    void addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative rounded-xl transition-colors duration-150',
          dragOver && 'bg-[#FFF0F2]',
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            'grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3',
            images.length === 0 && 'grid-cols-1',
          )}
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-[rgba(26,24,20,0.1)] bg-[#F1ECE1]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt={`参考图 ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                disabled={disabled}
                aria-label={`删除参考图 ${index + 1}`}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity duration-150 hover:bg-[#FF2E4D] focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white">
                {index + 1}/{MAX_IMAGES}
              </span>
            </div>
          ))}

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-label="上传参考图片，支持点击或拖拽"
              className={cn(
                'flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-all duration-200',
                dragOver
                  ? 'border-[#FF2E4D] bg-[#FFF0F2]'
                  : 'border-[rgba(26,24,20,0.16)] bg-[#FAF7F1] hover:border-[#FF2E4D]/60 hover:bg-[#FFF6F7]',
              )}
            >
              {loading ? (
                <span className="text-[12px] text-[#6B655C]">处理中…</span>
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-[#B0A99D]" aria-hidden />
                  <span className="text-[12px] font-medium text-[#6B655C]">
                    点击或拖拽图片到这里
                  </span>
                  <span className="text-[10px] text-[#9A948B]">
                    支持 JPG / PNG / WebP，剩余 {MAX_IMAGES - images.length}{' '}
                    张
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* 拖入时的整区高亮反馈层 */}
        {dragOver && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#FF2E4D] bg-[rgba(255,240,242,0.92)]"
          >
            <UploadCloud className="h-7 w-7 text-[#FF2E4D]" aria-hidden />
            <span className="text-[13px] font-bold text-[#FF2E4D]">
              {isFull ? `已达 ${MAX_IMAGES} 张上限，无法继续添加` : '松开鼠标，添加参考图'}
            </span>
            {!isFull && (
              <span className="text-[11px] font-medium text-[#B0505E]">
                还可添加 {MAX_IMAGES - images.length} 张
              </span>
            )}
          </div>
        )}
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-1.5 rounded-lg bg-[#FFF7E6] px-2.5 py-1.5 text-[11px] font-medium text-[#8C6D1F]"
        >
          {notice}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-[#9A948B]">
        支持 1-10 张参考图，可点击上传或直接拖入上传区；图片仅用于本次 AI
        分析，不会上传保存。
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
        }}
      />
    </div>
  );
}

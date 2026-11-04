/** 参考图数据结构 */
export interface ImageItem {
  id: string;
  dataUrl: string;
  /**
   * 高清副本（长边≤2560，JPEG 0.98），专供卡片视觉素材裁剪与封面展示，
   * 保证卡片里的图表/照片与原图一致；不发给 LLM（省 token）。
   */
  fullDataUrl: string;
  /** 原始文件，不缩放、不二次压缩，仅供局部文字编辑。 */
  originalDataUrl?: string;
}

const CARD_MAX_SIDE = 2560;
const CARD_QUALITY = 0.98;

/**
 * 客户端压缩图片：长边不超过 maxSize，JPEG quality 输出
 */
export function compressImageFile(
  file: File,
  maxSize: number,
  quality: number,
): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析图片失败'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('画布不可用'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // 高清副本：尽量保留原分辨率，仅在超大图时缩到 2560
        const cardScale = Math.min(
          1,
          CARD_MAX_SIDE / Math.max(img.width, img.height),
        );
        const cardWidth = Math.max(1, Math.round(img.width * cardScale));
        const cardHeight = Math.max(1, Math.round(img.height * cardScale));
        const cardCanvas = document.createElement('canvas');
        cardCanvas.width = cardWidth;
        cardCanvas.height = cardHeight;
        const cardCtx = cardCanvas.getContext('2d');
        if (!cardCtx) {
          reject(new Error('画布不可用'));
          return;
        }
        cardCtx.drawImage(img, 0, 0, cardWidth, cardHeight);
        const fullDataUrl = cardCanvas.toDataURL('image/jpeg', CARD_QUALITY);

        resolve({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dataUrl,
          fullDataUrl,
          originalDataUrl: reader.result as string,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type Rect={x:number;y:number;width:number;height:number};
const textRegions = new Map<string,Rect[]>();
export function rememberPageTextRegions(src:string, regions:Rect[]) { textRegions.set(src,regions); }
export function pageTextRegions(src:string) { return textRegions.get(src); }

/** Detect a white chart panel on an off-white screenshot before looking for dense volume bars.
 * The panel's light background joins sparse candles, axes and volume into one complete figure.
 */
export function findLightPanelVisual(pixels: Uint8Array | Uint8ClampedArray, w: number, h: number): Rect | null {
  const histogram = new Map<number, number>();
  const edge = Math.max(3, Math.floor(w * .04));
  for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
    if (x >= edge && x < w - edge) continue;
    const i = (y * w + x) * 4;
    const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }
  const background = [...histogram].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (background === undefined) return null;
  const rgb = [(background >> 16) & 255, (background >> 8) & 255, background & 255];
  const luminance = (rgb[0] + rgb[1] + rgb[2]) / 3;
  if (luminance < 230 || luminance > 252 || Math.max(...rgb) - Math.min(...rgb) > 15) return null;
  const light = (i: number) => Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >= 253 && (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 - luminance >= 3;
  const rows = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let count = 0;
    for (let x = 0; x < w; x++) if (light((y * w + x) * 4)) count++;
    rows[y] = count / w;
  }
  const bands: { top: number; bottom: number }[] = [];
  const gap = Math.max(3, Math.round(h * .08));
  let top = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    if (rows[y] >= .2) { if (top < 0) top = y; bottom = y; }
    else if (top >= 0 && y - bottom > gap) { bands.push({ top, bottom }); top = -1; }
  }
  if (top >= 0) bands.push({ top, bottom });
  let best: Rect | null = null, bestArea = 0;
  for (const band of bands) {
    const height = band.bottom - band.top + 1;
    if (height < h * .1) continue;
    const columns: number[] = [];
    for (let x = 0; x < w; x++) {
      let count = 0;
      for (let y = band.top; y <= band.bottom; y++) if (light((y * w + x) * 4)) count++;
      columns.push(count / height);
    }
    let left = w, right = -1, columnStart = -1, columnEnd = -1;
    const finishColumn = () => { if (columnStart >= 0 && columnEnd - columnStart > right - left) { left = columnStart; right = columnEnd; } columnStart = -1; };
    for (let x = 0; x < w; x++) {
      if (columns[x] >= .18) { if (columnStart < 0) columnStart = x; columnEnd = x; }
      else if (columnStart >= 0 && x - columnEnd > w * .015) finishColumn();
    }
    finishColumn();
    if (right - left < w * .25) continue;
    let colored = 0;
    for (let y = band.top; y <= band.bottom; y++) for (let x = left; x <= right; x++) {
      const i = (y * w + x) * 4;
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 50 && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 190) colored++;
    }
    const area = (right - left + 1) * height;
    if (colored < area * .002 || area <= bestArea) continue;
    // Dense bars and colored footer strips can hide the panel's white background.
    // Extend to nearby broad color bands, while rejecting narrow title-border strokes.
    let figureTop = band.top, figureBottom = band.bottom;
    let colorTop = -1, colorBottom = -1, colorLeft = w, colorRight = -1, colorCount = 0;
    const finishColor = () => {
      if (colorTop >= 0 && colorRight - colorLeft >= (right - left) * .2 && colorCount >= 30) { figureTop = Math.min(figureTop, colorTop); figureBottom = Math.max(figureBottom, colorBottom); }
      colorTop = -1; colorLeft = w; colorRight = -1; colorCount = 0;
    };
    const firstRow = Math.max(0, band.top - Math.round(h * .05)), lastRow = Math.min(h - 1, band.bottom + Math.round(h * .2));
    for (let y = firstRow; y <= lastRow; y++) {
      let rowCount = 0;
      for (let x = left; x <= right; x++) {
        const i = (y * w + x) * 4;
        if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 50 && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 220) { rowCount++; colorLeft = Math.min(colorLeft, x); colorRight = Math.max(colorRight, x); }
      }
      if (rowCount >= 2) { if (colorTop < 0) colorTop = y; colorBottom = y; colorCount += rowCount; }
      else if (colorTop >= 0 && y - colorBottom > h * .04) finishColor();
    }
    finishColor();
    const pad = Math.max(3, Math.round(w * .008));
    const l = Math.max(0, left - pad), r = Math.min(w - 1, right + pad);
    const t = Math.max(0, figureTop - pad), b = Math.min(h - 1, figureBottom + pad);
    best = { x: l / w, y: t / h, width: (r - l + 1) / w, height: (b - t + 1) / h }; bestArea = area;
  }
  return best;
}

/** Locate an original chart/photo in the gaps between verified prose blocks. */
export function findVisualInTextGaps(pixels:Uint8Array|Uint8ClampedArray,w:number,h:number,rects:Rect[]):Rect|null {
  const spans=rects.map(r=>[Math.max(0,Math.floor(r.y*h)),Math.min(h,Math.ceil((r.y+r.height)*h))]).sort((a,b)=>a[0]-b[0]);
  const gaps:number[][]=[];let end=0;
  for(const [top,bottom] of spans){if(top>end)gaps.push([end,top]);end=Math.max(end,bottom);}if(end<h)gaps.push([end,h]);
  let best:Rect|null=null,bestArea=0;
  for(const [top,bottom] of gaps){
    if(bottom-top<h*.12)continue;
    const hist=new Map<number,number>();
    for(let y=top;y<bottom;y+=3)for(let x=0;x<w;x+=3){const i=(y*w+x)*4,k=((pixels[i]>>4)<<8)|((pixels[i+1]>>4)<<4)|(pixels[i+2]>>4);hist.set(k,(hist.get(k)||0)+1);}
    const k=[...hist].sort((a,b)=>b[1]-a[1])[0]?.[0];if(k===undefined)continue;
    const bg=[((k>>8)&15)*16+8,((k>>4)&15)*16+8,(k&15)*16+8];
    let l=w,r=0,t=h,b=0,color=0;
    for(let y=top;y<bottom;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,rr=pixels[i],gg=pixels[i+1],bb=pixels[i+2];
      const diff=Math.abs(rr-bg[0])+Math.abs(gg-bg[1])+Math.abs(bb-bg[2]);
      if(diff>50){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);if(Math.max(rr,gg,bb)-Math.min(rr,gg,bb)>45)color++;}
    }
    if(color<w*(bottom-top)*.003||r-l<w*.25||b-t<h*.08)continue;
    const pad=3;l=Math.max(0,l-pad);r=Math.min(w-1,r+pad);t=Math.max(top,t-pad);b=Math.min(bottom-1,b+pad);
    const area=(r-l)*(b-t);if(area>bestArea){bestArea=area;best={x:l/w,y:t/h,width:(r-l+1)/w,height:(b-t+1)/h};}
  }
  return best;
}

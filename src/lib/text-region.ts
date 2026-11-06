type Rect = { x: number; y: number; width: number; height: number };

/** Snap approximate model boxes to actual ink groups, then coalesce shared groups. */
export function alignTextRegions<T extends {rect:Rect;text:string;sourceText:string;fontRatio?:number}>(regions:T[], blocks:Rect[]):T[] {
  // When both detectors agree on the block count, reading order is more reliable
  // than approximate vision coordinates on low-resolution, dense screenshots.
  if(regions.length===blocks.length && blocks.length>0) {
    const orderedRegions=[...regions].sort((a,b)=>a.rect.y-b.rect.y||a.rect.x-b.rect.x);
    const orderedBlocks=[...blocks].sort((a,b)=>a.y-b.y||a.x-b.x);
    return orderedRegions.map((r,i)=>({...r,rect:orderedBlocks[i]}));
  }
  const overlap=(a:Rect,b:Rect)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  const grouped: {block:Rect;members:T[];keys:Set<Rect>}[]=[];
  const union=(a:Rect,b:Rect):Rect=>{const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return {x,y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y};};
  for(const region of regions) {
    const matches=blocks.filter(block=>overlap(region.rect,block)/Math.min(region.rect.width*region.rect.height,block.width*block.height)>.55);
    const block=matches.length?matches.reduce(union):region.rect;
    const existing=grouped.filter(g=>matches.some(key=>g.keys.has(key)));
    if(existing.length){
      const target=existing[0];target.block=union(target.block,block);target.members.push(region);matches.forEach(key=>target.keys.add(key));
      for(const other of existing.slice(1)){target.block=union(target.block,other.block);target.members.push(...other.members);other.keys.forEach(key=>target.keys.add(key));grouped.splice(grouped.indexOf(other),1);}
    }else grouped.push({block,members:[region],keys:new Set(matches)});
  }
  return grouped.map(g=>{
    const members=g.members.sort((a,b)=>Math.abs(a.rect.y-b.rect.y)<.02?a.rect.x-b.rect.x:a.rect.y-b.rect.y);
    return {...members[0],rect:g.block,text:members.map(r=>r.text).join('\n'),sourceText:members.map(r=>r.sourceText).join('\n'),fontRatio:Math.min(...members.map(r=>r.fontRatio||.045))};
  }).sort((a,b)=>a.rect.y-b.rect.y);
}

/** Detect separated text blocks on flat paper; dense image bands are excluded. */
export function detectFlatTextRegions(pixels: Uint8Array | Uint8ClampedArray, w: number, h: number): Rect[] {
  const left=Math.max(0,Math.floor(w*.005)), right=Math.min(w,Math.ceil(w*.995)), start=0, end=h;
  const colors=new Map<number,number>();
  for(let y=Math.ceil(h*.02);y<h*.14;y+=3) for(let x=left;x<right;x+=3) {
    const i=(y*w+x)*4, k=((pixels[i]>>4)<<8)|((pixels[i+1]>>4)<<4)|(pixels[i+2]>>4);
    colors.set(k,(colors.get(k)||0)+1);
  }
  const sorted=[...colors].sort((a,b)=>b[1]-a[1]);
  if(!sorted.length || sorted[0][1]/[...colors.values()].reduce((a,b)=>a+b,0)<.5) return [];
  const k=sorted[0][0], bg=[((k>>8)&15)*16+8,((k>>4)&15)*16+8,(k&15)*16+8];
  const rows: { y:number; l:number; r:number; count:number }[]=[];
  for(let y=start;y<end;y++) {
    let l=w,r=-1,count=0;
    for(let x=left;x<right;x++) {const i=(y*w+x)*4;if(Math.abs(pixels[i]-bg[0])+Math.abs(pixels[i+1]-bg[1])+Math.abs(pixels[i+2]-bg[2])>100){l=Math.min(l,x);r=x;count++;}}
    if(count>1) rows.push({y,l,r,count});
  }
  const bands: typeof rows[]=[];
  for(const row of rows) {const band=bands[bands.length-1];if(!band || row.y-band[band.length-1].y>Math.max(2,h*.004)) bands.push([row]);else band.push(row);}
  const groups: {top:number;bottom:number;left:number;right:number}[]=[];
  let barrier=true;
  for(const band of bands) {
    const top=band[0].y,bottom=band[band.length-1].y;
    // A chart is a continuous tall ink band; glyph lines have blank rows between them.
    if(bottom-top>h*.085 || band.filter(r=>r.count/(right-left)>.65).length>h*.045){barrier=true;continue;}
    const l=Math.min(...band.map(r=>r.l)),r=Math.max(...band.map(r=>r.r));
    if(r-l<w*.13 || bottom-top<2) continue;
    const prev=groups[groups.length-1];
    if(!barrier && prev && top-prev.bottom<h*.035) {prev.bottom=bottom;prev.left=Math.min(prev.left,l);prev.right=Math.max(prev.right,r);}
    else groups.push({top,bottom,left:l,right:r});
    barrier=false;
  }
  const pad=Math.max(2,Math.round(w*.008));
  return groups.map(g=>{const x=Math.max(0,g.left-pad), y=Math.max(0,g.top-pad), r=Math.min(w,g.right+pad+1), b=Math.min(h,g.bottom+pad+1);return {x:x/w,y:y/h,width:(r-x)/w,height:(b-y)/h};});
}

/** Locate a sparse text block above a solid chart, keeping a blank separator. */
export function findTextAboveChart(pixels: Uint8ClampedArray | Uint8Array, w: number, h: number, seed: Rect): Rect | null {
  const x0 = Math.ceil(w * .05), x1 = Math.floor(w * .95);
  const palette = new Map<number, number>();
  for (let y = Math.ceil(h * .02); y < h * .13; y += 2) for (let x = x0; x < x1; x += 2) {
    const i = (y * w + x) * 4;
    const key = ((pixels[i] >> 4) << 8) | ((pixels[i + 1] >> 4) << 4) | (pixels[i + 2] >> 4);
    palette.set(key, (palette.get(key) ?? 0) + 1);
  }
  const key = [...palette].sort((a,b)=>b[1]-a[1])[0]?.[0];
  if (key === undefined) return null;
  const bg = [((key >> 8) & 15)*16+8, ((key >> 4)&15)*16+8, (key&15)*16+8];
  const ink = (x:number,y:number) => { const i=(y*w+x)*4; return Math.abs(pixels[i]-bg[0])+Math.abs(pixels[i+1]-bg[1])+Math.abs(pixels[i+2]-bg[2]) > 100; };
  const density = new Float32Array(h);
  let run = 0, chartTop = -1;
  for (let y = Math.ceil(h*.04); y < h*.85; y++) {
    let count=0; for(let x=x0;x<x1;x++) if(ink(x,y)) count++;
    density[y]=count/(x1-x0);
    run=density[y]>.55 ? run+1 : 0;
    if(run>=Math.max(8,Math.ceil(h*.035))) {chartTop=y-run+1;break;}
  }
  if(chartTop < h*.12 || seed.y*h >= chartTop) return null;
  // Require a genuinely blank gap above the chart; never erase across it.
  let gap=-1;
  for(let y=chartTop-3;y>h*.06;y--) {
    if(density[y]<.003 && density[y-1]<.003 && density[y-2]<.003) {gap=y-2;break;}
  }
  if(gap<0) return null;
  let left=w,right=0,top=h,bottom=0,inkRows=0;
  for(let y=Math.ceil(h*.04);y<gap;y++) {
    let found=false;
    for(let x=x0;x<x1;x++) if(ink(x,y)) {left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);found=true;}
    if(found) inkRows++;
  }
  if(right<=left || inkRows<4 || bottom<seed.y*h || top>(seed.y+seed.height)*h) return null;
  const pad=Math.max(3,Math.round(w*.008));
  left=Math.max(x0,left-pad); right=Math.min(x1,right+pad);
  top=Math.max(0,top-pad); bottom=Math.min(gap,bottom+pad);
  return {x:left/w,y:top/h,width:(right-left+1)/w,height:(bottom-top+1)/h};
}

import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';

for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)) {
  const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();
}
const {POST}=await import('../src/app/api/smart-edit/route.ts');
const {copiedPhraseRatio}=await import('../src/lib/rewrite-quality.ts');
const {detectFlatTextRegions,alignTextRegions}=await import('../src/lib/text-region.ts');
const {findVisualInTextGaps}=await import('../src/lib/page-visuals.ts');
const sharp=(await import('sharp')).default;
const names=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const out='test-artifacts/concise-six-final';fs.mkdirSync(out,{recursive:true});
const report=[];
const count=s=>Array.from(s.replace(/\s/gu,'')).length;
async function run(file,index){
  const dest=path.join(out,`${String(index+1).padStart(2,'0')}.json`);
  try {
    let data;
    const {data:pixels,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const candidates=detectFlatTextRegions(pixels,info.width,info.height);
    if(fs.existsSync(dest)) data=JSON.parse(fs.readFileSync(dest,'utf8'));
    else {
      const response=await POST(new NextRequest('http://integration.test/api/smart-edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:'data:image/jpeg;base64,'+fs.readFileSync(file).toString('base64'),regions:candidates,body:'对本页全部标题和正文逐区同义精简：意思完整，文字可以更短，不照抄长句。图表内部文字属于图片素材，保留原图。'})}));
      const events=(await response.text()).split('\n').filter(l=>l.startsWith('data: ')).map(l=>JSON.parse(l.slice(6)));
      const failure=events.find(e=>e.type==='error');if(failure)throw Error(failure.message);
      data=JSON.parse(events.filter(e=>e.type==='delta').map(e=>e.text).join(''));
      if(!data.safe)throw Error(data.reason||'未识别安全文字区');
      fs.writeFileSync(dest,JSON.stringify(data,null,2));
    }
    if(!data.regions?.length)throw Error('文字区域为空');
    const aligned=alignTextRegions(data.regions,detectFlatTextRegions(pixels,info.width,info.height));
    const source=data.regions.reduce((n,r)=>n+count(r.sourceText),0),rewritten=data.regions.reduce((n,r)=>n+count(r.text),0);
    const maxCopy=Math.max(...data.regions.map(r=>copiedPhraseRatio(r.sourceText,r.text)));
    if(maxCopy>.65)throw Error('改写重复过高');
    const visual=findVisualInTextGaps(pixels,info.width,info.height,aligned.map(r=>r.rect));
    if(!!visual!==[true,false,true,true,false,false][index])throw Error('图文区域分类不符');
    if(index===0 && visual.y<.27 || index===2 && visual.y+visual.height>.48 || index===3 && visual.y<.45)throw Error('图表裁切中混入正文，需重新识别坐标');
    const item={page:index+1,status:'pass',regions:data.regions.length,sourceCharacters:source,newCharacters:rewritten,maxCopiedPhraseRatio:Number(maxCopy.toFixed(3)),originalVisual:visual};
    report.push(item);fs.writeFileSync(path.join(out,`${String(index+1).padStart(2,'0')}.txt`),data.regions.map(r=>r.text).join('\n\n'));
    console.log(JSON.stringify(item));
  } catch(e){const item={page:index+1,status:'fail',error:e.message};report.push(item);console.log(JSON.stringify(item));}
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report.sort((a,b)=>a.page-b.page),null,2));
}
let cursor=0;
await Promise.all(Array.from({length:2},async()=>{while(cursor<names.length){const i=cursor++;await run(names[i],i);}}));
if(report.some(r=>r.status==='fail'))process.exitCode=1;

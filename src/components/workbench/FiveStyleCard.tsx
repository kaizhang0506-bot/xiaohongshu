import { CardRichText } from './CardRichText';
import { CARD_TEXT_SCALE, groupCardText } from '@/lib/card-rich-text';
import type { CardContent } from '@/lib/types';
import { CARD_FONTS } from '@/lib/card-typography';

export function FiveStyleCard({content,image,layout,fontScale=1}:{content:CardContent;image?:string;layout:string;fontScale?:number}) {
  const kind=layout.replace('xhs-five-','');
  const news=kind==='newspaper', blue=kind==='blueprint', pink=kind==='scrapbook';
  const bg=news?'#efe0c1':blue?'#062342':pink?'#f8d8e3':'#ff6a21';
  const fg=news?'#292018':blue?'#ecf8ff':pink?'#5a1632':'#17120e';
  const accent=news?'#973721':blue?'#42f0ed':pink?'#bb386a':'#fff0d6';
  const cover=content.kind==='cover';
  const title=(cover?content.title:content.heading)||(cover?'学习笔记':'');
  const rawText=content.paragraph||content.subtitle||'';
  const sameAsTitle=rawText.replace(/[\s\p{P}]/gu,'')===title.replace(/[\s\p{P}]/gu,'');
  const parts=groupCardText(sameAsTitle?'':rawText);
  const length=parts.join('').length;
  const short=!cover&&!image&&length<100;
  const relaxed=!cover&&!image&&length<220;
  const textSize=(cover?44:short?64:relaxed?50:length>320?34:42)*fontScale;
  const titleSize=cover?(image?108:title.length>24?112:news?146:pink?132:154)*fontScale:textSize*CARD_TEXT_SCALE.heading;
  const imageHeight=cover?370:length>200?340:parts.length>1?420:length>140?480:640;
  const font=news?CARD_FONTS.serif:CARD_FONTS.sans;
  const headingFont=news?CARD_FONTS.serif:blue?CARD_FONTS.sans:pink?CARD_FONTS.rounded:CARD_FONTS.display;
  return <div data-card-composition={cover?'cover':short?'short':'body'} style={{width:1080,height:1440,position:'relative',overflow:'hidden',background:bg,color:fg,fontFamily:font,boxSizing:'border-box',backgroundImage:blue?'linear-gradient(#1c5672 1px,transparent 1px),linear-gradient(90deg,#1c5672 1px,transparent 1px)':pink?'radial-gradient(#ffffff77 2px,transparent 3px)':news?'repeating-linear-gradient(0deg,#7b492209 0 1px,transparent 1px 5px)':undefined,backgroundSize:blue?'36px 36px':pink?'22px 22px':undefined}}>
    {!news&&!blue&&!pink&&<div style={{position:'absolute',left:26,top:30,bottom:30,width:20,background:fg}}/>}
    {pink&&<><div style={{position:'absolute',top:22,right:80,width:230,height:42,background:'#d1769b88',transform:'rotate(9deg)'}}/><div style={{position:'absolute',bottom:35,right:30,fontSize:130,color:'#fff5cc'}}>✦</div></>}
    <div style={{position:'absolute',top:40,left:70,right:65,borderBottom:`${news?8:2}px ${news?'double':'solid'} ${accent}`,paddingBottom:20,display:'flex',justifyContent:'space-between',fontSize:news?42:26,fontWeight:900,color:news?accent:fg}}><span>{news?'财经学习报':blue?'RESEARCH / 研究档案':pink?'我的交易学习本':'MARKET NOTES / 交易观察'}</span><span>{String(content.index+1).padStart(2,'0')} / {String(content.total).padStart(2,'0')}</span></div>
    <div style={{position:'absolute',top:cover?190:short?215:135,left:70,right:65,bottom:cover||short?150:90,overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:cover||relaxed?'center':'flex-start',gap:cover?48:short?64:relaxed?36:18}}>
      {cover&&<div style={{display:'flex',alignItems:'center',gap:24,color:accent,fontSize:32,fontWeight:900,letterSpacing:6}}><span style={{width:72,height:8,background:accent}}/>封面笔记<span style={{height:2,background:accent,flex:1}}/></div>}
      {title && <h2 style={{margin:0,fontSize:titleSize,fontFamily:headingFont,lineHeight:1.3,fontWeight:pink||(!blue&&!news)?400:900,flexShrink:0,letterSpacing:news?-2:0,color:blue?accent:fg,padding:blue?'12px 20px':pink?'14px 22px':news?'8px 0':'14px 22px',background:pink?'#fff7eb':!blue&&!news?accent:undefined,border:blue?`3px solid ${accent}`:undefined,borderBottom:news?`4px solid ${accent}`:undefined,boxShadow:pink?'8px 10px 0 #c987a455':undefined,borderRadius:pink?'4px 30px 5px 25px':0,overflowWrap:'anywhere'}}>{title}</h2>}
      {image&&<img src={image} alt="完整原图素材" style={{width:'100%',height:imageHeight,objectFit:'contain',flexShrink:0,margin:'6px 0'}}/>}
      {!!parts.length&&<div style={{display:'flex',flexDirection:'column',gap:relaxed?24:blue?12:pink?14:10,flexShrink:0}}>{parts.map((p,i)=><div key={i} style={{display:'flex',gap:18,padding:cover?'20px 0':pink?'14px 22px':blue?'10px 16px':news?'7px 0':'10px 20px',background:cover?'transparent':pink?'#fff8ed':blue?'#0a3154':news?'transparent':i%2===0?'#fff2d9':'#ff853f',borderLeft:blue&&!cover?`5px solid ${accent}`:undefined,borderBottom:news?'1px solid #92745c':undefined,borderRadius:pink?14:0,boxShadow:pink&&!cover?'3px 5px 0 #c987a433':undefined}}>{!news&&!cover&&parts.length>1&&<span style={{fontSize:25,fontWeight:900,color:blue?accent:fg,flexShrink:0,paddingTop:4}}>{String(i+1).padStart(2,'0')}</span>}<CardRichText style={{margin:0,fontSize:textSize,lineHeight:1.5,fontWeight:news?400:700,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}} text={p} accent={accent} headingFont={headingFont} /></div>)}</div>}
      {(cover||short)&&!!content.tags?.length&&<div style={{display:'flex',flexWrap:'wrap',gap:16,flexShrink:0}}>{content.tags.slice(0,4).map(tag=><span key={tag} style={{fontSize:28,fontWeight:800,border:`2px solid ${accent}`,padding:'10px 16px',borderRadius:pink?30:0}}>#{tag.replace(/^#/,'')}</span>)}</div>}
    </div>
    <div style={{position:'absolute',bottom:35,left:70,right:65,borderTop:`2px solid ${accent}`,paddingTop:12,fontSize:21,display:'flex',justifyContent:'space-between'}}><span>学习笔记 · 原图保留</span><span>心得交流 / 仅供参考 →</span></div>
  </div>;
}

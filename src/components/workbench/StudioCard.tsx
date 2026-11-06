import { CardRichText } from './CardRichText';
import type { CSSProperties } from 'react';
import type { CardContent } from '@/lib/types';
import { STUDIO_STYLES } from '@/lib/studio-layouts';
import { CARD_FONTS } from '@/lib/card-typography';

export function StudioCard({ id, content, image, fontScale=1 }: { id:string; content:CardContent; image?:string; fontScale?:number }) {
  const [,index,version]=id.split('-');
  const i=Number(index), v=Number(version), style=STUDIO_STYLES[i] ?? STUDIO_STYLES[0];
  const [name,bg,fg,accent,font,decor]=style;
  const family=font==='serif'?CARD_FONTS.serif:font==='mono'?`"Consolas",${CARD_FONTS.sans}`:font==='round'?CARD_FONTS.rounded:CARD_FONTS.sans;
  const title=content.kind==='cover'?content.title:content.kind==='section'?(content.heading ?? ''):'要点回顾';
  const text=content.kind==='cover'?(content.subtitle ?? ''):content.paragraph ?? (content.tags ?? []).join(' · ');
  const compactSection=v===0 && content.kind==='section';
  // Give long content pages room before shrinking their type; keep every paragraph and the whole original image.
  const displayText=compactSection?text.replace(/\n[\t ]*\n+/g,'\n'):text;
  const sectionImageHeight=text.replace(/\s/g,'').length>160?360:440;
  const patterns: Record<string,string>={grid:`linear-gradient(${accent}22 1px,transparent 1px),linear-gradient(90deg,${accent}22 1px,transparent 1px)`,ledger:`repeating-linear-gradient(0deg,transparent 0 59px,${fg}22 60px 61px)`,dots:`radial-gradient(${accent}88 3px,transparent 4px)`,pixel:`repeating-linear-gradient(45deg,${accent}18 0 12px,transparent 12px 24px)`,orbs:`radial-gradient(circle at 100% 0,${accent}66,transparent 55%)`,neon:`radial-gradient(ellipse at 0 100%,${accent}44,transparent 65%)`,waves:`repeating-radial-gradient(ellipse at 120% 120%,transparent 0 80px,${accent}33 82px 84px)`,chalk:`radial-gradient(${fg}22 1px,transparent 2px)`};
  const root:CSSProperties={width:1080,height:1440,position:'relative',overflow:'hidden',boxSizing:'border-box',backgroundColor:bg,color:fg,fontFamily:family,backgroundImage:patterns[decor],backgroundSize:decor==='grid'?'80px 80px':decor==='dots'?'44px 44px':decor==='chalk'?'9px 9px':undefined};
  const header:CSSProperties={position:'absolute',top:46,left:75,right:75,display:'flex',justifyContent:'space-between',fontSize:24,letterSpacing:3,fontWeight:700,borderBottom:decor==='news'?`7px double ${fg}`:`2px solid ${fg}66`,paddingBottom:18};
  const titleStyle:CSSProperties={fontSize:(content.kind==='cover'?104:40*1.12)*fontScale,fontWeight:decor==='museum'||decor==='ink'?500:900,lineHeight:1.3,margin:0,padding:'10px 0 6px',overflowWrap:'anywhere',letterSpacing:0,flexShrink:0};
  const bodyStyle:CSSProperties={fontSize:40*fontScale,lineHeight:1.55,margin:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere',flexShrink:compactSection?0:undefined};
  const copy=<>{title && <h1 style={titleStyle}>{title}</h1>}{image && <img alt="完整原图素材" src={image} style={{width:'100%',height:content.kind==='cover'?450:compactSection?sectionImageHeight:520,objectFit:'contain',flexShrink:0,margin:compactSection?'12px 0':'24px 0',background:'transparent'}}/>}{text && <CardRichText style={bodyStyle} text={displayText} accent={accent} headingFont={family} />}</>;
  return <div style={root}>
    {decor==='rings' && Array.from({length:12},(_,n)=><span key={n} style={{position:'absolute',left:-15,top:90+n*112,width:44,height:22,borderRadius:20,background:fg,boxShadow:`inset -6px 3px 3px ${accent}`}}/>)}
    {['stripe','hazard'].includes(decor) && <div style={{position:'absolute',top:0,left:0,right:0,height:24,background:`repeating-linear-gradient(120deg,${accent} 0 40px,${fg} 41px 80px)`}}/>}
    {decor==='film' && [0,1].map(n=><div key={n} style={{position:'absolute',left:n?undefined:10,right:n?10:undefined,top:0,bottom:0,width:26,background:`repeating-linear-gradient(0deg,${accent} 0 20px,transparent 20px 48px)`}}/>)}
    {decor==='tape' && <div style={{position:'absolute',left:350,top:90,width:380,height:80,background:accent,opacity:.7,transform:'rotate(-6deg)'}}/>}
    {decor==='cross' && <div style={{position:'absolute',right:65,top:150,fontSize:170,color:accent}}>+</div>}
    {decor==='botanic' && <div style={{position:'absolute',right:-40,bottom:80,width:400,height:700,border:`12px solid ${accent}`,borderRadius:'100% 0 100% 0',transform:'rotate(-20deg)',opacity:.35}}/>}
    {['stamp','file'].includes(decor) && <div style={{position:'absolute',right:70,bottom:100,border:`6px ${decor==='stamp'?'dashed':'double'} ${accent}`,padding:20,fontSize:28,transform:'rotate(-9deg)',color:accent}}>NOTE / {String(i+1).padStart(2,'0')}</div>}
    {decor==='news' && <div style={{position:'absolute',top:120,left:75,right:75,textAlign:'center',fontSize:34,letterSpacing:15,borderBottom:`2px solid ${fg}`,paddingBottom:15}}>THE DAILY NOTE</div>}
    {decor==='terminal' && <div style={{position:'absolute',top:120,left:75,fontSize:30,color:accent}}>● ● ● &nbsp; ~/notes/readme</div>}
    {decor==='ink' && <div style={{position:'absolute',right:55,top:145,writingMode:'vertical-rl',border:`3px solid ${accent}`,color:accent,padding:10,fontSize:34}}>手记</div>}
    {decor==='pop' && <div style={{position:'absolute',right:-100,top:160,width:400,height:400,background:accent,borderRadius:'50%',border:`12px solid ${fg}`,opacity:.7}}/>}
    {decor==='museum' && <div style={{position:'absolute',inset:32,border:`2px solid ${fg}`}}/>}
    <div style={header}><span>{name} / 原创笔记</span><span>{String(content.index+1).padStart(2,'0')} / {content.total}</span></div>
    {v===0 && <div style={{position:'absolute',top:decor==='news'?230:compactSection?165:210,left:85,right:85,bottom:compactSection?115:140,overflow:'hidden',display:'flex',flexDirection:'column',gap:compactSection?20:40,justifyContent:content.kind==='cover'?'center':'flex-start'}}><div style={{height:16,width:170,background:accent,flexShrink:0}}/>{copy}</div>}
    {v===1 && <><div style={{position:'absolute',left:65,top:220,bottom:140,width:170,background:accent,color:bg,display:'flex',justifyContent:'center',alignItems:'center',fontSize:70,fontWeight:900,writingMode:'vertical-rl',letterSpacing:20}}>阅读笔记</div><div style={{position:'absolute',left:285,right:75,top:230,bottom:140,overflow:'hidden',display:'flex',flexDirection:'column',gap:38}}>{copy}</div></>}
    {v===2 && <>{title && <div style={{position:'absolute',left:0,right:0,top:200,padding:'24px 80px',boxSizing:'border-box',height:content.kind==='cover'?480:160,background:accent,color:bg,overflow:'hidden'}}><h2 style={titleStyle}>{title}</h2></div>}<div style={{position:'absolute',left:85,right:85,top:content.kind==='cover'?740:title?400:210,bottom:145,overflow:'hidden',display:'flex',flexDirection:'column',gap:24}}>{image && <img alt="完整原图素材" src={image} style={{width:'100%',height:410,objectFit:'contain',flexShrink:0}}/>}<CardRichText style={bodyStyle} text={text} accent={accent} headingFont={family} /></div></>}
    {v===3 && <div style={{position:'absolute',left:95,right:95,top:210,bottom:150,border:`5px ${decor==='chalk'?'dashed':'solid'} ${accent}`,borderRadius:['sticky','orbs','pop'].includes(decor)?70:0,padding:55,boxSizing:'border-box',overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:content.kind==='cover'?'center':'flex-start',gap:35,textAlign:'center',boxShadow:decor==='sticky'?`22px 22px 0 ${fg}22`:undefined}}>{copy}</div>}
    <div style={{position:'absolute',bottom:55,left:85,right:85,fontSize:22,display:'flex',justifyContent:'space-between',borderTop:`2px solid ${fg}44`,paddingTop:18}}><span>图文手记</span><span>{v===1?'INDEX →':v===2?'READ MORE →':v===3?'● ● ●':'继续阅读 →'}</span></div>
  </div>;
}

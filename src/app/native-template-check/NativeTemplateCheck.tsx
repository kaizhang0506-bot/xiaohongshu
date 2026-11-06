'use client';

import { useState } from 'react';
import { CardItem } from '@/components/workbench/CardItem';
import { NATIVE_TEMPLATES } from '@/lib/xhs-native-layouts';
import type { CardContent } from '@/lib/types';
import { FontLoadCheck } from '../layout-fit-check/FontLoadCheck';

const paragraph = '整理一条信息时，先检查它的来源、适用条件与时间范围，再比较不同解释。把事实和推测分开，记录判断依据，明确哪些变化会让原来的结论失效。单个案例不能代表所有情形，历史走势也不能保证未来结果。';
const cases: {key: string; content: CardContent; image?: string}[] = [
  {key:'cover',content:{kind:'cover',index:0,total:6,title:'看懂背后的逻辑\n再做自己的判断',subtitle:'把信息整理清楚，把重点留在自己的笔记里。',tags:['学习笔记','干货收藏','每日复盘']}},
  {key:'short',content:{kind:'end',index:5,total:6,heading:'把重点记下来',paragraph:'慢一点，看清楚，再做决定。',tags:['收藏复习','独立判断']}},
  {key:'chart',image:'/finished-six/chart-1.png',content:{kind:'section',index:1,total:6,heading:'先看事实与边界，再理解这张完整原图',paragraph:paragraph+'\n\n'+paragraph}},
  {key:'dense',content:{kind:'section',index:2,total:6,heading:'把观察条件写清楚，才知道判断何时失效',paragraph:Array.from({length:6},()=>paragraph).join('\n\n')}},
  {key:'image-cover',image:'/finished-six/chart-1.png',content:{kind:'cover',index:0,total:6,title:'先整理信息与条件，再建立自己的判断方法',subtitle:'图表中的价格、坐标和标注保持原样，只重新排版文字。',tags:['图文笔记']}},
  {key:'many-blocks',content:{kind:'section',index:3,total:6,heading:'把每条判断依据逐项记清楚',paragraph:Array.from({length:30},(_,i)=>`${i+1}. 记录信息来源与适用条件，然后核对事实。`).join('\n\n')}},
];

export function NativeTemplateCheck() {
  const [batch,setBatch]=useState(0);
  const templates=NATIVE_TEMPLATES.slice(batch*10,batch*10+10);
  return <main style={{padding:20,background:'#ede9df'}}>
    <h1>100 套本地小红书模板回归检查</h1><FontLoadCheck />
    <label>测试批次<select aria-label="测试批次" value={batch} onChange={event=>setBatch(Number(event.target.value))}>{Array.from({length:10},(_,index)=><option key={index} value={index}>第 {index+1} 批</option>)}</select></label>
    <div style={{display:'flex',gap:20,margin:'12px 0'}}><button type="button" disabled={batch===0} onClick={()=>setBatch(batch-1)}>上一批</button><span data-testid="current-batch">当前第 {batch+1} 批</span><button type="button" disabled={batch===9} onClick={()=>setBatch(batch+1)}>下一批</button></div>
    <p>每批 10 套 × 封面、短句、图文、长文、带图封面；同时检查缩略图与原始尺寸。</p>
    {templates.map(template=><section key={template.id}><h2 style={{fontSize:17,margin:'18px 0 8px'}}>{template.name}</h2><div style={{display:'flex',gap:14}}>{cases.map(sample=><div key={sample.key} data-native-test={`${template.number}-${sample.key}-preview`} style={{width:162,height:216,overflow:'hidden'}}><div style={{width:1080,height:1440,transform:'scale(.15)',transformOrigin:'top left'}}><CardItem layout={template.id} content={sample.content} referenceVisual={sample.image} /></div></div>)}</div></section>)}
    <div aria-hidden="true" style={{position:'fixed',left:-22000,top:0,pointerEvents:'none'}}>{templates.map(template=>cases.map(sample=><div key={`${template.id}-${sample.key}`} data-native-test={`${template.number}-${sample.key}-export`} style={{width:1080,height:1440}}><CardItem layout={template.id} content={sample.content} referenceVisual={sample.image} /></div>))}</div>
  </main>;
}

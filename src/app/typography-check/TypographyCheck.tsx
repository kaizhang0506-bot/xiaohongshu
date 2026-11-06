'use client';

import { CardItem } from '@/components/workbench/CardItem';
import { CardDeck } from '@/components/workbench/CardDeck';
import { NATIVE_TEMPLATES } from '@/lib/xhs-native-layouts';
import type { CardContent, RewriteResult } from '@/lib/types';
import { FontLoadCheck } from '../layout-fit-check/FontLoadCheck';

const body = '## 一、先看信息来源\n原文、统计口径和发布日期，要放在一起核对。把事实和推测分开，才能读懂一条信息。\n\n### 适用条件也要写清楚\n同一句结论，换了时间范围或观察对象，可能就不再成立。\n\n**真正值得记住的，是判断依据。**\n先理解，再比较；保留问题，持续复盘。';
const content: CardContent = { kind: 'section', index: 1, total: 3, heading: '把信息读出层次\n让重点一眼看见', paragraph: body };
const imageContent: CardContent = { ...content, heading: '先看完整图表\n再理解文字结论', paragraph: '## 一、保留完整原图\n图表的坐标、标注和内容保持原样，只调整页面上的文字排版。\n\n### 按层次阅读\n先看标题，再读说明。\n\n**图表与文字，分别核对。**' };
const layouts = [0, 6, 12, 18, 24].map(index => NATIVE_TEMPLATES[index].id).concat(['xhs-paper-notebook', 'xhs-five-newspaper', 'xhs-five-blueprint', 'xhs-five-scrapbook', 'xhs-five-magazine', 'studio-0-0', 'studio-1-1', 'studio-2-2', 'studio-3-3', 'minimal', 'md2card-tech']);
const result: RewriteResult = { titles: ['把信息读出层次，让重点一眼看见'], body, tags: ['学习笔记', '独立思考'], rewriteNotes: '' };

export function TypographyCheck() {
  return <main style={{ padding: 24, background: '#f7f1e4' }}>
    <h1>大标题 / 小标题 / 正文 / 重点句</h1><FontLoadCheck />
    <p>同一份文字按不同模板本地排版，原图完整保留；缩略图与导出共享同一组件。</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 24 }}>
      {layouts.map(layout => <section key={layout}><h2 style={{ fontSize: 14 }}>{layout}</h2><div style={{ display: 'flex', gap: 10 }}>
        {[false, true].map(withImage => <div key={String(withImage)} data-typography-case={`${layout}-${withImage}-preview`} style={{ width: 216, height: 288 }}><div style={{ width: 1080, height: 1440, transform: 'scale(.2)', transformOrigin: 'top left' }}><CardItem layout={layout} content={withImage ? imageContent : content} referenceVisual={withImage ? '/finished-six/chart-1.png' : undefined} /></div></div>)}
      </div></section>)}
    </div>
    <div aria-hidden="true" style={{ position: 'fixed', left: -24000, top: 0, pointerEvents: 'none' }}>{layouts.map(layout => [false, true].map(withImage => <div key={`${layout}-${withImage}`} data-typography-case={`${layout}-${withImage}-export`}><CardItem layout={layout} content={withImage ? imageContent : content} referenceVisual={withImage ? '/finished-six/chart-1.png' : undefined} /></div>))}</div>
    <div style={{ marginTop: 40 }}><h2>真实分页与下载检查</h2><CardDeck result={result} layout={NATIVE_TEMPLATES[0].id} brandName="" referenceImages={[]} /></div>
  </main>;
}

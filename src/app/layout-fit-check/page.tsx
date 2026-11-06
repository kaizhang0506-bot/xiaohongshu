import { notFound } from 'next/navigation';
import { CardItem } from '@/components/workbench/CardItem';
import type { CardContent } from '@/lib/types';
import { FontLoadCheck } from './FontLoadCheck';

const layouts = ['xhs-paper-notebook', 'xhs-five-newspaper', 'xhs-five-blueprint', 'xhs-five-scrapbook', 'xhs-five-magazine'];
const samples: { label: string; content: CardContent; image?: string }[] = [
  { label: '封面', content: { kind: 'cover', index: 0, total: 3, title: '涨停后那五天，究竟在观察什么', subtitle: '看清时间、量能与价格边界，再理解图中的观察条件。', tags: ['交易笔记', '量价关系', '风险控制'] } },
  { label: '短句', content: { kind: 'section', index: 2, total: 3, heading: '投资有风险，决策需谨慎', paragraph: '投资有风险，决策需谨慎。', tags: ['财经科普', '理性判断'] } },
  { label: '短正文', content: { kind: 'section', index: 2, total: 3, heading: '多次小盈利，可能被一次不设退出的…', paragraph: '多次小盈利，可能被一次不设退出的亏损抹掉。再检查缩量、放量是否有可重复定义，最后用小样本复盘并计入交易成本。技术形态只描述概率，不承诺结果。投资有风险，决策需谨慎。', tags: ['财经科普', '风险控制'] } },
  { label: '图文', image: '/finished-six/chart-1.png', content: { kind: 'section', index: 1, total: 3, heading: '先看方向，再看细节', paragraph: '日线和短周期图分别展示不同时间范围内的变化。图表中的价格、成交量和标注保留原样；文字只用于说明观察顺序，不能把历史形态当成结果保证。' } },
  { label: '长文', content: { kind: 'section', index: 1, total: 3, heading: '把观察条件写清楚，才知道判断何时失效', paragraph: Array.from({ length: 5 }, () => '形态只是观察信息的一部分。要同时检查时间窗口、量能变化和关键价格边界，记录判断依据与失效条件，不从一张成功截图推断所有情形。不同环境下，相同图形可能有不同结果。').join('\n\n') } },
];

export default function LayoutFitCheck() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <main style={{ padding: 20, background: '#eee9df' }}>
    <h1 style={{ fontSize: 24, marginBottom: 20 }}>封面、短内容和完整原图的排版检查</h1>
    <FontLoadCheck />
    {samples.map((sample, row) => <section key={sample.label}>
      <h2 style={{ fontSize: 18, margin: '18px 0 10px' }}>{sample.label}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {layouts.map((layout, column) => <div key={layout} data-testid={`layout-check-${row}-${column}`} style={{ width: 216, height: 288, overflow: 'hidden' }}>
          <div style={{ width: 1080, height: 1440, transform: 'scale(.2)', transformOrigin: 'top left' }}>
            <CardItem content={sample.content} layout={layout} referenceVisual={sample.image} />
          </div>
        </div>)}
      </div>
    </section>)}
  </main>;
}

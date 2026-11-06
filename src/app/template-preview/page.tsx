import { CardItem } from '@/components/workbench/CardItem';
export default function Page() {
 const layouts = ['rednote-macbook','rednote-iphone17','rednote-checklist','rednote-essay'];
 return <main style={{padding:24}}><h1>同文案排版对比</h1><p>同一段真实文字，分别应用四套字体与版式。</p><div style={{display:'flex',gap:20,flexWrap:'wrap',marginTop:20}}>{layouts.map(layout=><section key={layout}><h2>{layout}</h2><div style={{width:324,height:432,overflow:'hidden',border:'1px solid #ddd'}}><div style={{transform:'scale(.3)',transformOrigin:'top left'}}><CardItem layout={layout} referenceVisual="/template-qa-chart.png" content={{kind:'cover',index:0,total:3,title:'别急着追涨停\n先看懂投资风险',subtitle:'理解波动，做好自己的资金规划。'}} /></div></div></section>)}</div></main>;
}



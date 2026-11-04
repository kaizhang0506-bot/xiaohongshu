import type { CardTemplate, PageRenderData } from '../base';

function MacBookCard({ data }: { data: PageRenderData }) {
  const hasImage = data.content.includes('<img');
  return <div className={`macbook-expanded ${hasImage ? 'with-image' : ''}`} style={{width:'100%',height:'100%',background:'#B8C840',padding:6,fontFamily:'"Microsoft YaHei",sans-serif',boxSizing:'border-box'}}>
    <div style={{height:'100%',display:'flex',flexDirection:'column',border:'2px solid #344919',borderRadius:8,overflow:'hidden',background:'linear-gradient(135deg,#7ACB64,#C8E840)'}}>
      <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'#3E6B2D',color:'#FFF',fontSize:10,flexShrink:0}}><span>● Finder　文件　编辑　显示</span><span>Wi-Fi　▰</span></div>
      <div style={{margin:'6px 6px 0',background:'#F2F3ED',borderRadius:'6px 6px 0 0',display:'flex',flexDirection:'column',flex:1,minHeight:0,overflow:'hidden'}}>
        <div style={{padding:'7px 10px',display:'flex',justifyContent:'space-between',fontSize:10,borderBottom:'1px solid #D6D9CC',flexShrink:0}}><span style={{color:'#E46047'}}>● ● ●</span><span>Pages · 原创笔记</span></div>
        <div style={{padding:'16px 18px',flex:1,minHeight:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {data.title && <h1 style={{fontSize:hasImage?28:42,fontWeight:800,lineHeight:1.25,margin:'0 0 12px',color:'#172116',flexShrink:0}}>{data.title}</h1>}
          <div className="tpl-macbook-body" style={{flex:1,minHeight:0,overflow:'hidden',position:'relative'}} dangerouslySetInnerHTML={{__html:data.content}} />
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#58714C',paddingTop:8,flexShrink:0}}><span>{data.tags.slice(0,3).map(tag=>'#'+tag).join(' ')}</span><span>{data.pageInfo ? `${data.pageInfo.current} / ${data.pageInfo.total}` : ''}</span></div>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'center',gap:8,padding:7,flexShrink:0}}>{['#3BBEEE','#EC9D2F','#64B65B','#ED7154','#7D87C9'].map(color=><span key={color} style={{width:18,height:18,borderRadius:4,background:color,border:'1px solid #FFFFFF77'}} />)}</div>
    </div>
  </div>;
}
export const macbookTemplate: CardTemplate = {
  id:'macbook', name:'MacBook', description:'全幅桌面窗口 · 自适应文字 · 完整图表',
  render:data=><MacBookCard data={data}/>,
  defaultData:{title:'效率工作流分享',pages:['<p>把重要内容放进清晰的工作窗口。</p>'],tags:['工作流']},
};

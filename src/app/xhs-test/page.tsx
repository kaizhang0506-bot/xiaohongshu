'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
export default function XhsTestPage() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const downloadChart = async () => {
    try {
      setMessage('正在导出…');
      await document.fonts.ready;
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current!, { scale: 1, backgroundColor: '#fff8e6' });
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = '02_原图保留版.png'; a.click(); setMessage('已导出');
    } catch { setMessage('导出失败，请重试'); }
  };
  return <main style={{ padding: 24, background: '#eee9dc', minHeight: '100vh' }}>
    <h1>三张同义改写排版测试</h1><p>封面与要点页使用生图样张；图表页直接嵌入原始行情图，保留图片内容。</p>
    <Link href="/">返回工作台</Link>
    <div style={{display:'flex', flexWrap:'wrap', gap:24, marginTop:24}}>
      <section><img src="/xhs-test/01-cover.png" alt="重新排版的封面" style={{width:324}}/><p><a href="/xhs-test/01-cover.png" download>下载封面</a></p></section>
      <section><div style={{width:324,height:432,overflow:'hidden'}}><div style={{transform:'scale(.3)',transformOrigin:'top left'}}>
        <div ref={chartRef} style={{width:1080,height:1440,backgroundColor:'#fff8e6',color:'#073d1d',padding:70,boxSizing:'border-box',fontFamily:'Microsoft YaHei,sans-serif',overflow:'hidden'}}>
          <div style={{fontSize:38,fontWeight:900,backgroundColor:'#f6ca53',display:'inline-block',padding:'10px 22px'}}>交易笔记 / 02</div>
          <h2 style={{fontSize:68,lineHeight:1.25,margin:'25px 0'}}>不追涨停，耐心等洗盘</h2>
          <p style={{fontSize:34,lineHeight:1.5,margin:'0 0 30px'}}>见到涨停就贸然追入？冲高回落被套，隔天低开又慌着卖，这是新手常犯的错。我把8万做到150万，始终守着一个原则：不去追板，只等洗盘。</p>
          <div style={{position:'relative',width:820,height:860,overflow:'hidden',margin:'0 auto'}}><img alt="原始行情图，未经AI重绘" src="/xhs-test/original-chart-page.jpg" style={{position:'absolute',width:984,maxWidth:'none',height:'auto',left:-81.1,top:-581.3}} /></div>
        </div>
      </div></div><p><button onClick={()=>void downloadChart()}>下载图表页（原图保留版）</button> {message}</p></section>
      <section><img src="/xhs-test/03-details.png" alt="四个要点的重新排版" style={{width:324}}/><p><a href="/xhs-test/03-details.png" download>下载要点页</a></p></section>
    </div>
  </main>;
}

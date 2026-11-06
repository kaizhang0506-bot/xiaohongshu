const fs = require('fs');
const source = JSON.parse(fs.readFileSync('src/app/finished-six/data.json', 'utf8'));
const angles = ['冷静直接的交易复盘，句子短而有力', '从连续提问展开，像在给朋友解惑', '以常见误解与解释的对照展开', '从结构、位置、量能的分析逻辑展开', '以耐心观察者的学习笔记口吻展开'];
async function run(index) {
  const cache='test-artifacts/five-independent/version-'+(index+1)+'.json';
  if(fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache,'utf8')); 
  const response = await fetch((process.env.CONFLUX_BASE_URL || 'https://oapi.kaitools.cn/v1').replace(/\/$/, '') + '/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(180000), headers: {'Content-Type':'application/json', Authorization:'Bearer '+process.env.CONFLUX_API_KEY},
    body: JSON.stringify({model:'deepseek-v4.1-flash-1017', temperature:.8, stream:false, messages:[{role:'system',content:'你是中文编辑，执行同义改写。仅返回JSON对象 {"coverTitle":"封面短标题","coverSubtitle":"一句副标题","pages":[{"heading":"标题","paragraph":"正文"}]}。不得返回代码围栏。保留每页原意、全部数字、条件和风险提示，不新增事实或案例。保持8个内容页及其顺序，章节一至六分别位于第2至7内容页。每页正文不长于原文，标题和所有正文都必须重新措辞。不要只替换几个同义词。涉及原作者断言须保留为作者观点。'}, {role:'user',content:'版本'+(index+1)+'，采用'+angles[index]+'。独立重写下面这套文案，原意一致而开头、标题、句式明显不同：'+JSON.stringify(source.map(c=>({heading:c.content.heading,paragraph:c.content.paragraph})))}]})
  });
  if(!response.ok) throw Error('model HTTP '+response.status);
  const payload=await response.json(); const text=payload.choices?.[0]?.message?.content || '';
  const data=JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));
  if(data.pages?.length!==source.length || !data.coverTitle) throw Error('Invalid version '+index);
  data.pages=data.pages.map((p,i)=>{if(!p.heading?.trim()||!p.paragraph?.trim()||p.paragraph===source[i].content.paragraph)throw Error('Unchanged page');return {...source[i],content:{...source[i].content,heading:p.heading,paragraph:p.paragraph}};});
  fs.mkdirSync('test-artifacts/five-independent',{recursive:true});
  fs.writeFileSync('test-artifacts/five-independent/version-'+(index+1)+'.json',JSON.stringify(data,null,2));
  console.log('version '+(index+1)+' generated');return data;
}
Promise.all(angles.map((_,i)=>run(i))).then(versions=>{
  for(let page=0;page<source.length;page++) if(new Set(versions.map(v=>v.pages[page].content.paragraph.replace(/\s/g,''))).size!==5)throw Error('Duplicate page '+page);
  fs.writeFileSync('src/app/finished-six/versions.json',JSON.stringify(versions,null,2));console.log('Five independent versions saved');
}).catch(e=>{console.error(e.message);process.exitCode=1;});

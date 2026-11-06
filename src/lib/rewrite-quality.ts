export function copiedPhraseRatio(source: string, rewritten: string): number {
  const a=source.replace(/[\s\p{P}\p{S}]/gu,''),b=rewritten.replace(/[\s\p{P}\p{S}]/gu,'');
  if(!b) return 1;
  if(['均线粘合','成交量','K线','MACD','投资有风险'].includes(a)) return 0;
  if(a.length<20) return a===b?1:0;
  const grams=new Map<string,number>();
  for(let i=0;i<a.length-2;i++){const token=a.slice(i,i+3);grams.set(token,(grams.get(token)||0)+1);}
  let same=0;
  for(let i=0;i<b.length-2;i++){const token=b.slice(i,i+3),n=grams.get(token)||0;if(n){same++;grams.set(token,n-1);}}
  return same/Math.max(1,b.length-2);
}

function normalizeFactText(text: string): string {
  const digits: Record<string, number> = { 零:0, 〇:0, 一:1, 二:2, 两:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 };
  return text.replace(/\s/g, '').replace(/[％]/g, '%').replace(/([零〇一二两三四五六七八九十百]+)(?=日|天|倍|年|月|元|万|亿)/g, value => {
    let total = 0, current = 0;
    for (const char of value) {
      if (char === '十' || char === '百') { total += (current || 1) * (char === '十' ? 10 : 100); current = 0; }
      else current = digits[char] ?? 0;
    }
    return String(total + current);
  }).toUpperCase();
}

/** Conservative coverage check for source quantities/periods and named indicators, not a semantic guarantee. */
export function sourceNumericFacts(text: string): string[] {
  const normalized = normalizeFactText(text);
  const facts: string[] = [];
  const pattern = /(\d+(?:\.\d+)?(?:[—–\-~至到、，,]\d+(?:\.\d+)?){0,5})(%|倍|日|天|年|月|万元|亿元|元|万|亿|小时|分钟)/g;
  for (const match of normalized.matchAll(pattern)) {
    const unit = match[2];
    for (const number of match[1].split(/[—–\-~至到、，,]/)) facts.push(`${Number(number)}${unit}`);
  }
  for (const indicator of ['MACD', 'KDJ', 'RSI', 'BOLL', 'ETF', 'GDP', 'CPI']) if (normalized.includes(indicator)) facts.push(indicator);
  return [...new Set(facts)];
}

export function missingSourceFacts(source: string, rewritten: string): string[] {
  const actual = new Set(sourceNumericFacts(rewritten));
  return sourceNumericFacts(source).filter(fact => !actual.has(fact));
}

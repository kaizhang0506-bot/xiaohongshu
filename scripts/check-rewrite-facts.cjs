require('tsx/cjs');
const assert = require('node:assert/strict');
process.env.NEXT_PUBLIC_AI_TEST_PROVIDER = 'relay';
const { missingSourceFacts, sourceNumericFacts } = require('../src/lib/rewrite-quality.ts');
const { RoutedTextClient } = require('../src/lib/text-client.ts');
const { readSseStream } = require('../src/lib/stream-client.ts');
const { NextRequest } = require('next/server');
const { POST } = require('../src/app/api/rewrite/route.ts');

const source = '倍量定义为1.8—2倍，观察60日均线，跟踪5日、10日线，并结合MACD。';
const badBody = '用1.8到2倍定义放量，观察60日线和MACD。';
const goodBody = '原文以1.8到2倍描述放量，结合60日线与MACD，另外用五日、十日线作跟踪参考。';
assert.deepEqual(missingSourceFacts(source, badBody), ['5日', '10日']);
assert.deepEqual(missingSourceFacts(source, goodBody), []);
assert.deepEqual(sourceNumericFacts('比例为3%到5%，看5、10日线，增幅1.8—2倍'), ['3%', '5%', '5日', '10日', '1.8倍', '2倍']);
assert.deepEqual(missingSourceFacts('股价观察60日线', '只看160日线'), ['60日']);

const output = body => JSON.stringify({ titles: ['量价观察', '条件拆解', '先看边界'], body, tags: ['学习'], rewriteNotes: '重新表达' });
const original = RoutedTextClient.prototype.stream;
async function run(responses, length = 'follow') {
  let calls = 0;
  RoutedTextClient.prototype.stream = async function* () { const text = responses[Math.min(calls++, responses.length - 1)]; yield { content: text }; };
  const request = new NextRequest('http://localhost/api/rewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ referenceText: source, images: [], modelId: 'deepseek-v4.1-flash-1017', length }) });
  const response = await POST(request);
  const deltas = [];
  try { return { final: await readSseStream(response, text => deltas.push(text)), calls, deltas }; }
  catch (error) { return { error, calls, deltas }; }
}

(async () => {
  try {
    const retried = await run([output(badBody), output(goodBody)]);
    assert.equal(retried.calls, 2);
    assert.equal(JSON.parse(retried.final).body, goodBody);
    assert(retried.deltas.includes(''), 'SSE reset removes the incomplete attempt before retry');
    const rejected = await run([output(badBody)]);
    assert.equal(rejected.calls, 2);
    assert.match(rejected.error.message, /5日、10日/);
    const concise = await run([output(badBody)], 'concise');
    assert.equal(concise.calls, 1, 'shortening mode keeps its previous behavior');
    const malformed = await run(['invalid JSON']);
    assert.match(malformed.error.message, /格式不完整/);
    console.log('PASS: source quantities/periods, Chinese numeral equivalents, real route retry, SSE reset, rejection after one correction, concise-mode compatibility. No model network calls.');
  } finally { RoutedTextClient.prototype.stream = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });

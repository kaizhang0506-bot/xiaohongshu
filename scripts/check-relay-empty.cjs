require('tsx/cjs');
const assert = require('node:assert/strict');
const { streamDeepseek } = require('../src/lib/deepseek.ts');
const originalFetch = global.fetch;
async function run(responses) {
  let calls = 0; const events = [];
  global.fetch = async () => new Response(responses[Math.min(calls++, responses.length - 1)], { headers: { 'Content-Type': 'text/event-stream' } });
  await streamDeepseek({ modelId: 'test', apiKey: 'test-only', apiUrl: 'https://example.invalid/chat/completions', messages: [], temperature: .2, safeEnqueue: event => events.push(event) });
  return { calls, events };
}
(async () => {
  try {
    const chunk = 'data: {"choices":[{"delta":{"content":"正文"}}]}';
    const noNewline = await run([chunk]);
    assert.equal(noNewline.calls, 1);
    assert.equal(noNewline.events[0].text, '正文');
    const recovered = await run(['data: [DONE]\n\n', chunk]);
    assert.equal(recovered.calls, 2);
    assert.deepEqual(recovered.events, [{ type: 'delta', text: '正文' }]);
    const empty = await run(['data: [DONE]\n\n']);
    assert.equal(empty.calls, 2);
    assert.equal(empty.events[0].type, 'error');
    console.log('PASS: final SSE chunk without newline, empty-response retry, and explicit failure after one retry. No network calls.');
  } finally { global.fetch = originalFetch; }
})().catch(error => { console.error(error); process.exitCode = 1; });

require('tsx/cjs');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { parseCardText, plainCardText, prepareCardText, cardTextToHtml } = require('../src/lib/card-rich-text.ts');
const { buildCardContents } = require('../src/lib/card-content.ts');
const { NATIVE_TEMPLATES } = require('../src/lib/xhs-native-layouts.ts');
const { XhsNativeCard } = require('../src/components/workbench/XhsNativeCard.tsx');

const body = '## 一、先核对来源\n来源、统计口径和发布日期要一起检查。把事实与推测分开，再比较不同解释。\n\n### 适用条件也要写清楚\n同一个结论，换了观察对象或时间范围，可能就不再适用。\n\n**真正值得记住的，是判断依据。**\n① 记录尚未核实的信息。\n② 保留问题，持续复盘。';
const normalize = text => plainCardText(text).replace(/\s/g, '');
assert.deepEqual(parseCardText(body).slice(0, 4).map(block => block.kind), ['heading', 'paragraph', 'subheading', 'paragraph']);
assert.equal(parseCardText('查看适用条件\n同一个结论，换了观察对象或时间范围，可能就不再适用。')[0].kind, 'paragraph');
assert.equal(parseCardText('① 记录尚未核实的信息。')[0].kind, 'paragraph');
assert.equal(prepareCardText(prepareCardText(body)), prepareCardText(body));
assert(!cardTextToHtml('<img src=x onerror=alert(1)>').includes('<img'));
assert(cardTextToHtml('## 小节\n正文有**重点**。').includes('<strong'));

const result = { titles: ['把信息读出层次'], body, tags: ['学习笔记'], rewriteNotes: '' };
const headings = parseCardText(body).filter(block => ['heading', 'subheading'].includes(block.kind)).map(block => plainCardText(block.text));
for (let count = 3; count <= 12; count++) {
  const pages = buildCardContents(result, count, '').slice(1);
  const joined = pages.map(page => (headings.includes(page.heading) ? page.heading : '') + plainCardText(page.paragraph ?? '')).join('');
  assert.equal(normalize(joined), normalize(body), `all text/numbering retained in order for ${count} pages`);
  pages.forEach(page => {
    if (headings.includes(page.heading)) assert(page.paragraph, 'a section heading stays with following copy');
    assert.equal(((page.paragraph ?? '').match(/\*\*/g) ?? []).length % 2, 0, 'bold fragments are not cut across pages');
  });
}
const inlineBold = { ...result, body: '开头说明。中间含有**完整重点。后半句**，需要保留。最后一句。' };
assert.equal(normalize(buildCardContents(inlineBold, 5, '').slice(1).map(page => page.paragraph).join('')), normalize(inlineBold.body));

for (const template of NATIVE_TEMPLATES) {
  const html = renderToStaticMarkup(React.createElement(XhsNativeCard, { id: template.id, content: { kind: 'section', index: 1, total: 3, heading: '把信息读出层次', paragraph: body } }));
  for (const role of ['heading', 'subheading', 'emphasis', 'paragraph']) assert(html.includes(`data-text-role="${role}"`), `${template.id}: ${role}`);
  assert(!html.includes('## '), 'format markers are not painted onto the image');
}
console.log('PASS: semantic hierarchy, safe rendering, 10 pagination counts, bold boundaries, original numbering and 100 native templates.');

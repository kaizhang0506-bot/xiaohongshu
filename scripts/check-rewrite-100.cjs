require('tsx/cjs');
const assert = require('node:assert/strict');
const { MAX_REWRITE_COUNT, REWRITE_COUNTS, BATCH_PREVIEW_SIZE, normalizeRewriteCount, buildRewriteBatchContext } = require('../src/lib/rewrite-batch.ts');
const { NATIVE_TEMPLATES } = require('../src/lib/xhs-native-layouts.ts');
const { loadHistory, saveHistoryItem } = require('../src/lib/storage.ts');

assert.equal(MAX_REWRITE_COUNT, 100);
assert.deepEqual(REWRITE_COUNTS, Array.from({ length: 100 }, (_, index) => index + 1));
assert.equal(normalizeRewriteCount(0), 1);
assert.equal(normalizeRewriteCount(101), 100);
assert.equal(normalizeRewriteCount(NaN), 5);
assert.equal(new Set(NATIVE_TEMPLATES.map(template => template.id)).size, 100);
const versions = [];
const directions = new Set();
for (let index = 0; index < 100; index++) {
  const context = buildRewriteBatchContext(index, 100, versions, '策划要求'.repeat(200));
  assert(context.startsWith(`第${index + 1}/100条完整仿写`));
  assert(!context.includes('undefined'));
  assert(context.length <= 2000, `request ${index + 1} context fits server limit`);
  directions.add(context.slice(context.indexOf('采用') + 2).split('。')[0]);
  if (index > 8) assert(!context.includes('文案1：'), 'only recent examples are retained');
  versions.push({ titles: [`文案${index + 1}`], body: `第${index + 1}条` + '正文内容'.repeat(100), tags: ['笔记'], rewriteNotes: '' });
}
assert.equal(directions.size, 100);
assert.equal(Math.ceil(versions.length / BATCH_PREVIEW_SIZE), 10);
assert.equal(versions.slice(90, 100).length, 10);

const values = new Map();
global.window = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } };
for (let index = 0; index < versions.length; index++) saveHistoryItem({ id: String(index + 1), createdAt: index, params: {}, referenceText: '', result: versions[index] });
assert.equal(loadHistory().length, 100);
assert.equal(loadHistory()[0].id, '100');
assert.equal(loadHistory()[99].id, '1');
delete global.window;
console.log('PASS: 1–100 choices, all 100 context positions, bounded prompts, 100 distinct template IDs, 10-item preview batches and all 100 history entries. No model requests were sent.');

// Exercise the real workbench ZIP callback with deterministic card handles.
// Only card rasterization is stubbed; hidden-deck mounting, folder mapping and JSZip are real.
async function checkOffscreenExport() {
  const fs = require('node:fs');
  const path = require('node:path');
  const ts = require('typescript');
  const JSZip = require('jszip');
  const source = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8');
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'downloadTemplatesZip') callback = node.initializer.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert(callback);
  const compiled = ts.transpileModule(`const subject = ${callback}; module.exports = subject;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mounted = [];
  const ids = NATIVE_TEMPLATES.map(template => template.id);
  const capturedPages = new Map();
  let stitchedFromPages = 0;
  let zipBlob, exportError;
  const handleFor = id => ({
    exportPages: async () => {
      assert(!capturedPages.has(id), 'each deck is captured once');
      const pages = [{ fileName: '01_封面.png', blob: new TextEncoder().encode(`content-${ids.indexOf(id) + 1}`) }];
      capturedPages.set(id, pages);
      return pages;
    },
    exportStitched: async pages => {
      assert.strictEqual(pages, capturedPages.get(id), 'long image reuses the exported PNGs');
      stitchedFromPages++;
      return new TextEncoder().encode(`stitched-${ids.indexOf(id) + 1}`);
    },
  });
  const scope = {
    versions, layouts: ids,
    deckHandles: { current: new Map(ids.slice(0, BATCH_PREVIEW_SIZE).map(id => [id, handleFor(id)])) },
    exportWaiter: { current: null },
    setZipBusyKey() {},
    setZipError(error) { exportError = error; },
    setExportDeck(deck) { if (deck) { mounted.push(deck.spec.id); queueMicrotask(() => scope.exportWaiter.current?.(handleFor(deck.spec.id))); } },
    window: { setTimeout, clearTimeout },
    URL: { createObjectURL(blob) { zipBlob = blob; return 'blob:test'; }, revokeObjectURL() {} },
    document: { createElement() { return { click() {} }; } },
  };
  const subjectModule = { exports: {} };
  new Function('require', 'module', 'scope', `with (scope) { ${compiled} }`)(require, subjectModule, scope);
  await subjectModule.exports(NATIVE_TEMPLATES.map(template => ({ id: template.id, label: template.name, desc: template.description })), '100条仿写.zip');
  assert.equal(exportError, null);
  assert.equal(mounted.length, 90);
  assert.equal(stitchedFromPages, 100);
  const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
  const pngs = Object.values(zip.files).filter(file => !file.dir && file.name.endsWith('.png'));
  assert.equal(pngs.length, 200);
  for (let index = 0; index < ids.length; index++) {
    const ordinal = String(index + 1).padStart(2, '0');
    const page = pngs.find(file => file.name.includes(`/${ordinal}_`) && file.name.endsWith('/01_封面.png'));
    assert(page, `folder for version ${index + 1}`);
    assert.equal(await page.async('string'), `content-${index + 1}`);
  }
  console.log('PASS: actual workbench ZIP callback exports all 100 matching version folders, mounting the 90 nonvisible decks on demand.');
}
checkOffscreenExport().catch(error => { console.error(error); process.exitCode = 1; });

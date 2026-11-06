require('tsx/cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const sharp = require('sharp');
const { findLightPanelVisual } = require('../src/lib/page-visuals.ts');

function sample(colored = true) {
  const w = 400, h = 600, pixels = new Uint8ClampedArray(w * h * 4);
  function fill(x, y, width, height, rgb) {
    for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) {
      const i = (yy * w + xx) * 4;
      pixels.set([...rgb, 255], i);
    }
  }
  fill(0, 0, w, h, [248, 248, 248]);
  fill(60, 210, 280, 210, [255, 255, 255]);
  fill(65, 240, 260, 2, [120, 120, 120]);
  if (colored) {
    fill(190, 235, 8, 100, [220, 10, 10]);
    fill(90, 405, 200, 25, [20, 140, 30]);
  }
  return { w, h, pixels };
}
const { w, h, pixels } = sample();
const detected = findLightPanelVisual(pixels, w, h);
assert(detected);
assert(detected.y * h <= 210, 'sparse upper chart is retained');
assert((detected.y + detected.height) * h >= 430, 'dense lower bars are retained');
assert(detected.x * w <= 60 && (detected.x + detected.width) * w >= 340);
assert.equal(findLightPanelVisual(sample(false).pixels, w, h), null, 'plain text panel is not nested as an image');
const white = new Uint8ClampedArray(w * h * 4).fill(255);
assert.equal(findLightPanelVisual(white, w, h), null, 'no false detection on empty white pages');
console.log('PASS: sparse upper candles and dense lower bars form a complete chart; blank/text-only panels are rejected.');

// Optional real six-image regression: pass the fixture directory explicitly.
const fixtureDir = process.argv[2];
if (fixtureDir) (async () => {
  const fixtures = [
    ['6681902c-25c3-4a1f-badb-bf479c805c9a.jpg', [97, 478, 620, 959]],
    ['62d4ca74-2ef1-48b7-a8d1-5d8fcfcfa329.jpg', [81, 600, 379, 871]],
    ['e1416108-4fd0-44cf-abe8-e9d2ce937ba7.jpg', [80, 488, 679, 1025]],
    ['03bc8217-576e-4ba6-8bc2-761ef0af6676.jpg', [81, 760, 481, 1118]],
    ['963661a7-4e6c-4752-a328-fba326fe74d6.jpg', null],
    ['cca39d10-7bcd-4930-88af-34413c9a622f.jpg', [80, 172, 680, 661]],
  ];
  for (const [filename, expected] of fixtures) {
    const { data, info } = await sharp(path.join(fixtureDir, filename)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rect = findLightPanelVisual(data, info.width, info.height);
    if (!expected) { assert.equal(rect, null, filename); continue; }
    assert(rect, filename);
    const bounds = [rect.x * info.width, rect.y * info.height, (rect.x + rect.width) * info.width, (rect.y + rect.height) * info.height];
    assert(bounds[0] <= expected[0] && bounds[1] <= expected[1] && bounds[2] >= expected[2] && bounds[3] >= expected[3], `${filename}: complete expected figure bounds`);
    assert(bounds[1] > 100, 'do not include the screenshot title');
  }
  console.log('PASS: all five actual source charts, including the final censored chart, are complete; the pure-text page returns no image.');
})().catch(error => { console.error(error); process.exitCode = 1; });

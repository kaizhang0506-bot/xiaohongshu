const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'xhs-deployment-'));
const base = { ...process.env };
for (const name of ['AI_TEST_PROVIDER', 'NEXT_PUBLIC_AI_TEST_PROVIDER', 'CONFLUX_API_KEY', 'AI_DEBUG_SAVE_RESULTS', 'NEXT_BUILD_DIR']) delete base[name];
function run(file, args = [], env = {}) {
  return spawnSync(process.execPath, [path.join(fixture, 'scripts', file), ...args], { cwd: fixture, env: { ...base, ...env }, encoding: 'utf8' });
}
const relay = { AI_TEST_PROVIDER: 'relay', NEXT_PUBLIC_AI_TEST_PROVIDER: 'relay', AI_DEBUG_SAVE_RESULTS: '0' };
try {
  for (const dir of ['src', 'public/fonts', 'scripts']) fs.mkdirSync(path.join(fixture, dir), { recursive: true });
  for (const name of ['release-integrity.mjs', 'create-release-manifest.mjs', 'check-deployment.mjs']) fs.copyFileSync(path.join(__dirname, name), path.join(fixture, 'scripts', name));
  for (const name of ['.coze', '.gitattributes', 'pnpm-lock.yaml', 'next.config.ts', 'tsconfig.json', 'eslint.config.mjs', 'postcss.config.mjs', 'stylelint.config.mjs', 'src/accepted.txt']) fs.writeFileSync(path.join(fixture, name), 'accepted\n');
  fs.writeFileSync(path.join(fixture, 'package.json'), '{}');
  fs.writeFileSync(path.join(fixture, 'public/fonts/test.woff2'), Buffer.from([1, 2, 3]));
  fs.writeFileSync(path.join(fixture, 'deployment-contract.json'), JSON.stringify({ version: 'fixture', nativeTemplates: 100, localFontAssets: 1 }));
  assert.equal(run('create-release-manifest.mjs', ['--approved-release']).status, 0);
  const check = (phase, env) => run('check-deployment.mjs', [phase], env);
  assert.equal(check('source').status, 0);
  assert.notEqual(check('build').status, 0, 'missing provider cannot silently switch to Coze');
  assert.notEqual(check('build', { ...relay, NEXT_PUBLIC_AI_TEST_PROVIDER: 'coze' }).status, 0);
  assert.equal(check('build', relay).status, 0);
  assert.notEqual(check('build', { ...relay, AI_DEBUG_SAVE_RESULTS: '1' }).status, 0);
  assert.equal(check('record', relay).status, 0);
  assert.notEqual(check('start', relay).status, 0, 'relay needs a server credential');
  assert.equal(check('start', { ...relay, CONFLUX_API_KEY: 'fixture-not-a-real-key' }).status, 0);
  assert.notEqual(check('start', { AI_TEST_PROVIDER: 'coze', NEXT_PUBLIC_AI_TEST_PROVIDER: 'coze' }).status, 0, 'runtime switch requires rebuild');
  fs.writeFileSync(path.join(fixture, '.env.local'), 'AI_TEST_PROVIDER=coze\nNEXT_PUBLIC_AI_TEST_PROVIDER=coze\n');
  assert.match(check('build', relay).stdout, /relay/, 'platform variables take priority over a local file');
  fs.writeFileSync(path.join(fixture, 'public/fonts/test.woff2'), Buffer.from([9]));
  assert.notEqual(check('source').status, 0, 'changed static assets are detected');
  console.log('PASS: source integrity, missing/mismatched providers, debug guard, credentials, build/runtime consistency, environment precedence and changed fonts. No model calls.');
} finally {
  const resolved = path.resolve(fixture);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('xhs-deployment-')) fs.rmSync(resolved, { recursive: true, force: true });
}

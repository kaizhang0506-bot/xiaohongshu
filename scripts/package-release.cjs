const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const JSZip = require('jszip');

const rootFiles = ['.coze', '.gitignore', '.gitattributes', '.npmrc', '.env.relay.example', '.env.coze.example', 'AGENTS.md', 'README.md', '给扣子编程的交接指令.txt', '扣子部署与模型接入说明.md', 'deployment-contract.json', 'release-integrity.json', 'DEPLOYMENT_VERIFICATION.json', 'DESIGN.md', 'THIRD_PARTY_NOTICES.md', 'REDNOTE-LICENSE.txt', 'package.json', 'pnpm-lock.yaml', 'next-env.d.ts', 'next.config.ts', 'tsconfig.json', 'components.json', 'postcss.config.mjs', 'eslint.config.mjs', 'stylelint.config.mjs'];
function collectReleaseFiles(root) {
  const files = [...rootFiles];
  function visit(relative) {
    if (relative === 'scripts/package-private.cjs') return;
    const full = path.join(root, relative);
    if (fs.statSync(full).isDirectory()) fs.readdirSync(full).forEach(name => visit(`${relative}/${name}`));
    else files.push(relative);
  }
  ['src', 'public', 'scripts', 'references'].forEach(visit);
  for (const file of files) if (!fs.existsSync(path.join(root, file))) throw new Error(`发布文件缺失：${file}`);
  return files.sort();
}
function scanRelease(root, files) {
  const envFile = path.join(root, '.env.local');
  const privateValues = fs.existsSync(envFile)
    ? [...fs.readFileSync(envFile, 'utf8').matchAll(/^(?:CONFLUX_API_KEY|DEEPSEEK_API_KEY|IMAGE_API_KEY|COZE_API_TOKEN)=(.+)$/gm)].map(match => match[1].trim().replace(/^["']|["']$/g, '')).filter(value => value.length >= 20)
    : [];
  const rejected = [];
  for (const file of files) {
    if (!/\.(?:[cm]?[jt]sx?|json|css|md|txt|svg|sh|ps1|ya?ml)$/i.test(file) && !rootFiles.includes(file)) continue;
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    if (privateValues.some(value => content.includes(value)) || /\bsk-[A-Za-z0-9_-]{24,}\b|\bgh[pousr]_[A-Za-z0-9]{24,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) rejected.push(file);
  }
  if (rejected.length) throw new Error(`公开发布扫描发现疑似凭据，仅列文件名：${rejected.join('、')}`);
}
function releaseFileBytes(root, file) {
  // Next regenerates route types during build; do not ship a local check-directory import.
  if (file === 'next-env.d.ts') return Buffer.from('/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// Generated route types are created by Next.js during build.\n');
  return fs.readFileSync(path.join(root, file));
}
module.exports = { collectReleaseFiles, scanRelease, releaseFileBytes };
if (require.main === module) (async () => {
  const root = process.cwd();
  const { verifyIntegrity } = await import('./release-integrity.mjs');
  verifyIntegrity(root);
  const files = collectReleaseFiles(root);
  scanRelease(root, files);
  const zip = new JSZip();
  for (const file of files) zip.file(`xiaohongshu/${file}`, releaseFileBytes(root, file), { unixPermissions: file.endsWith('.sh') ? '100755' : '100644' });
  const out = path.resolve(process.argv[2] || '../releases/xiaohongshu-coze-2026-11-06.zip');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const bytes = await zip.generateAsync({ type: 'nodebuffer', platform: 'UNIX', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  fs.writeFileSync(out, bytes);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(`${out}.sha256`, `${sha256}  ${path.basename(out)}\n`);
  console.log(JSON.stringify({ path: out, files: files.length, bytes: bytes.length, sha256, credentialScan: 'passed' }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });

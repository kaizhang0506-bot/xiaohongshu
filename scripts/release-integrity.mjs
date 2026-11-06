import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const protectedRoots = ['src', 'public', 'scripts', '.coze', '.gitattributes', 'package.json', 'pnpm-lock.yaml', 'next.config.ts', 'tsconfig.json', 'deployment-contract.json', 'eslint.config.mjs', 'postcss.config.mjs', 'stylelint.config.mjs'];
export function projectFiles(root, entries = protectedRoots) {
  const files = [];
  for (const entry of entries) {
    if (entry.replaceAll('\\', '/') === 'scripts/package-private.cjs') continue;
    const full = path.join(root, entry);
    if (!fs.existsSync(full)) throw new Error(`缺少交接文件：${entry}`);
    if (fs.statSync(full).isDirectory()) files.push(...projectFiles(root, fs.readdirSync(full).map(name => `${entry}/${name}`)));
    else files.push(entry.replaceAll('\\', '/'));
  }
  return files.sort();
}
export function digestFile(root, name) {
  let bytes = fs.readFileSync(path.join(root, name));
  if (/\.(?:[cm]?[jt]sx?|json|css|md|txt|svg|sh|ps1|ya?ml|toml)$/i.test(name) || ['.coze', '.gitattributes'].includes(name)) {
    bytes = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
  }
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
export function verifyIntegrity(root) {
  const manifestPath = path.join(root, 'release-integrity.json');
  if (!fs.existsSync(manifestPath)) throw new Error('缺少 release-integrity.json，请恢复完整发布包；部署时不要重新生成基线。');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const current = projectFiles(root);
  const expected = Object.keys(manifest.files).sort();
  const changed = current.filter(name => !manifest.files[name] || digestFile(root, name) !== manifest.files[name]);
  const missing = expected.filter(name => !current.includes(name));
  if (changed.length || missing.length) throw new Error(`受保护源码/素材发生变化：${[...missing, ...changed].slice(0, 12).join('、')}。请先核对用户授权的改动；不要靠删除校验或重建基线跳过检查。`);
  return { files: current.length, manifest };
}

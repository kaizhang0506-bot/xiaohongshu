import fs from 'node:fs';
import { projectFiles, digestFile } from './release-integrity.mjs';

// Release authoring only. Build/start deliberately never call this script.
if (!process.argv.includes('--approved-release')) {
  console.error('仅在用户授权功能变更且完成验收后，使用 --approved-release 建立新发布基线。普通部署不要运行此命令。');
  process.exit(1);
}
const root = process.cwd();
const files = Object.fromEntries(projectFiles(root).map(name => [name, digestFile(root, name)]));
fs.writeFileSync('release-integrity.json', JSON.stringify({ version: '2026-11-06', algorithm: 'sha256', textLineEndings: 'LF', files }, null, 2) + '\n');
console.log(`已建立 ${Object.keys(files).length} 个源码/素材文件的发布基线。`);

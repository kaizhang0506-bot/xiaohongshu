import fs from 'node:fs';
import path from 'node:path';
import { verifyIntegrity } from './release-integrity.mjs';

const phase = process.argv[2] || 'source';
try {
  const root = process.cwd();
  const checked = verifyIntegrity(root);
  const contract = JSON.parse(fs.readFileSync('deployment-contract.json', 'utf8'));
  const fonts = Object.keys(checked.manifest.files).filter(name => name.startsWith('public/fonts/') && /\.(woff2?|ttf|otf)$/i.test(name)).length;
  if (fonts !== contract.localFontAssets) throw new Error(`字体资产数不一致：${fonts}/${contract.localFontAssets}`);
  if (phase === 'source') {
    console.log(`交接完整性通过：${checked.files} 个受保护文件，${fonts} 份字体；未调用模型。`);
    process.exit(0);
  }
  // Node.js 24 is required by .coze. Existing platform variables take priority.
  for (const name of ['.env.local', '.env']) if (fs.existsSync(name)) process.loadEnvFile(name);
  const provider = process.env.AI_TEST_PROVIDER;
  const publicProvider = process.env.NEXT_PUBLIC_AI_TEST_PROVIDER;
  if (!['relay', 'coze'].includes(provider) || provider !== publicProvider) {
    throw new Error('请在扣子服务端明确配置 AI_TEST_PROVIDER 与 NEXT_PUBLIC_AI_TEST_PROVIDER，且两者一致。当前交接方案是 relay；不会因为缺配置自动改用扣子模型。');
  }
  if (process.env.AI_DEBUG_SAVE_RESULTS === '1') throw new Error('生产部署需设置 AI_DEBUG_SAVE_RESULTS=0，避免保存用户文案调试文件。');
  const buildDir = process.env.NEXT_BUILD_DIR || '.next';
  const stampPath = path.join(root, buildDir, 'deployment-runtime.json');
  if (phase === 'build') {
    console.log(`部署配置通过：${provider}；模板本地排版；生图入口${process.env.ENABLE_LEGACY_AI_IMAGES === '1' ? '已明确启用' : '关闭'}。未调用模型。`);
  } else if (phase === 'record') {
    fs.mkdirSync(path.dirname(stampPath), { recursive: true });
    fs.writeFileSync(stampPath, JSON.stringify({ version: contract.version, provider, nativeTemplates: contract.nativeTemplates, fonts, files: checked.files }, null, 2) + '\n');
    console.log('已记录构建时的模型通道；记录不包含密钥。');
  } else if (phase === 'start') {
    if (provider === 'relay' && !process.env.CONFLUX_API_KEY?.trim()) throw new Error('缺少服务端 CONFLUX_API_KEY。请填入现有中转站密钥，不要改模板或切到其他模型绕过此错误。');
    if (!fs.existsSync(stampPath)) throw new Error('缺少部署构建记录，请按 pnpm build 完整构建后启动。');
    const built = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
    if (built.provider !== provider) throw new Error('运行通道与构建时不一致，请先核对配置并重新构建，不能只改运行变量。');
    console.log(`启动检查通过：${provider}；${fonts} 份本地字体；不依赖 Codex。`);
  } else throw new Error(`未知检查阶段：${phase}`);
} catch (error) {
  console.error(`[部署检查失败] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

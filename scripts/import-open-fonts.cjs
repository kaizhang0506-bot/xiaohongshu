/* Asset import only: the deployed website serves these files without a CDN. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve('public/fonts');
fs.mkdirSync(path.join(root, 'licenses'), { recursive: true });
const families = [
  { name: 'Noto Sans SC', alias: 'XHS Sans', slug: 'noto-sans-sc', weights: '400;700;900', license: 'notosanssc' },
  { name: 'Noto Serif SC', alias: 'XHS Serif', slug: 'noto-serif-sc', weights: '400;700;900', license: 'notoserifsc' },
  { name: 'LXGW WenKai TC', alias: 'XHS WenKai', slug: 'lxgw-wenkai-tc', weights: '400', license: 'lxgwwenkaitc' },
];
const headers = { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36' };
async function get(url) {
  for (let pass = 0; pass < 3; pass++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error('HTTP ' + response.status);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (pass === 2) throw error;
    }
  }
}
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
async function fontAsset(name, source) {
  const file = path.join(root, name);
  const buffer = fs.existsSync(file) ? fs.readFileSync(file) : await get(source);
  if (name.endsWith('.woff2') && buffer.toString('ascii', 0, 4) !== 'wOF2') throw Error('Invalid webfont: ' + name);
  fs.writeFileSync(file, buffer);
  return { name, source, bytes: buffer.length, sha256: sha(buffer) };
}

(async () => {
  const manifest = [];
  let css = '/* Local open fonts. Original licenses and file provenance: public/fonts/. */\n';
  for (const family of families) {
    const source = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family.name) + ':wght@' + family.weights + '&display=swap';
    let sheet = (await get(source)).toString();
    const urls = [...new Set([...sheet.matchAll(/url\((https[^)]+)\)/g)].map(match => match[1]))];
    if (!urls.length) throw Error('No webfonts found: ' + family.name);
    let cursor = 0;
    const assets = Array(urls.length);
    await Promise.all(Array.from({ length: 10 }, async () => {
      while (cursor < urls.length) {
        const index = cursor++;
        assets[index] = await fontAsset(family.slug + '-' + index + '.woff2', urls[index]);
      }
    }));
    manifest.push(...assets);
    for (let index = 0; index < urls.length; index++) sheet = sheet.split(urls[index]).join('/fonts/' + assets[index].name);
    sheet = sheet.split("'" + family.name + "'").join("'" + family.alias + "'");
    css += sheet + '\n';
    fs.writeFileSync(path.join(root, 'licenses', family.name.replaceAll(' ', '') + '-OFL.txt'), await get('https://raw.githubusercontent.com/google/fonts/main/ofl/' + family.license + '/OFL.txt'));
    console.log(family.name + ': ' + urls.length + ' local webfont fragments');
  }
  // Pinned webfont distribution; the font itself retains the author's OFL license.
  manifest.push(await fontAsset('SmileySans.woff2', 'https://cdn.jsdelivr.net/npm/font-smiley-sans@1.0.0/SmileySans-Oblique.ttf.woff2'));
  fs.writeFileSync(path.join(root, 'licenses', 'SmileySans-OFL.txt'), await get('https://raw.githubusercontent.com/atelier-anchor/smiley-sans/main/LICENSE'));
  manifest.push(await fontAsset('ZCOOLKuaiLe-Regular.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf'));
  fs.writeFileSync(path.join(root, 'licenses', 'ZCOOLKuaiLe-OFL.txt'), await get('https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/OFL.txt'));
  css += "@font-face{font-family:'XHS Smiley';src:url('/fonts/SmileySans.woff2') format('woff2');font-style:normal;font-weight:400;font-display:swap;}\n";
  css += "@font-face{font-family:'XHS KuaiLe';src:url('/fonts/ZCOOLKuaiLe-Regular.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap;}\n";
  fs.writeFileSync('src/app/card-fonts.css', css);
  fs.writeFileSync(path.join(root, 'sources.json'), JSON.stringify(manifest, null, 2));
  console.log('All font families installed: ' + manifest.length + ' assets');
})().catch(error => { console.error(error.message); process.exitCode = 1; });

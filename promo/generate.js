// CrumbKit — Promo tile generator for Chrome Web Store
// Generates small, large, and marquee promo tiles.
// Usage: node promo/generate.js

import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = dirname(__dirname);

const BRAND = '#2563eb';
const BG_GRADIENT = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#94a3b8';

function buildPromoHTML({ width, height, title, subtitle, features }) {
  const scaleFactor = width / 440; // Base scale on small tile width

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${width}, initial-scale=1.0">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: ${BG_GRADIENT};
  display: flex; align-items: center; justify-content: center;
  color: ${TEXT_PRIMARY};
}
.container {
  text-align: center; padding: ${Math.round(24 * scaleFactor)}px;
  max-width: ${Math.round(width * 0.85)}px;
}
.logo { font-size: ${Math.round(56 * scaleFactor)}px; display: block; margin-bottom: ${Math.round(12 * scaleFactor)}px; }
h1 { font-size: ${Math.round(28 * scaleFactor)}px; font-weight: 700; margin-bottom: ${Math.round(6 * scaleFactor)}px; }
.tagline { font-size: ${Math.round(14 * scaleFactor)}px; color: ${TEXT_SECONDARY}; line-height: 1.4; }
.features {
  display: flex; justify-content: center; flex-wrap: wrap;
  gap: ${Math.round(10 * scaleFactor)}px; margin-top: ${Math.round(16 * scaleFactor)}px;
}
.feature {
  background: rgba(255,255,255,0.08); border-radius: ${Math.round(6 * scaleFactor)}px;
  padding: ${Math.round(6 * scaleFactor)}px ${Math.round(12 * scaleFactor)}px;
  font-size: ${Math.round(12 * scaleFactor)}px; color: #cbd5e1;
}
.accent { color: #60a5fa; }
</style>
</head>
<body>
<div class="container">
  <span class="logo">🍪</span>
  <h1>${title}</h1>
  <p class="tagline">${subtitle}</p>
  ${features ? `<div class="features">${features.map(f => `<span class="feature">${f}</span>`).join('')}</div>` : ''}
</div>
</body>
</html>`;
}

async function main() {
  console.log('🎨 CrumbKit Promo Tile Generator\n');

  const tiles = [
    {
      name: 'small-tile',
      width: 440, height: 280,
      title: 'CrumbKit',
      subtitle: 'Free, open-source cookie editor.<br><span class="accent">Zero tracking · Privacy score · Dark mode</span>',
      features: ['Privacy Score', 'Import/Export', 'Dark Mode'],
    },
    {
      name: 'large-tile',
      width: 920, height: 680,
      title: 'CrumbKit',
      subtitle: 'The privacy-first cookie editor for Chrome.<br><span class="accent">Free · Open source · Zero tracking · MV3 native</span>',
      features: ['View & Edit Cookies', 'Privacy Score 0–100', 'Cookie Classification', 'JSON/Netscape/cURL Export', 'Import & Export', 'Domain Whitelist', 'Undo Support', 'Dark/Light Mode'],
    },
    {
      name: 'marquee-tile',
      width: 1400, height: 560,
      title: 'CrumbKit',
      subtitle: 'Privacy-first cookie editor — <span class="accent">Free · Open source · Zero tracking · MV3 native</span>',
      features: ['Privacy Score', 'Cookie Classification', 'Domain Whitelist', 'Undo Support', 'Import/Export', 'Dark Mode'],
    },
  ];

  const browser = await puppeteer.launch({ headless: 'new' });

  for (const tile of tiles) {
    console.log(`  🖼️  ${tile.name} (${tile.width}×${tile.height})`);
    const page = await browser.newPage();
    await page.setViewport({ width: tile.width, height: tile.height });
    const html = buildPromoHTML(tile);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));
    const filepath = `${OUT_DIR}/promo/${tile.name}.png`;
    await page.screenshot({ path: filepath });
    console.log(`     → ${filepath}`);
    await page.close();
  }

  await browser.close();
  console.log('\n✅ Done! Promo tiles saved to promo/');
}

main().catch(err => { console.error('❌', err); process.exit(1); });

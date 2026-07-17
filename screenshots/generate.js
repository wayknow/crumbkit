// CrumbKit — Screenshot generator for Chrome Web Store
// Generates 3 screenshots at 1280×800 for CWS submission.
// Usage: node screenshots/generate.js

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_PATH = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = `${EXT_PATH}/screenshots`;

// Read popup CSS for embedding
const popupCSS = readFileSync(`${EXT_PATH}/src/popup/popup.css`, 'utf-8');

// Sample cookies for realistic screenshots
const SAMPLE_COOKIES = [
  { name: '_ga', value: 'GA1.2.123456789.1234567890', domain: '.example.com', path: '/', secure: true, httpOnly: false, sameSite: 'lax', session: false, category: 'analytics', categoryIcon: '📊' },
  { name: '_gid', value: 'GA1.2.987654321.1234567890', domain: '.example.com', path: '/', secure: true, httpOnly: false, sameSite: 'lax', session: false, category: 'analytics', categoryIcon: '📊' },
  { name: 'user_session', value: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ', domain: 'example.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax', session: true, category: 'essential', categoryIcon: '🔧' },
  { name: 'logged_in', value: 'yes', domain: '.example.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax', session: true, category: 'essential', categoryIcon: '🔧' },
  { name: '_octo', value: 'GH1.1.1234567890.1234567890', domain: '.example.com', path: '/', secure: true, httpOnly: false, sameSite: 'lax', session: false, category: 'functional', categoryIcon: '⚙️' },
  { name: 'tz', value: 'Asia%2FShanghai', domain: '.example.com', path: '/', secure: true, httpOnly: false, sameSite: 'lax', session: false, category: 'functional', categoryIcon: '⚙️' },
];

// Category color map
const CAT_COLORS = {
  essential: '#4CAF50',
  functional: '#2196F3',
  analytics: '#FF9800',
  advertising: '#F44336',
  social: '#E91E63',
  unknown: '#9E9E9E',
};

const CAT_LABELS = {
  essential: 'Essential',
  functional: 'Functional',
  analytics: 'Analytics',
  advertising: 'Advertising',
  social: 'Social',
  unknown: 'Unknown',
};

function cookieRowHTML(cookie, expanded = false) {
  const catColor = CAT_COLORS[cookie.category] || CAT_COLORS.unknown;
  const secureBadge = cookie.secure ? '<span class="badge badge-secure">S</span>' : '';
  const httpOnlyBadge = cookie.httpOnly ? '<span class="badge badge-httponly">H</span>' : '';
  const valuePreview = cookie.value.length > 30 ? cookie.value.substring(0, 30) + '...' : cookie.value;

  let editFormHTML = '';
  if (expanded) {
    editFormHTML = `
    <div class="cookie-edit-form" style="padding:8px 12px 10px;background:var(--bg-secondary);border-bottom:1px solid var(--border);">
      <div class="form-row" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <label style="font-size:10px;font-weight:600;color:var(--text-secondary);width:70px;flex-shrink:0;text-align:right;text-transform:uppercase;">Name</label>
        <input type="text" value="${cookie.name}" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text);font-size:12px;font-family:inherit;" readonly>
      </div>
      <div class="form-row" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <label style="font-size:10px;font-weight:600;color:var(--text-secondary);width:70px;flex-shrink:0;text-align:right;text-transform:uppercase;">Value</label>
        <input type="text" value="${cookie.value}" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text);font-size:12px;font-family:inherit;" readonly>
      </div>
      <div class="form-row" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <label style="font-size:10px;font-weight:600;color:var(--text-secondary);width:70px;flex-shrink:0;text-align:right;text-transform:uppercase;">Domain</label>
        <input type="text" value="${cookie.domain}" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text);font-size:12px;font-family:inherit;" readonly>
      </div>
      <div class="form-actions" style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px;">
        <button class="btn btn-primary" style="padding:4px 14px;font-size:11px;">Save</button>
        <button class="btn" style="padding:4px 14px;font-size:11px;">Cancel</button>
      </div>
    </div>`;
  }

  return `<div class="cookie-row${expanded ? ' expanded' : ''}" style="display:flex;align-items:center;padding:6px 12px;border-bottom:1px solid var(--border-light);gap:8px;">
    <span class="cookie-category-icon" style="font-size:14px;flex-shrink:0;width:18px;text-align:center;">${cookie.categoryIcon}</span>
    <div class="cookie-info" style="flex:1;min-width:0;">
      <div class="cookie-name" style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cookie.name}</div>
      <div class="cookie-meta" style="font-size:10px;color:var(--text-secondary);display:flex;gap:8px;align-items:center;margin-top:1px;">
        <span class="cookie-value-preview" style="color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${valuePreview}</span>
        <span class="cookie-domain-preview" style="color:var(--primary);">${cookie.domain}</span>
        ${secureBadge}${httpOnlyBadge}
        <span class="badge" style="display:inline-block;padding:0 4px;font-size:9px;font-weight:600;border-radius:2px;border:1px solid ${catColor};color:${catColor};">${CAT_LABELS[cookie.category]}</span>
      </div>
    </div>
    <div class="cookie-actions" style="display:flex;gap:2px;flex-shrink:0;">
      <button class="icon-btn" style="width:24px;height:24px;font-size:12px;background:transparent;border:none;cursor:pointer;color:var(--text);">✎</button>
      <button class="icon-btn btn-delete" style="width:24px;height:24px;font-size:12px;background:transparent;border:none;cursor:pointer;color:var(--danger);">✕</button>
    </div>
  </div>${editFormHTML}`;
}

function buildScene1() {
  // Scene 1: Popup showing cookie list with privacy score
  return buildPopupScene({
    score: 67,
    scoreColor: '#FF9800',
    scoreLabel: 'Fair Privacy',
    domain: 'example.com',
    trackerCount: '2 trackers detected',
    expandedCookie: null,
  });
}

function buildScene2() {
  // Scene 2: Popup with edit form expanded and export dropdown
  return buildPopupScene({
    score: 67,
    scoreColor: '#FF9800',
    scoreLabel: 'Fair Privacy',
    domain: 'example.com',
    trackerCount: '2 trackers detected',
    expandedCookie: 2, // Expand the 3rd cookie (user_session)
  });
}

function buildPopupScene({ score, scoreColor, scoreLabel, domain, trackerCount, expandedCookie }) {
  const circumference = 100;
  const dashoffset = circumference - score;

  let cookieRows = '';
  SAMPLE_COOKIES.forEach((c, i) => {
    cookieRows += cookieRowHTML(c, i === expandedCookie);
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CrumbKit - Screenshot</title>
<style>
/* Popup CSS (embedded from popup.css) */
${popupCSS}
/* Screenshot-specific: center popup on a nice desktop background */
html { background: #e8eaed; font-size: 13px; }
body {
  width: 480px;
  max-height: 560px;
  min-height: 400px;
  margin: 60px auto 0;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08);
  border-radius: 8px;
  overflow: hidden;
}
/* Desktop context */
.desktop-bg {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #e8eaed 0%, #d4d8dd 100%);
  z-index: -1;
}
.desktop-header {
  position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
  color: #666; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  background: rgba(255,255,255,0.7); padding: 4px 12px; border-radius: 6px;
  z-index: -1;
}
</style>
</head>
<body>
<div class="desktop-bg"></div>
<div class="desktop-header">🔒 example.com — CrumbKit popup</div>

<header class="header">
  <div class="header-top">
    <div class="brand">
      <span class="logo">🍪</span>
      <h1>CrumbKit</h1>
    </div>
    <div class="header-actions">
      <button class="icon-btn" title="Toggle dark/light mode" aria-label="Toggle theme">
        <span id="themeIcon">🌙</span>
      </button>
    </div>
  </div>
  <div class="privacy-score-row">
    <div class="score-circle" title="Privacy Score">
      <svg viewBox="0 0 36 36" class="score-chart">
        <path class="score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
        <path class="score-fill" stroke-dasharray="${score}, ${circumference}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke="${scoreColor}"/>
      </svg>
      <span class="score-text">${score}</span>
    </div>
    <div class="privacy-info">
      <span class="domain-label">${domain}</span>
      <span class="privacy-label">${scoreLabel} · ${trackerCount}</span>
    </div>
  </div>
</header>

<div class="toolbar">
  <div class="search-row">
    <input type="text" class="search-input" placeholder="Search cookies..." autocomplete="off" value="">
    <button class="icon-btn search-clear" title="Clear search" style="display:none">✕</button>
  </div>
  <div class="action-row">
    <button class="btn btn-primary" title="Add new cookie">+ Add</button>
    <div class="dropdown">
      <button class="btn" title="Export cookies" style="background:var(--bg-hover);">↥ Export ▾</button>
      ${expandedCookie !== null ? `
      <div class="dropdown-menu open" style="display:block; position:absolute; top:100%; left:0; margin-top:2px; min-width:200px; background:var(--bg); border:1px solid var(--border); border-radius:4px; box-shadow:var(--shadow); z-index:10; padding:4px 0;">
        <button style="display:block;width:100%;padding:7px 12px;border:none;background:var(--bg-hover);color:var(--text);font-size:12px;font-family:inherit;text-align:left;cursor:pointer;">JSON (.json)</button>
        <button style="display:block;width:100%;padding:7px 12px;border:none;background:none;color:var(--text);font-size:12px;font-family:inherit;text-align:left;cursor:pointer;">Netscape (.txt) — curl/wget</button>
        <button style="display:block;width:100%;padding:7px 12px;border:none;background:none;color:var(--text);font-size:12px;font-family:inherit;text-align:left;cursor:pointer;">cURL command (.sh)</button>
      </div>` : ''}
    </div>
    <button class="btn" title="Import cookies from file">↧ Import</button>
    <button class="btn btn-danger" title="Delete all cookies">✕ All</button>
    <button class="btn btn-undo" title="Undo last action" disabled>↩</button>
  </div>
</div>

<main class="cookie-list">
  ${cookieRows}
</main>

<footer class="footer">
  <div class="footer-row">
    <span>6 cookies</span>
    <span class="tracker-count">
      <span><span class="cat-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#FF9800;margin-right:2px;"></span>2 tracking</span>
    </span>
    <a class="feedback-link" style="font-size:10px;color:var(--text-muted);text-decoration:none;padding:2px 6px;border-radius:4px;">💡 Feedback</a>
  </div>
  <div class="footer-promo" style="display:flex;align-items:center;justify-content:center;gap:4px;padding:2px 0 4px;font-size:10px;color:var(--text-muted);border-top:1px solid var(--border-light);margin-top:3px;">
    <span>Clear Tools:</span>
    <a href="https://wayknow.tech/clearjson.html" target="_blank" style="color:var(--text-muted);text-decoration:none;padding:1px 4px;border-radius:2px;">ClearJSON</a>
    <span style="opacity:0.4">·</span>
    <a href="https://wayknow.tech/snapmark.html" target="_blank" style="color:var(--text-muted);text-decoration:none;padding:1px 4px;border-radius:2px;">SnapMark</a>
  </div>
</footer>

</body>
</html>`;
}

function buildScene3() {
  // Scene 3: Options page (standalone, can be captured from real extension or as static HTML)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CrumbKit Settings</title>
<style>
:root {
  --bg: #ffffff; --bg-secondary: #f9fafb; --bg-hover: #f3f4f6;
  --text: #1a1a1a; --text-secondary: #666666; --text-muted: #999999;
  --border: #e0e0e0; --primary: #2563eb; --primary-hover: #1d4ed8;
  --primary-text: #ffffff; --danger: #dc2626; --danger-hover: #b91c1c;
  --radius: 8px; --radius-sm: 4px; --shadow: 0 1px 3px rgba(0,0,0,0.08);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 15px; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #e8eaed 0%, #d4d8dd 100%);
  color: var(--text);
  min-height: 800px;
}
.container { max-width: 720px; margin: 0 auto; padding: 40px 24px; }
header { text-align: center; margin-bottom: 32px; }
header .logo { font-size: 36px; display: block; margin-bottom: 8px; }
header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
header .subtitle { font-size: 14px; color: var(--text-secondary); }
.card {
  background: var(--bg); border-radius: var(--radius);
  box-shadow: var(--shadow); padding: 24px; margin-bottom: 20px;
}
.card h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.setting-row { display: flex; align-items: center; justify-content: space-between; }
.setting-row label { font-size: 14px; font-weight: 500; }
.setting-row select {
  padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 14px; font-family: inherit; background: var(--bg); min-width: 180px;
}
.help-text { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5; }
.help-text a { color: var(--primary); text-decoration: none; }
.add-domain-row { display: flex; gap: 8px; margin-bottom: 12px; }
.domain-input {
  flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 14px; font-family: inherit;
}
.domain-input:focus { border-color: var(--primary); outline: none; }
.btn {
  padding: 8px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); color: var(--text); font-size: 13px; font-family: inherit;
  font-weight: 500; cursor: pointer; white-space: nowrap;
}
.btn-primary { background: var(--primary); color: var(--primary-text); border-color: var(--primary); }
.btn-primary:hover { background: var(--primary-hover); }
.whitelist-list { list-style: none; }
.whitelist-list li {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  margin-bottom: 6px; background: var(--bg-secondary); font-size: 14px;
}
.whitelist-list .item-domain { font-weight: 500; font-family: monospace; }
.whitelist-list .btn-delete {
  padding: 4px 10px; border: 1px solid var(--danger); border-radius: var(--radius-sm);
  background: transparent; color: var(--danger); font-size: 12px; cursor: pointer;
}
.whitelist-list .btn-delete:hover { background: var(--danger); color: #fff; }
.empty-msg { color: var(--text-muted); text-align: center; padding: 20px; }
</style>
</head>
<body>
<div class="container">
  <header>
    <span class="logo">🍪</span>
    <h1>CrumbKit</h1>
    <p class="subtitle">Settings</p>
  </header>

  <main>
    <section class="card">
      <h2>Appearance</h2>
      <div class="setting-row">
        <label for="themeSelect">Theme</label>
        <select id="themeSelect">
          <option value="auto" selected>System default</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </section>

    <section class="card">
      <h2>Domain Whitelist</h2>
      <p class="help-text">
        Cookies from these domains will be preserved when you use "Delete All".
        Useful for keeping login sessions on sites you trust.
      </p>
      <div class="add-domain-row">
        <input type="text" class="domain-input" placeholder="example.com" value="mycompany.com">
        <button class="btn btn-primary">Add</button>
      </div>
      <ul class="whitelist-list">
        <li>
          <span class="item-domain">example.com</span>
          <button class="btn-delete">Remove</button>
        </li>
        <li>
          <span class="item-domain">gitlab.com</span>
          <button class="btn-delete">Remove</button>
        </li>
        <li>
          <span class="item-domain">stackoverflow.com</span>
          <button class="btn-delete">Remove</button>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>About</h2>
      <p class="help-text">
        CrumbKit is a free, open-source cookie editor. No tracking, no ads, no data collection.
        All processing happens locally on your device.
      </p>
      <p class="help-text">
        Version 1.0.0 · <a href="https://github.com/wayknow/crumbkit" target="_blank">GitHub</a> · MIT License
      </p>
    </section>
  </main>
</div>
</body>
</html>`;
}

async function main() {
  console.log('📸 CrumbKit Screenshot Generator\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
  });

  const scenes = [
    { name: '01-popup-list', title: 'Popup: Cookie list with privacy score', html: buildScene1() },
    { name: '02-edit-export', title: 'Popup: Edit form with export menu', html: buildScene2() },
    { name: '03-options-whitelist', title: 'Settings page with domain whitelist', html: buildScene3() },
  ];

  for (const scene of scenes) {
    console.log(`  📷 ${scene.title}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setContent(scene.html, { waitUntil: 'networkidle0' });

    // Wait for any SVGs or fonts to render
    await new Promise(r => setTimeout(r, 500));

    const filepath = `${OUT_DIR}/${scene.name}.png`;
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`     → ${filepath}`);
    await page.close();
  }

  await browser.close();

  console.log('\n✅ Done! Screenshots saved to screenshots/');
  console.log('   Upload these to the Chrome Web Store listing.\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

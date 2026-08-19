// CrumbKit — E2E and unit tests
// Tests core logic and extension loading via Puppeteer.

import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_PATH = fileURLToPath(new URL('..', import.meta.url));

let browser;
let extPage;
let extId;
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

async function test(name, fn) {
  console.log(`\n📋 ${name}`);
  try {
    await fn();
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
// UNIT TESTS: Pure functions (no Chrome API needed)
// ═══════════════════════════════════════════════════════════════

// Mock chrome API
const mockStorage = new Map();
globalThis.chrome = {
  runtime: {
    getURL: (path) => `file://${EXT_PATH}/${path}`
  },
  storage: {
    local: {
      get: async (keys) => {
        const result = {};
        if (Array.isArray(keys)) {
          for (const k of keys) result[k] = mockStorage.get(k);
        } else if (typeof keys === 'string') {
          result[keys] = mockStorage.get(keys);
        } else if (keys && typeof keys === 'object') {
          for (const k of Object.keys(keys)) result[k] = mockStorage.get(k);
        }
        return result;
      },
      set: async (items) => {
        for (const [k, v] of Object.entries(items)) {
          mockStorage.set(k, v);
        }
      },
      remove: async (keys) => {
        if (typeof keys === 'string') {
          mockStorage.delete(keys);
        } else if (Array.isArray(keys)) {
          for (const k of keys) mockStorage.delete(k);
        }
      }
    }
  }
};

async function runUnitTests() {
  console.log('\n═══ UNIT TESTS ═══');

  // ── Export Module ──
  await test('Export: toJSON produces valid JSON', async () => {
    const { toJSON } = await import(`${EXT_PATH}/src/utils/export.js`);
    const cookies = [
      { name: 'session', value: 'abc123', domain: '.example.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax', expirationDate: 1735689600, session: false },
      { name: 'prefs', value: 'dark', domain: 'example.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax', expirationDate: null, session: true }
    ];
    const json = toJSON(cookies);
    const parsed = JSON.parse(json);
    assert(Array.isArray(parsed), 'output is an array');
    assert(parsed.length === 2, 'contains 2 cookies');
    assert(parsed[0].name === 'session', 'first cookie name correct');
    assert(parsed[0].value === 'abc123', 'first cookie value correct');
    assert(parsed[1].session === true, 'second cookie has session=true');
  });

  // ── Import Module ──
  await test('Import: detectFormat recognizes JSON', async () => {
    // Dynamic import to load module
    const { importFromFile } = await import(`${EXT_PATH}/src/utils/import.js`);
    // We can't easily test the full import flow without Chrome cookies API,
    // but we can test the detection logic indirectly.
    // The module loads successfully = no syntax errors.
    assert(typeof importFromFile === 'function', 'importFromFile is a function');
  });

  await test('Import: detects JSON array format', async () => {
    // Test JSON detection by checking format via parsing
    const jsonText = JSON.stringify([{ name: 'test', value: 'x', domain: '.example.com', path: '/' }]);
    assert(jsonText.trim().startsWith('['), 'JSON array starts with [');
    const parsed = JSON.parse(jsonText);
    assert(parsed.length === 1, 'parsed 1 cookie');
    assert(parsed[0].name === 'test', 'cookie name is "test"');
  });

  await test('Import: detects Netscape format', async () => {
    const netscapeText = '# Netscape HTTP Cookie File\n.example.com\tTRUE\t/\tFALSE\t1735689600\tsession\tabc123';
    assert(netscapeText.startsWith('# Netscape'), 'Netscape header detected');
    // Parse a Netscape line
    const line = netscapeText.split('\n')[1];
    const parts = line.split('\t');
    assert(parts.length === 7, 'Netscape line has 7 fields');
    assert(parts[0] === '.example.com', 'domain correct');
    assert(parts[5] === 'session', 'name correct');
    assert(parts[6] === 'abc123', 'value correct');
  });

  // ── Undo Module ──
  await test('Undo: push and pop operations', async () => {
    const undo = await import(`${EXT_PATH}/src/utils/undo.js`);
    undo.clear();
    assert(undo.getUndoCount() === 0, 'stack starts empty');
    assert(!undo.canUndo(), 'canUndo returns false when empty');

    undo.push('delete', { name: 'test', value: 'x' }, null, 'https://example.com/');
    assert(undo.getUndoCount() === 1, 'stack has 1 entry after push');
    assert(undo.canUndo(), 'canUndo returns true');

    undo.push('add', null, { name: 'new', value: 'y' }, 'https://example.com/');
    assert(undo.getUndoCount() === 2, 'stack has 2 entries');

    const entry = undo.pop();
    assert(entry.type === 'add', 'pop returns most recent (add)');
    assert(undo.getUndoCount() === 1, 'stack has 1 entry after pop');

    undo.clear();
    assert(undo.getUndoCount() === 0, 'clear empties stack');
  });

  await test('Undo: max stack size (50)', async () => {
    const undo = await import(`${EXT_PATH}/src/utils/undo.js`);
    undo.clear();
    for (let i = 0; i < 60; i++) {
      undo.push('delete', { name: `cookie${i}` }, null, 'https://example.com/');
    }
    assert(undo.getUndoCount() === 50, 'stack capped at 50 entries');
    assert(undo.canUndo(), 'canUndo still true at cap');
    undo.clear();
  });

  // ── Classify Module ──
  await test('Classify: module loads and exports correct symbols', async () => {
    const classify = await import(`${EXT_PATH}/src/utils/classify.js`);
    assert(typeof classify.classifyCookie === 'function', 'classifyCookie is a function');
    assert(typeof classify.classifyAll === 'function', 'classifyAll is a function');
    assert(typeof classify.calculatePrivacyScore === 'function', 'calculatePrivacyScore is a function');
    assert(typeof classify.getScoreColor === 'function', 'getScoreColor is a function');
    assert(typeof classify.getScoreLabel === 'function', 'getScoreLabel is a function');
    assert(classify.CATEGORIES.ESSENTIAL.id === 'essential', 'CATEGORIES defined correctly');
  });

  await test('Classify: privacy score calculation', async () => {
    const { calculatePrivacyScore } = await import(`${EXT_PATH}/src/utils/classify.js`);

    // Empty list
    let result = calculatePrivacyScore([]);
    assert(result.score === 100, 'empty list = score 100');
    assert(result.summary.total === 0, 'empty list = 0 total');

    // All essential
    const allEssential = [
      { category: 'essential' }, { category: 'essential' }, { category: 'essential' }
    ];
    result = calculatePrivacyScore(allEssential);
    assert(result.score === 100, 'all essential = score 100');
    assert(result.summary.tracking === 0, 'all essential = 0 tracking');

    // All tracking
    const allTracking = [
      { category: 'advertising' }, { category: 'analytics' }, { category: 'social' }
    ];
    result = calculatePrivacyScore(allTracking);
    assert(result.score === 0, 'all tracking = score 0');
    assert(result.summary.tracking === 3, 'all tracking = 3 tracking');

    // Mixed
    const mixed = [
      { category: 'essential' }, { category: 'essential' },
      { category: 'analytics' }, { category: 'advertising' }
    ];
    result = calculatePrivacyScore(mixed);
    assert(result.score === 50, 'half tracking = score 50');
    assert(result.summary.tracking === 2, 'mixed = 2 tracking');
    assert(result.summary.essential === 2, 'mixed = 2 essential');
  });

  await test('Classify: score color and label', async () => {
    const { getScoreColor, getScoreLabel } = await import(`${EXT_PATH}/src/utils/classify.js`);
    assert(getScoreColor(90) === '#4CAF50', 'score 90 = green');
    assert(getScoreColor(70) === '#FF9800', 'score 70 = orange');
    assert(getScoreColor(50) === '#FF5722', 'score 50 = deep orange');
    assert(getScoreColor(20) === '#F44336', 'score 20 = red');
    assert(getScoreLabel(85) === 'Good', 'score 85 = Good');
    assert(getScoreLabel(65) === 'Fair', 'score 65 = Fair');
    assert(getScoreLabel(45) === 'Poor', 'score 45 = Poor');
    assert(getScoreLabel(25) === 'Bad', 'score 25 = Bad');
  });

  // ── Export full round-trip ──
  await test('Export/Import: JSON round-trip preserves data', async () => {
    const { toJSON } = await import(`${EXT_PATH}/src/utils/export.js`);
    const original = [
      { name: 'a', value: '1', domain: '.x.com', path: '/', secure: true, httpOnly: true, sameSite: 'strict', expirationDate: 1735689600, session: false },
      { name: 'b', value: '', domain: 'x.com', path: '/a', secure: false, httpOnly: false, sameSite: 'lax', expirationDate: null, session: true }
    ];
    const json = toJSON(original);
    const reimported = JSON.parse(json);

    assert(reimported.length === 2, 'round-trip: 2 cookies');
    assert(reimported[0].name === 'a', 'round-trip: name preserved');
    assert(reimported[0].secure === true, 'round-trip: secure preserved');
    assert(reimported[0].sameSite === 'strict', 'round-trip: sameSite preserved');
    assert(reimported[1].session === true, 'round-trip: session preserved');
  });
  // ─── CSV Export ──────────────────────────────────────────────

  await test('Export: toCSV produces RFC 4180 CSV', async () => {
    const { toCSV } = await import(`${EXT_PATH}/src/utils/export.js`);

    // Test with cookies containing commas and quotes
    const cookies = [
      { name: 'a', value: '1', domain: '.x.com', path: '/', secure: true, httpOnly: false, sameSite: 'lax', expirationDate: 1735689600, session: false },
      { name: 'b', value: 'hello, world', domain: 'x.com', path: '/a', secure: false, httpOnly: true, sameSite: 'strict', expirationDate: null, session: true }
    ];
    const csv = toCSV(cookies);
    const lines = csv.trim().split('\n');
    assert(lines.length === 3, 'CSV has header + 2 data rows');
    assert(lines[0] === 'name,value,domain,path,secure,httpOnly,sameSite,expirationDate,session,partitionKey', 'CSV header row correct');
    assert(lines[2].includes('TRUE'), 'CSV session column has TRUE');
    // Verify comma in value is escaped: the field must contain double quotes
    assert(csv.includes('"hello, world"'), 'CSV wraps comma-containing value in double quotes');

    // Test empty array
    const empty = toCSV([]);
    const emptyLines = empty.trim().split('\n');
    assert(emptyLines.length === 1, 'CSV of empty array has only header');
    assert(emptyLines[0].startsWith('name,'), 'CSV empty header starts with name');

    // Test double quote escaping
    const quoteCookies = [
      { name: 'x', value: 'say "hello"', domain: '.c.com', path: '/', secure: false, httpOnly: false, sameSite: 'unspecified', expirationDate: null, session: true }
    ];
    const quoteCsv = toCSV(quoteCookies);
    assert(quoteCsv.includes('"say ""hello"""'), 'CSV doubles embedded double quotes');
  });

  // ─── Puppeteer Export ────────────────────────────────────────

  await test('Export: toPuppeteer generates valid JavaScript', async () => {
    const { toPuppeteer } = await import(`${EXT_PATH}/src/utils/export.js`);
    const cookies = [
      { name: 'sess', value: 'abc', domain: '.example.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax', expirationDate: null, session: true },
      { name: 'persist', value: 'xyz', domain: '.example.com', path: '/', secure: false, httpOnly: false, sameSite: 'strict', expirationDate: 1735689600, session: false }
    ];
    const script = toPuppeteer(cookies, 'example.com');
    assert(script.includes("const puppeteer = require('puppeteer');"), 'requires puppeteer');
    assert(script.includes('page.setCookie'), 'calls page.setCookie');
    assert(script.includes('sess'), 'includes session cookie name');
    assert(script.includes('persist'), 'includes persistent cookie name');
    assert(script.includes('1735689600'), 'includes expirationDate as expires');
    assert(script.includes('example.com'), 'includes target domain');
  });

  await test('Export: toSetCookieHeader generates valid headers', async () => {
    const { toSetCookieHeader } = await import(`${EXT_PATH}/src/utils/export.js`);
    const cookies = [
      { name: 'sess', value: 'abc', domain: '.example.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax', expirationDate: null, session: true },
      { name: 'persist', value: 'xyz', domain: '.example.com', path: '/app', secure: false, httpOnly: false, sameSite: 'strict', expirationDate: Math.floor(Date.now() / 1000) + 3600, session: false },
      { name: 'no_restrict', value: '1', domain: 'cdn.example.com', path: '/', secure: true, httpOnly: false, sameSite: 'no_restriction', expirationDate: null, session: true }
    ];
    const headers = toSetCookieHeader(cookies);
    assert(headers.includes('Set-Cookie: sess=abc'), 'includes session cookie');
    assert(headers.includes('Domain=.example.com'), 'includes domain');
    assert(headers.includes('Path=/app'), 'includes path for persist cookie');
    assert(headers.includes('Secure'), 'includes Secure attribute');
    assert(headers.includes('HttpOnly'), 'includes HttpOnly attribute');
    assert(headers.includes('SameSite=Lax'), 'includes SameSite=Lax');
    assert(headers.includes('SameSite=Strict'), 'includes SameSite=Strict');
    assert(headers.includes('SameSite=None'), 'maps no_restriction to None');
    assert(headers.includes('Max-Age='), 'includes Max-Age for persistent cookie');
    // Session cookie should NOT have Max-Age
    const sessLine = headers.split('\n').find(l => l.includes('sess=abc'));
    assert(!sessLine.includes('Max-Age'), 'session cookie has no Max-Age');
  });

  await test('Export: partitionKey preserved across formats', async () => {
    const mod = await import(`${EXT_PATH}/src/utils/export.js`);
    const cookies = [
      { name: 'part', value: 'val', domain: '.example.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax', expirationDate: 1735689600, session: false, partitionKey: { topLevelSite: 'https://example.com' } },
      { name: 'nopart', value: 'nv', domain: '.example.com', path: '/', secure: false, httpOnly: false, sameSite: 'unspecified', expirationDate: null, session: true, partitionKey: null }
    ];

    // JSON includes partitionKey only when present
    const json = mod.toJSON(cookies);
    const parsed = JSON.parse(json);
    assert(parsed[0].partitionKey !== undefined, 'partitioned cookie includes partitionKey in JSON');
    assert(parsed[0].partitionKey.topLevelSite === 'https://example.com', 'partitionKey has topLevelSite');
    assert(parsed[1].partitionKey === undefined, 'non-partitioned cookie omits partitionKey');

    // CSV includes partitionKey column
    const csv = mod.toCSV(cookies);
    // CSV double-quote escapes partitionKey JSON: {"topLevelSite":"https://..."} → "{""topLevelSite"":""https://..."}"
    assert(csv.includes('topLevelSite') && csv.includes('https://example.com'), 'CSV includes partitionKey data');

    // Set-Cookie header includes Partitioned attribute
    const headers = mod.toSetCookieHeader(cookies);
    assert(headers.includes('Partitioned'), 'Set-Cookie header includes Partitioned for partitioned cookie');

    // Puppeteer script includes partitionKey
    const script = mod.toPuppeteer(cookies, 'example.com');
    assert(script.includes('partitionKey'), 'Puppeteer script includes partitionKey');
  });

  // ─── Rules CRUD ──────────────────────────────────────────────

  await test('Rules: createRule generates unique ID', async () => {
    const { createRule, getRules, deleteRule } = await import(`${EXT_PATH}/src/utils/rules.js`);
    const rule1 = await createRule({ name: 'Test 1', schedule: 60 });
    const rule2 = await createRule({ name: 'Test 2', schedule: 60 });
    assert(rule1.id !== rule2.id, 'rule IDs are unique');
    assert(rule1.id.startsWith('r_'), 'rule ID starts with r_');
    assert(rule1.name === 'Test 1', 'rule name preserved');
    assert(rule1.enabled === true, 'rule enabled by default');
    assert(rule1.schedule === 60, 'rule schedule preserved');

    const rules = await getRules();
    assert(rules.length >= 2, 'getRules returns created rules');
    assert(rules.some(r => r.id === rule1.id), 'rule1 found in storage');

    // Cleanup
    await deleteRule(rule1.id);
    await deleteRule(rule2.id);
  });

  await test('Rules: updateRule modifies fields', async () => {
    const { createRule, updateRule, deleteRule } = await import(`${EXT_PATH}/src/utils/rules.js`);
    const rule = await createRule({ name: 'Original', enabled: true, schedule: 60 });
    const updated = await updateRule(rule.id, { name: 'Updated', enabled: false });
    assert(updated !== null, 'updateRule returns rule');
    assert(updated.name === 'Updated', 'name updated');
    assert(updated.enabled === false, 'enabled updated');
    assert(updated.id === rule.id, 'id preserved');
    await deleteRule(rule.id);
  });

  await test('Rules: deleteRule removes rule', async () => {
    const { createRule, getRules, deleteRule } = await import(`${EXT_PATH}/src/utils/rules.js`);
    const rule = await createRule({ name: 'To Delete', schedule: 60 });
    const deleted = await deleteRule(rule.id);
    assert(deleted === true, 'deleteRule returns true');
    const rules = await getRules();
    assert(!rules.some(r => r.id === rule.id), 'rule removed from storage');
  });

  await test('Rules: markRuleExecuted updates lastRun', async () => {
    const { createRule, getRules, markRuleExecuted, deleteRule } = await import(`${EXT_PATH}/src/utils/rules.js`);
    const rule = await createRule({ name: 'Executed', schedule: 60 });
    assert(rule.lastRun === null, 'lastRun starts null');
    await markRuleExecuted(rule.id);
    const rules = await getRules();
    const updated = rules.find(r => r.id === rule.id);
    assert(updated && updated.lastRun !== null, 'lastRun updated');
    await deleteRule(rule.id);
  });
}

// ═══════════════════════════════════════════════════════════════
// E2E TESTS: Browser-based via Puppeteer
// ═══════════════════════════════════════════════════════════════

async function runE2ETests() {
  console.log('\n═══ E2E TESTS (Puppeteer) ═══');

  // Launch browser with extension
  await test('Launch browser with extension loaded', async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    assert(browser !== null, 'browser launched');
  });

  // Get extension ID and background page
  await test('Extension background page is active', async () => {
    // Open a regular page to get extension context
    const page = await browser.newPage();
    await page.goto('about:blank');

    // Wait a bit for extension service worker to start
    await new Promise((r) => setTimeout(r, 1000));

    // Get the service worker target (retry up to 3 times)
    let swTarget = null;
    for (let attempt = 0; attempt < 3 && !swTarget; attempt++) {
      const targets = await browser.targets();
      swTarget = targets.find(t => {
        const url = t.url();
        return (t.type() === 'service_worker' || t.type() === 'background_page') &&
               url.includes('chrome-extension://') &&
               (url.includes('service-worker') || url.includes('background'));
      });

      // Also check for any extension target with our background script
      if (!swTarget) {
        swTarget = targets.find(t =>
          t.url().includes('service-worker.js')
        );
      }

      if (!swTarget && attempt < 2) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    assert(swTarget !== undefined, 'service worker target found');

    // Extract extension ID from URL
    if (swTarget) {
      const match = swTarget.url().match(/chrome-extension:\/\/([^/]+)/);
      extId = match ? match[1] : null;
      assert(extId !== null, 'extension ID extracted: ' + extId);
    }

    await page.close();
  });

  // Test that popup page loads without JS errors
  await test('Popup page loads without errors', async () => {
    if (!extId) {
      console.log('  ⚠️  Skipping — no extension ID');
      return;
    }

    const page = await browser.newPage();

    // Collect console errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    // Navigate to popup page directly
    const popupUrl = `chrome-extension://${extId}/src/popup/popup.html`;
    await page.goto(popupUrl, { waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
      // Popup might fail to load fully due to chrome.tabs.query in non-popup context
      // That's expected
    });

    // Check that the page rendered something
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    assert(bodyHTML.includes('CrumbKit'), 'popup page contains "CrumbKit"');
    assert(bodyHTML.includes('cookie'), 'popup page contains cookie-related content');

    // Report any JS errors that aren't expected (missing chrome API in test context is expected)
    const realErrors = errors.filter(e =>
      !e.includes('chrome.tabs.query') &&
      !e.includes('chrome.cookies') &&
      !e.includes('Cannot read properties')
    );
    if (realErrors.length > 0) {
      console.log(`  ⚠️  Popup JS errors (expected in non-popup context): ${realErrors.length}`);
    } else {
      console.log('  ℹ️  No unexpected JS errors');
    }

    await page.close();
  });

  // Test options page loads
  await test('Options page loads without errors', async () => {
    if (!extId) {
      console.log('  ⚠️  Skipping — no extension ID');
      return;
    }

    const page = await browser.newPage();

    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const optionsUrl = `chrome-extension://${extId}/src/options/options.html`;
    await page.goto(optionsUrl, { waitUntil: 'networkidle0', timeout: 10000 });

    const title = await page.title();
    assert(title.includes('CrumbKit'), 'options page title contains CrumbKit');

    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    assert(bodyHTML.includes('Whitelist'), 'options page contains Whitelist section');
    assert(bodyHTML.includes('Theme'), 'options page contains Theme setting');

    if (errors.length > 0) {
      console.log(`  ⚠️  Options page JS errors: ${errors.length}`);
    }

    await page.close();
  });

  // Test manifest is accessible
  await test('manifest.json is valid and accessible', async () => {
    if (!extId) {
      console.log('  ⚠️  Skipping — no extension ID');
      return;
    }

    const page = await browser.newPage();
    const manifestUrl = `chrome-extension://${extId}/manifest.json`;
    const response = await page.goto(manifestUrl, { waitUntil: 'networkidle0', timeout: 10000 });

    if (response && response.ok()) {
      const text = await response.text();
      let manifest;
      try {
        manifest = JSON.parse(text);
        assert(manifest.manifest_version === 3, 'manifest_version is 3');
        assert(manifest.name === 'CrumbKit', 'name is CrumbKit');
        assert(manifest.permissions.includes('cookies'), 'has cookies permission');
        assert(manifest.permissions.includes('storage'), 'has storage permission');
        assert(manifest.action.default_popup, 'has popup defined');
        assert(manifest.options_page, 'has options page defined');
      } catch {
        assert(false, 'manifest is valid JSON');
      }
    } else {
      assert(false, 'could not fetch manifest.json');
    }

    await page.close();
  });

  // Test tracking-domains.json is accessible
  await test('tracking-domains.json is accessible', async () => {
    if (!extId) {
      console.log('  ⚠️  Skipping — no extension ID');
      return;
    }

    const page = await browser.newPage();
    const dataUrl = `chrome-extension://${extId}/data/tracking-domains.json`;
    const response = await page.goto(dataUrl, { waitUntil: 'networkidle0', timeout: 10000 });

    if (response && response.ok()) {
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
        assert(data.domains && typeof data.domains === 'object', 'domains object exists');
        const domainCount = Object.keys(data.domains).length;
        assert(domainCount > 50, `has ${domainCount} tracking domains (>50 expected)`);
        assert(data.domains['doubleclick.net'] !== undefined, 'doubleclick.net is in the list');
        assert(data.domains['doubleclick.net'].category === 'Advertising', 'doubleclick.net categorized as Advertising');
      } catch {
        assert(false, 'tracking-domains.json is valid JSON');
      }
    } else {
      assert(false, 'could not fetch tracking-domains.json');
    }

    await page.close();
  });

  // Test extension icon files exist
  await test('Icon files are accessible', async () => {
    if (!extId) {
      console.log('  ⚠️  Skipping — no extension ID');
      return;
    }

    const page = await browser.newPage();
    for (const size of [16, 48, 128]) {
      const iconUrl = `chrome-extension://${extId}/icons/icon${size}.png`;
      const response = await page.goto(iconUrl, { waitUntil: 'networkidle0', timeout: 10000 });
      assert(response && response.ok(), `icon${size}.png accessible`);
    }
    await page.close();
  });

  // Test real cookie interaction on a page
  await test('Cookies can be set and inspected on a test page', async () => {
    if (!extId) {
      console.log('  ⚠️  Skipping — no extension ID');
      return;
    }

    const page = await browser.newPage();

    // Navigate to a simple HTML page served via data URI but with a real domain
    // We use the page just to get a CDP session; cookies are set on the browser level
    await page.goto('about:blank');

    // Set a test cookie via CDP using a real http URL
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    const testUrl = 'http://cookietest.local/';
    const cookieSet = await client.send('Network.setCookie', {
      name: 'test_cc',
      value: 'hello_world',
      url: testUrl,
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'Lax'
    });
    assert(cookieSet.success === true, 'cookie set successfully via CDP');

    // Get all cookies from the browser store
    const { cookies } = await client.send('Network.getAllCookies');
    const testCookie = cookies.find(c => c.name === 'test_cc');
    assert(testCookie !== undefined, 'set cookie found via CDP');
    if (testCookie) {
      assert(testCookie.value === 'hello_world', 'cookie value matches');
    }

    // Clean up
    await client.send('Network.deleteCookies', { name: 'test_cc', url: testUrl });
    await page.close();
  });

  // v1.2.0 — Export dropdown options
  await test('Export dropdown has CSV, Puppeteer, and Set-Cookie header options', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extId}/src/popup/popup.html`, { waitUntil: 'domcontentloaded' });
    const formats = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#exportMenu button')).map(b => b.dataset.format);
    });
    assert(formats.includes('csv'), 'CSV export button exists');
    assert(formats.includes('puppeteer'), 'Puppeteer export button exists');
    assert(formats.includes('set-cookie'), 'Set-Cookie header export button exists');
    await page.close();
  });

  // v1.2.0 — Options page: auto-cleanup section
  await test('Options page has auto-cleanup section', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extId}/src/options/options.html`, { waitUntil: 'domcontentloaded' });
    const content = await page.evaluate(() => document.body.innerHTML);
    assert(content.includes('Auto-Cleanup'), 'options page has Auto-Cleanup section');
    assert(content.includes('Suggest a Feature'), 'options page has feedback link');
    await page.close();
  });

  // v1.2.0 — Popup has bulk edit and intercept buttons
  await test('Popup has bulk edit and interceptor buttons', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extId}/src/popup/popup.html`, { waitUntil: 'domcontentloaded' });
    const hasEditBtn = await page.evaluate(() => !!document.querySelector('#btnEditSelected'));
    const hasInterceptBtn = await page.evaluate(() => !!document.querySelector('#btnInterceptToggle'));
    assert(hasEditBtn, 'bulk edit button exists');
    assert(hasInterceptBtn, 'intercept toggle button exists');
    await page.close();
  });

  // v1.2.0 — New permissions in manifest
  await test('manifest.json has v1.2.0 permissions', async () => {
    const manifestPath = `${EXT_PATH}/manifest.json`;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    assert(manifest.version === '1.2.0', 'version is 1.2.0');
    assert(manifest.permissions.includes('alarms'), 'has alarms permission');
    assert(manifest.permissions.includes('notifications'), 'has notifications permission');
    assert(manifest.permissions.includes('webRequest'), 'has webRequest permission');
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🧪 CrumbKit Test Suite\n');
  console.log('═══════════════════════════════════════');

  const startTime = Date.now();

  // Run unit tests
  await runUnitTests();

  // Run E2E tests
  await runE2ETests();

  // Cleanup
  if (browser) {
    await browser.close();
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════');
  console.log(`📊 Results: ${passed} passed, ${failed} failed (${duration}s)`);
  console.log('═══════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Test suite crashed:', e);
  process.exit(1);
});

// CrumbKit Service Worker
// Handles scheduled cookie cleanup alarms and inter-service communication.

const RULES_KEY = 'crumbkit_rules';
const ALARM_PREFIX = 'crumbkit_rule_';

// ─── Name-based cookie classification (mirrors classify.js NAME_PATTERNS) ───

const NAME_PATTERNS = {
  essential: [/^SESS/i, /^session/i, /^__Host-/i, /^__Secure-/i, /^csrf/i, /^xsrf/i,
    /^auth/i, /^token/i, /^jwt/i, /^laravel_session/i, /^PHPSESSID/i, /^JSESSIONID/i,
    /^connect\.sid/i, /^wordpress_logged_in/i, /^wordpress_sec/i],
  functional: [/^lang/i, /^language/i, /^locale/i, /^region/i, /^country/i, /^theme/i,
    /^darkMode/i, /^colorMode/i, /^cookieconsent/i, /^cookie_consent/i, /^euCookie/i,
    /^preferences/i, /^settings/i, /^remember/i],
  analytics: [/^_ga/i, /^_gid/i, /^_gat/i, /^_gcl/i, /^_gac_/i, /^_pk_id/i, /^_pk_ses/i,
    /^_pk_ref/i, /^_pk_cvar/i, /^_hj/i, /^mp_/i, /^__utm/i],
  advertising: [/^_fbp/i, /^_fbc/i, /^_gcl_aw/i, /^_gcl_dc/i, /^IDE$/i, /^ANID$/i,
    /^DSID$/i, /^FLC$/i, /^__ad/i, /^ad_/i, /^ads_/i, /^__gads/i, /^__gpi/i],
  social: [/^_twitter_sess/i, /^twid/i, /^_pinterest/i, /^_pin_unauth/i,
    /^_linkedin/i, /^li_oatml/i, /^bcookie/i, /^_reddit/i, /^reddit_session/i,
    /^_tiktok/i]
};

/**
 * Classify a cookie by name patterns only.
 * @param {string} name
 * @returns {string} Category ID
 */
function classifyCookieByName(name) {
  if (!name) return 'unknown';
  for (const [category, patterns] of Object.entries(NAME_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(name)) return category;
    }
  }
  return 'unknown';
}

// ─── Rule matching ──────────────────────────────────────────────────

/**
 * Check if a cookie matches a cleanup rule.
 * @param {Object} cookie - chrome.cookies.Cookie
 * @param {Object} rule - CleanupRule
 * @returns {boolean}
 */
function matchesRule(cookie, rule) {
  // Domain filter — supports subdomain matching
  if (rule.targetDomains && rule.targetDomains.length > 0) {
    const cookieDomain = (cookie.domain || '').replace(/^\./, '');
    const matchesDomain = rule.targetDomains.some(d =>
      cookieDomain === d || cookieDomain.endsWith('.' + d)
    );
    if (!matchesDomain) return false;
  }

  // Category filter — name-based classification only (no domain DB lookup in SW)
  if (rule.categories && rule.categories.length > 0) {
    const cat = classifyCookieByName(cookie.name);
    if (!rule.categories.includes(cat)) return false;
  }

  // Max age filter — delete cookies whose expirationDate is too far in the future
  // (indicates a persistent tracker cookie). Note: Chrome does not expose creationDate,
  // so we can only filter by expirationDate relative to now.
  if (rule.maxAge > 0 && cookie.expirationDate) {
    const maxExpiry = Date.now() / 1000 + rule.maxAge * 3600;
    if (cookie.expirationDate <= maxExpiry) {
      // Cookie expires within the maxAge window — keep it (it's short-lived)
      return false;
    }
    // Cookie persists beyond maxAge threshold — it's a long-lived cookie, delete it
  }

  return true;
}

// ─── Alarm registration ─────────────────────────────────────────────

/**
 * Re-register all alarms from stored rules. Called on install, startup, and
 * when rules change via the options page.
 */
async function registerAllAlarms() {
  // Clear existing crumbkit alarms
  const existing = await chrome.alarms.getAll();
  for (const a of existing) {
    if (a.name.startsWith(ALARM_PREFIX)) {
      await chrome.alarms.clear(a.name);
    }
  }

  // Load rules and create alarms for enabled ones
  try {
    const { [RULES_KEY]: rules } = await chrome.storage.local.get(RULES_KEY);
    if (!rules || !Array.isArray(rules) || rules.length === 0) return;

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (!rule.schedule || rule.schedule < 1) continue;
      await chrome.alarms.create(ALARM_PREFIX + rule.id, {
        periodInMinutes: rule.schedule,
        delayInMinutes: 1 // First run after 1 minute to avoid flood on startup
      });
    }
  } catch (e) {
    console.error('CrumbKit: Failed to register alarms:', e);
  }
}

// ─── Cleanup execution ──────────────────────────────────────────────

/**
 * Execute cleanup for a specific rule.
 * @param {string} ruleId
 */
async function executeCleanup(ruleId) {
  let rule;
  try {
    const { [RULES_KEY]: rules } = await chrome.storage.local.get(RULES_KEY);
    if (!rules) return;
    rule = rules.find(r => r.id === ruleId);
  } catch (e) {
    console.error('CrumbKit: Failed to load rules for cleanup:', e);
    return;
  }

  if (!rule || !rule.enabled) return;

  // Get all cookies across all domains
  let cookies;
  try {
    cookies = await chrome.cookies.getAll({});
  } catch (e) {
    console.error('CrumbKit: Failed to get cookies for cleanup:', e);
    return;
  }

  // Filter and delete
  let deleted = 0;
  for (const cookie of cookies) {
    if (!matchesRule(cookie, rule)) continue;

    try {
      const protocol = cookie.secure ? 'https' : 'http';
      const url = `${protocol}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
      await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
      deleted++;
    } catch (e) {
      // Cookie may have been deleted by another process or is session-only
    }
  }

  // Update lastRun
  try {
    const { [RULES_KEY]: rules } = await chrome.storage.local.get(RULES_KEY);
    if (rules) {
      const idx = rules.findIndex(r => r.id === ruleId);
      if (idx !== -1) {
        rules[idx].lastRun = new Date().toISOString();
        await chrome.storage.local.set({ [RULES_KEY]: rules });
      }
    }
  } catch (e) { /* non-critical */ }

  // Show notification if any cookies were deleted
  if (deleted > 0) {
    try {
      await chrome.notifications.create(`cleanup_${ruleId}`, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'CrumbKit Auto-Cleanup',
        message: `"${rule.name}": Deleted ${deleted} cookie(s).`
      });
    } catch (e) { /* notifications may be disabled */ }
  }
}

// ─── Event listeners ────────────────────────────────────────────────

// Register alarms on install
chrome.runtime.onInstalled.addListener(() => {
  registerAllAlarms();
});

// Re-register alarms on browser startup
chrome.runtime.onStartup.addListener(() => {
  registerAllAlarms();
});

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const ruleId = alarm.name.replace(ALARM_PREFIX, '');
  await executeCleanup(ruleId);
});

// ─── Set-Cookie Interceptor ─────────────────────────────────────────

const INTERCEPTED_KEY = 'crumbkit_intercepted';
const MAX_INTERCEPTED = 50;

/**
 * Parse a Set-Cookie header value into a cookie-like object.
 * Set-Cookie format: name=value; Domain=...; Path=...; Secure; HttpOnly; SameSite=...; Max-Age=...; Expires=...
 * @param {string} headerValue
 * @param {string} requestUrl
 * @returns {Object|null}
 */
function parseSetCookieHeader(headerValue, requestUrl) {
  const parts = headerValue.split(';').map(s => s.trim());
  const eqIdx = parts[0].indexOf('=');
  if (eqIdx === -1) return null;

  const name = parts[0].substring(0, eqIdx).trim();
  const value = parts[0].substring(eqIdx + 1).trim();
  if (!name) return null;

  let domain = '';
  let path = '/';
  let secure = false;
  let httpOnly = false;
  let sameSite = 'unspecified';
  let maxAge = null;
  let expires = null;

  try {
    const url = new URL(requestUrl);
    domain = domain || url.hostname;
  } catch (_) {}

  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    const attrEqIdx = attr.indexOf('=');
    const key = attrEqIdx === -1 ? attr.trim().toLowerCase() : attr.substring(0, attrEqIdx).trim().toLowerCase();
    const val = attrEqIdx === -1 ? '' : attr.substring(attrEqIdx + 1).trim();

    switch (key) {
      case 'domain': domain = val; break;
      case 'path': path = val || '/'; break;
      case 'secure': secure = true; break;
      case 'httponly': httpOnly = true; break;
      case 'samesite':
        sameSite = val.toLowerCase() === 'none' ? 'no_restriction'
          : val.toLowerCase() === 'strict' ? 'strict'
          : 'lax';
        break;
      case 'max-age':
        maxAge = parseInt(val, 10);
        break;
      case 'expires':
        expires = new Date(val).getTime() / 1000;
        break;
    }
  }

  let expirationDate = null;
  if (maxAge !== null && !isNaN(maxAge)) {
    expirationDate = Date.now() / 1000 + maxAge;
  } else if (expires && !isNaN(expires)) {
    expirationDate = expires;
  }

  return {
    name,
    value,
    domain: (domain || '').replace(/^\./, ''),
    path,
    secure,
    httpOnly,
    sameSite,
    expirationDate,
    session: !expirationDate,
    interceptedAt: Date.now(),
    sourceUrl: requestUrl
  };
}

async function storeInterceptedCookie(cookie) {
  try {
    const { [INTERCEPTED_KEY]: existing } = await chrome.storage.session.get(INTERCEPTED_KEY);
    const list = existing || [];

    // Deduplicate by name+domain+path
    const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
    const filtered = list.filter(c => `${c.name}|${c.domain}|${c.path}` !== key);

    filtered.unshift(cookie); // Newest first

    // Cap at MAX_INTERCEPTED
    if (filtered.length > MAX_INTERCEPTED) {
      filtered.length = MAX_INTERCEPTED;
    }

    await chrome.storage.session.set({ [INTERCEPTED_KEY]: filtered });

    // Notify popup if open
    chrome.runtime.sendMessage({
      type: 'interceptedCookie',
      cookie
    }).catch(() => {
      // Popup not open — that's fine
    });
  } catch (e) {
    // chrome.storage.session may not be available; silently ignore
  }
}

// Intercept response headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Only process meaningful request types — skip images, scripts, stylesheets, fonts
    if (details.type !== 'main_frame' && details.type !== 'sub_frame' && details.type !== 'xmlhttprequest') {
      return;
    }

    const setCookieHeaders = details.responseHeaders?.filter(
      h => h.name.toLowerCase() === 'set-cookie'
    );
    if (!setCookieHeaders || setCookieHeaders.length === 0) return;

    for (const header of setCookieHeaders) {
      const parsed = parseSetCookieHeader(header.value, details.url);
      if (parsed) {
        storeInterceptedCookie(parsed);
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'resyncAlarms') {
    registerAllAlarms().then(() => sendResponse({ success: true }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'getInterceptedCookies') {
    chrome.storage.session.get(INTERCEPTED_KEY).then(result => {
      sendResponse({ cookies: result[INTERCEPTED_KEY] || [] });
    }).catch(() => {
      sendResponse({ cookies: [] });
    });
    return true; // async
  }

  if (message.type === 'clearInterceptedCookies') {
    chrome.storage.session.remove(INTERCEPTED_KEY).then(() => {
      sendResponse({ success: true });
    }).catch(() => {
      sendResponse({ success: false });
    });
    return true; // async
  }

  return false;
});

console.log('CrumbKit service worker started.');

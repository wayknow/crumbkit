// CrumbKit — Cookie classification & privacy scoring engine

// Tracker classification data is loaded from tracking-domains.json
let trackerData = null;

/**
 * Categories used for cookie classification.
 */
export const CATEGORIES = {
  ESSENTIAL: { id: 'essential', label: 'Essential', icon: '🔑', color: '#4CAF50' },
  FUNCTIONAL: { id: 'functional', label: 'Functional', icon: '⚙️', color: '#2196F3' },
  ANALYTICS: { id: 'analytics', label: 'Analytics', icon: '📊', color: '#FF9800' },
  ADVERTISING: { id: 'advertising', label: 'Advertising', icon: '🎯', color: '#F44336' },
  SOCIAL: { id: 'social', label: 'Social', icon: '👥', color: '#E91E63' },
  UNKNOWN: { id: 'unknown', label: 'Unknown', icon: '❓', color: '#9E9E9E' }
};

// Common cookie name patterns for classification
// These patterns match cookie NAMES (not domains)
const NAME_PATTERNS = {
  essential: [
    /^SESS/, /^session/, /^__Host-/, /^__Secure-/,
    /^csrf/, /^xsrf/, /^auth/, /^token/, /^jwt/,
    /^laravel_session/, /^PHPSESSID/, /^JSESSIONID/,
    /^connect\.sid/, /^wordpress_logged_in/, /^wordpress_sec/
  ],
  functional: [
    /^lang/, /^language/, /^locale/, /^region/, /^country/,
    /^theme/, /^darkMode/, /^colorMode/,
    /^cookieconsent/, /^cookie_consent/, /^euCookie/,
    /^preferences/, /^settings/, /^remember/
  ],
  analytics: [
    /^_ga/, /^_gid/, /^_gat/, /^_gcl/, /^_gac_/,
    /^_pk_id/, /^_pk_ses/, /^_pk_ref/, /^_pk_cvar/,   // Matomo
    /^_hj/, /^mp_/,                                    // Hotjar, Mixpanel
    /^__utma/, /^__utmb/, /^__utmc/, /^__utmt/, /^__utmz/ // Old Google Analytics
  ],
  advertising: [
    /^_fbp/, /^_fbc/,                      // Facebook Pixel
    /^_gcl_aw/, /^_gcl_dc/,                // Google Ads
    /^IDE/, /^ANID/, /^DSID/, /^FLC/,      // Google DoubleClick
    /^__ad/, /^ad_/, /^ads_/,
    /^__gads/, /^__gpi/                     // Google AdSense
  ],
  social: [
    /^_twitter_sess/, /^twid/,
    /^_pinterest/, /^_pin_unauth/,
    /^_linkedin/, /^li_oatml/, /^bcookie/,
    /^_reddit/, /^reddit_session/,
    /^_tiktok/
  ]
};

/**
 * Load the tracker domain database.
 */
async function loadTrackerData() {
  if (trackerData) return trackerData;
  const url = chrome.runtime.getURL('data/tracking-domains.json');
  const response = await fetch(url);
  trackerData = await response.json();
  return trackerData;
}

/**
 * Classify a single cookie based on its name and domain.
 * @param {Object} cookie - Normalized cookie object.
 * @returns {Promise<{ category: Object, matchedBy: string }>}
 */
export async function classifyCookie(cookie) {
  // 1. Check cookie name patterns first
  const name = cookie.name || '';

  for (const cat of ['essential', 'functional', 'analytics', 'advertising', 'social']) {
    const patterns = NAME_PATTERNS[cat];
    for (const pattern of patterns) {
      if (pattern.test(name)) {
        return { category: CATEGORIES[cat.toUpperCase()], matchedBy: `name:${cat}` };
      }
    }
  }

  // 2. Check domain against tracker database
  const data = await loadTrackerData();
  const domain = cookie.domain.replace(/^\./, ''); // Strip leading dot

  // Walk up the domain hierarchy (e.g. ads.example.com → example.com)
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const checkDomain = parts.slice(i).join('.');
    const entry = data.domains[checkDomain];
    if (entry) {
      // Map Disconnect.me category to our categories
      const catMap = {
        'Advertising': 'ADVERTISING',
        'Analytics': 'ANALYTICS',
        'Social': 'SOCIAL',
        'Disconnect': 'ESSENTIAL',
        'Content': 'FUNCTIONAL'
      };
      const cat = catMap[entry.category] || 'UNKNOWN';
      return { category: CATEGORIES[cat], matchedBy: `domain:${checkDomain}` };
    }
  }

  return { category: CATEGORIES.UNKNOWN, matchedBy: 'none' };
}

/**
 * Classify all cookies and return with categories.
 * @param {Object[]} cookies
 * @returns {Promise<Object[]>} Cookies with `category` and `matchedBy` fields added.
 */
export async function classifyAll(cookies) {
  const results = await Promise.all(
    cookies.map(async (cookie) => {
      const { category, matchedBy } = await classifyCookie(cookie);
      return { ...cookie, category: category.id, categoryLabel: category.label, matchedBy };
    })
  );
  return results;
}

/**
 * Calculate privacy score for a site based on classified cookies.
 * Score is 0–100, where 100 = best (no trackers).
 * @param {Object[]} classifiedCookies - Cookies with category field.
 * @returns {{ score: number, summary: Object }}
 */
export function calculatePrivacyScore(classifiedCookies) {
  if (classifiedCookies.length === 0) {
    return { score: 100, summary: { total: 0, tracking: 0, essential: 0, functional: 0, analytics: 0, advertising: 0, social: 0, unknown: 0 } };
  }

  const summary = {
    total: classifiedCookies.length,
    essential: 0,
    functional: 0,
    analytics: 0,
    advertising: 0,
    social: 0,
    unknown: 0
  };

  for (const cookie of classifiedCookies) {
    const cat = cookie.category;
    if (summary.hasOwnProperty(cat)) {
      summary[cat]++;
    } else {
      summary.unknown++;
    }
  }

  // Tracking cookies = analytics + advertising + social
  const tracking = summary.analytics + summary.advertising + summary.social;
  summary.tracking = tracking;

  // Score: higher = better. Non-tracking / total * 100
  const nonTracking = summary.essential + summary.functional + summary.unknown;
  const score = Math.round((nonTracking / classifiedCookies.length) * 100);

  return { score, summary };
}

/**
 * Get the score color based on the 0-100 score.
 * @param {number} score
 * @returns {string} CSS color
 */
export function getScoreColor(score) {
  if (score >= 80) return '#4CAF50'; // Green — Good
  if (score >= 60) return '#FF9800'; // Orange — Fair
  if (score >= 40) return '#FF5722'; // Deep Orange — Poor
  return '#F44336';                  // Red — Bad
}

/**
 * Get a human-readable score label.
 * @param {number} score
 * @returns {string}
 */
export function getScoreLabel(score) {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Bad';
}

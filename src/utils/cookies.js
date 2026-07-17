// CrumbKit — chrome.cookies API wrapper
// Provides a clean interface for cookie CRUD operations.

/**
 * Extract the effective domain and URL from a tab URL.
 * @param {string} tabUrl - The full URL of the current tab.
 * @returns {{ url: string, domain: string }}
 */
function parseTabUrl(tabUrl) {
  try {
    const parsed = new URL(tabUrl);
    return {
      url: tabUrl,
      domain: parsed.hostname
    };
  } catch {
    return { url: tabUrl, domain: '' };
  }
}

/**
 * Normalize a cookie object to a consistent format.
 * @param {chrome.cookies.Cookie} cookie
 * @returns {Object}
 */
function normalizeCookie(cookie) {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite || 'unspecified',
    expirationDate: cookie.expirationDate || null,  // null = session cookie
    hostOnly: cookie.hostOnly,
    session: cookie.session || !cookie.expirationDate,
    storeId: cookie.storeId
  };
}

/**
 * Get all cookies for the current tab.
 * @param {string} tabUrl - The full URL of the current tab.
 * @returns {Promise<Object[]>} Normalized cookie objects.
 */
export async function getCookiesForTab(tabUrl) {
  const { url, domain } = parseTabUrl(tabUrl);

  // Get cookies that match the tab's URL
  // chrome.cookies.getAll({url}) returns cookies whose domain matches the URL
  const cookies = await chrome.cookies.getAll({ url });

  // Also get domain-scoped cookies for subdomains
  const domainCookies = await chrome.cookies.getAll({ domain });

  // Merge and deduplicate by name + domain + path
  const seen = new Set();
  const all = [];

  for (const c of [...cookies, ...domainCookies]) {
    const key = `${c.name}|${c.domain}|${c.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      all.push(normalizeCookie(c));
    }
  }

  return all;
}

/**
 * Get all cookies across all domains.
 * Used for global operations.
 * @returns {Promise<Object[]>}
 */
export async function getAllCookies() {
  const cookies = await chrome.cookies.getAll({});
  return cookies.map(normalizeCookie);
}

/**
 * Set a cookie (create or update).
 * @param {Object} details
 * @param {string} details.url - The URL to associate the cookie with.
 * @param {string} details.name - Cookie name.
 * @param {string} details.value - Cookie value.
 * @param {string} [details.domain] - Cookie domain.
 * @param {string} [details.path='/'] - Cookie path.
 * @param {boolean} [details.secure=false] - Secure flag.
 * @param {boolean} [details.httpOnly=false] - HttpOnly flag.
 * @param {'unspecified'|'no_restriction'|'lax'|'strict'} [details.sameSite='unspecified']
 * @param {number} [details.expirationDate] - Expiry timestamp (seconds since epoch). Omit for session cookie.
 * @returns {Promise<Object>} The normalized cookie that was set.
 */
export async function setCookie(details) {
  const cookieDetails = {
    url: details.url,
    name: details.name,
    value: details.value,
    domain: details.domain || undefined,
    path: details.path || '/',
    secure: details.secure || false,
    httpOnly: details.httpOnly || false,
    sameSite: details.sameSite || 'unspecified'
  };

  if (details.expirationDate) {
    cookieDetails.expirationDate = details.expirationDate;
  }

  const cookie = await chrome.cookies.set(cookieDetails);
  return normalizeCookie(cookie);
}

/**
 * Remove a cookie.
 * @param {Object} details
 * @param {string} details.url - The URL the cookie is associated with.
 * @param {string} details.name - Cookie name.
 * @param {string} [details.storeId] - Cookie store ID.
 * @returns {Promise<Object>} Details of the removed cookie.
 */
export async function removeCookie(details) {
  const removeDetails = {
    url: details.url,
    name: details.name
  };
  if (details.storeId) {
    removeDetails.storeId = details.storeId;
  }
  return await chrome.cookies.remove(removeDetails);
}

/**
 * Get the current active tab.
 * @returns {Promise<chrome.tabs.Tab>}
 */
export async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

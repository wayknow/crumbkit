// CrumbKit — chrome.storage.local wrapper
// Stores settings (theme, whitelist domains) and undo history.

const STORAGE_KEYS = {
  SETTINGS: 'crumbkit_settings',
  UNDO: 'crumbkit_undo'
};

const DEFAULT_SETTINGS = {
  theme: 'auto',           // 'light' | 'dark' | 'auto'
  whitelist: []            // array of domain strings
};

/**
 * Load settings from chrome.storage.local.
 * @returns {Promise<{ theme: string, whitelist: string[] }>}
 */
export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const stored = result[STORAGE_KEYS.SETTINGS];
  if (stored) {
    // Merge with defaults in case new settings are added in future versions
    return { ...DEFAULT_SETTINGS, ...stored };
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to chrome.storage.local.
 * @param {Object} settings
 */
export async function saveSettings(settings) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

/**
 * Get the current theme preference.
 * 'auto' resolves to system preference.
 * @returns {Promise<'light'|'dark'>}
 */
export async function getTheme() {
  const settings = await getSettings();
  if (settings.theme === 'light' || settings.theme === 'dark') {
    return settings.theme;
  }
  // 'auto' — check system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Set theme preference.
 * @param {'light'|'dark'|'auto'} theme
 */
export async function setTheme(theme) {
  const settings = await getSettings();
  settings.theme = theme;
  await saveSettings(settings);
}

/**
 * Get the domain whitelist.
 * @returns {Promise<string[]>}
 */
export async function getWhitelist() {
  const settings = await getSettings();
  return settings.whitelist || [];
}

/**
 * Add a domain to the whitelist.
 * @param {string} domain
 */
export async function addToWhitelist(domain) {
  const settings = await getSettings();
  if (!settings.whitelist.includes(domain)) {
    settings.whitelist.push(domain);
    await saveSettings(settings);
  }
}

/**
 * Remove a domain from the whitelist.
 * @param {string} domain
 */
export async function removeFromWhitelist(domain) {
  const settings = await getSettings();
  settings.whitelist = settings.whitelist.filter((d) => d !== domain);
  await saveSettings(settings);
}

/**
 * Check if a domain is whitelisted.
 * Also matches subdomains (e.g. login.example.com matches example.com).
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
export async function isWhitelisted(domain) {
  const whitelist = await getWhitelist();
  return whitelist.some((w) => domain === w || domain.endsWith('.' + w));
}

/**
 * Save undo stack.
 * @param {Array} stack
 */
export async function saveUndoStack(stack) {
  await chrome.storage.local.set({ [STORAGE_KEYS.UNDO]: stack });
}

/**
 * Load undo stack.
 * @returns {Promise<Array>}
 */
export async function loadUndoStack() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.UNDO);
  return result[STORAGE_KEYS.UNDO] || [];
}

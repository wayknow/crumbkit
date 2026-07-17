// CrumbKit — Cookie import module
// Parses JSON and Netscape format cookie files and imports them.

import { setCookie } from './cookies.js';

/**
 * Parse a JSON cookie file.
 * Expected format: Array of objects with at least { name, value, domain }.
 * @param {string} text - File content.
 * @returns {Object[]} Parsed cookie objects.
 * @throws {Error} If the format is invalid.
 */
function parseJSON(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON format: could not parse the file.');
  }

  // Handle single object vs array
  if (!Array.isArray(data)) {
    if (typeof data === 'object' && data !== null) {
      data = [data];
    } else {
      throw new Error('Invalid JSON format: expected an array of cookies or a single cookie object.');
    }
  }

  // Validate each entry has at minimum a name
  const cookies = [];
  for (const item of data) {
    if (!item.name) {
      console.warn('Skipping cookie entry without a name:', item);
      continue;
    }
    cookies.push({
      name: String(item.name),
      value: String(item.value || ''),
      domain: item.domain || undefined,
      path: item.path || '/',
      secure: item.secure || false,
      httpOnly: item.httpOnly || false,
      sameSite: item.sameSite || 'unspecified',
      expirationDate: item.expirationDate || undefined
    });
  }

  return cookies;
}

/**
 * Parse a Netscape HTTP Cookie file.
 *
 * Format (tab-separated):
 *   domain  flag  path  secure  expiration  name  value
 *
 * Lines starting with # are comments. Empty lines are ignored.
 *
 * @param {string} text - File content.
 * @returns {Object[]} Parsed cookie objects.
 * @throws {Error} If the format is invalid.
 */
function parseNetscape(text) {
  const lines = text.split(/\r?\n/);
  const cookies = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const parts = trimmed.split('\t');
    if (parts.length < 7) {
      console.warn('Skipping malformed Netscape line:', trimmed);
      continue;
    }

    const [domain, flag, path, secure, expiration, name, value] = parts;

    // Parse expiration: 0 or empty = session cookie
    const expNum = parseInt(expiration, 10);
    const isSession = expNum === 0 || isNaN(expNum);
    const expirationDate = isSession ? undefined : expNum;

    cookies.push({
      name: String(name || '').trim(),
      value: String(value || '').trim(),
      domain: String(domain || '').trim().replace(/^\./, ''),
      path: String(path || '/').trim(),
      secure: String(secure || '').toUpperCase() === 'TRUE',
      httpOnly: false, // Not captured in Netscape format
      sameSite: 'unspecified', // Not captured in Netscape format
      expirationDate
    });
  }

  return cookies;
}

/**
 * Detect the format of a cookie file from its content.
 * @param {string} text - File content.
 * @returns {'json'|'netscape'}
 */
function detectFormat(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  if (trimmed.startsWith('# Netscape HTTP Cookie File') || trimmed.includes('\t')) {
    return 'netscape';
  }
  // Default to JSON if it starts like one, otherwise Netscape
  if (trimmed.startsWith('#')) {
    return 'netscape';
  }
  return 'json';
}

/**
 * Import cookies from a file.
 *
 * @param {File} file - The file selected by the user.
 * @param {string} [targetUrl] - Optional URL to set cookies for (required by chrome.cookies.set).
 *   If not provided, we construct it from the cookie's domain.
 * @returns {Promise<{ success: number, failed: number, skipped: number, errors: string[] }>}
 */
export async function importFromFile(file, targetUrl) {
  const text = await file.text();
  const format = detectFormat(text);

  let cookies;
  try {
    if (format === 'json') {
      cookies = parseJSON(text);
    } else {
      cookies = parseNetscape(text);
    }
  } catch (e) {
    throw new Error(`Failed to parse ${format.toUpperCase()} file: ${e.message}`);
  }

  if (cookies.length === 0) {
    throw new Error('No valid cookies found in the file.');
  }

  const result = { success: 0, failed: 0, skipped: 0, errors: [] };

  for (const cookie of cookies) {
    try {
      // Build URL from cookie domain + path
      const protocol = cookie.secure ? 'https' : 'http';
      const domain = cookie.domain || (targetUrl ? new URL(targetUrl).hostname : '');
      if (!domain) {
        result.skipped++;
        result.errors.push(`Skipped "${cookie.name}": no domain specified.`);
        continue;
      }

      const url = `${protocol}://${domain}${cookie.path || '/'}`;

      await setCookie({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite || 'unspecified',
        expirationDate: cookie.expirationDate
      });

      result.success++;
    } catch (e) {
      result.failed++;
      result.errors.push(`Failed to set "${cookie.name}": ${e.message}`);
    }
  }

  return result;
}

/**
 * Import cookies from a JSON string (for clipboard paste).
 * @param {string} jsonText
 * @param {string} [targetUrl]
 * @returns {Promise<{ success: number, failed: number, skipped: number, errors: string[] }>}
 */
export async function importFromJSON(jsonText, targetUrl) {
  return await importFromFile(new File([jsonText], 'cookies.json', { type: 'application/json' }), targetUrl);
}

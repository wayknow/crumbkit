// CrumbKit — Popup main script
// Orchestrates cookie listing, editing, import/export, and all interactions.

import { getCookiesForTab, getCurrentTab, setCookie, removeCookie } from '../utils/cookies.js';
import { classifyAll, calculatePrivacyScore, getScoreColor, getScoreLabel } from '../utils/classify.js';
import { exportCookies } from '../utils/export.js';
import { importFromFile } from '../utils/import.js';
import { getTheme, setTheme, getWhitelist, isWhitelisted } from '../utils/storage.js';
import { push as undoPush, pop as undoPop, canUndo, getUndoCount, clear as undoClear } from '../utils/undo.js';

// ─── State ───────────────────────────────────────────────────────

let currentTab = null;
let currentDomain = '';
let allCookies = [];          // All cookies for current tab (with classification)
let filteredCookies = [];     // After search filter
let editingCookieKey = null;  // 'name|domain|path' of the cookie being edited
let searchQuery = '';

// ─── DOM Elements ─────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  themeToggle: $('#themeToggle'),
  themeIcon: $('#themeIcon'),
  scoreText: $('#scoreText'),
  scoreFill: $('#scoreFill'),
  domainLabel: $('#domainLabel'),
  privacyLabel: $('#privacyLabel'),
  searchInput: $('#searchInput'),
  clearSearch: $('#clearSearch'),
  btnAdd: $('#btnAdd'),
  btnExport: $('#btnExport'),
  exportMenu: $('#exportMenu'),
  btnImport: $('#btnImport'),
  btnDeleteAll: $('#btnDeleteAll'),
  btnUndo: $('#btnUndo'),
  cookieList: $('#cookieList'),
  emptyState: $('#emptyState'),
  cookieCount: $('#cookieCount'),
  trackerCount: $('#trackerCount'),
  importFileInput: $('#importFileInput')
};

// ─── Initialization ──────────────────────────────────────────────

async function init() {
  await applyTheme();
  currentTab = await getCurrentTab();
  if (!currentTab) {
    showError('Could not get current tab.');
    return;
  }
  currentDomain = new URL(currentTab.url).hostname;
  dom.domainLabel.textContent = currentDomain;
  dom.domainLabel.title = currentDomain;

  await refreshCookieList();
  setupEventListeners();
}

// ─── Theme ────────────────────────────────────────────────────────

async function applyTheme() {
  const theme = await getTheme();
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

async function toggleTheme() {
  const current = await getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  await setTheme(next);
  await applyTheme();
}

// ─── Cookie List ──────────────────────────────────────────────────

async function refreshCookieList() {
  try {
    allCookies = await getCookiesForTab(currentTab.url);
  } catch (e) {
    console.error('Failed to get cookies:', e);
    allCookies = [];
  }

  try {
    allCookies = await classifyAll(allCookies);
  } catch (e) {
    console.error('Failed to classify cookies:', e);
  }

  applySearchFilter();
  updatePrivacyScore();
  renderCookieList();
  updateFooter();
}

function applySearchFilter() {
  if (!searchQuery) {
    filteredCookies = [...allCookies];
  } else {
    const q = searchQuery.toLowerCase();
    filteredCookies = allCookies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        (c.categoryLabel && c.categoryLabel.toLowerCase().includes(q))
    );
  }
}

function updatePrivacyScore() {
  const { score, summary } = calculatePrivacyScore(allCookies);

  dom.scoreText.textContent = allCookies.length > 0 ? score : '--';
  dom.scoreFill.setAttribute('stroke-dasharray', `${score}, 100`);
  dom.scoreFill.setAttribute('stroke', getScoreColor(score));
  dom.privacyLabel.textContent = allCookies.length > 0
    ? `${getScoreLabel(score)} · ${summary.tracking} tracker${summary.tracking !== 1 ? 's' : ''}`
    : 'No cookies';
}

function updateFooter() {
  const total = allCookies.length;
  dom.cookieCount.textContent = `${total} cookie${total !== 1 ? 's' : ''}`;

  // Build tracker breakdown dots
  if (total === 0) {
    dom.trackerCount.innerHTML = '';
    return;
  }

  const { summary } = calculatePrivacyScore(allCookies);
  const parts = [];
  if (summary.advertising > 0) {
    parts.push(`<span class="cat-dot" style="background:#F44336" title="Advertising"></span> ${summary.advertising} ads`);
  }
  if (summary.analytics > 0) {
    parts.push(`<span class="cat-dot" style="background:#FF9800" title="Analytics"></span> ${summary.analytics} analytics`);
  }
  if (summary.social > 0) {
    parts.push(`<span class="cat-dot" style="background:#E91E63" title="Social"></span> ${summary.social} social`);
  }
  dom.trackerCount.innerHTML = parts.join(' ');
}

// ─── Rendering ────────────────────────────────────────────────────

function renderCookieList() {
  dom.cookieList.innerHTML = '';
  dom.emptyState.style.display = filteredCookies.length === 0 ? 'flex' : 'none';

  for (const cookie of filteredCookies) {
    const key = cookieKey(cookie);
    const isExpanded = key === editingCookieKey;

    // Row
    const row = document.createElement('div');
    row.className = 'cookie-row' + (isExpanded ? ' expanded' : '');
    row.dataset.key = key;
    row.innerHTML = renderCookieRow(cookie);
    row.addEventListener('click', (e) => {
      // Don't toggle if clicking action buttons
      if (e.target.closest('.cookie-actions')) return;
      toggleEdit(cookie);
    });
    dom.cookieList.appendChild(row);

    // Edit form (if expanded)
    if (isExpanded) {
      const form = document.createElement('div');
      form.className = 'cookie-edit-form';
      form.innerHTML = renderEditForm(cookie);
      form.addEventListener('click', (e) => e.stopPropagation());
      dom.cookieList.appendChild(form);

      // Bind form actions
      form.querySelector('.form-save').addEventListener('click', () => handleSaveEdit(cookie));
      form.querySelector('.form-cancel').addEventListener('click', cancelEdit);
      form.querySelector('.form-delete').addEventListener('click', () => handleDeleteOne(cookie));
    }
  }
}

function renderCookieRow(cookie) {
  const catIcon = getCategoryIcon(cookie.category);
  const valuePreview = cookie.value
    ? (cookie.value.length > 30 ? cookie.value.substring(0, 30) + '...' : cookie.value)
    : '(empty)';
  const badges = [];
  if (cookie.secure) badges.push('<span class="badge badge-secure">S</span>');
  if (cookie.httpOnly) badges.push('<span class="badge badge-httponly">H</span>');

  return `
    <span class="cookie-category-icon">${catIcon}</span>
    <div class="cookie-info">
      <div class="cookie-name">${escapeHtml(cookie.name)}</div>
      <div class="cookie-meta">
        <span class="cookie-value-preview">${escapeHtml(valuePreview)}</span>
        <span class="cookie-domain-preview">${escapeHtml(cookie.domain)}</span>
        ${badges.join(' ')}
      </div>
    </div>
    <div class="cookie-actions">
      <button class="icon-btn btn-delete" title="Delete cookie" data-action="delete">✕</button>
    </div>
  `;
}

function renderEditForm(cookie) {
  return `
    <div class="form-row">
      <label>Name</label>
      <input type="text" id="editName" value="${escapeAttr(cookie.name)}" placeholder="Cookie name">
    </div>
    <div class="form-row">
      <label>Value</label>
      <input type="text" id="editValue" value="${escapeAttr(cookie.value)}" placeholder="Cookie value">
    </div>
    <div class="form-row">
      <label>Domain</label>
      <input type="text" id="editDomain" value="${escapeAttr(cookie.domain)}" placeholder=".example.com">
    </div>
    <div class="form-row">
      <label>Path</label>
      <input type="text" id="editPath" value="${escapeAttr(cookie.path || '/')}" placeholder="/">
    </div>
    <div class="form-row">
      <label>Expiry</label>
      <input type="text" id="editExpiry" value="${cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toISOString().slice(0, 16) : ''}" placeholder="YYYY-MM-DDTHH:MM (empty for session)">
    </div>
    <div class="form-row">
      <label></label>
      <div style="display:flex;gap:12px;align-items:center">
        <span class="form-check">
          <input type="checkbox" id="editSecure" ${cookie.secure ? 'checked' : ''}>
          <label>Secure</label>
        </span>
        <span class="form-check">
          <input type="checkbox" id="editHttpOnly" ${cookie.httpOnly ? 'checked' : ''}>
          <label>HttpOnly</label>
        </span>
      </div>
    </div>
    <div class="form-row">
      <label>SameSite</label>
      <select id="editSameSite" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:12px;font-family:inherit">
        <option value="unspecified" ${cookie.sameSite === 'unspecified' ? 'selected' : ''}>Unspecified</option>
        <option value="no_restriction" ${cookie.sameSite === 'no_restriction' ? 'selected' : ''}>None</option>
        <option value="lax" ${cookie.sameSite === 'lax' ? 'selected' : ''}>Lax</option>
        <option value="strict" ${cookie.sameSite === 'strict' ? 'selected' : ''}>Strict</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-danger form-delete">Delete</button>
      <button class="btn form-cancel">Cancel</button>
      <button class="btn btn-primary form-save">Save</button>
    </div>
  `;
}

// ─── Cookie Operations ───────────────────────────────────────────

async function handleAddNew() {
  editingCookieKey = null;

  // Create a blank template cookie
  const template = {
    name: '',
    value: '',
    domain: currentDomain,
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'lax',
    expirationDate: null,
    session: true,
    category: 'unknown',
    categoryLabel: 'Unknown'
  };

  const key = '__new__';
  editingCookieKey = key;

  // Render blank form at top of list
  const form = document.createElement('div');
  form.className = 'cookie-edit-form';
  form.style.cssText = 'border-top: 2px solid var(--primary);';
  form.innerHTML = renderEditForm(template);
  form.addEventListener('click', (e) => e.stopPropagation());

  // Insert at top
  if (dom.cookieList.firstChild) {
    dom.cookieList.insertBefore(form, dom.cookieList.firstChild);
  } else {
    dom.cookieList.appendChild(form);
  }

  dom.emptyState.style.display = 'none';

  // Bind actions
  form.querySelector('.form-save').addEventListener('click', () => handleSaveNew());
  form.querySelector('.form-cancel').addEventListener('click', cancelEdit);
  form.querySelector('.form-delete').style.display = 'none';
}

async function handleSaveNew() {
  const data = readEditForm();
  if (!data.name) {
    alert('Cookie name is required.');
    return;
  }

  try {
    const protocol = data.secure ? 'https' : 'http';
    const url = `${protocol}://${data.domain || currentDomain}${data.path || '/'}`;

    // Save old state for undo
    undoPush('add', null, data, url);

    await setCookie({
      url,
      name: data.name,
      value: data.value,
      domain: data.domain,
      path: data.path,
      secure: data.secure,
      httpOnly: data.httpOnly,
      sameSite: data.sameSite,
      expirationDate: data.expirationDate || undefined
    });

    editingCookieKey = null;
    await refreshCookieList();
    updateUndoButton();
  } catch (e) {
    alert(`Failed to create cookie: ${e.message}`);
  }
}

async function handleSaveEdit(originalCookie) {
  const data = readEditForm();
  if (!data.name) {
    alert('Cookie name is required.');
    return;
  }

  try {
    const protocol = data.secure ? 'https' : 'http';
    const url = `${protocol}://${data.domain || currentDomain}${data.path || '/'}`;

    // Save old state for undo
    undoPush('edit', originalCookie, data, url);

    // Remove the old cookie first
    await removeCookie({
      url: `${originalCookie.secure ? 'https' : 'http'}://${originalCookie.domain}${originalCookie.path}`,
      name: originalCookie.name,
      storeId: originalCookie.storeId
    });

    // Set the new cookie
    await setCookie({
      url,
      name: data.name,
      value: data.value,
      domain: data.domain,
      path: data.path,
      secure: data.secure,
      httpOnly: data.httpOnly,
      sameSite: data.sameSite,
      expirationDate: data.expirationDate || undefined
    });

    editingCookieKey = null;
    await refreshCookieList();
    updateUndoButton();
  } catch (e) {
    alert(`Failed to save cookie: ${e.message}`);
  }
}

async function handleDeleteOne(cookie) {
  if (!confirm(`Delete cookie "${cookie.name}"?`)) return;

  const protocol = cookie.secure ? 'https' : 'http';
  const url = `${protocol}://${cookie.domain}${cookie.path}`;

  // Save for undo
  undoPush('delete', cookie, null, url);

  try {
    await removeCookie({ url, name: cookie.name, storeId: cookie.storeId });
  } catch (e) {
    console.error(`Failed to delete ${cookie.name}:`, e);
  }

  editingCookieKey = null;
  await refreshCookieList();
  updateUndoButton();
}

async function handleDeleteAll() {
  const whitelist = await getWhitelist();
  const toDelete = [];
  const toKeep = [];

  for (const cookie of allCookies) {
    const domain = cookie.domain.replace(/^\./, '');
    const protected_ = whitelist.some((w) => domain === w || domain.endsWith('.' + w));
    if (protected_) {
      toKeep.push(cookie);
    } else {
      toDelete.push(cookie);
    }
  }

  const keepMsg = toKeep.length > 0 ? `\n\n${toKeep.length} cookie(s) from whitelisted domains will be kept.` : '';
  if (!confirm(`Delete ${toDelete.length} cookie(s) from this site?${keepMsg}`)) return;

  // Push to undo — save all deleted cookies
  for (const cookie of toDelete) {
    const protocol = cookie.secure ? 'https' : 'http';
    const url = `${protocol}://${cookie.domain}${cookie.path}`;
    undoPush('delete', cookie, null, url);
  }

  for (const cookie of toDelete) {
    try {
      const protocol = cookie.secure ? 'https' : 'http';
      const url = `${protocol}://${cookie.domain}${cookie.path}`;
      await removeCookie({ url, name: cookie.name, storeId: cookie.storeId });
    } catch (e) {
      console.error(`Failed to delete ${cookie.name}:`, e);
    }
  }

  editingCookieKey = null;
  await refreshCookieList();
  updateUndoButton();
}

async function handleUndo() {
  if (!canUndo()) return;

  const entry = undoPop();
  updateUndoButton();

  try {
    switch (entry.type) {
      case 'delete': {
        // Restore deleted cookie
        const c = entry.oldData;
        await setCookie({
          url: entry.url,
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite || 'unspecified',
          expirationDate: c.expirationDate || undefined
        });
        break;
      }
      case 'add': {
        // Remove the added cookie
        const c = entry.newData;
        await removeCookie({
          url: entry.url,
          name: c.name,
          storeId: c.storeId
        });
        break;
      }
      case 'edit': {
        // Restore old value
        const old = entry.oldData;
        // Remove current value
        const newCookie = entry.newData;
        const newProtocol = newCookie.secure ? 'https' : 'http';
        const newUrl = `${newProtocol}://${newCookie.domain || currentDomain}${newCookie.path || '/'}`;
        try {
          await removeCookie({ url: newUrl, name: newCookie.name });
        } catch (_) { /* cookie might already be gone */ }

        // Set old value
        await setCookie({
          url: entry.url,
          name: old.name,
          value: old.value,
          domain: old.domain,
          path: old.path,
          secure: old.secure,
          httpOnly: old.httpOnly,
          sameSite: old.sameSite || 'unspecified',
          expirationDate: old.expirationDate || undefined
        });
        break;
      }
    }
  } catch (e) {
    console.error('Undo failed:', e);
  }

  await refreshCookieList();
}

function updateUndoButton() {
  dom.btnUndo.disabled = !canUndo();
  const count = getUndoCount();
  dom.btnUndo.title = count > 0 ? `Undo (${count} action${count > 1 ? 's' : ''})` : 'Nothing to undo';
}

// ─── Edit Form Helpers ───────────────────────────────────────────

function readEditForm() {
  const expiryStr = $('#editExpiry')?.value?.trim() || '';
  let expirationDate = null;
  if (expiryStr) {
    const ts = new Date(expiryStr).getTime() / 1000;
    if (!isNaN(ts) && ts > 0) {
      expirationDate = ts;
    }
  }

  return {
    name: $('#editName')?.value?.trim() || '',
    value: $('#editValue')?.value || '',
    domain: $('#editDomain')?.value?.trim() || currentDomain,
    path: $('#editPath')?.value?.trim() || '/',
    secure: $('#editSecure')?.checked || false,
    httpOnly: $('#editHttpOnly')?.checked || false,
    sameSite: $('#editSameSite')?.value || 'unspecified',
    expirationDate
  };
}

function toggleEdit(cookie) {
  const key = cookieKey(cookie);
  if (editingCookieKey === key) {
    editingCookieKey = null;
  } else {
    editingCookieKey = key;
  }
  renderCookieList();
}

function cancelEdit() {
  editingCookieKey = null;
  renderCookieList();
}

// ─── Export / Import ──────────────────────────────────────────────

function handleExport(format) {
  exportCookies(format, allCookies, currentDomain, currentTab.url);
  dom.exportMenu.classList.remove('open');
}

async function handleImport() {
  dom.importFileInput.click();
}

async function handleImportFile(file) {
  try {
    const result = await importFromFile(file, currentTab.url);
    const msg = [
      `Import complete:`,
      `${result.success} cookie(s) imported successfully.`,
      result.failed > 0 ? `${result.failed} failed.` : '',
      result.skipped > 0 ? `${result.skipped} skipped.` : ''
    ].filter(Boolean).join('\n');

    if (result.errors.length > 0) {
      const errorDetails = result.errors.slice(0, 5).join('\n');
      const more = result.errors.length > 5 ? `\n...and ${result.errors.length - 5} more errors.` : '';
      alert(`${msg}\n\nErrors:\n${errorDetails}${more}`);
    } else {
      alert(msg);
    }

    await refreshCookieList();
  } catch (e) {
    alert(`Import failed: ${e.message}`);
  }
  // Reset file input so the same file can be re-imported
  dom.importFileInput.value = '';
}

// ─── Event Listeners ─────────────────────────────────────────────

function setupEventListeners() {
  // Theme toggle
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Search
  dom.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    dom.clearSearch.style.display = searchQuery ? 'flex' : 'none';
    applySearchFilter();
    renderCookieList();
  });
  dom.clearSearch.addEventListener('click', () => {
    searchQuery = '';
    dom.searchInput.value = '';
    dom.clearSearch.style.display = 'none';
    applySearchFilter();
    renderCookieList();
  });

  // Add cookie
  dom.btnAdd.addEventListener('click', handleAddNew);

  // Export dropdown
  dom.btnExport.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.exportMenu.classList.toggle('open');
  });
  dom.exportMenu.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleExport(btn.dataset.format);
    });
  });
  // Close dropdown on outside click
  document.addEventListener('click', () => {
    dom.exportMenu.classList.remove('open');
  });

  // Import
  dom.btnImport.addEventListener('click', handleImport);
  dom.importFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImportFile(e.target.files[0]);
    }
  });

  // Delete all
  dom.btnDeleteAll.addEventListener('click', handleDeleteAll);

  // Undo
  dom.btnUndo.addEventListener('click', handleUndo);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
    // Escape to cancel edit
    if (e.key === 'Escape' && editingCookieKey) {
      cancelEdit();
    }
  });
}

// ─── Utilities ────────────────────────────────────────────────────

function cookieKey(cookie) {
  return `${cookie.name}|${cookie.domain}|${cookie.path}`;
}

function getCategoryIcon(categoryId) {
  const icons = {
    essential: '🔑',
    functional: '⚙️',
    analytics: '📊',
    advertising: '🎯',
    social: '👥',
    unknown: '❓'
  };
  return icons[categoryId] || '🍪';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showError(msg) {
  dom.cookieList.innerHTML = `<div class="empty-state"><p>${escapeHtml(msg)}</p></div>`;
  dom.emptyState.style.display = 'none';
}

// ─── Start ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

// CrumbKit — Popup main script
// Orchestrates cookie listing, editing, import/export, and all interactions.

import { getCookiesForTab, getCurrentTab, setCookie, removeCookie } from '../utils/cookies.js';
import { classifyAll, calculatePrivacyScore, getScoreColor, getScoreLabel } from '../utils/classify.js';
import { exportCookies } from '../utils/export.js';
import { importFromFile } from '../utils/import.js';
import { getTheme, setTheme, getWhitelist, isWhitelisted } from '../utils/storage.js';
import { push as undoPush, pop as undoPop, canUndo, getUndoCount, clear as undoClear } from '../utils/undo.js';
import { getProfiles, saveProfile, deleteProfile } from '../utils/profiles.js';

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
  btnDeleteSelected: $('#btnDeleteSelected'),
  btnUndo: $('#btnUndo'),
  cookieList: $('#cookieList'),
  emptyState: $('#emptyState'),
  cookieCount: $('#cookieCount'),
  trackerCount: $('#trackerCount'),
  importFileInput: $('#importFileInput'),
  selectAll: $('#selectAll'),
  btnProfiles: $('#btnProfiles'),
  profilesPanel: $('#profilesPanel'),
  profilesList: $('#profilesList'),
  btnSaveProfile: $('#btnSaveProfile')
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
  // Preserve list header, remove everything else
  const header = dom.cookieList.querySelector('.list-header');
  dom.cookieList.innerHTML = '';
  if (header) dom.cookieList.appendChild(header);
  dom.emptyState.style.display = filteredCookies.length === 0 ? 'flex' : 'none';

  // Show/hide header
  if (header) header.style.display = filteredCookies.length === 0 ? 'none' : 'flex';

  for (const cookie of filteredCookies) {
    const key = cookieKey(cookie);
    const isExpanded = key === editingCookieKey;

    // Row
    const row = document.createElement('div');
    row.className = 'cookie-row' + (isExpanded ? ' expanded' : '');
    row.dataset.key = key;
    row.innerHTML = renderCookieRow(cookie);
    row.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn') || e.target.closest('.col-check')) return;
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

  // Bind row action buttons
  dom.cookieList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.closest('.cookie-row').dataset.key;
      const cookie = findCookieByKey(key);
      if (cookie) handleDeleteOne(cookie);
    });
  });

  dom.cookieList.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.closest('.cookie-row').dataset.key;
      const cookie = findCookieByKey(key);
      if (cookie) copyCookieValue(cookie, btn);
    });
  });

  // Bind checkboxes
  dom.cookieList.querySelectorAll('.cookie-checkbox').forEach(cb => {
    cb.addEventListener('click', (e) => e.stopPropagation());
    cb.addEventListener('change', updateBatchDeleteButton);
  });

  updateBatchDeleteButton();
}

function findCookieByKey(key) {
  return filteredCookies.find(c => cookieKey(c) === key);
}

// ─── Copy ────────────────────────────────────────────────────────

async function copyCookieValue(cookie, btn) {
  try {
    await navigator.clipboard.writeText(cookie.value);
    btn.textContent = '✓';
    btn.style.color = 'var(--success)';
    setTimeout(() => {
      btn.textContent = '📋';
      btn.style.color = '';
    }, 1000);
  } catch (_) {
    // Fallback for older browsers / non-HTTPS
    const ta = document.createElement('textarea');
    ta.value = cookie.value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✓';
    btn.style.color = 'var(--success)';
    setTimeout(() => {
      btn.textContent = '📋';
      btn.style.color = '';
    }, 1000);
  }
}

// ─── Batch Delete ─────────────────────────────────────────────────

function getSelectedKeys() {
  const cbs = dom.cookieList.querySelectorAll('.cookie-checkbox:checked');
  return Array.from(cbs).map(cb => cb.dataset.key);
}

function updateBatchDeleteButton() {
  if (!dom.btnDeleteSelected) return;
  const count = getSelectedKeys().length;
  dom.btnDeleteSelected.hidden = count === 0;
  dom.btnDeleteSelected.textContent = `✕ ${count}`;
  // Update select-all state
  if (dom.selectAll) {
    const total = dom.cookieList.querySelectorAll('.cookie-checkbox').length;
    dom.selectAll.checked = count > 0 && count === total;
    dom.selectAll.indeterminate = count > 0 && count < total;
  }
}

async function handleDeleteSelected() {
  const keys = getSelectedKeys();
  if (keys.length === 0) return;
  if (!confirm(`Delete ${keys.length} selected cookie(s)?`)) return;

  for (const key of keys) {
    const cookie = findCookieByKey(key);
    if (!cookie) continue;
    const protocol = cookie.secure ? 'https' : 'http';
    const url = `${protocol}://${cookie.domain}${cookie.path}`;
    undoPush('delete', cookie, null, url);
    try {
      await removeCookie({ url, name: cookie.name, storeId: cookie.storeId });
    } catch (e) {
      console.error(`Failed to delete ${cookie.name}:`, e);
    }
  }

  editingCookieKey = null;
  await refreshCookieList();
  updateUndoButton();
}

function renderCookieRow(cookie) {
  const catIcon = getCategoryIcon(cookie.category);
  const valuePreview = cookie.value
    ? (cookie.value.length > 40 ? cookie.value.substring(0, 40) + '…' : cookie.value)
    : '(empty)';
  const badges = [];
  if (cookie.secure) badges.push('<span class="badge badge-secure">S</span>');
  if (cookie.httpOnly) badges.push('<span class="badge badge-httponly">H</span>');

  return `
    <span class="col-check"><input type="checkbox" class="cookie-checkbox" data-key="${cookieKey(cookie)}" title="Select cookie"></span>
    <span class="col-icon">${catIcon}</span>
    <span class="col-name" title="${escapeAttr(cookie.name)}">${escapeHtml(cookie.name)}</span>
    <span class="col-value" title="${escapeAttr(cookie.value)}">${escapeHtml(valuePreview)}</span>
    <span class="col-domain" title="${escapeAttr(cookie.domain)}">${escapeHtml(cookie.domain)}</span>
    <span class="col-tags">${badges.join(' ')}<span class="tag-category cat-${cookie.category}">${cookie.categoryLabel || '?'}</span></span>
    <button class="icon-btn btn-copy" title="Copy value" data-action="copy">📋</button>
    <button class="icon-btn btn-delete" title="Delete cookie" data-action="delete">✕</button>
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

// ─── Profiles ───────────────────────────────────────────────────

function toggleProfilesPanel() {
  const show = dom.profilesPanel.hidden;
  dom.profilesPanel.hidden = !show;
  if (show) renderProfileList();
}

async function renderProfileList() {
  const profiles = await getProfiles();
  dom.profilesList.innerHTML = '';

  if (profiles.length === 0) {
    dom.profilesList.innerHTML = '<div class="profiles-empty">No saved profiles yet. Save your current cookies as a profile to quickly switch between test environments.</div>';
    return;
  }

  for (const p of profiles) {
    const item = document.createElement('div');
    item.className = 'profile-item';
    const date = new Date(p.createdAt).toLocaleDateString();
    item.innerHTML = `
      <div class="profile-info">
        <div class="profile-name">${escapeHtml(p.name)}</div>
        <div class="profile-meta">
          <span>${escapeHtml(p.domain)}</span>
          <span>${p.cookies.length} cookie${p.cookies.length !== 1 ? 's' : ''}</span>
          <span>${date}</span>
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn btn-primary btn-sm btn-load-profile" data-id="${p.id}">Load</button>
        <button class="btn btn-danger btn-sm btn-del-profile" data-id="${p.id}">Del</button>
      </div>
    `;
    dom.profilesList.appendChild(item);
  }

  // Bind load buttons
  dom.profilesList.querySelectorAll('.btn-load-profile').forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleLoadProfile(btn.dataset.id);
    });
  });

  // Bind delete buttons
  dom.profilesList.querySelectorAll('.btn-del-profile').forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleDeleteProfile(btn.dataset.id);
    });
  });
}

async function handleSaveProfile() {
  if (allCookies.length === 0) {
    alert('No cookies to save.');
    return;
  }
  const name = prompt('Profile name:', `${currentDomain} (${allCookies.length} cookies)`);
  if (!name || !name.trim()) return;

  await saveProfile(name.trim(), currentDomain, allCookies);
  renderProfileList();
}

async function handleLoadProfile(id) {
  const { getProfileById } = await import('../utils/profiles.js');
  const profile = await getProfileById(id);
  if (!profile) return;

  if (!confirm(`Load profile "${profile.name}"? This will set ${profile.cookies.length} cookie(s) for ${profile.domain}.`)) return;

  let success = 0;
  let failed = 0;
  const protocol = 'https';
  const baseUrl = `${protocol}://${profile.domain}/`;

  for (const c of profile.cookies) {
    try {
      const url = `${protocol}://${c.domain}${c.path || '/'}`;
      await setCookie({
        url,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite || 'unspecified',
        expirationDate: c.expirationDate || undefined
      });
      success++;
    } catch (e) {
      failed++;
    }
  }

  alert(`Profile loaded: ${success} cookie(s) set${failed > 0 ? `, ${failed} failed` : ''}.`);
  await refreshCookieList();
}

async function handleDeleteProfile(id) {
  if (!confirm('Delete this profile?')) return;
  await deleteProfile(id);
  renderProfileList();
}

// ─── Event Listeners ─────────────────────────────────────────────

function setupEventListeners() {
  // Theme toggle
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Search
  dom.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    dom.clearSearch.hidden = !searchQuery;
    applySearchFilter();
    renderCookieList();
  });
  dom.clearSearch.addEventListener('click', () => {
    searchQuery = '';
    dom.searchInput.value = '';
    dom.clearSearch.hidden = true;
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

  // Profiles
  dom.btnProfiles.addEventListener('click', toggleProfilesPanel);
  dom.btnSaveProfile.addEventListener('click', handleSaveProfile);

  // Import
  dom.btnImport.addEventListener('click', handleImport);
  dom.importFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImportFile(e.target.files[0]);
    }
  });

  // Delete all
  dom.btnDeleteAll.addEventListener('click', handleDeleteAll);

  // Delete selected
  dom.btnDeleteSelected.addEventListener('click', handleDeleteSelected);

  // Select all
  dom.selectAll.addEventListener('change', () => {
    const checked = dom.selectAll.checked;
    dom.cookieList.querySelectorAll('.cookie-checkbox').forEach(cb => { cb.checked = checked; });
    updateBatchDeleteButton();
  });

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

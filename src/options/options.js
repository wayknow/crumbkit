// CrumbKit — Options page script
// Manages theme preference and domain whitelist.

import { getSettings, saveSettings, getWhitelist, addToWhitelist, removeFromWhitelist } from '../utils/storage.js';

// ─── DOM Elements ─────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

const dom = {
  themeSelect: $('#themeSelect'),
  newDomain: $('#newDomain'),
  btnAddDomain: $('#btnAddDomain'),
  whitelistItems: $('#whitelistItems'),
  emptyWhitelist: $('#emptyWhitelist')
};

// ─── Init ─────────────────────────────────────────────────────────

async function init() {
  await loadSettings();
  await renderWhitelist();
  setupListeners();
  applyTheme();
}

async function loadSettings() {
  const settings = await getSettings();
  dom.themeSelect.value = settings.theme || 'auto';
}

async function applyTheme() {
  const settings = await getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'auto');
}

// ─── Theme ────────────────────────────────────────────────────────

async function handleThemeChange() {
  const settings = await getSettings();
  settings.theme = dom.themeSelect.value;
  await saveSettings(settings);
  applyTheme();
}

// ─── Whitelist ────────────────────────────────────────────────────

async function renderWhitelist() {
  const whitelist = await getWhitelist();
  dom.whitelistItems.innerHTML = '';

  if (whitelist.length === 0) {
    dom.whitelistItems.innerHTML = '<li class="empty-msg" id="emptyWhitelist">No domains added yet.</li>';
    return;
  }

  for (const domain of whitelist) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="domain-text">${escapeHtml(domain)}</span>
      <button class="btn-remove" data-domain="${escapeAttr(domain)}">Remove</button>
    `;
    li.querySelector('.btn-remove').addEventListener('click', async () => {
      await removeFromWhitelist(domain);
      await renderWhitelist();
    });
    dom.whitelistItems.appendChild(li);
  }
}

async function handleAddDomain() {
  const domain = dom.newDomain.value.trim().toLowerCase();
  if (!domain) return;

  // Basic validation
  if (!domain.includes('.')) {
    alert('Please enter a valid domain (e.g. example.com).');
    return;
  }

  // Strip protocol and path
  let cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

  await addToWhitelist(cleanDomain);
  dom.newDomain.value = '';
  dom.newDomain.focus();
  await renderWhitelist();
}

// ─── Event Listeners ──────────────────────────────────────────────

function setupListeners() {
  dom.themeSelect.addEventListener('change', handleThemeChange);
  dom.btnAddDomain.addEventListener('click', handleAddDomain);
  dom.newDomain.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleAddDomain();
    }
  });
}

// ─── Utilities ────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Start ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

// CrumbKit — Options page script
// Manages theme preference and domain whitelist.

import { getSettings, saveSettings, getWhitelist, addToWhitelist, removeFromWhitelist } from '../utils/storage.js';
import { getRules, createRule, updateRule, deleteRule } from '../utils/rules.js';

// ─── DOM Elements ─────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

let editingRuleId = null; // Track which rule is being edited (null = new rule)

const dom = {
  themeSelect: $('#themeSelect'),
  newDomain: $('#newDomain'),
  btnAddDomain: $('#btnAddDomain'),
  whitelistItems: $('#whitelistItems'),
  emptyWhitelist: $('#emptyWhitelist'),
  // Auto-cleanup rules
  ruleList: $('#ruleList'),
  emptyRules: $('#emptyRules'),
  btnAddRule: $('#btnAddRule'),
  ruleForm: $('#ruleForm'),
  ruleName: $('#ruleName'),
  ruleDomains: $('#ruleDomains'),
  ruleMaxAge: $('#ruleMaxAge'),
  ruleSchedule: $('#ruleSchedule'),
  btnRuleSave: $('#btnRuleSave'),
  btnRuleCancel: $('#btnRuleCancel')
};

// ─── Init ─────────────────────────────────────────────────────────

async function init() {
  await loadSettings();
  await renderWhitelist();
  await renderRuleList();
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
  // Auto-cleanup rules
  dom.btnAddRule.addEventListener('click', () => showRuleForm());
  dom.btnRuleCancel.addEventListener('click', hideRuleForm);
  dom.btnRuleSave.addEventListener('click', handleSaveRule);
}

// ─── Auto-Cleanup Rules ────────────────────────────────────────────

async function renderRuleList() {
  const rules = await getRules();
  dom.ruleList.innerHTML = '';

  if (rules.length === 0) {
    dom.ruleList.innerHTML = '<li class="empty-msg" id="emptyRules">No rules configured.</li>';
    return;
  }

  for (const rule of rules) {
    const item = document.createElement('div');
    item.className = 'rule-item';
    const categoriesLabel = rule.categories.length > 0
      ? rule.categories.join(', ')
      : 'All categories';
    const domainsLabel = rule.targetDomains.length > 0
      ? rule.targetDomains.join(', ')
      : 'All domains';

    item.innerHTML = `
      <div class="rule-info">
        <label class="rule-toggle-label">
          <input type="checkbox" class="rule-toggle" data-id="${escapeAttr(rule.id)}" ${rule.enabled ? 'checked' : ''}>
          <span class="rule-name">${escapeHtml(rule.name)}</span>
        </label>
        <span class="rule-meta">Every ${formatSchedule(rule.schedule)} · ${categoriesLabel} · ${domainsLabel}</span>
        <span class="rule-lastrun">Last run: ${formatLastRun(rule.lastRun)}</span>
      </div>
      <div class="rule-actions">
        <button class="btn-edit" data-id="${escapeAttr(rule.id)}">Edit</button>
        <button class="btn-remove" data-id="${escapeAttr(rule.id)}">Delete</button>
      </div>
    `;

    // Toggle handler
    item.querySelector('.rule-toggle').addEventListener('change', async (e) => {
      await updateRule(rule.id, { enabled: e.target.checked });
      await notifyAlarmSync();
    });

    // Edit handler
    item.querySelector('.btn-edit').addEventListener('click', () => {
      showRuleForm(rule);
    });

    // Delete handler
    item.querySelector('.btn-remove').addEventListener('click', async () => {
      if (!confirm(`Delete rule "${rule.name}"?`)) return;
      await deleteRule(rule.id);
      hideRuleForm();
      await renderRuleList();
      await notifyAlarmSync();
    });

    dom.ruleList.appendChild(item);
  }
}

function showRuleForm(rule) {
  editingRuleId = rule ? rule.id : null;
  dom.ruleName.value = rule ? rule.name : '';
  dom.ruleDomains.value = rule ? rule.targetDomains.join(', ') : '';
  dom.ruleMaxAge.value = rule ? rule.maxAge : 0;
  dom.ruleSchedule.value = rule ? rule.schedule : 60;

  // Set category checkboxes
  const checks = dom.ruleForm.querySelectorAll('.category-checks input[type="checkbox"]');
  checks.forEach(cb => {
    cb.checked = rule ? rule.categories.includes(cb.value) : false;
  });

  dom.ruleForm.hidden = false;
  dom.btnAddRule.hidden = true;
  dom.btnRuleSave.textContent = rule ? 'Update Rule' : 'Save Rule';
  dom.ruleName.focus();
}

function hideRuleForm() {
  editingRuleId = null;
  dom.ruleForm.hidden = true;
  dom.btnAddRule.hidden = false;
  // Reset form
  dom.ruleName.value = '';
  dom.ruleDomains.value = '';
  dom.ruleMaxAge.value = 0;
  dom.ruleSchedule.value = '60';
  const checks = dom.ruleForm.querySelectorAll('.category-checks input[type="checkbox"]');
  checks.forEach(cb => { cb.checked = false; });
}

async function handleSaveRule() {
  const name = dom.ruleName.value.trim();
  if (!name) {
    alert('Please enter a rule name.');
    return;
  }

  const domainsStr = dom.ruleDomains.value.trim();
  const targetDomains = domainsStr
    ? domainsStr.split(',').map(d => d.trim().toLowerCase()).filter(d => d.length > 0)
    : [];

  const categories = [];
  dom.ruleForm.querySelectorAll('.category-checks input[type="checkbox"]:checked').forEach(cb => {
    categories.push(cb.value);
  });

  const maxAge = parseInt(dom.ruleMaxAge.value, 10) || 0;
  const schedule = parseInt(dom.ruleSchedule.value, 10) || 60;

  if (editingRuleId) {
    await updateRule(editingRuleId, { name, targetDomains, categories, maxAge, schedule });
  } else {
    await createRule({ name, targetDomains, categories, maxAge, schedule });
  }

  hideRuleForm();
  await renderRuleList();
  await notifyAlarmSync();
}

async function notifyAlarmSync() {
  try {
    await chrome.runtime.sendMessage({ type: 'resyncAlarms' });
  } catch (e) {
    // Service worker may not be running — alarms will be registered on next startup
  }
}

function formatLastRun(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatSchedule(minutes) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hour${minutes > 60 ? 's' : ''}`;
  return `${Math.round(minutes / 1440)} day${minutes > 1440 ? 's' : ''}`;
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

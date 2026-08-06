// CrumbKit — Cleanup Rules management
// CRUD for scheduled cookie cleanup rules in chrome.storage.local.

const RULES_KEY = 'crumbkit_rules';

/**
 * @typedef {Object} CleanupRule
 * @property {string} id - Unique rule ID
 * @property {string} name - User-visible name
 * @property {boolean} enabled - Whether the rule is active
 * @property {string[]} targetDomains - Domain filter (empty = all domains)
 * @property {string[]} categories - Category filter (empty = all categories)
 * @property {number} maxAge - Max cookie age in hours (0 = no limit)
 * @property {number} schedule - Alarm interval in minutes
 * @property {string|null} lastRun - ISO timestamp of last execution
 * @property {string} createdAt - ISO timestamp of creation
 */

/**
 * Generate a unique rule ID.
 * @returns {string}
 */
function generateRuleId() {
  return 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Get all rules from storage.
 * @returns {Promise<CleanupRule[]>}
 */
export async function getRules() {
  try {
    const { [RULES_KEY]: rules } = await chrome.storage.local.get(RULES_KEY);
    return Array.isArray(rules) ? rules : [];
  } catch {
    return [];
  }
}

/**
 * Save (create) a new rule.
 * @param {Object} ruleData - Rule fields (without id, lastRun, createdAt)
 * @returns {Promise<CleanupRule>}
 */
export async function createRule(ruleData) {
  const rule = {
    id: generateRuleId(),
    name: ruleData.name || 'Untitled Rule',
    enabled: ruleData.enabled !== false,
    targetDomains: ruleData.targetDomains || [],
    categories: ruleData.categories || [],
    maxAge: ruleData.maxAge || 0,
    schedule: ruleData.schedule || 60,
    lastRun: null,
    createdAt: new Date().toISOString()
  };
  const rules = await getRules();
  rules.push(rule);
  await chrome.storage.local.set({ [RULES_KEY]: rules });
  return rule;
}

/**
 * Update an existing rule by id.
 * @param {string} id
 * @param {Object} updates - Fields to update
 * @returns {Promise<CleanupRule|null>}
 */
export async function updateRule(id, updates) {
  const rules = await getRules();
  const idx = rules.findIndex(r => r.id === id);
  if (idx === -1) return null;
  rules[idx] = { ...rules[idx], ...updates, id }; // Prevent id overwrite
  await chrome.storage.local.set({ [RULES_KEY]: rules });
  return rules[idx];
}

/**
 * Delete a rule by id.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteRule(id) {
  const rules = await getRules();
  const filtered = rules.filter(r => r.id !== id);
  if (filtered.length === rules.length) return false;
  await chrome.storage.local.set({ [RULES_KEY]: filtered });
  return true;
}

/**
 * Get a single rule by id.
 * @param {string} id
 * @returns {Promise<CleanupRule|undefined>}
 */
export async function getRuleById(id) {
  const rules = await getRules();
  return rules.find(r => r.id === id);
}

/**
 * Update the lastRun timestamp for a rule.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function markRuleExecuted(id) {
  const rules = await getRules();
  const idx = rules.findIndex(r => r.id === id);
  if (idx === -1) return;
  rules[idx].lastRun = new Date().toISOString();
  await chrome.storage.local.set({ [RULES_KEY]: rules });
}

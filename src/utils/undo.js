// CrumbKit — Undo/redo stack
// Tracks cookie operations so users can undo accidental changes.

const MAX_STACK_SIZE = 50;

let undoStack = [];

/**
 * Push an operation onto the undo stack.
 * @param {string} type - 'add' | 'delete' | 'edit'
 * @param {Object} [oldData] - The cookie data before the operation (for restore).
 * @param {Object} [newData] - The cookie data after the operation (for edit reversal).
 * @param {string} [url] - The URL needed to set the cookie.
 */
export function push(type, oldData = null, newData = null, url = null) {
  undoStack.push({ type, oldData, newData, url, timestamp: Date.now() });
  if (undoStack.length > MAX_STACK_SIZE) {
    undoStack.shift();
  }
}

/**
 * Pop the most recent operation from the undo stack.
 * @returns {Object|null} The undo entry, or null if stack is empty.
 */
export function pop() {
  if (undoStack.length === 0) return null;
  return undoStack.pop();
}

/**
 * Check if the undo stack has any entries.
 * @returns {boolean}
 */
export function canUndo() {
  return undoStack.length > 0;
}

/**
 * Get the number of undo entries available.
 * @returns {number}
 */
export function getUndoCount() {
  return undoStack.length;
}

/**
 * Clear the undo stack.
 */
export function clear() {
  undoStack = [];
}

/**
 * Load the undo stack from storage (called on popup open).
 * In the MVP, undo is in-memory only — resets when popup closes.
 * Future: persist across popup opens via chrome.storage.local.
 * @returns {Promise<void>}
 */
export async function loadFromStorage() {
  clear();
}

/**
 * Persist undo state to storage.
 * No-op in MVP — undo is in-memory during popup session.
 * @returns {Promise<void>}
 */
export async function persistState() {
  // Placeholder for future persistence
}

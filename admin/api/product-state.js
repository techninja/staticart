/**
 * Product state tracker — config hashes + drift detection.
 * Computes a hash from the catalog entry config, compares against
 * last-synced state to detect what needs reconciliation.
 * @module admin/api/product-state
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const STATE_PATH = resolve(ROOT, '.admin-state.json');

function loadState() {
  return existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, 'utf-8')) : {};
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

/** Hash the parts of a catalog entry that affect provider sync. */
function syncHash(entry) {
  const data = { printful: entry.printful, retail: entry.retail };
  return createHash('md5').update(JSON.stringify(data)).digest('hex').slice(0, 12);
}

/** Hash the parts that affect mockup generation. */
function mockupHash(entry) {
  const data = { mockupStyles: entry.mockupStyles || [], heroStyle: entry.heroStyle };
  return createHash('md5').update(JSON.stringify(data)).digest('hex').slice(0, 12);
}

/**
 * Get the reconciliation status for all catalog products.
 * @param {any} catalog - parsed printful-catalog.json
 * @param {any} store - parsed printful-store.json
 * @returns {{ sku: string, name: string, status: object }[]}
 */
export function getProductStates(catalog, store) {
  const state = loadState();
  const prefix = catalog.skuPrefix || 'SM';
  return catalog.products.map((entry) => {
    const fullSku = `${prefix}-${entry.sku}`;
    const storeIds = store.products?.[fullSku] || {};
    const created = Object.keys(storeIds).length > 0;
    const currentSync = syncHash(entry);
    const currentMockup = mockupHash(entry);
    const saved = state[entry.sku] || {};
    return {
      sku: entry.sku, fullSku, name: entry.name,
      created,
      syncDirty: created && saved.syncHash !== currentSync,
      mockupDirty: created && saved.mockupHash !== currentMockup,
      syncHash: currentSync,
      mockupHash: currentMockup,
      lastSync: saved.lastSync || null,
      lastMockup: saved.lastMockup || null,
    };
  });
}

/** Mark a product's sync as up-to-date. */
export function markSynced(sku, catalog) {
  const entry = catalog.products.find((p) => p.sku === sku);
  if (!entry) return;
  const state = loadState();
  state[sku] = { ...state[sku], syncHash: syncHash(entry), lastSync: new Date().toISOString() };
  saveState(state);
}

/** Mark a product's mockups as up-to-date. */
export function markMockupsGenerated(sku, catalog) {
  const entry = catalog.products.find((p) => p.sku === sku);
  if (!entry) return;
  const state = loadState();
  state[sku] = { ...state[sku], mockupHash: mockupHash(entry), lastMockup: new Date().toISOString() };
  saveState(state);
}

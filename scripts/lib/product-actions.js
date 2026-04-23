/**
 * Product management actions — sync, create, delete, status.
 * Called by the interactive menu in scripts/products.js.
 * @module scripts/lib/product-actions
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export { sync } from './sync-action.js';
export { create } from './create-action.js';

const ROOT = process.cwd();
const r = (/** @type {string} */ p) => resolve(ROOT, p);

/** @param {any} helpers @param {string} apiKey */
export async function deleteOrphans(helpers, apiKey) {
  const client = helpers.createClient(apiKey);
  const remote = await client.call('GET', '/store/products');
  const local = JSON.parse(readFileSync(r('src/data/products.json'), 'utf-8'));
  const localIds = new Set(local.flatMap((p) => p.metadata?.printfulSyncProductIds || []));
  let deleted = 0;
  for (const p of remote) {
    if (!localIds.has(p.id)) {
      await client.call('DELETE', `/store/products/${p.id}`);
      console.log(`  ✗ ${p.name}`);
      deleted++;
    }
  }
  console.log(`${deleted} orphans deleted.`);
}

/** @param {any} helpers @param {string} apiKey */
export async function status(helpers, apiKey) {
  const client = helpers.createClient(apiKey);
  const remote = await client.call('GET', '/store/products');
  const localPath = r('src/data/products.json');
  const local = existsSync(localPath) ? JSON.parse(readFileSync(localPath, 'utf-8')) : [];
  console.log(`  Remote: ${remote.length} products`);
  console.log(`  Local:  ${local.length} products`);
}

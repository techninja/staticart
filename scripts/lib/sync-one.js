/**
 * Single-SKU sync — fetches one product from Printful, merges into products.json.
 * Used by the admin pipeline for incremental sync without touching other products.
 * @module scripts/lib/sync-one
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const r = (/** @type {string} */ p) => resolve(ROOT, p);

/**
 * Sync a single catalog entry and merge into products.json.
 * @param {any} helpers - provider helpers (printful.js)
 * @param {string} apiKey
 * @param {any} config - staticart.config.json
 * @param {string} sku - catalog SKU (without prefix)
 * @param {(msg: string) => void} [log] - progress callback
 */
export async function syncOne(helpers, apiKey, config, sku, log = console.log) {
  const provider = config?.fulfillment?.provider || 'printful';
  const catalog = JSON.parse(readFileSync(r(`src/data/${provider}-catalog.json`), 'utf-8'));
  const entry = catalog.products.find((p) => p.sku === sku);
  if (!entry) throw new Error(`SKU ${sku} not in catalog`);

  const store = existsSync(r(`${provider}-store.json`))
    ? JSON.parse(readFileSync(r(`${provider}-store.json`), 'utf-8')) : {};
  const fullSku = `${catalog.skuPrefix}-${entry.sku}`;
  const syncIds = store.products?.[fullSku] || {};
  if (!Object.keys(syncIds).length) throw new Error(`${fullSku} not created on provider yet`);

  const client = helpers.createClient(apiKey);
  const allVariants = [];
  const allImages = new Set();
  const catVariants = new Map();

  for (const pfEntry of entry.printful) {
    const syncId = syncIds[pfEntry.label];
    if (!syncId) continue;
    log(`Fetching ${pfEntry.label}…`);
    const detail = await client.call('GET', `/store/products/${syncId}`);
    const catalogId = detail.sync_variants[0]?.product?.product_id;
    if (catalogId && !catVariants.has(catalogId)) {
      const cat = await client.call('GET', `/products/${catalogId}`);
      catVariants.set(catalogId, cat.variants || []);
    }
    for (const v of detail.sync_variants) {
      const preview = v.files?.find((f) => f.type === 'preview')?.preview_url || '';
      if (preview) allImages.add(preview);
      const raw = v.name.replace(detail.sync_product.name, '').replace(/^[\s/—-]+/, '');
      const parts = raw.split('/').map((s) => s.trim()).filter(Boolean);
      const color = entry.printful.length > 1 ? pfEntry.label : (pfEntry.colors?.[0] || '');
      const size = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
      allVariants.push({
        id: String(v.id), label: [color, size].filter(Boolean).join(' / ') || 'Default',
        sku: `${fullSku}-${v.external_id || v.id}`, price: 0, stock: -1, image: preview,
        color, size, printfulSyncProductId: syncId,
      });
    }
  }

  const retail = entry.retail || entry.printful[0]?.retail || 0;
  const product = {
    sku: fullSku, name: entry.name, description: entry.description || entry.name,
    price: Math.round(retail * 100), currency: 'USD', images: [...allImages],
    category: entry.category || 'other', tags: entry.tags || [],
    heroStyle: entry.heroStyle || 'default', stock: -1, active: true,
    variants: allVariants,
    metadata: { printfulSyncProductIds: Object.values(syncIds), catalogSku: entry.sku },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  helpers.enrichOutOfStock([product], catVariants, catalog);

  // Merge into existing products.json
  const productsPath = r('src/data/products.json');
  const existing = existsSync(productsPath) ? JSON.parse(readFileSync(productsPath, 'utf-8')) : [];
  const idx = existing.findIndex((p) => p.sku === fullSku);
  if (idx >= 0) {
    product.createdAt = existing[idx].createdAt;
    existing[idx] = product;
  } else {
    existing.push(product);
  }
  writeFileSync(productsPath, JSON.stringify(existing, null, 2) + '\n');
  log(`✓ Synced ${fullSku} (${allVariants.length} variants)`);
}

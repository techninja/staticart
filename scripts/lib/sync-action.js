/**
 * Sync action — fetches Printful sync products, builds products.json
 * from unified catalog groupings.
 * @module scripts/lib/sync-action
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const r = (/** @type {string} */ p) => resolve(ROOT, p);

/** @param {any} helpers @param {string} apiKey @param {any} [config] */
export async function sync(helpers, apiKey, config) {
  const provider = config?.fulfillment?.provider || 'printful';
  const catalogPath = r(`src/data/${provider}-catalog.json`);
  if (!existsSync(catalogPath)) {
    console.error('No catalog found.');
    return;
  }
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  if (!catalog?.products?.length) {
    console.error('Empty products array.');
    return;
  }
  const storePath = r(`${provider}-store.json`);
  const store = existsSync(storePath) ? JSON.parse(readFileSync(storePath, 'utf-8')) : {};
  const storeProducts = store.products || {};
  const client = helpers.createClient(apiKey);
  const catVariants = new Map();
  const products = [];

  for (let i = 0; i < catalog.products.length; i++) {
    const entry = catalog.products[i];
    const fullSku = `${catalog.skuPrefix}-${entry.sku}`;
    const syncIds = storeProducts[fullSku] || {};
    if (!Object.keys(syncIds).length) {
      console.log(`  ⏭ ${fullSku} (not created yet)`);
      continue;
    }
    process.stdout.write(`  [${i + 1}/${catalog.products.length}] ${fullSku}...`);
    const allVariants = [];
    const allImages = new Set();

    for (const pfEntry of entry.printful) {
      const syncId = syncIds[pfEntry.label];
      if (!syncId) continue;
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
        const parts = raw
          .split('/')
          .map((s) => s.trim())
          .filter(Boolean);
        const color = pfEntry.colors?.[0] || '';
        const size = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
        allVariants.push({
          id: String(v.id),
          label: [color, size].filter(Boolean).join(' / ') || 'Default',
          sku: `${fullSku}-${v.external_id || v.id}`,
          price: 0,
          stock: -1,
          image: preview,
          color,
          size,
          printfulSyncProductId: syncId,
        });
      }
    }

    const retail = entry.retail || entry.printful[0]?.retail || 0;
    products.push({
      sku: fullSku,
      name: entry.name,
      description: entry.description || entry.name,
      price: Math.round(retail * 100),
      currency: 'USD',
      images: [...allImages],
      category: entry.category || 'other',
      tags: entry.tags || [],
      heroStyle: entry.heroStyle || 'default',
      stock: -1,
      active: true,
      variants: allVariants,
      metadata: {
        printfulSyncProductIds: Object.values(syncIds),
        catalogSku: entry.sku,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(' ✓');
  }

  helpers.enrichOutOfStock(products, catVariants, catalog);
  writeFileSync(r('src/data/products.json'), JSON.stringify(products, null, 2) + '\n');
  console.log(`✓ Synced ${products.length} products → src/data/products.json`);
}

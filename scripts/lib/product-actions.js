/**
 * Product management actions — sync, create, delete, status.
 * Called by the interactive menu in scripts/products.js.
 * @module scripts/lib/product-actions
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const ROOT = process.cwd();
const r = (/** @type {string} */ p) => resolve(ROOT, p);

/** @param {string} prompt @returns {Promise<string>} */
function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(prompt, (a) => {
      rl.close();
      res(a.trim());
    }),
  );
}

/**
 * Load the unified catalog. Returns { skuPrefix, products } or null.
 * @param {string} provider
 */
function loadCatalog(provider) {
  const catalogPath = r(`src/data/${provider}-catalog.json`);
  if (!existsSync(catalogPath)) return null;
  return JSON.parse(readFileSync(catalogPath, 'utf-8'));
}

/** @param {any} helpers @param {string} apiKey @param {any} [config] */
export async function sync(helpers, apiKey, config) {
  const provider = config?.fulfillment?.provider || 'printful';
  const catalog = loadCatalog(provider);
  if (!catalog?.products?.length) {
    console.error('No catalog found or empty products array.');
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
    const labels = Object.keys(syncIds);
    if (!labels.length) {
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
        const parts = raw.split('/').map((s) => s.trim()).filter(Boolean);
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

/** @param {any} helpers @param {string} apiKey @param {any} config */
export async function create(helpers, apiKey, config) {
  const provider = config.fulfillment.provider;
  const catalog = loadCatalog(provider);
  if (!catalog?.products?.length) {
    console.error(`Catalog not found or empty: src/data/${provider}-catalog.json`);
    return;
  }
  const storePath = r(`${provider}-store.json`);
  const store = existsSync(storePath) ? JSON.parse(readFileSync(storePath, 'utf-8')) : {};
  const storeProducts = store.products || {};
  const logoFileId = parseInt(process.env.LOGO_FILE_ID || '0') || store.logoFileId;
  if (!logoFileId) {
    console.error('Set LOGO_FILE_ID env var');
    return;
  }
  const client = helpers.createClient(apiKey);
  let created = 0;

  for (const entry of catalog.products) {
    const fullSku = `${catalog.skuPrefix}-${entry.sku}`;
    if (!storeProducts[fullSku]) storeProducts[fullSku] = {};

    for (const pfEntry of entry.printful) {
      if (storeProducts[fullSku][pfEntry.label]) {
        console.log(`  ⏭ ${fullSku} / ${pfEntry.label}`);
        continue;
      }
      const variants = await helpers.getVariants(
        client, pfEntry.catalogId, pfEntry.colors, pfEntry.sizes,
      );
      if (!variants.length) {
        console.warn(`  ⚠ ${fullSku} / ${pfEntry.label}: no variants`);
        continue;
      }
      const retail = pfEntry.retail || entry.retail;
      const sv = helpers.buildSyncVariants(variants, pfEntry, logoFileId, retail);
      const name = entry.printful.length > 1
        ? `${entry.name} — ${pfEntry.label}`
        : entry.name;
      const result = await client.call('POST', '/store/products', {
        sync_product: { name, external_id: fullSku },
        sync_variants: sv,
      });
      storeProducts[fullSku][pfEntry.label] = result.id;
      created++;
      console.log(`  ✓ ${fullSku} / ${pfEntry.label} (id: ${result.id})`);
    }
  }

  writeFileSync(
    storePath,
    JSON.stringify({ logoFileId, products: storeProducts }, null, 2) + '\n',
  );
  console.log(`\n${created} created. ${created > 0 ? 'Run sync next.' : ''}`);
}

/** @param {any} helpers @param {string} apiKey */
export async function deleteOrphans(helpers, apiKey) {
  const client = helpers.createClient(apiKey);
  const remote = await client.call('GET', '/store/products');
  const local = JSON.parse(readFileSync(r('src/data/products.json'), 'utf-8'));
  const localIds = new Set(
    local.flatMap((p) => p.metadata?.printfulSyncProductIds || []),
  );
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

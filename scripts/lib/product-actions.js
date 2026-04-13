/**
 * Product management actions — sync, create, delete, status.
 * Called by the interactive menu in scripts/products.js.
 * @module scripts/lib/product-actions
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
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

/** @param {any} helpers @param {string} apiKey */
export async function sync(helpers, apiKey) {
  const client = helpers.createClient(apiKey);
  const categories = await helpers.loadCategories(client);
  const remote = await client.call('GET', '/store/products');
  const catCache = new Map();
  const products = [];
  for (const sp of remote) {
    const detail = await client.call('GET', `/store/products/${sp.id}`);
    const catalogId = detail.sync_variants[0]?.product?.product_id;
    if (catalogId && !catCache.has(catalogId)) {
      const cat = await client.call('GET', `/products/${catalogId}`);
      catCache.set(catalogId, cat.product.main_category_id || 0);
    }
    products.push(
      helpers.toProduct(detail.sync_product, detail.sync_variants, {
        categoryId: catCache.get(catalogId) || 0,
        categories,
      }),
    );
  }
  writeFileSync(r('src/data/products.json'), JSON.stringify(products, null, 2) + '\n');
  console.log(`✓ Synced ${products.length} products → src/data/products.json`);
}

/** @param {any} helpers @param {string} apiKey @param {any} config */
export async function create(helpers, apiKey, config) {
  const provider = config.fulfillment.provider;
  const catalogPath = r(`src/data/${provider}-catalog.json`);
  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    return;
  }
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  const storePath = r(`${provider}-store.json`);
  const store = existsSync(storePath) ? JSON.parse(readFileSync(storePath, 'utf-8')) : {};
  const products = store.products || {};
  const logoFileId = parseInt(process.env.LOGO_FILE_ID || '0') || store.logoFileId;
  if (!logoFileId) {
    console.error('Set LOGO_FILE_ID env var');
    return;
  }
  const client = helpers.createClient(apiKey);
  let created = 0;
  for (const p of catalog) {
    if (products[p.name]) {
      console.log(`  ⏭ ${p.name}`);
      continue;
    }
    const variants = await helpers.getVariants(client, p.catalogId, p.colors, p.sizes);
    if (!variants.length) {
      console.warn(`  ⚠ ${p.name}: no variants`);
      continue;
    }
    const sv = helpers.buildSyncVariants(variants, p, logoFileId);
    const result = await client.call('POST', '/store/products', {
      sync_product: { name: p.name },
      sync_variants: sv,
    });
    products[p.name] = result.id;
    created++;
    console.log(`  ✓ ${p.name} (id: ${result.id})`);
  }
  writeFileSync(storePath, JSON.stringify({ logoFileId, products }, null, 2) + '\n');
  console.log(`\n${created} created. ${created > 0 ? 'Run sync next.' : ''}`);
}

/** @param {any} helpers @param {string} apiKey */
export async function deleteOrphans(helpers, apiKey) {
  const client = helpers.createClient(apiKey);
  const remote = await client.call('GET', '/store/products');
  const local = JSON.parse(readFileSync(r('src/data/products.json'), 'utf-8'));
  const localIds = new Set(local.map((p) => p.metadata?.printfulSyncProductId));
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

/** @param {any} helpers @param {string} apiKey @param {string} [query] @param {string} [inspectId] */
export async function browse(helpers, apiKey, query, inspectId) {
  const client = helpers.createClient(apiKey);
  const q = query || (await ask('  Search catalog: '));
  if (!q) return;
  const results = await helpers.browseCatalog(client, q);
  if (!results.length) {
    console.log('  No matches.');
    return;
  }
  console.log(`\n  ${results.length} match(es):\n`);
  for (const p of results.slice(0, 15)) console.log(`    ${p.id}  ${p.title}`);
  const id = inspectId || (query ? null : await ask('\n  Inspect ID (or enter to skip): '));
  if (!id) return;
  const info = await helpers.inspectProduct(client, parseInt(id));
  console.log(`\n  ${info.product.title} (id: ${info.product.id})`);
  console.log(`  Brand:    ${info.brand || '(none)'}`);
  console.log(`  Category: ${info.categoryId}`);
  console.log(`  Colors:   ${info.colors.join(', ') || '(none)'}`);
  console.log(`  Sizes:    ${info.sizes.join(', ') || '(none)'}`);
  console.log(`  In stock: ${info.inStock}/${info.total} variants`);
}

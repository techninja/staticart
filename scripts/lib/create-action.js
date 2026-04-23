/**
 * Create action — pushes catalog products to Printful as sync products.
 * @module scripts/lib/create-action
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const r = (/** @type {string} */ p) => resolve(ROOT, p);

/** @param {any} helpers @param {string} apiKey @param {any} config */
export async function create(helpers, apiKey, config) {
  const provider = config.fulfillment.provider;
  const catalogPath = r(`src/data/${provider}-catalog.json`);
  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
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
        client,
        pfEntry.catalogId,
        pfEntry.colors,
        pfEntry.sizes,
      );
      if (!variants.length) {
        console.warn(`  ⚠ ${fullSku} / ${pfEntry.label}: no variants`);
        continue;
      }
      const retail = pfEntry.retail || entry.retail;
      const sv = helpers.buildSyncVariants(variants, pfEntry, logoFileId, retail);
      const name = entry.printful.length > 1 ? `${entry.name} — ${pfEntry.label}` : entry.name;
      const result = await client.call('POST', '/store/products', {
        sync_product: { name, external_id: fullSku },
        sync_variants: sv,
      });
      storeProducts[fullSku][pfEntry.label] = result.id;
      created++;
      console.log(`  ✓ ${fullSku} / ${pfEntry.label} (id: ${result.id})`);
    }
  }

  writeFileSync(storePath, JSON.stringify({ logoFileId, products: storeProducts }, null, 2) + '\n');
  console.log(`\n${created} created. ${created > 0 ? 'Run sync next.' : ''}`);
}

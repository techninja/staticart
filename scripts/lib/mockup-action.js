/**
 * Mockup generation action — generates multi-angle images via Printful API.
 * Downloads to src/assets/products/, updates products.json with local paths.
 * @module scripts/lib/mockup-action
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMockups, hasMockups, clearMockups } from './printful-mockups.js';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const r = (/** @type {string} */ p) => resolve(ROOT, p);

/**
 * Generate mockups for all store products, download images, update products.json.
 * @param {any} helpers
 * @param {string} apiKey
 * @param {{ force?: boolean, fresh?: boolean, filter?: string }} [opts]
 */
export async function mockups(helpers, apiKey, opts) {
  if (opts?.fresh) clearMockups();
  const client = helpers.createClient(apiKey);
  let remote = await client.call('GET', '/store/products');
  if (opts?.filter) {
    const q = opts.filter.toLowerCase();
    remote = remote.filter((sp) => sp.name.toLowerCase().includes(q));
    console.log(`  Filtered to ${remote.length} product(s) matching "${opts.filter}"`);
  }
  const productsPath = r('src/data/products.json');
  const products = existsSync(productsPath) ? JSON.parse(readFileSync(productsPath, 'utf-8')) : [];

  /** @type {Map<number, Map<string, string[]>>} storeProductId → variantId → paths */
  const allMockups = new Map();

  for (const sp of remote) {
    if (!opts?.force && hasMockups(sp.id)) {
      console.log(`  ⏭ ${sp.name} (mockups exist)`);
      continue;
    }
    console.log(`\n  📸 ${sp.name}`);
    const detail = await client.call('GET', `/store/products/${sp.id}`);
    const catalogId = detail.sync_variants[0]?.product?.product_id;
    const styles = catalogId ? await helpers.pickMockupStyles(client, catalogId) : [];
    if (!styles.length) {
      console.log('    No mockup styles available');
      continue;
    }
    const variantMockups = await generateMockups(client, detail, styles);
    allMockups.set(sp.id, variantMockups);
  }

  // Update products.json with local image paths
  let updated = 0;
  for (const product of products) {
    const syncIds = product.metadata?.mergedFrom || [product.metadata?.printfulSyncProductId];
    for (const syncId of syncIds) {
      const variantMockups = allMockups.get(syncId);
      if (!variantMockups) continue;
      // Apply mockups to generated variants
      for (const variant of product.variants) {
        const paths = variantMockups.get(variant.id);
        if (paths?.length) {
          variant.images = paths;
          variant.image = paths[0];
          updated++;
        }
      }
      // Propagate to all same-color variants (sizes share mockups)
      for (const variant of product.variants) {
        if (variantMockups.has(variant.id)) continue;
        const donor = product.variants.find(
          (v) => v.color === variant.color && variantMockups.has(v.id),
        );
        if (donor) {
          variant.images = donor.images;
          variant.image = donor.image;
        }
      }
    }
    // Rebuild product images: local mockups only, no stale remote URLs
    const allImgs = product.variants.flatMap((v) => v.images || (v.image ? [v.image] : []));
    const local = [...new Set(allImgs)].filter((p) => p.startsWith('/'));
    if (local.length) product.images = local;
  }

  if (updated > 0) {
    writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n');
    console.log(`\n✓ Updated ${updated} variants with mockup images`);
  } else {
    console.log('\n  No new mockups generated.');
  }
}

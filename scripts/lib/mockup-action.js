/**
 * Mockup generation action — generates multi-angle images via Printful API.
 * Downloads to src/assets/products/, updates products.json with local paths.
 * Uses unified catalog heroStyle to select hero images.
 * @module scripts/lib/mockup-action
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateMockups, hasMockups, clearMockups, loadExistingMockups } from './printful-mockups.js';

const ROOT = process.cwd();
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
  const catalogPath = r('src/data/printful-catalog.json');
  const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf-8')) : {};
  const catalogProducts = catalog.products || [];

  // Build syncId → { catalogEntry, pfEntry, fullSku } lookup
  const storePath = r('printful-store.json');
  const store = existsSync(storePath) ? JSON.parse(readFileSync(storePath, 'utf-8')) : {};
  const syncIdMap = new Map();
  for (const entry of catalogProducts) {
    const fullSku = `${catalog.skuPrefix}-${entry.sku}`;
    const syncIds = store.products?.[fullSku] || {};
    for (const pfEntry of entry.printful) {
      const syncId = syncIds[pfEntry.label];
      if (syncId) syncIdMap.set(syncId, { entry, pfEntry, fullSku });
    }
  }

  /** @type {Map<number, Map<string, string[]>>} storeProductId → variantId → paths */
  const allMockups = new Map();

  for (const sp of remote) {
    if (!opts?.force && hasMockups(sp.id)) {
      console.log(`  ⏭ ${sp.name} (mockups exist)`);
      allMockups.set(sp.id, loadExistingMockups(sp.id));
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
    const mapping = syncIdMap.get(sp.id);
    const heroStyle = mapping?.entry?.heroStyle || 'default';
    const variantMockups = await generateMockups(
      client, detail, styles, mapping?.pfEntry, heroStyle,
    );
    allMockups.set(sp.id, variantMockups);
  }

  // Update products.json with local image paths
  let updated = 0;
  for (const product of products) {
    const syncIds = product.metadata?.printfulSyncProductIds || [];
    const catEntry = catalogProducts.find(
      (e) => `${catalog.skuPrefix}-${e.sku}` === product.sku,
    );
    const heroStyle = catEntry?.heroStyle || 'default';

    for (const syncId of syncIds) {
      const variantMockups = allMockups.get(syncId);
      if (!variantMockups) continue;
      for (const variant of product.variants) {
        const paths = variantMockups.get(variant.id);
        if (paths?.length) {
          variant.images = paths;
          // Pick hero based on heroStyle
          variant.image = pickHero(paths, heroStyle);
          updated++;
        }
      }
      // Propagate to same-color variants (sizes share mockups)
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
    // Rebuild product images: local mockups only
    const allImgs = product.variants.flatMap((v) => v.images || (v.image ? [v.image] : []));
    const local = [...new Set(allImgs)].filter((p) => p.startsWith('/'));
    if (local.length) {
      product.images = local;
      product.heroImage = pickHero(local, heroStyle);
    }
  }

  if (updated > 0) {
    writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n');
    console.log(`\n✓ Updated ${updated} variants with mockup images`);
  } else {
    console.log('\n  No new mockups generated.');
  }
}

/**
 * Pick the hero image from a list of paths based on heroStyle.
 * Image filenames contain style tags like "ghost", "lifestyle", "flat", "default".
 */
function pickHero(paths, heroStyle) {
  if (!paths.length) return '';
  const styles = {
    lifestyle: ['men-s', 'lifestyle'],
    flat: ['flat', 'ghost', 'default'],
    default: ['default', 'flat', 'ghost'],
  };
  const prefs = styles[heroStyle] || [heroStyle];
  for (const s of prefs) {
    const match = paths.find((p) => p.includes(`-${s}-`));
    if (match) return match;
  }
  return paths[0];
}

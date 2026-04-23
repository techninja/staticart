/**
 * Printful mockup generation — multi-angle product images per color variant.
 * Downloads temporary S3 URLs to local assets for static hosting.
 * Images are tagged with their style (ghost, lifestyle, flat, default) in filenames.
 * @module scripts/lib/printful-mockups
 */

import { existsSync, rmSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { download, uniqueColorVariants, calcPosition, runTask } from './mockup-helpers.js';

const ROOT = process.cwd();
const ASSETS = resolve(ROOT, 'src/assets/products');

/**
 * Generate mockups for a store product (one per color, style-tagged).
 * @param {any} client
 * @param {any} storeProduct
 * @param {any[]} styles
 * @param {any} [catalogEntry] - printful sub-entry from unified catalog
 * @param {string} [heroStyle] - from unified catalog
 */
export async function generateMockups(client, storeProduct, styles, catalogEntry, heroStyle) {
  const sv = storeProduct.sync_variants[0];
  if (!sv) return new Map();
  const catalogId = sv.product.product_id;
  const logoFile = sv.files.find((f) => f.type !== 'preview');
  if (!logoFile?.preview_url) {
    console.warn('  No logo file');
    return new Map();
  }
  const catFiles = catalogEntry?.files || [];
  const logoUrl = catFiles[0]?.url || logoFile.url || logoFile.preview_url;
  const catPosition = catFiles[0]?.position;
  const tplData = await client.call('GET', `/mockup-generator/templates/${catalogId}`);
  const results = new Map();

  for (const variant of uniqueColorVariants(storeProduct.sync_variants)) {
    const mapping = tplData.variant_mapping.find(
      (m) => m.variant_id === variant.product.variant_id,
    );
    if (!mapping?.templates[0]) continue;
    const tpl = tplData.templates.find((t) => t.template_id === mapping.templates[0].template_id);
    if (!tpl) continue;
    const pos = catPosition
      ? { placement: mapping.templates[0].placement, ...catPosition }
      : calcPosition(tpl, logoFile, mapping.templates[0].placement);
    console.log(`  📸 variant ${variant.id}...`);
    const dir = resolve(ASSETS, String(storeProduct.sync_product.id));
    const paths = [];
    for (const style of styles) {
      try {
        const tag = (style.option_groups?.[0] || 'default').toLowerCase().replace(/[\s']/g, '-');
        const imgs = await runTask(
          client,
          catalogId,
          variant.product.variant_id,
          style,
          logoUrl,
          pos,
        );
        for (const img of imgs) {
          const fname = `${variant.id}-${tag}-${img.label}.jpg`;
          await download(img.url, resolve(dir, fname));
          paths.push(`/assets/products/${storeProduct.sync_product.id}/${fname}`);
          console.log(`    ✓ ${fname} [${tag}]`);
        }
      } catch (e) {
        console.warn(`  Style failed: ${e.message}`);
      }
    }
    if (paths.length) results.set(String(variant.id), paths);
  }
  return results;
}

/** Check if mockups exist for a store product. */
export function hasMockups(id) {
  return existsSync(resolve(ASSETS, String(id)));
}

/** Load existing mockup paths from disk into variantId → paths map. */
export function loadExistingMockups(id) {
  const dir = resolve(ASSETS, String(id));
  const results = new Map();
  if (!existsSync(dir)) return results;
  for (const fname of readdirSync(dir)) {
    if (!fname.endsWith('.jpg')) continue;
    const variantId = fname.split('-')[0];
    const p = `/assets/products/${id}/${fname}`;
    if (!results.has(variantId)) results.set(variantId, []);
    results.get(variantId).push(p);
  }
  return results;
}

/** Delete all generated mockups. */
export function clearMockups() {
  if (existsSync(ASSETS)) rmSync(ASSETS, { recursive: true });
  console.log('  ✓ Cleared src/assets/products/');
}

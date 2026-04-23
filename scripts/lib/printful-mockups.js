/**
 * Printful mockup generation — multi-angle product images per color variant.
 * Downloads temporary S3 URLs to local assets for static hosting.
 * @module scripts/lib/printful-mockups
 */

import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const ASSETS = resolve(ROOT, 'src/assets/products');
const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/** @param {string} url @param {string} dest */
async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/** Pick one variant per unique color. */
function uniqueColorVariants(variants) {
  const seen = new Set();
  return variants.filter((v) => {
    const key = v.product?.name?.split('/')?.slice(0, -1).join('/').trim() || v.id;
    return !seen.has(key) && seen.add(key);
  });
}

/** Fit logo into print area, or fill if file matches print area aspect ratio. */
function calcPosition(tpl, logoFile, placement) {
  const pw = tpl.print_area_width;
  const ph = tpl.print_area_height;
  const lw = logoFile.width || 602;
  const lh = logoFile.height || 490;
  const areaRatio = pw / ph;
  const logoRatio = lw / lh;
  // Pre-composited file: aspect ratio within 10% of print area → fill
  if (Math.abs(logoRatio - areaRatio) / areaRatio < 0.1) {
    return { placement, area_width: pw, area_height: ph, width: pw, height: ph, top: 0, left: 0 };
  }
  let w = Math.round(pw * 0.5);
  let h = Math.round(w / logoRatio);
  if (h > ph * 0.8) {
    h = Math.round(ph * 0.8);
    w = Math.round(h * logoRatio);
  }
  return {
    placement,
    area_width: pw,
    area_height: ph,
    width: w,
    height: h,
    top: Math.round((ph - h) / 2),
    left: Math.round((pw - w) / 2),
  };
}

/** Run a mockup task, poll for result, return image URLs. */
async function runTask(client, productId, variantId, style, logoUrl, pos) {
  const task = await client.call('POST', `/mockup-generator/create-task/${productId}`, {
    variant_ids: [variantId],
    ...style,
    format: 'jpg',
    files: [{ placement: pos.placement, image_url: logoUrl, position: pos }],
  });
  await sleep(6000);
  let result = await client.call('GET', `/mockup-generator/task?task_key=${task.task_key}`);
  if (result.status === 'pending') {
    await sleep(6000);
    result = await client.call('GET', `/mockup-generator/task?task_key=${task.task_key}`);
  }
  if (result.status !== 'completed') return [];
  const imgs = [];
  for (const m of result.mockups || []) {
    if (m.mockup_url) imgs.push({ url: m.mockup_url, label: 'main' });
  }
  return imgs;
}

/** Generate mockups for a store product (one per color, style-aware). */
export async function generateMockups(client, storeProduct, styles, catalogEntry) {
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
          client, catalogId, variant.product.variant_id, style, logoUrl, pos,
        );
        for (const img of imgs) {
          const fname = `${variant.id}-${tag}-${img.label}.jpg`;
          await download(img.url, resolve(dir, fname));
          paths.push(`/assets/products/${storeProduct.sync_product.id}/${fname}`);
          console.log(`    ✓ ${fname}`);
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

/** Delete all generated mockups. */
export function clearMockups() {
  if (existsSync(ASSETS)) rmSync(ASSETS, { recursive: true });
  console.log('  ✓ Cleared src/assets/products/');
}

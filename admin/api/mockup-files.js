/**
 * Mockup file resolver — determines file strategy from catalog entry.
 * @module admin/api/mockup-files
 */

import { readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();

/**
 *
 */
export function loadCatalogEntry(sku) {
  const cfg = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
  const provider = cfg.fulfillment?.provider || 'printful';
  const catPath = resolve(ROOT, `src/data/${provider}-catalog.json`);
  if (!existsSync(catPath)) return null;
  const catalog = JSON.parse(readFileSync(catPath, 'utf-8'));
  return catalog.products.find((p) => p.sku === sku) || null;
}

/**
 *
 */
export function loadStore() {
  const cfg = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
  const provider = cfg.fulfillment?.provider || 'printful';
  const storePath = resolve(ROOT, `${provider}-store.json`);
  return existsSync(storePath) ? JSON.parse(readFileSync(storePath, 'utf-8')) : {};
}

/**
 *
 */
export function getFileStrategy(pfEntry) {
  if (pfEntry?.threadColor) return 'embroidery';
  if (pfEntry?.files?.some((f) => f.url)) return 'allover';
  return 'logo';
}

/** Short hash of file config + style for cache-busting filenames. */
export function configHash(pfEntry, style) {
  const payload = JSON.stringify({ files: pfEntry?.files, style });
  return createHash('md5').update(payload).digest('hex').slice(0, 8);
}

/** Remove mockup images in dir that don't match any valid hash. */
export function cleanStale(dir, validHashes) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.png') && !f.endsWith('.jpg')) continue;
    if (!validHashes.some((h) => f.includes(h))) rmSync(resolve(dir, f), { force: true });
  }
}

/**
 *
 */
export function buildFiles(strategy, pfEntry, tplData, variantId, logoUrl) {
  const mapping = tplData.variant_mapping?.find((m) => m.variant_id === variantId)
    || tplData.variant_mapping?.[0];
  if (!mapping?.templates?.length) throw new Error('No template mapping');
  const tplMap = new Map(tplData.templates.map((t) => [t.template_id, t]));
  const files = [];

  if (strategy === 'allover') {
    const tplNames = new Set(mapping.templates.map((mt) => mt.placement));
    for (const mt of mapping.templates) {
      const tpl = tplMap.get(mt.template_id);
      if (!tpl) continue;
      let cf = pfEntry.files?.find((f) => f.placement === mt.placement);
      if (!cf) cf = pfEntry.files?.find((f) =>
        (f.placement === 'default' && mt.placement === 'front')
        || (f.placement === 'front' && mt.placement === 'default'));
      if (!cf?.url) continue;
      const pw = tpl.print_area_width, ph = tpl.print_area_height;
      files.push({ placement: mt.placement, image_url: cf.url,
        position: { area_width: pw, area_height: ph, width: pw, height: ph, top: 0, left: 0 } });
    }
    return files;
  }

  if (!logoUrl) throw new Error('No logo file URL available');
  for (const mt of mapping.templates) {
    const tpl = tplMap.get(mt.template_id);
    if (!tpl) continue;
    const cf = pfEntry?.files?.find((f) => f.placement === mt.placement);
    const pw = tpl.print_area_width, ph = tpl.print_area_height;
    let position;
    if (cf?.position) {
      const scale = pw / cf.position.area_width;
      const w = Math.round(cf.position.width * scale);
      const h = Math.round(cf.position.height * scale);
      position = { area_width: pw, area_height: ph, width: w, height: h,
        top: Math.round((ph - h) / 2), left: Math.round((pw - w) / 2) };
    } else {
      const logoRatio = 602 / 490;
      let w = Math.round(pw * 0.5);
      let h = Math.round(w / logoRatio);
      if (h > ph * 0.9) { h = Math.round(ph * 0.9); w = Math.round(h * logoRatio); }
      position = { area_width: pw, area_height: ph, width: w, height: h,
        top: Math.round((ph - h) / 2), left: Math.round((pw - w) / 2) };
    }
    files.push({ placement: mt.placement, image_url: logoUrl, position,
      ...(strategy === 'embroidery' && pfEntry.threadColor ? { thread_colors: pfEntry.threadColor } : {}) });
    break;
  }
  return files;
}

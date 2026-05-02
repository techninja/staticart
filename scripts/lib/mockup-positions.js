/**
 * Mockup position helpers — resolve placements and build file arrays.
 * @module scripts/lib/mockup-positions
 */

import { calcPosition } from './mockup-helpers.js';

/**
 * Resolve a catalog placement name to a template placement.
 * Handles default↔front mapping when the template uses different names.
 * @param {string} p - catalog placement
 * @param {Set<string>} tplNames - template placement names
 */
function resolvePlacement(p, tplNames) {
  if (tplNames.has(p)) return p;
  if (p === 'default' && tplNames.has('front')) return 'front';
  if (p === 'front' && tplNames.has('default')) return 'default';
  return p;
}

/** Build a position for a logo file, scaled proportionally to the template area. */
function logoPosition(pl, tpl, catPos) {
  const pw = tpl.print_area_width;
  const ph = tpl.print_area_height;
  const w = Math.round(pw * (catPos.width / catPos.area_width));
  const h = Math.round(w * (catPos.height / catPos.width));
  return {
    placement: pl,
    area_width: pw,
    area_height: ph,
    width: w,
    height: h,
    top: Math.round((ph - h) / 2),
    left: Math.round((pw - w) / 2),
  };
}

/** Build a full-coverage position filling the template's print area. */
function fillPosition(pl, tpl) {
  const pw = tpl.print_area_width;
  const ph = tpl.print_area_height;
  return { placement: pl, area_width: pw, area_height: ph, width: pw, height: ph, top: 0, left: 0 };
}

/**
 * Build the files array for a mockup task from catalog files + template data.
 * @param {any[]} catFiles - catalog entry files
 * @param {string} defaultUrl - fallback image URL
 * @param {Map<string, any>} placementTpls - placement → template lookup
 * @param {any} mapping - variant_mapping entry
 * @param {any} [logoFile] - sync variant's logo file (for calcPosition fallback)
 * @returns {{ placement: string, image_url: string, position: any }[]}
 */
export function buildMockupFiles(catFiles, defaultUrl, placementTpls, mapping, logoFile) {
  const tplNames = new Set(placementTpls.keys());
  const files = [];
  if (catFiles.length) {
    for (const cf of catFiles) {
      const pl = resolvePlacement(cf.placement || 'default', tplNames);
      const url = cf.url || defaultUrl;
      const tpl = placementTpls.get(pl) || placementTpls.values().next().value;
      if (!tpl) continue;
      const position = cf.position
        ? logoPosition(pl, tpl, cf.position)
        : cf.url
          ? fillPosition(pl, tpl)
          : null;
      if (position) files.push({ placement: pl, image_url: url, position });
    }
  }
  if (!files.length) {
    const tpl = placementTpls.values().next().value;
    const pl = mapping.templates[0].placement;
    const pos = calcPosition(tpl, logoFile, pl);
    files.push({ placement: pl, image_url: defaultUrl, position: pos });
  }
  return files;
}

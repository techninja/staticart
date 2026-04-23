/**
 * Catalog → Printful variant builder.
 * Resolves file configs, positions, thread colors from the catalog format
 * into Printful sync_variant payloads.
 * @module scripts/lib/printful-variants
 */

/**
 * Resolve catalog entry files config to Printful file objects.
 * Supports: { placement } or { files: [{ placement, url?, position? }] }
 */
function resolveFiles(entry, logoFileId) {
  return (entry.files || [{ placement: entry.placement || 'front' }]).map((f) => {
    const file = { type: f.placement };
    if (f.url) file.url = f.url;
    else file.id = logoFileId;
    if (f.position) file.position = f.position;
    return file;
  });
}

/** Resolve thread color options from catalog entry. */
function resolveOptions(entry) {
  if (!entry.threadColor) return [];
  const placements = entry.files
    ? entry.files.map((f) => f.placement)
    : [entry.placement || 'front'];
  const keys = new Set();
  for (const p of placements) {
    keys.add(`thread_colors${p.replace('embroidery', '')}`);
    keys.add('thread_colors');
  }
  return [...keys].map((id) => ({ id, value: entry.threadColor }));
}

/**
 * Build Printful sync_variants payload from catalog variants.
 * @param {any[]} variants - filtered Printful catalog variants
 * @param {any} entry - printful sub-entry from unified catalog
 * @param {number} logoFileId
 * @param {number} retail - resolved retail price (entry-level or product-level)
 */
export function buildSyncVariants(variants, entry, logoFileId, retail) {
  const files = resolveFiles(entry, logoFileId);
  const options = resolveOptions(entry);
  return variants.map((v) => {
    const sv = { variant_id: v.id, retail_price: retail.toFixed(2), files };
    if (options.length) sv.options = options;
    return sv;
  });
}

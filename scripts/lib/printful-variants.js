/**
 * Catalog → Printful variant builder.
 * Resolves file configs, positions, thread colors from the catalog format
 * into Printful sync_variant payloads.
 * @module scripts/lib/printful-variants
 */

/**
 * Resolve catalog entry files config to Printful file objects.
 * Legacy: { placement: "front" } or new: { files: [{ placement, url?, position? }] }
 */
function resolveFiles(product, logoFileId) {
  return (product.files || [{ placement: product.placement || 'front' }]).map((f) => {
    const file = { type: f.placement };
    if (f.url) file.url = f.url;
    else file.id = logoFileId;
    if (f.position) file.position = f.position;
    return file;
  });
}

/** Resolve thread color options from catalog entry. */
function resolveOptions(product) {
  if (!product.threadColor) return [];
  const placements = product.files
    ? product.files.map((f) => f.placement)
    : [product.placement || 'front'];
  const keys = new Set();
  for (const p of placements) {
    keys.add(`thread_colors${p.replace('embroidery', '')}`);
    keys.add('thread_colors');
  }
  return [...keys].map((id) => ({ id, value: product.threadColor }));
}

/** Build Printful sync_variants payload from catalog variants. */
export function buildSyncVariants(variants, product, logoFileId) {
  const files = resolveFiles(product, logoFileId);
  const options = resolveOptions(product);
  return variants.map((v) => {
    const sv = { variant_id: v.id, retail_price: product.retail.toFixed(2), files };
    if (options.length) sv.options = options;
    return sv;
  });
}

/**
 * Variant dimension helpers — cascading color/size selection.
 * @module utils/variantDimensions
 */

/**
 * Extract unique values for a dimension from variants.
 * @param {any[]} variants
 * @param {string} dim - 'color' or 'size'
 * @returns {string[]}
 */
export function uniqueValues(variants, dim) {
  const seen = new Set();
  return variants.filter((v) => v[dim] && !seen.has(v[dim]) && seen.add(v[dim])).map((v) => v[dim]);
}

/**
 * Filter variants by a partial selection.
 * @param {any[]} variants
 * @param {Record<string, string>} selection - e.g. { color: 'Black' }
 * @returns {any[]}
 */
export function filterVariants(variants, selection) {
  return variants.filter((v) =>
    Object.entries(selection).every(([k, val]) => !val || v[k] === val),
  );
}

/**
 * Find the exact variant matching a full selection.
 * @param {any[]} variants
 * @param {Record<string, string>} selection
 * @returns {any|undefined}
 */
export function findVariant(variants, selection) {
  return variants.find((v) => Object.entries(selection).every(([k, val]) => v[k] === val));
}

/**
 * Detect which dimensions a product's variants use.
 * @param {any[]} variants
 * @returns {string[]} e.g. ['color', 'size'] or ['color'] or []
 */
export function detectDimensions(variants) {
  const dims = [];
  if (variants.some((v) => v.color)) dims.push('color');
  if (variants.some((v) => v.size)) dims.push('size');
  return dims;
}

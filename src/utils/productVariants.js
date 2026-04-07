/**
 * Product variant helpers — resolve effective price and stock.
 * @module utils/productVariants
 */

/** @param {any} p @param {string} vid */
export function effectivePrice(p, vid) {
  if (!vid) return p.price;
  const v = /** @type {any[]} */ (p.variants).find((v) => v.id === vid);
  return v && v.price > 0 ? v.price : p.price;
}

/** @param {any} p @param {string} vid */
export function effectiveStock(p, vid) {
  if (!vid) return p.stock;
  return /** @type {any[]} */ (p.variants).find((v) => v.id === vid)?.stock ?? 0;
}

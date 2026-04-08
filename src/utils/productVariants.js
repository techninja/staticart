/**
 * Product variant helpers — resolve effective price and stock.
 * @module utils/productVariants
 */

import { t } from '#utils/i18n.js';

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

/** @param {number} stock */
export function stockLabel(stock) {
  if (stock <= 0) return t('product.outOfStock');
  if (stock <= 5) return t('product.lowStock');
  return t('product.inStock');
}

/** @param {number} stock */
export function stockColor(stock) {
  if (stock <= 0) return 'danger';
  if (stock <= 5) return 'warning';
  return 'success';
}

/** @param {string} json */
export function parseVariants(json) {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

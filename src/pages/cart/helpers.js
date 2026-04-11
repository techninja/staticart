/**
 * Cart helpers — shared logic for cart view.
 * @module pages/cart/helpers
 */

/**
 * @param {any[]} products @param {string} sku
 * @returns {any}
 */
export function findProduct(products, sku) {
  return products.find((p) => p.sku === sku);
}

/** @param {any[]} products @param {any[]} items @returns {number} */
export function subtotal(products, items) {
  return items.reduce((sum, item) => {
    const p = findProduct(products, item.sku);
    if (!p) return sum;
    const v = item.variantId ? p.variants.find((v) => v.id === item.variantId) : null;
    return sum + (v && v.price > 0 ? v.price : p.price) * item.quantity;
  }, 0);
}

/** @param {any[]} products @param {any[]} items @returns {any[]} */
export function buildLineItems(products, items) {
  return items
    .filter((i) => i.sku)
    .map((item) => {
      const p = findProduct(products, item.sku);
      const v = item.variantId ? (p?.variants || []).find((v) => v.id === item.variantId) : null;
      return {
        sku: item.sku,
        name: p?.name || item.sku,
        price: v && v.price > 0 ? v.price : p?.price || 0,
        currency: p?.currency || 'USD',
        quantity: item.quantity,
      };
    });
}

/** @param {any[]} products @param {any[]} items @returns {any[]} */
export function buildShippingItems(products, items) {
  return items.map((item) => {
    const p = findProduct(products, item.sku);
    return { price: p?.price || 0, quantity: item.quantity, metadata: p?.metadata || {} };
  });
}

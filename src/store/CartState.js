/**
 * CartState — localStorage-backed singleton for cart items.
 * @module store/CartState
 */

import { store } from 'hybrids';

/**
 * @typedef {Object} CartItem
 * @property {string} sku
 * @property {string} variantId
 * @property {number} quantity
 * @property {string} addedAt
 */

/**
 * @typedef {Object} CartState
 * @property {CartItem[]} items
 */

const STORAGE_KEY = 'staticart-cart';

/** @type {any} */
const CartState = {
  items: [{ sku: '', variantId: '', quantity: 0, addedAt: '' }],
  [store.connect]: {
    get: () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    },
    set: (id, values) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      return values;
    },
  },
};

export default CartState;

/**
 * Add an item or increment quantity if it already exists.
 * @param {any} state
 * @param {string} sku
 * @param {string} [variantId]
 * @param {number} [qty]
 * @returns {Promise}
 */
export function addToCart(state, sku, variantId = '', qty = 1) {
  const items = [...state.items];
  const idx = items.findIndex((i) => i.sku === sku && i.variantId === variantId);
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: items[idx].quantity + qty };
  } else {
    items.push({ sku, variantId, quantity: qty, addedAt: new Date().toISOString() });
  }
  return store.set(state, { items });
}

/**
 * Remove an item from the cart.
 * @param {any} state
 * @param {string} sku
 * @param {string} [variantId]
 * @returns {Promise}
 */
export function removeFromCart(state, sku, variantId = '') {
  const items = state.items.filter((i) => !(i.sku === sku && i.variantId === variantId));
  return store.set(state, { items });
}

/**
 * Set exact quantity for an item.
 * @param {any} state
 * @param {string} sku
 * @param {string} variantId
 * @param {number} quantity
 * @returns {Promise}
 */
export function updateQuantity(state, sku, variantId, quantity) {
  const items = state.items.map((i) =>
    i.sku === sku && i.variantId === variantId ? { ...i, quantity } : i,
  );
  return store.set(state, { items });
}

/** @param {any} state */
export function cartCount(state) {
  return state.items.filter((i) => i.sku).reduce((sum, i) => sum + i.quantity, 0);
}

/** @param {any} state */
export function clearCart(state) {
  return store.set(state, { items: [] });
}

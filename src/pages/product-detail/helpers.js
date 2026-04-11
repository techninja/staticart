/**
 * Product detail helpers — event handlers and UI fragments.
 * @module pages/product-detail/helpers
 */

import { html, store } from 'hybrids';
import { addToCart } from '#store/CartState.js';
import { t } from '#utils/i18n.js';

/** @param {number} s */
export function stockBadge(s) {
  const label = s <= 0 ? 'product.outOfStock' : s <= 5 ? 'product.lowStock' : 'product.inStock';
  const color = s <= 0 ? 'danger' : s <= 5 ? 'warning' : 'success';
  return html`<app-badge label="${t(label)}" color="${color}"></app-badge>`;
}

/** @param {any} host */
export function handleAdd(host) {
  if (!store.ready(host.cart) || !store.ready(host.product)) return;
  const { product: p, selectedVariant: vid, qty } = host;
  const stock = vid ? (p.variants.find((v) => v.id === vid)?.stock ?? 0) : p.stock;
  if (qty <= stock && stock > 0) addToCart(host.cart, p.sku, vid, qty);
}

/** @param {any} host */
export function handleVariantChange(host, e) { host.selectedVariant = e.target.value; host.qty = 1; }

/** @param {any} host */
export function handleQtyChange(host, e) { host.qty = Math.max(1, parseInt(e.target.value, 10) || 1); }

/** @param {any} host */
export function handleThumbClick(host, e) { host.activeImage = parseInt(e.target.dataset.index, 10) || 0; }

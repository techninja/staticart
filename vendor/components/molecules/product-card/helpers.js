/**
 * Product card helpers — event handlers for add-to-cart and variant picker.
 * @module components/molecules/product-card/helpers
 */

import { store } from 'hybrids';
import { addToCart } from '#store/CartState.js';
import { parseVariants } from '#utils/productVariants.js';
import { t } from '#utils/i18n.js';

/** @param {any} host @param {string} [label] */
export function showAdded(host, label) {
  host.addedLabel = label ? t('cart.addedVariant', { variant: label }) : t('cart.added');
  setTimeout(() => {
    host.addedLabel = '';
  }, 1500);
}

/** @param {any} host */
export function handleAdd(host) {
  if (!store.ready(host.cart) || host.addedLabel) return;
  const variants = parseVariants(host.variantsJson);
  if (variants.length > 0) {
    host.showVariants = true;
    return;
  }
  addToCart(host.cart, host.sku);
  showAdded(host);
}

/** @param {any} host @param {any} e */
export function handlePick(host, e) {
  const vid = e.target.dataset.vid;
  if (!vid || !store.ready(host.cart)) return;
  const variants = parseVariants(host.variantsJson);
  const picked = variants.find((v) => v.id === vid);
  addToCart(host.cart, host.sku, vid);
  host.showVariants = false;
  showAdded(host, picked?.label);
}

/** @param {any} host */
export function handleCancel(host) {
  host.showVariants = false;
}

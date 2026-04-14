/**
 * Product card helpers — multi-step variant picker (color → size → add).
 * @module components/molecules/product-card/helpers
 */

import { store } from 'hybrids';
import { addToCart } from '#store/CartState.js';
import { parseVariants } from '#utils/productVariants.js';
import { detectDimensions, uniqueValues, filterVariants } from '#utils/variantDimensions.js';
import { t } from '#utils/i18n.js';

/** @param {any} host @param {string} [label] */
export function showAdded(host, label) {
  host.addedLabel = label ? t('cart.addedVariant', { variant: label }) : t('cart.added');
  setTimeout(() => {
    host.addedLabel = '';
    host.variantStep = '';
    host.selectedColor = '';
  }, 1500);
}

/** @param {any} host */
export function handleAdd(host) {
  if (!store.ready(host.cart) || host.addedLabel) return;
  const variants = parseVariants(host.variantsJson);
  if (variants.length === 1) {
    addToCart(host.cart, host.sku, variants[0].id);
    showAdded(host, variants[0].label);
    return;
  }
  if (variants.length > 1) {
    const dims = detectDimensions(variants);
    host.variantStep = dims.includes('color') ? 'color' : 'pick';
    return;
  }
  addToCart(host.cart, host.sku);
  showAdded(host);
}

/** @param {any} host @param {any} e */
export function handlePickColor(host, e) {
  const color = e.target.dataset.color;
  if (!color) return;
  host.selectedColor = color;
  const variants = parseVariants(host.variantsJson);
  const forColor = filterVariants(variants, { color });
  // Swap card image to this color's variant image
  const colorImg = forColor.find((v) => v.image)?.image;
  if (colorImg) host.image = colorImg;
  const sizes = uniqueValues(forColor, 'size');
  if (sizes.length <= 1) {
    addToCart(host.cart, host.sku, forColor[0]?.id);
    showAdded(host, forColor[0]?.label);
  } else {
    host.variantStep = 'size';
  }
}

/** @param {any} host @param {any} e */
export function handlePickSize(host, e) {
  const size = e.target.dataset.size;
  if (!size || !store.ready(host.cart)) return;
  const variants = parseVariants(host.variantsJson);
  const match = variants.find((v) => v.color === host.selectedColor && v.size === size);
  if (match) {
    addToCart(host.cart, host.sku, match.id);
    showAdded(host, match.label);
  }
}

/** @param {any} host @param {any} e — flat pick for non-dimensional variants */
export function handlePick(host, e) {
  const vid = e.target.dataset.vid;
  if (!vid || !store.ready(host.cart)) return;
  const variants = parseVariants(host.variantsJson);
  const picked = variants.find((v) => v.id === vid);
  addToCart(host.cart, host.sku, vid);
  host.variantStep = '';
  showAdded(host, picked?.label);
}

/** @param {any} host */
export function handleCancel(host) {
  host.variantStep = '';
  host.selectedColor = '';
}

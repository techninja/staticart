/**
 * Variant selector — cascading color/size or flat fallback.
 * Pure render function — no host mutation. Auto-select via connect in the view.
 * @module pages/product-detail/variant-selector
 */

import { html } from 'hybrids';
import { t } from '#utils/i18n.js';
import {
  detectDimensions,
  uniqueValues,
  filterVariants,
  findVariant,
} from '#utils/variantDimensions.js';

/** @param {any} host */
export function selectColor(host, color) {
  host.selectedColor = color;
  host.selectedSize = '';
  host.qty = 1;
  autoSelectSize(host, color);
}

/** Auto-select size if only one option, and resolve variant. */
function autoSelectSize(host, color) {
  const variants = /** @type {any[]} */ (host.product.variants);
  const forColor = filterVariants(variants, { color });
  const sizes = uniqueValues(forColor, 'size');
  if (sizes.length <= 1) {
    host.selectedSize = sizes[0] || '';
    host.selectedVariant = forColor[0]?.id || '';
  } else {
    host.selectedVariant = '';
  }
}

/** @param {any} host */
function handleColorChange(host, e) {
  selectColor(host, e.target.value);
}

/** @param {any} host */
function handleSizeChange(host, e) {
  host.selectedSize = e.target.value;
  const variants = /** @type {any[]} */ (host.product.variants);
  const match = findVariant(variants, { color: host.selectedColor, size: host.selectedSize });
  host.selectedVariant = match?.id || '';
  host.qty = 1;
}

/** @param {any} host */
function handleFlatChange(host, e) {
  host.selectedVariant = e.target.value;
  host.qty = 1;
}

/** Check if a color has any purchasable variants. */
function colorInStock(variants, color) {
  return filterVariants(variants, { color }).some((v) => v.stock !== 0);
}

/** Check if a specific color+size variant is purchasable. */
function sizeInStock(variants, color, size) {
  const v = findVariant(variants, { color, size });
  return v && v.stock !== 0;
}

/** Render variant selectors — cascading if dimensions detected, flat otherwise. */
export function renderVariantSelector(host) {
  const variants = /** @type {any[]} */ (host.product.variants);
  if (!variants.length) return html``;
  const dims = detectDimensions(variants);

  if (!dims.includes('color')) {
    return html`
      <label class="product-detail__label">
        ${t('product.variant')}
        <select onchange="${handleFlatChange}">
          <option value="">${t('product.select')}</option>
          ${variants.map((v) => html`<option value="${v.id}">${v.label}</option>`)}
        </select>
      </label>
    `;
  }

  const colors = uniqueValues(variants, 'color');
  const color = host.selectedColor || colors[0] || '';
  const hasSizes = dims.includes('size');
  const sizes = color ? uniqueValues(filterVariants(variants, { color }), 'size') : [];

  return html`
    ${colors.length === 1
      ? html`<p class="product-detail__label">
          ${t('product.color')}: <strong>${colors[0]}</strong>
        </p>`
      : html`
          <label class="product-detail__label">
            ${t('product.color')}
            <select onchange="${handleColorChange}">
              ${colors.map((c) => {
                const oos = !colorInStock(variants, c);
                const label = oos ? `${c} — ${t('product.outOfStock')}` : c;
                return html`<option value="${c}" selected="${color === c}" disabled="${oos}">
                  ${label}
                </option>`;
              })}
            </select>
          </label>
        `}
    ${hasSizes &&
    sizes.length === 1 &&
    html`<p class="product-detail__label">${t('product.size')}: <strong>${sizes[0]}</strong></p>`}
    ${hasSizes &&
    sizes.length > 1 &&
    html`
      <label class="product-detail__label">
        ${t('product.size')}
        <select onchange="${handleSizeChange}">
          <option value="">${t('product.select')}</option>
          ${sizes.map((s) => {
            const oos = !sizeInStock(variants, color, s);
            const label = oos ? `${s} — ${t('product.outOfStock')}` : s;
            return html`<option
              value="${s}"
              selected="${host.selectedSize === s}"
              disabled="${oos}"
            >
              ${label}
            </option>`;
          })}
        </select>
      </label>
    `}
  `;
}

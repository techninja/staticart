/**
 * Variant selector — cascading color/size or flat fallback.
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
function handleColorChange(host, e) {
  host.selectedColor = e.target.value;
  host.selectedSize = '';
  host.selectedVariant = '';
  host.qty = 1;
  if (host.selectedColor) {
    const v = host.product.variants.find((v) => v.color === host.selectedColor);
    if (v?.image) {
      const idx = host.product.images.indexOf(v.image);
      host.activeImage = idx >= 0 ? idx : 0;
    }
  }
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

/** Render variant selectors — cascading if dimensions detected, flat otherwise. */
export function renderVariantSelector(host) {
  const variants = /** @type {any[]} */ (host.product.variants);
  if (!variants.length) return html``;
  const dims = detectDimensions(variants);
  if (dims.includes('color') && dims.includes('size')) {
    const colors = uniqueValues(variants, 'color');
    const sizes = host.selectedColor
      ? uniqueValues(filterVariants(variants, { color: host.selectedColor }), 'size')
      : [];
    return html`
      <label class="product-detail__label">
        ${t('product.color')}
        <select onchange="${handleColorChange}">
          <option value="">${t('product.select')}</option>
          ${colors.map(
            (c) => html`<option value="${c}" selected="${host.selectedColor === c}">${c}</option>`,
          )}
        </select>
      </label>
      ${sizes.length > 0 &&
      html`
        <label class="product-detail__label">
          ${t('product.size')}
          <select onchange="${handleSizeChange}">
            <option value="">${t('product.select')}</option>
            ${sizes.map(
              (s) => html`<option value="${s}" selected="${host.selectedSize === s}">${s}</option>`,
            )}
          </select>
        </label>
      `}
    `;
  }
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

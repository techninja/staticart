/**
 * Product card — image, name, price, multi-step variant select + add to cart.
 * @module components/molecules/product-card
 */

import { html, define, store } from 'hybrids';
import CartState from '#store/CartState.js';
import { formatPrice } from '#utils/formatPrice.js';
import { stockLabel, stockColor, parseVariants } from '#utils/productVariants.js';
import { uniqueValues, filterVariants } from '#utils/variantDimensions.js';
import { t } from '#utils/i18n.js';
import { handleAdd, handlePickColor, handlePickSize, handlePick, handleCancel } from './helpers.js';
import '#atoms/app-icon/app-icon.js';
import '#atoms/app-badge/app-badge.js';

/** @param {any} host */
function renderActions(host) {
  const { variantStep, selectedColor, addedLabel, stock, variantsJson } = host;
  if (addedLabel) return html`<span class="product-card__added">${addedLabel}</span>`;
  const variants = parseVariants(variantsJson);
  if (variantStep === 'color') {
    const colors = uniqueValues(variants, 'color');
    return html`<div class="product-card__variants">
      <button class="product-card__variants-close" onclick="${handleCancel}">✕</button>
      <div class="product-card__variants-row">
        ${colors.map((c) => {
          const oos = !filterVariants(variants, { color: c }).some((v) => v.stock !== 0);
          return html`<button
            class="btn btn-primary btn-sm"
            data-color="${c}"
            onclick="${handlePickColor}"
            disabled="${oos}"
          >
            ${c}
          </button>`;
        })}
      </div>
    </div>`;
  }
  if (variantStep === 'size') {
    const sizes = uniqueValues(filterVariants(variants, { color: selectedColor }), 'size');
    return html`<div class="product-card__variants">
      <button class="product-card__variants-close" onclick="${handleCancel}">✕</button>
      <div class="product-card__variants-row">
        ${sizes.map((s) => {
          const v = variants.find((v) => v.color === selectedColor && v.size === s);
          return html`<button
            class="btn btn-primary btn-sm"
            data-size="${s}"
            onclick="${handlePickSize}"
            disabled="${v?.stock === 0}"
          >
            ${s}
          </button>`;
        })}
      </div>
    </div>`;
  }
  if (variantStep === 'pick') {
    return html`<div class="product-card__variants">
      <button class="product-card__variants-close" onclick="${handleCancel}">✕</button>
      <div class="product-card__variants-row">
        ${variants.map(
          (v) =>
            html`<button
              class="btn btn-primary btn-sm"
              data-vid="${v.id}"
              onclick="${handlePick}"
              disabled="${v.stock === 0}"
            >
              ${v.label}
            </button>`,
        )}
      </div>
    </div>`;
  }
  return html`<button
    class="btn btn-primary product-card__add"
    onclick="${handleAdd}"
    disabled="${stock === 0}"
  >
    ${t('cart.add')}
  </button>`;
}

/** @type {import('hybrids').Component<any>} */
export default define({
  tag: 'product-card',
  sku: '',
  name: '',
  price: 0,
  currency: 'USD',
  image: '',
  stock: 0,
  detailUrl: '',
  variantsJson: '[]',
  variantStep: '',
  selectedColor: '',
  addedLabel: '',
  cart: store(CartState),
  render: {
    value: (host) => html`
      <article class="product-card">
        <a href="${host.detailUrl}" class="product-card__link">
          <div class="product-card__image">
            ${host.image
              ? html`<img src="${host.image}" alt="${host.name}" loading="lazy" />`
              : html`<app-icon
                  name="image"
                  size="xl"
                  class="product-card__placeholder"
                ></app-icon>`}
          </div>
          <h3 class="product-card__name">${host.name}</h3>
        </a>
        <div class="product-card__footer">
          <span class="product-card__price">${formatPrice(host.price, host.currency)}</span>
          <app-badge
            label="${stockLabel(host.stock)}"
            color="${stockColor(host.stock)}"
          ></app-badge>
        </div>
        <div class="product-card__actions">${renderActions(host)}</div>
      </article>
    `,
    shadow: false,
  },
});

/**
 * Product card — image, name, price, inline variant select + add to cart.
 * @module components/molecules/product-card
 */

import { html, define, store } from 'hybrids';
import CartState, { addToCart } from '#store/CartState.js';
import { formatPrice } from '#utils/formatPrice.js';
import { stockLabel, stockColor, parseVariants } from '#utils/productVariants.js';
import { t } from '#utils/i18n.js';
import '#atoms/app-icon/app-icon.js';
import '#atoms/app-badge/app-badge.js';

/**
 * @typedef {Object} ProductCardHost
 * @property {string} sku
 * @property {string} name
 * @property {number} price
 * @property {string} currency
 * @property {string} image
 * @property {number} stock
 * @property {string} detailUrl
 * @property {string} variantsJson
 * @property {boolean} showVariants
 * @property {string} addedLabel
 * @property {any} cart
 */

/** @param {string} json */
/** @param {ProductCardHost & HTMLElement} host @param {string} [label] */
function showAdded(host, label) {
  host.addedLabel = label ? t('cart.addedVariant', { variant: label }) : t('cart.added');
  setTimeout(() => {
    host.addedLabel = '';
  }, 1500);
}

/** @param {ProductCardHost & HTMLElement} host */
function handleAdd(host) {
  if (!store.ready(host.cart) || host.addedLabel) return;
  const variants = parseVariants(host.variantsJson);
  if (variants.length > 0) {
    host.showVariants = true;
    return;
  }
  addToCart(host.cart, host.sku);
  showAdded(host);
}

/** @param {ProductCardHost & HTMLElement} host */
function handlePick(host, e) {
  const vid = e.target.dataset.vid;
  if (!vid || !store.ready(host.cart)) return;
  const variants = parseVariants(host.variantsJson);
  const picked = variants.find((v) => v.id === vid);
  addToCart(host.cart, host.sku, vid);
  host.showVariants = false;
  showAdded(host, picked?.label);
}

/** @param {ProductCardHost & HTMLElement} host */
function handleCancel(host) {
  host.showVariants = false;
}

/** @type {import('hybrids').Component<ProductCardHost>} */
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
  showVariants: false,
  addedLabel: '',
  cart: store(CartState),
  render: {
    value: ({
      sku: _s,
      name,
      price,
      currency,
      image,
      stock,
      detailUrl,
      variantsJson,
      showVariants,
      addedLabel,
    }) => {
      const variants = parseVariants(variantsJson);
      return html`
        <article class="product-card">
          <a href="${detailUrl}" class="product-card__link">
            <div class="product-card__image">
              ${image
                ? html`<img src="${image}" alt="${name}" loading="lazy" />`
                : html`<app-icon name="image" size="xl" class="product-card__placeholder"></app-icon>`}
            </div>
            <h3 class="product-card__name">${name}</h3>
          </a>
          <div class="product-card__footer">
            <span class="product-card__price">${formatPrice(price, currency)}</span>
            <app-badge label="${stockLabel(stock)}" color="${stockColor(stock)}"></app-badge>
          </div>
          <div class="product-card__actions">
            ${addedLabel
              ? html`<span class="product-card__added">${addedLabel}</span>`
              : showVariants
                ? html`
                    <div class="product-card__variants">
                      <button class="product-card__variants-close" onclick="${handleCancel}">
                        ✕
                      </button>
                      <div class="product-card__variants-row">
                        ${variants.map(
                          (v) => html`
                            <button
                              class="btn btn-primary btn-sm"
                              data-vid="${v.id}"
                              onclick="${handlePick}"
                              disabled="${v.stock <= 0}"
                            >
                              ${v.label}
                            </button>
                          `,
                        )}
                      </div>
                    </div>
                  `
                : html`
                    <button
                      class="btn btn-primary product-card__add"
                      onclick="${handleAdd}"
                      disabled="${stock <= 0}"
                    >
                      ${t('cart.add')}
                    </button>
                  `}
          </div>
        </article>
      `;
    },
    shadow: false,
  },
});

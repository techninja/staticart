/**
 * Product card — image, name, price, stock badge, add to cart.
 * @module components/molecules/product-card
 */

import { html, define, store } from 'hybrids';
import CartState, { addToCart } from '#store/CartState.js';
import { formatPrice } from '#utils/formatPrice.js';
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
 * @property {any} cart
 */

/** @param {ProductCardHost & HTMLElement} host */
function handleAddToCart(host) {
  if (!store.ready(host.cart)) return;
  addToCart(host.cart, host.sku);
}

/** @param {number} stock */
function stockLabel(stock) {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 5) return 'Low Stock';
  return 'In Stock';
}

/** @param {number} stock */
function stockColor(stock) {
  if (stock <= 0) return 'danger';
  if (stock <= 5) return 'warning';
  return 'success';
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
  cart: store(CartState),
  render: {
    value: ({ sku: _sku, name, price, currency, image, stock, detailUrl }) => html`
      <article class="product-card">
        <a href="${detailUrl}" class="product-card__link">
          <div class="product-card__image">
            <img src="${image}" alt="${name}" loading="lazy" />
          </div>
          <h3 class="product-card__name">${name}</h3>
        </a>
        <div class="product-card__footer">
          <span class="product-card__price">${formatPrice(price, currency)}</span>
          <app-badge label="${stockLabel(stock)}" color="${stockColor(stock)}"></app-badge>
        </div>
        <button
          class="btn btn-primary product-card__add"
          onclick="${handleAddToCart}"
          disabled="${stock <= 0}"
        >
          Add to Cart
        </button>
      </article>
    `,
    shadow: false,
  },
});

/**
 * Cart item — line item in the cart with quantity controls.
 * @module components/molecules/cart-item
 */

import { html, define, store } from 'hybrids';
import CartState, { updateQuantity, removeFromCart } from '#store/CartState.js';
import { formatPrice } from '#utils/formatPrice.js';

/**
 * @typedef {Object} CartItemHost
 * @property {string} sku
 * @property {string} variantId
 * @property {string} name
 * @property {string} variantLabel
 * @property {number} price
 * @property {string} currency
 * @property {string} image
 * @property {number} quantity
 * @property {number} maxStock
 * @property {any} cart
 */

/** @param {CartItemHost & HTMLElement} host */
function handleIncrement(host) {
  if (!store.ready(host.cart) || host.quantity >= host.maxStock) return;
  updateQuantity(host.cart, host.sku, host.variantId, host.quantity + 1);
}

/** @param {CartItemHost & HTMLElement} host */
function handleDecrement(host) {
  if (!store.ready(host.cart) || host.quantity <= 1) return;
  updateQuantity(host.cart, host.sku, host.variantId, host.quantity - 1);
}

/** @param {CartItemHost & HTMLElement} host */
function handleRemove(host) {
  if (!store.ready(host.cart)) return;
  removeFromCart(host.cart, host.sku, host.variantId);
}

/** @type {import('hybrids').Component<CartItemHost>} */
export default define({
  tag: 'cart-item',
  sku: '',
  variantId: '',
  name: '',
  variantLabel: '',
  price: 0,
  currency: 'USD',
  image: '',
  quantity: 1,
  maxStock: 99,
  cart: store(CartState),
  render: {
    value: ({ name, variantLabel, price, currency, image, quantity }) => html`
      <div class="cart-item">
        <img class="cart-item__thumb" src="${image}" alt="${name}" />
        <div class="cart-item__info">
          <span class="cart-item__name">${name}</span>
          ${variantLabel && html`<span class="cart-item__variant">${variantLabel}</span>`}
        </div>
        <div class="cart-item__qty">
          <button class="btn btn-secondary btn-sm" onclick="${handleDecrement}">−</button>
          <span>${quantity}</span>
          <button class="btn btn-secondary btn-sm" onclick="${handleIncrement}">+</button>
        </div>
        <span class="cart-item__total">${formatPrice(price * quantity, currency)}</span>
        <button class="btn btn-secondary btn-sm" onclick="${handleRemove}">✕</button>
      </div>
    `,
    shadow: false,
  },
});

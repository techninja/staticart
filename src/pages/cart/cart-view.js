/**
 * Cart view — full cart page with item list, subtotal, checkout button.
 * @module pages/cart
 */

import { html, define, store, router } from 'hybrids';
import Product from '#store/Product.js';
import CartState from '#store/CartState.js';
import { formatPrice } from '#utils/formatPrice.js';
import { requestCheckout } from '#utils/checkout.js';
import '#molecules/cart-item/cart-item.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/**
 * @typedef {Object} CartViewHost
 * @property {any} cart
 * @property {any} products
 * @property {string} checkoutError
 * @property {boolean} checkingOut
 */

/**
 * Look up product data for a cart item.
 * @param {any[]} products
 * @param {string} sku
 */
function findProduct(products, sku) {
  return products.find((p) => p.sku === sku);
}

/** @param {any[]} products @param {any[]} items */
function subtotal(products, items) {
  return items.reduce((sum, item) => {
    const p = findProduct(products, item.sku);
    if (!p) return sum;
    const vid = item.variantId;
    const variants = /** @type {any[]} */ (p.variants);
    const v = vid ? variants.find((v) => v.id === vid) : null;
    const price = v && v.price > 0 ? v.price : p.price;
    return sum + price * item.quantity;
  }, 0);
}

/** @param {CartViewHost & HTMLElement} host */
async function handleCheckout(host) {
  if (!(/** @type {any} */ (store).ready(host.cart))) return;
  const items = /** @type {any[]} */ (host.cart.items);
  const prods = /** @type {any[]} */ (host.products);
  host.checkingOut = true;
  host.checkoutError = '';
  const lineItems = items.map((item) => {
    const p = findProduct(prods, item.sku);
    const variants = /** @type {any[]} */ (p?.variants || []);
    const v = item.variantId ? variants.find((v) => v.id === item.variantId) : null;
    return {
      sku: item.sku,
      name: p?.name || item.sku,
      price: v && v.price > 0 ? v.price : p?.price || 0,
      currency: p?.currency || 'USD',
      quantity: item.quantity,
    };
  });
  const result = await requestCheckout(lineItems);
  host.checkingOut = false;
  if (result.url) {
    window.location.href = result.url;
  } else {
    host.checkoutError = result.error || 'Checkout failed';
  }
}

/** @type {import('hybrids').Component<CartViewHost>} */
export default define({
  tag: 'cart-view',
  cart: store(CartState),
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  checkoutError: '',
  checkingOut: false,
  [router.connect]: { url: '/cart', stack: [] },
  render: {
    value: ({ cart, products, checkoutError, checkingOut }) => {
      const ready =
        /** @type {any} */ (store).ready(cart) && /** @type {any} */ (store).ready(products);
      if (!ready) return html`<p>Loading…</p>`;
      const items = /** @type {any[]} */ (cart.items);
      const prods = /** @type {any[]} */ (products);
      if (items.length === 0) {
        return html`
          <div class="cart-view">
            <h1>Your Cart</h1>
            <p class="cart-view__empty">Your cart is empty.</p>
            <a href="${router.url(CatalogView)}" class="btn btn-primary">Continue Shopping</a>
          </div>
        `;
      }
      const total = subtotal(prods, items);
      return html`
        <div class="cart-view">
          <h1>Your Cart</h1>
          ${items.map((item) => {
            const p = findProduct(prods, item.sku);
            if (!p) return html``;
            const variants = /** @type {any[]} */ (p.variants);
            const v = item.variantId ? variants.find((v) => v.id === item.variantId) : null;
            const price = v && v.price > 0 ? v.price : p.price;
            const stock = v ? v.stock : p.stock;
            return html`
              <cart-item
                sku="${item.sku}"
                variantId="${item.variantId}"
                name="${p.name}"
                variantLabel="${v ? v.label : ''}"
                price="${price}"
                currency="${p.currency}"
                image="${p.images[0] || ''}"
                quantity="${item.quantity}"
                maxStock="${stock}"
              ></cart-item>
            `;
          })}
          <div class="cart-view__footer">
            <span class="cart-view__subtotal">Subtotal: ${formatPrice(total)}</span>
            <button class="btn btn-primary" onclick="${handleCheckout}" disabled="${checkingOut}">
              ${checkingOut ? 'Processing…' : 'Proceed to Checkout'}
            </button>
          </div>
          ${checkoutError && html`<p class="error-message">${checkoutError}</p>`}
        </div>
      `;
    },
    shadow: false,
  },
});

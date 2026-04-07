/**
 * Order success — shown after Stripe redirect, clears cart.
 * @module pages/order-success
 */

import { html, define, store, router } from 'hybrids';
import CartState, { clearCart } from '#store/CartState.js';
import '#atoms/app-icon/app-icon.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/**
 * @typedef {Object} OrderSuccessHost
 * @property {any} cart
 * @property {boolean} cleared
 */

/** @type {import('hybrids').Component<OrderSuccessHost>} */
export default define({
  tag: 'order-success-view',
  cart: store(CartState),
  cleared: {
    value: false,
    connect(host) {
      if (store.ready(host.cart) && host.cart.items.length > 0) {
        clearCart(host.cart);
      }
      host.cleared = true;
    },
  },
  [router.connect]: { url: '/order/success', stack: [] },
  render: {
    value: () => html`
      <div class="order-result">
        <app-icon name="circle-check" size="lg"></app-icon>
        <h1>Order Confirmed!</h1>
        <p>Thank you for your purchase. You'll receive a confirmation email shortly.</p>
        <a href="${router.url(CatalogView)}" class="btn btn-primary">Continue Shopping</a>
      </div>
    `,
    shadow: false,
  },
});

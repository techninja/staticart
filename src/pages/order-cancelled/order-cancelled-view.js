/**
 * Order cancelled — shown if user cancels Stripe checkout.
 * @module pages/order-cancelled
 */

import { html, define, router } from 'hybrids';
import CartView from '#pages/cart/cart-view.js';

export default define({
  tag: 'order-cancelled-view',
  [router.connect]: { url: '/order/cancelled', stack: [] },
  render: {
    value: () => html`
      <div class="order-result">
        <h1>Checkout Cancelled</h1>
        <p>Your cart is still saved. You can return to it anytime.</p>
        <a href="${router.url(CartView)}" class="btn btn-primary">Back to Cart</a>
      </div>
    `,
    shadow: false,
  },
});

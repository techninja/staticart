/**
 * Order cancelled — shown if user cancels Stripe checkout.
 * @module pages/order-cancelled
 */

import { html, define, router } from 'hybrids';
import { t } from '#utils/i18n.js';
import '#atoms/app-icon/app-icon.js';
import CartView from '#pages/cart/cart-view.js';

export default define({
  tag: 'order-cancelled-view',
  [router.connect]: { url: '/shop/order/cancelled', stack: [] },
  render: {
    value: () => html`
      <div class="order-result">
        <app-icon name="circle-x" size="lg"></app-icon>
        <h1>${t('order.cancelled')}</h1>
        <p>${t('order.cancelledMsg')}</p>
        <a href="${router.url(CartView)}" class="btn btn-primary">${t('order.backToCart')}</a>
      </div>
    `,
    shadow: false,
  },
});

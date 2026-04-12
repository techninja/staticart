/**
 * Order success — shown after Stripe redirect, clears cart, saves user info.
 * @module pages/order-success
 */

import { html, define, store, router } from 'hybrids';
import CartState, { clearCart } from '#store/CartState.js';
import UserPrefs, { saveUserInfo } from '#store/UserPrefs.js';
import { t } from '#utils/i18n.js';
import '#atoms/app-icon/app-icon.js';
import { getApiBase } from '#utils/storeConfig.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/**
 * @typedef {Object} OrderSuccessHost
 * @property {any} cart
 * @property {any} prefs
 * @property {boolean} cleared
 * @property {string} customerName
 */

/** @param {OrderSuccessHost & HTMLElement} host */
async function fetchSession(host) {
  const sessionId = sessionStorage.getItem('stripe_session_id');
  sessionStorage.removeItem('stripe_session_id');
  if (!sessionId) return;
  try {
    const res = await fetch(`${getApiBase()}/session/${sessionId}`);
    if (!res.ok) return;
    const { email, name } = await res.json();
    if (store.ready(host.prefs) && email) saveUserInfo(host.prefs, name, email);
    if (name) host.customerName = name;
  } catch {
    /* session lookup is best-effort */
  }
}

/** @type {import('hybrids').Component<OrderSuccessHost>} */
export default define({
  tag: 'order-success-view',
  cart: store(CartState),
  prefs: store(UserPrefs),
  customerName: '',
  cleared: {
    value: false,
    connect(host, _key, invalidate) {
      if (store.ready(host.cart) && host.cart.items.length > 0) clearCart(host.cart);
      fetchSession(host).then(() => invalidate());
      host.cleared = true;
    },
  },
  [router.connect]: { url: '/order/success', stack: [] },
  render: {
    value: ({ customerName }) => html`
      <div class="order-result">
        <app-icon name="circle-check" size="lg"></app-icon>
        <h1>${t('order.confirmed')}</h1>
        <p>${customerName ? t('order.thanksName', { name: customerName }) : t('order.thanks')}</p>
        <a href="${router.url(CatalogView)}" class="btn btn-primary"
          >${t('order.continueShopping')}</a
        >
      </div>
    `,
    shadow: false,
  },
});

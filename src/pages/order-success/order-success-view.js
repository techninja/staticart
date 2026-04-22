/**
 * Order success — shown after Stripe redirect, clears cart, saves user info.
 * @module pages/order-success
 */

import { html, define, store, router } from 'hybrids';
import CartState, { clearCart } from '#store/CartState.js';
import UserPrefs, { saveUserInfo } from '#store/UserPrefs.js';
import { t } from '#utils/i18n.js';
import '#atoms/app-icon/app-icon.js';
import '#molecules/passkey-prompt/passkey-prompt.js';
import { getApiBase } from '#utils/storeConfig.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/**
 * @typedef {Object} OrderSuccessHost
 * @property {any} cart
 * @property {any} prefs
 * @property {boolean} ready
 * @property {string} customerName
 * @property {string} orderStatus
 */

/** @param {OrderSuccessHost & HTMLElement} host */
async function fetchSession(host) {
  const sessionId = sessionStorage.getItem('stripe_session_id');
  sessionStorage.removeItem('stripe_session_id');
  if (!sessionId) {
    host.ready = true;
    return;
  }
  try {
    const res = await fetch(`${getApiBase()}/session/${sessionId}`);
    if (!res.ok) {
      host.ready = true;
      return;
    }
    const data = await res.json();
    if (store.ready(host.prefs) && data.email) saveUserInfo(host.prefs, data.name, data.email);
    if (data.name) host.customerName = data.name;
    if (data.orderStatus) host.orderStatus = data.orderStatus;
  } catch {
    /* best-effort */
  }
  host.ready = true;
}

/** @type {import('hybrids').Component<OrderSuccessHost>} */
export default define({
  tag: 'order-success-view',
  cart: store(CartState),
  prefs: store(UserPrefs),
  customerName: '',
  orderStatus: 'paid',
  ready: {
    value: false,
    connect(host, _key, invalidate) {
      if (store.ready(host.cart) && host.cart.items.length > 0) clearCart(host.cart);
      fetchSession(host).then(() => invalidate());
    },
  },
  [router.connect]: { url: '/shop/order/success', stack: [] },
  render: {
    value: (host) => {
      if (!host.ready) {
        return html`<div class="loading-overlay"><span class="spinner"></span></div>`;
      }
      const { customerName, orderStatus, prefs } = host;
      const failed = orderStatus === 'refunded-fulfillment-failed';
      const icon = failed ? 'circle-x' : 'circle-check';
      const heading = failed ? t('order.failed') : t('order.confirmed');
      const message = failed
        ? t('order.refunded')
        : customerName
          ? t('order.thanksName', { name: customerName })
          : t('order.thanks');
      return html`
        <div class="order-result">
          <app-icon name="${icon}" size="lg"></app-icon>
          <h1>${heading}</h1>
          <p>${message}</p>
          ${!failed &&
          html`<passkey-prompt
            email="${store.ready(prefs) ? prefs.email : ''}"
            name="${store.ready(prefs) ? prefs.displayName : ''}"
          ></passkey-prompt>`}
          <a href="${router.url(CatalogView)}" class="btn btn-primary"
            >${t('order.continueShopping')}</a
          >
        </div>
      `;
    },
    shadow: false,
  },
});

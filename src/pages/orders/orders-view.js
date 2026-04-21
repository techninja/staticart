/**
 * Orders page — shows order history for authenticated users.
 * @module pages/orders
 */

import { html, define, store, router } from 'hybrids';
import UserPrefs from '#store/UserPrefs.js';
import { formatPrice } from '#utils/formatPrice.js';
import { t } from '#utils/i18n.js';
import { getApiBase } from '#utils/storeConfig.js';
import { isAuthenticated, getToken, getTokenEmail, getTokenName } from '#utils/passkey.js';
import CatalogView from '#pages/catalog/catalog-view.js';
import '#molecules/passkey-login/passkey-login.js';

/**
 * @typedef {Object} OrdersViewHost
 * @property {any} prefs
 * @property {any[]} orders
 * @property {boolean} loading
 * @property {string} error
 */

/** @param {OrdersViewHost & HTMLElement} host */
async function fetchOrders(host) {
  host.loading = true;
  host.error = '';
  try {
    const res = await fetch(`${getApiBase()}/orders`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 401) {
      host.error = t('passkey.loginError');
      host.loading = false;
      return;
    }
    const body = await res.json();
    const orders = body.orders || [];
    host.orders = orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (!host.orders.length) host.error = t('orders.noOrders');
  } catch {
    host.error = 'Failed to load orders.';
  }
  host.loading = false;
}

/** @param {OrdersViewHost & HTMLElement} host */
function handleAuthenticated(host) {
  fetchOrders(host);
}

/** @type {import('hybrids').Component<OrdersViewHost>} */
export default define({
  tag: 'orders-view',
  prefs: store(UserPrefs),
  orders: {
    value: [],
    connect(host, _key, invalidate) {
      if (isAuthenticated()) fetchOrders(host).then(() => invalidate());
    },
  },
  loading: false,
  error: '',
  [router.connect]: { url: '/orders', stack: [] },
  render: {
    value: ({ prefs, orders, loading, error }) => {
      if (!isAuthenticated()) {
        return html`
          <div class="orders-view">
            <h1>${t('orders.title')}</h1>
            <p>${t('orders.noAccount')}</p>
            <passkey-login onauthenticated="${handleAuthenticated}"></passkey-login>
            <a href="${router.url(CatalogView)}" class="btn btn-secondary btn-icon">
              <app-icon name="store" size="sm"></app-icon> ${t('orders.startShopping')}</a
            >
          </div>
        `;
      }
      const displayName = getTokenName() || getTokenEmail();
      return html`
        <div class="orders-view">
          <h1>${t('orders.title')}</h1>
          <p class="orders-view__email">${t('orders.ordersFor', { name: displayName })}</p>
          ${loading && html`<p>${t('general.loading')}</p>`}
          ${error && html`<p class="error-message">${error}</p>`}
          ${!loading &&
          orders.length > 0 &&
          html`
            <div class="orders-view__list">
              ${orders.map(
                (o) => html`
                  <div class="orders-view__item">
                    <span class="orders-view__id">#${o.orderId.slice(0, 8)}…</span>
                    <span>${o.itemCount} item${o.itemCount !== 1 ? 's' : ''}</span>
                    <span class="orders-view__total">${formatPrice(o.totalCents, o.currency)}</span>
                    <span class="badge badge-${o.status === 'paid' ? 'success' : 'info'}">
                      ${o.status}
                    </span>
                    <span class="orders-view__date">
                      ${new Date(o.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                `,
              )}
            </div>
          `}
        </div>
      `;
    },
    shadow: false,
  },
});

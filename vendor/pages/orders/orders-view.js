/**
 * Orders page — shows order history for logged-in users.
 * @module pages/orders
 */

import { html, define, store, router } from 'hybrids';
import UserPrefs from '#store/UserPrefs.js';
import { formatPrice } from '#utils/formatPrice.js';
import { t } from '#utils/i18n.js';
import { getApiBase } from '#utils/storeConfig.js';
import CatalogView from '#pages/catalog/catalog-view.js';
import '#molecules/passkey-login/passkey-login.js';
import { getToken } from '#molecules/passkey-login/passkey-login.js';

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
    const token = getToken();
    const res = await fetch(`${getApiBase()}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { host.error = t('passkey.loginError'); host.loading = false; return; }
    const body = await res.json();
    host.orders = body.orders || [];
    if (host.orders.length === 0) host.error = t('orders.noOrders');
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
  orders: { value: [], connect: () => {} },
  loading: false,
  error: '',
  [router.connect]: { url: '/orders', stack: [] },
  render: {
    value: ({ prefs, orders, loading, error }) => {
      if (!store.ready(prefs)) return html`<p>${t('general.loading')}</p>`;
      if (!getToken()) {
        return html`
          <div class="orders-view">
            <h1>${t('orders.title')}</h1>
            <p>${t('orders.noAccount')}</p>
            <passkey-login onauthenticated="${handleAuthenticated}"></passkey-login>
            <a href="${router.url(CatalogView)}" class="btn btn-secondary"
              >${t('orders.startShopping')}</a
            >
          </div>
        `;
      }
      return html`
        <div class="orders-view">
          <h1>${t('orders.title')}</h1>
          <p class="orders-view__email">Orders for ${prefs.displayName || prefs.email}</p>
          ${loading && html`<p>${t('general.loading')}</p>`}
          ${error && html`<p class="error-message">${error}</p>`}
          ${!loading &&
          !error &&
          orders.length === 0 &&
          html`<button
            class="btn btn-primary"
            onclick="${(host) => fetchOrders(host)}"
          >
            ${t('orders.load')}
          </button>`}
          ${Array.isArray(orders) &&
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

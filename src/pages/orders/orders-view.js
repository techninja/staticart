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

/**
 * @typedef {Object} OrdersViewHost
 * @property {any} prefs
 * @property {any[]} orders
 * @property {boolean} loading
 * @property {string} error
 */

/** @param {OrdersViewHost & HTMLElement} host @param {string} email */
async function fetchOrders(host, email) {
  host.loading = true;
  host.error = '';
  try {
    const res = await fetch(`${getApiBase()}/orders?email=${encodeURIComponent(email)}`);
    const body = await res.json();
    host.orders = body.orders || [];
    if (host.orders.length === 0) host.error = t('orders.noOrders');
  } catch {
    host.error = 'Failed to load orders.';
  }
  host.loading = false;
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
      if (!prefs.email) {
        return html`
          <div class="orders-view">
            <h1>${t('orders.title')}</h1>
            <p>${t('orders.noAccount')}</p>
            <a href="${router.url(CatalogView)}" class="btn btn-primary"
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
            onclick="${(host) => fetchOrders(host, prefs.email)}"
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

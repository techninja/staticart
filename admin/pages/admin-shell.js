/**
 * Admin shell — sidebar nav + content area with hybrids router.
 * Detects provider vs standalone mode for conditional nav.
 * @module admin/pages/admin-shell
 */

import { html, define, router } from 'hybrids';
import DashboardView from './dashboard.js';
import ProductListView from './product-list.js';
import CatalogBrowseView from './catalog-browse.js';
import StockManagerView from './stock-manager.js';
import OrderListView from './order-list.js';
import StandaloneProductListView from './standalone-product-list.js';

async function detectMode(host) {
  try {
    const res = await fetch('/admin/api/mode');
    if (res.ok) host.mode = (await res.json()).mode;
  } catch { host.mode = 'provider'; }
}

function navItem(View, label) {
  const href = router.url(View);
  const active = location.pathname === href.pathname;
  return html`<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
}

export default define({
  tag: 'admin-shell',
  mode: { value: '', connect(host, _k, inv) { detectMode(host).then(inv); } },
  stack: router(DashboardView, { url: '/admin' }),
  render: {
    value: ({ stack, mode }) => html`
      <nav>
        <div class="nav-title">
          <img src="/favicon.svg" alt="" class="nav-logo" />
          StatiCart Admin
        </div>
        ${navItem(DashboardView, 'Dashboard')}
        ${mode === 'standalone'
          ? html`${navItem(StandaloneProductListView, 'Products')}`
          : html`
            ${navItem(ProductListView, 'Products')}
            ${navItem(CatalogBrowseView, 'Browse Catalog')}
          `}
        ${navItem(StockManagerView, 'Stock')}
        ${navItem(OrderListView, 'Orders')}
      </nav>
      <main>${stack}</main>
    `,
    shadow: false,
  },
});

/**
 * Admin dashboard — overview with stat cards + deploy sync status.
 * @module admin/pages/dashboard
 */

import { html, define, router } from 'hybrids';
import '../components/stat-card.js';
import ProductListView from './product-list.js';
import CatalogBrowseView from './catalog-browse.js';
import CatalogAddView from './catalog-add.js';
import ProductDetailView from './product-detail.js';
import StockManagerView from './stock-manager.js';
import OrderListView from './order-list.js';

/**
 *
 */
async function loadStats(host) {
  try {
    const [productsRes, stockRes, ordersRes, deployRes] = await Promise.all([
      fetch('/admin/api/products'),
      fetch('/admin/api/stock'),
      fetch('/admin/api/orders?limit=5'),
      fetch('/admin/api/deploy/status'),
    ]);
    const products = await productsRes.json();
    const stock = await stockRes.json();
    host.orders = await ordersRes.json();
    host.deploy = deployRes.ok ? await deployRes.json() : null;
    const variants = products.reduce((n, p) => n + (p.variants?.length || 0), 0);
    const alerts = stock.filter((s) => s.stock === 0).length;
    host.stats = { products: products.length, variants, alerts };
  } catch (e) { console.error('Dashboard load error:', e); }
}

/**
 *
 */
function deployCard(d) {
  if (!d) return html`<stat-card label="Deploy" value="—"></stat-card>`;
  if (!d.deployed) return html`<stat-card label="Deploy" value="Not live" alert="true"></stat-card>`;
  if (d.inSync) return html`<stat-card label="Deploy" value="In sync"></stat-card>`;
  const changes = d.added.length + d.changed.length + d.removed.length;
  return html`<stat-card label="Deploy" value="${changes} pending" alert="true"></stat-card>`;
}

/**
 *
 */
function deployDetail(d) {
  if (!d || !d.deployed || d.inSync) return html``;
  return html`
    <div class="deploy-detail">
      ${d.added.length ? html`<div class="deploy-row add">+ ${d.added.join(', ')}</div>` : html``}
      ${d.changed.length ? html`<div class="deploy-row change">~ ${d.changed.join(', ')}</div>` : html``}
      ${d.removed.length ? html`<div class="deploy-row remove">- ${d.removed.join(', ')}</div>` : html``}
    </div>
  `;
}

export default define({
  tag: 'admin-dashboard',
  [router.connect]: {
    url: '',
    stack: [ProductListView, CatalogBrowseView, CatalogAddView, ProductDetailView, StockManagerView, OrderListView],
  },
  stats: { value: undefined, connect(host, _k, inv) { loadStats(host).then(inv); } },
  orders: { value: [] },
  deploy: { value: undefined },
  render: {
    value: ({ stats, orders, deploy }) => html`
      <h1 class="page-title">Dashboard</h1>
      ${stats ? html`
        <div class="stat-grid">
          <stat-card label="Products" value="${stats.products}"></stat-card>
          <stat-card label="Variants" value="${stats.variants}"></stat-card>
          <stat-card label="Stock Alerts" value="${stats.alerts}" alert="${stats.alerts > 0}"></stat-card>
          ${deployCard(deploy)}
        </div>
        ${deployDetail(deploy)}
      ` : html`<p class="loading">Loading…</p>`}
      <h2 style="font-size:1.1rem;margin-bottom:0.5rem">Recent Orders</h2>
      ${orders.length ? html`
        <div class="orders-list">
          ${orders.map((o) => html`
            <div class="order-row">
              <span>${o.PK || o.id}</span>
              <span>${o.email || ''}</span>
              <span>${o.status || ''}</span>
            </div>
          `)}
        </div>
      ` : html`<p class="loading">${stats ? 'No orders yet' : 'Loading…'}</p>`}
    `,
    shadow: false,
  },
});

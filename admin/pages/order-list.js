/**
 * Order list — browse all orders from DynamoDB.
 * @module admin/pages/order-list
 */

import { html, define, router } from 'hybrids';
import OrderDetailView from './order-detail.js';

async function loadOrders(host) {
  try {
    const res = await fetch('/admin/api/orders?limit=50');
    host.orders = { items: await res.json() };
  } catch (e) { console.error(e); }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCents(cents, currency) {
  if (!cents) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function statusClass(s) {
  if (s === 'paid') return 'badge ok';
  if (s?.includes('refund')) return 'badge warn';
  return 'badge';
}

function orderRow(o) {
  const id = (o.PK || '').replace('ORDER#', '');
  const shortId = id.length > 20 ? `…${id.slice(-12)}` : id;
  return html`
    <tr>
      <td><a href="${router.url(OrderDetailView, { id })}">${shortId}</a></td>
      <td>${o.email || '—'}</td>
      <td><span class="${statusClass(o.status)}">${o.status || '—'}</span></td>
      <td>${formatCents(o.totalCents, o.currency)}</td>
      <td>${(o.items || []).length}</td>
      <td>${formatDate(o.createdAt)}</td>
    </tr>
  `;
}

export default define({
  tag: 'order-list',
  [router.connect]: { url: '/admin/orders', stack: [OrderDetailView] },
  orders: {
    value: { items: [] },
    connect(host, _k, inv) { loadOrders(host).then(inv); },
  },
  render: {
    value: ({ orders }) => html`
      <h1 class="page-title">Orders</h1>
      ${orders.items.length ? html`
        <table class="admin-table">
          <thead><tr><th>Order</th><th>Email</th><th>Status</th><th>Total</th><th>Items</th><th>Date</th></tr></thead>
          <tbody>${orders.items.map(orderRow)}</tbody>
        </table>
      ` : html`<p class="loading">Loading orders…</p>`}
    `,
    shadow: false,
  },
});

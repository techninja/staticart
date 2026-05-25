/**
 * Order detail — single order view with items and fulfillment info.
 * @module admin/pages/order-detail
 */

import { html, define, router } from 'hybrids';

async function loadOrder(host) {
  if (!host.id) return;
  try {
    const res = await fetch(`/admin/api/orders/${encodeURIComponent(host.id)}`);
    if (res.ok) host.state = { order: await res.json() };
  } catch (e) { console.error(e); }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function itemRow(item) {
  return html`<tr>
    <td>${item.sku || '—'}</td>
    <td>${item.name || item.sku || '—'}</td>
    <td>${item.quantity || 1}</td>
  </tr>`;
}

export default define({
  tag: 'order-detail',
  [router.connect]: { url: '/admin/order/:id' },
  id: '',
  state: {
    value: { order: undefined },
    connect(host, _k, inv) { loadOrder(host).then(inv); },
  },
  render: {
    value: ({ id, state }) => {
      const o = state.order;
      if (!id) return html`<p>No order ID.</p>`;
      if (!o) return html`<p class="loading">Loading order…</p>`;
      const shortId = id.length > 20 ? `…${id.slice(-16)}` : id;
      return html`
        <h1 class="page-title">Order ${shortId}</h1>
        <div class="detail-card">
          <div class="detail-grid">
            <div><strong>Email:</strong> ${o.email || '—'}</div>
            <div><strong>Status:</strong> <span class="badge ${o.status === 'paid' ? 'ok' : ''}">${o.status}</span></div>
            <div><strong>Total:</strong> $${((o.totalCents || 0) / 100).toFixed(2)} ${o.currency || 'USD'}</div>
            <div><strong>Date:</strong> ${formatDate(o.createdAt)}</div>
            <div><strong>Payment:</strong> ${o.stripePaymentId || '—'}</div>
          </div>
        </div>
        ${(o.items || []).length ? html`
          <h3 style="margin-bottom:0.5rem">Items</h3>
          <table class="admin-table">
            <thead><tr><th>SKU</th><th>Name</th><th>Qty</th></tr></thead>
            <tbody>${o.items.map(itemRow)}</tbody>
          </table>
        ` : html``}
      `;
    },
    shadow: false,
  },
});

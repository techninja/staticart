/**
 * Stock manager — table of SKUs with inline stock editing.
 * @module admin/pages/stock-manager
 */

import { html, define, router } from 'hybrids';

/** @param {any} host */
async function loadStock(host) {
  try {
    const [stockRes, productsRes] = await Promise.all([
      fetch('/admin/api/stock'),
      fetch('/admin/api/products'),
    ]);
    const stock = await stockRes.json();
    const products = await productsRes.json();
    const nameMap = {};
    for (const p of products) {
      nameMap[p.sku] = p.name;
      for (const v of p.variants || []) nameMap[v.sku] = `${p.name} — ${v.label}`;
    }
    host.rows = stock.map((s) => ({ ...s, name: nameMap[s.sku] || s.sku, edited: false, saving: false }));
  } catch (e) {
    console.error('Stock load error:', e);
  }
}

/** @param {any} host */
function handleInput(host, e) {
  const sku = e.target.dataset.sku;
  const val = parseInt(e.target.value, 10);
  host.rows = host.rows.map((r) => (r.sku === sku ? { ...r, stock: val, edited: true } : r));
}

/** @param {any} host */
async function handleSave(host, e) {
  const sku = e.target.dataset.sku;
  const row = host.rows.find((r) => r.sku === sku);
  if (!row) return;
  host.rows = host.rows.map((r) => (r.sku === sku ? { ...r, saving: true } : r));
  try {
    await fetch(`/admin/api/stock/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: row.stock }),
    });
    host.rows = host.rows.map((r) => (r.sku === sku ? { ...r, edited: false, saving: false } : r));
  } catch {
    host.rows = host.rows.map((r) => (r.sku === sku ? { ...r, saving: false } : r));
  }
}

/** @param {any} row */
function stockCell(row) {
  if (row.stock === -1) return html`<span class="unlimited">Unlimited</span>`;
  return html`<input type="number" value="${row.stock}" min="-1" data-sku="${row.sku}" oninput="${handleInput}" />`;
}

export default define({
  tag: 'stock-manager',
  [router.connect]: { url: '/admin/stock' },
  rows: {
    value: /** @type {any[]} */ ([]),
    connect(host, _key, invalidate) {
      loadStock(host).then(invalidate);
    },
  },
  render: {
    value: ({ rows }) => html`
      <h1 class="page-title">Stock Management</h1>
      ${rows.length
        ? html`
            <table class="admin-table">
              <thead>
                <tr><th>SKU</th><th>Product</th><th>Stock</th><th></th></tr>
              </thead>
              <tbody>
                ${rows.map(
                  (r) => html`
                    <tr>
                      <td>${r.sku}</td>
                      <td>${r.name}</td>
                      <td>${stockCell(r)}</td>
                      <td>
                        ${r.stock !== -1
                          ? html`<button class="btn-sm ${r.saving ? 'saving' : ''}" data-sku="${r.sku}"
                              onclick="${handleSave}" disabled="${!r.edited || r.saving}">
                              ${r.saving ? 'Saving…' : 'Save'}
                            </button>`
                          : html``}
                      </td>
                    </tr>
                  `,
                )}
              </tbody>
            </table>
          `
        : html`<p class="loading">Loading stock data…</p>`}
    `,
    shadow: false,
  },
});

/**
 * Standalone product list — CRUD for products.json directly.
 * @module admin/pages/standalone-product-list
 */

import { html, define, router } from 'hybrids';

/**
 *
 */
async function loadProducts(host) {
  try {
    const res = await fetch('/admin/api/standalone/products');
    if (res.ok) host.products = await res.json();
  } catch (e) { console.error(e); }
}

/**
 *
 */
function openDetail(host, e) {
  const sku = e.currentTarget.dataset.sku;
  router.resolve(e, { url: `/admin/standalone/product/${sku}` });
}

/**
 *
 */
async function addProduct(host) {
  const sku = prompt('SKU (e.g. WIDGET):');
  if (!sku) return;
  const name = prompt('Product name:');
  if (!name) return;
  const res = await fetch('/admin/api/standalone/products', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, name, price: 0, variants: [] }),
  });
  if (res.ok) host.products = [...host.products, await res.json()];
}

/**
 *
 */
async function deleteProduct(host, e) {
  e.stopPropagation();
  const sku = e.currentTarget.dataset.sku;
  if (!confirm(`Delete ${sku}?`)) return;
  await fetch(`/admin/api/standalone/products/${sku}`, { method: 'DELETE' });
  host.products = host.products.filter((p) => p.sku !== sku);
}

export default define({
  tag: 'standalone-product-list',
  [router.connect]: { url: '/admin/products' },
  products: { value: [], connect(host, _k, inv) { loadProducts(host).then(inv); } },
  render: {
    value: ({ products }) => html`
      <h1 class="page-title">Products (Standalone)</h1>
      <button class="btn-primary" onclick="${addProduct}">+ Add Product</button>
      <div class="product-grid">
        ${products.map((p) => html`
          <div class="product-card" data-sku="${p.sku}" onclick="${openDetail}">
            <div class="pc-name">${p.name}</div>
            <div class="pc-meta">${p.sku} · ${p.variants?.length || 0} variants · $${p.price || 0}</div>
            <button class="btn-sm btn-back" data-sku="${p.sku}" onclick="${deleteProduct}">×</button>
          </div>
        `)}
      </div>
    `,
    shadow: false,
  },
});

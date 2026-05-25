/**
 * Product list — grid of all catalog entries merged with synced product data.
 * Links to product detail page. Shows sync status per product.
 * @module admin/pages/product-list
 */

import { html, define, router } from 'hybrids';
import ProductDetailView from './product-detail.js';

async function loadProducts(host) {
  try {
    const [productsRes, catalogRes, stateRes] = await Promise.all([
      fetch('/admin/api/products'), fetch('/admin/api/catalog'), fetch('/admin/api/state'),
    ]);
    const synced = await productsRes.json();
    const catalog = await catalogRes.json();
    const stateData = stateRes.ok ? await stateRes.json() : { products: [] };
    const prefix = catalog.skuPrefix || 'SM';
    const syncedBySku = new Map(synced.map((p) => [p.sku, p]));
    const stateMap = new Map((stateData.products || []).map((s) => [s.sku, s]));
    host.items = catalog.products.map((entry) => {
      const fullSku = `${prefix}-${entry.sku}`;
      const product = syncedBySku.get(fullSku);
      syncedBySku.delete(fullSku);
      const ps = stateMap.get(entry.sku) || {};
      return { entry, product, sku: entry.sku, fullSku, synced: !!product, state: ps };
    });
    for (const [, product] of syncedBySku) {
      host.items = [...host.items, { entry: null, product, sku: product.metadata?.catalogSku || product.sku, fullSku: product.sku, synced: true, state: {} }];
    }
  } catch (e) { console.error('Product load error:', e); }
}

function formatPrice(cents) { return `$${(cents / 100).toFixed(2)}`; }

function productCard(item) {
  const p = item.product;
  const e = item.entry;
  const name = p?.name || e?.name || item.sku;
  const img = p?.heroImage || p?.images?.[0] || '';
  const variantCount = p?.variants?.length || e?.printful?.length || 0;
  const colors = p ? [...new Set(p.variants.map((v) => v.color).filter(Boolean))] : (e?.printful || []).map((pf) => pf.label);
  const price = p ? formatPrice(p.price) : e?.retail ? `$${e.retail}` : '';
  const href = router.url(ProductDetailView, { sku: item.sku });
  return html`
    <a class="product-card" href="${href}">
      ${img ? html`<img class="product-thumb" src="${img}" alt="${name}" loading="lazy" />`
        : html`<div class="product-thumb empty">${item.synced ? 'No image' : 'Not synced'}</div>`}
      <div class="product-info">
        <div class="product-name">${name}</div>
        <div class="product-sku">${item.fullSku}
          ${item.state.syncDirty || item.state.mockupDirty ? html`<span class="badge warn">changed</span>`
            : item.synced ? html`<span class="badge ok">synced</span>`
            : html`<span class="badge pending">catalog only</span>`}
        </div>
        <div class="product-meta">
          ${price ? html`<span>${price}</span>` : html``}
          <span>${variantCount} variant${variantCount !== 1 ? 's' : ''}</span>
        </div>
        ${colors.length ? html`<div class="product-colors">${colors.join(', ')}</div>` : html``}
        <div class="product-tags">
          ${(p?.tags || e?.tags || []).map((t) => html`<span class="tag">${t}</span>`)}
        </div>
      </div>
    </a>
  `.key(item.sku);
}

export default define({
  tag: 'product-list',
  [router.connect]: { url: '/admin/products' },
  items: { value: [], connect(host, _k, inv) { loadProducts(host).then(inv); } },
  render: {
    value: ({ items }) => html`
      <h1 class="page-title">Products</h1>
      ${items.length
        ? html`<div class="product-grid">${items.map(productCard)}</div>`
        : html`<p class="loading">Loading products…</p>`}
    `,
    shadow: false,
  },
});

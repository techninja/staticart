/**
 * Product detail — catalog entry with mockup configs + drift status.
 * Color selector switches mockup preview context.
 * @module admin/pages/product-detail
 */

import { html, define, router } from 'hybrids';
import '../components/mockup-styles.js';
import { subscribe } from '../components/admin-events.js';

/**
 *
 */
async function loadProduct(host) {
  if (!host.sku) return;
  try {
    const [catRes, productsRes, catalogRes, stateRes] = await Promise.all([
      fetch(`/admin/api/catalog/${host.sku}`), fetch('/admin/api/products'),
      fetch('/admin/api/catalog'), fetch('/admin/api/state'),
    ]);
    const catalog = await catalogRes.json();
    const fullSku = `${catalog.skuPrefix}-${host.sku}`;
    const products = await productsRes.json();
    const product = products.find((p) => p.sku === fullSku) || undefined;
    const allImages = product?.variants?.flatMap((v) => v.images || []) || [];
    const stateData = stateRes.ok ? await stateRes.json() : { products: [] };
    const ps = stateData.products?.find((s) => s.sku === host.sku) || {};
    const entry = catRes.ok ? await catRes.json() : undefined;
    const syncIds = product?.metadata?.printfulSyncProductIds || [];
    const colors = entry?.printful?.map((p, i) => ({ label: p.label, spId: syncIds[i] || '' })) || [];
    host.state = { entry, product, fullSku, images: [...new Set(allImages)], productState: ps, colors };
    if (!host.selectedColor && colors.length) host.selectedColor = colors[0].label;
  } catch (e) { console.error(e); }
}

/**
 *
 */
function selectColor(host, e) { host.selectedColor = e.currentTarget.dataset.color; }

/**
 *
 */
async function applyHero(host, e) {
  const sku = e.currentTarget.dataset.sku;
  const res = await fetch(`/admin/api/mockups/apply/${sku}`, { method: 'POST' });
  const data = await res.json();
  if (res.ok) alert(`Applied! ${data.imageCount} images, hero: ${data.hero}`);
  else alert(`Error: ${data.error}`);
}

/**
 *
 */
async function cleanMockups(host, e) {
  const sku = e.currentTarget.dataset.sku;
  const res = await fetch(`/admin/api/mockups/clean/${sku}`, { method: 'POST' });
  const data = await res.json();
  if (res.ok) alert(`Cleaned! Valid hashes: ${data.validHashes.join(', ')}`);
  else alert(`Error: ${data.error}`);
}

/**
 *
 */
function driftBadge(ps) {
  if (!ps.created) return html`<span class="badge pending">not created</span>`;
  if (ps.syncDirty && ps.mockupDirty) return html`<span class="badge warn">config changed</span>`;
  if (ps.syncDirty) return html`<span class="badge warn">sync needed</span>`;
  if (ps.mockupDirty) return html`<span class="badge warn">mockups outdated</span>`;
  return html`<span class="badge ok">up to date</span>`;
}

/**
 *
 */
function entryInfo(entry, ps, sku) {
  const hasHero = entry.mockupStyles?.some((s) => s.hero);
  return html`<div class="detail-card">
    <div class="detail-grid">
      <div><strong>Retail:</strong> $${entry.retail}</div>
      <div><strong>Status:</strong> ${driftBadge(ps)}</div>
      <div><strong>Category:</strong> ${entry.category}</div>
      <div><strong>Variants:</strong> ${entry.printful?.length || 0}</div>
    </div>
    <div class="detail-actions">
      ${hasHero ? html`<button class="btn-sm" data-sku="${sku}" onclick="${applyHero}">Apply Hero</button>` : html``}
      <button class="btn-sm btn-back" data-sku="${sku}" onclick="${cleanMockups}">Clean Old Images</button>
    </div>
  </div>`;
}

/**
 *
 */
function colorSelector(colors, selected, product) {
  if (colors.length <= 1) return html``;
  return html`<div class="color-selector">
    ${colors.map((c) => {
      const v = product?.variants?.find((v) => v.color === c.label);
      const img = v?.image || '';
      return html`<button class="cs-btn ${c.label === selected ? 'active' : ''}"
        data-color="${c.label}" onclick="${selectColor}">
        ${img ? html`<img class="cs-thumb" src="${img}" alt="" />` : html``}
        ${c.label}
      </button>`;
    })}
  </div>`;
}

export default define({
  tag: 'product-detail',
  [router.connect]: { url: '/admin/product/:sku' },
  sku: '',
  selectedColor: '',
  state: {
    value: { entry: undefined, product: undefined, fullSku: '', images: [], productState: {}, colors: [] },
    connect(host, _k, invalidate) {
      loadProduct(host).then(invalidate);
      return subscribe('product:updated', () => loadProduct(host).then(invalidate));
    },
  },
  render: {
    value: ({ sku, state, selectedColor }) => {
      if (!sku) return html`<p>No SKU specified.</p>`;
      const { entry, product, images, productState: ps, colors } = state;
      if (!entry) return html`<p class="loading">Loading…</p>`;
      const activeColor = colors.find((c) => c.label === selectedColor) || colors[0];
      const spId = activeColor?.spId || '';
      const catalogId = entry.printful?.find((p) => p.label === activeColor?.label)?.catalogId
        || entry.printful?.[0]?.catalogId || '';
      return html`
        <h1 class="page-title">${entry.name}</h1>
        ${entryInfo(entry, ps, sku)}
        ${colorSelector(colors, selectedColor, product)}
        <mockup-styles catalogid="${catalogId}"
          sku="${sku}" storeproductid="${spId}"
          images="${images}"></mockup-styles>
      `;
    },
    shadow: false,
  },
});

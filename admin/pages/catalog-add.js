/**
 * Catalog add — stepped form to create a new catalog entry.
 * Receives Printful product data via hash params from browse page.
 * @module admin/pages/catalog-add
 */

import { html, define, router } from 'hybrids';
import { buildEntry, saveEntry } from './catalog-entry-builder.js';
import { stepBasics } from './catalog-add-basics.js';
import './catalog-add-variants.js';
import './catalog-add-placements.js';

/**
 *
 */
async function loadInspect(host) {
  const id = host.id;
  if (!id) return;
  host.loading = true;
  try {
    const [inspectRes, assetsRes, catalogRes] = await Promise.all([
      fetch(`/admin/api/provider/browse/${id}`),
      fetch('/admin/api/assets'),
      fetch('/admin/api/catalog'),
    ]);
    host.inspect = await inspectRes.json();
    host.assets = await assetsRes.json();
    host.skuPrefix = (await catalogRes.json()).skuPrefix || 'SM';
    host.name = host.inspect.product.title.replace(/\|.*$/, '').trim();
    host.retail = host.inspect.pricing?.suggestedRetail?.toFixed(2) || '';
    host.category = host.inspect.inferredCategory || '';
    host.tags = (host.inspect.inferredTags || []).join(', ');
    host.allover = isAllOver(host.inspect);
  } catch (e) { console.error(e); }
  host.loading = false;
}

/**
 *
 */
function isAllOver(inspect) {
  return inspect.colors.length <= 1 || (inspect.techniques || []).some((t) => /all.over/i.test(t));
}

/**
 *
 */
function handleNext(host) { host.step = Math.min(host.step + 1, 4); }
/**
 *
 */
function handleBack(host) { host.step = Math.max(host.step - 1, 1); }
/**
 *
 */
function onPatterns(host, e) { host.selectedPatterns = e.detail; }
/**
 *
 */
function onColors(host, e) { host.selectedColors = e.detail; }
/**
 *
 */
function onSizes(host, e) { host.selectedSizes = e.detail; }

/**
 *
 */
function productWidget(d) {
  const p = d.pricing;
  return html`<div class="product-widget">
    ${d.product.image ? html`<img src="${d.product.image}" alt="" />` : html``}
    <div class="pw-info">
      <div class="pw-title">${d.product.title}</div>
      <div class="pw-meta">${d.brand || ''} · ${d.colors.length} colors · ${d.sizes.length} sizes</div>
      ${p ? html`<div class="pw-cost">Cost: $${p.minCost.toFixed(2)}–$${p.maxCost.toFixed(2)}</div>` : html``}
      <div class="pw-meta">${(d.techniques || []).join(', ')}</div>
    </div>
  </div>`;
}

/**
 *
 */
function reviewStep(host) {
  const entry = buildEntry(host);
  return html`<div class="review">
    <h3>Review</h3>
    <p><strong>SKU:</strong> ${host.skuPrefix}-${host.sku}</p>
    <p><strong>Name:</strong> ${host.name} — $${host.retail}</p>
    <p><strong>Variants:</strong> ${entry.printful.map((p) => p.label).join(', ')}</p>
    <p><strong>Sizes:</strong> ${entry.printful[0]?.sizes?.join(', ') || 'All'}</p>
    <p><strong>Placements:</strong> ${entry.printful[0]?.files?.map((f) => f.placement).join(', ') || 'Logo'}</p>
    <button class="btn-sm" onclick="${saveEntry}">Save to Catalog</button>
  </div>`;
}

export default define({
  tag: 'catalog-add',
  [router.connect]: { url: '/admin/add/:id' },
  id: '',
  step: 1,
  loading: false,
  allover: false,
  inspect: { value: undefined, connect(host, _k, inv) { loadInspect(host).then(inv); } },
  assets: { value: [] },
  skuPrefix: '',
  sku: '',
  name: '',
  description: '',
  retail: '',
  category: '',
  heroStyle: 'flat',
  tags: '',
  selectedColors: { value: [] },
  selectedSizes: { value: [] },
  selectedPatterns: { value: [] },
  placements: { value: [] },
  render: {
    value: (host) => {
      if (host.loading) return html`<p class="loading">Loading product data…</p>`;
      if (!host.inspect) return html`<p>No product selected. Go to Browse Catalog first.</p>`;
      return html`
        <div class="add-layout">
          <div class="add-form">
            <h1 class="page-title">Add to Catalog</h1>
            <div class="step-indicator">Step ${host.step} of 4</div>
            ${host.step === 1 ? stepBasics(host, handleNext) : html``}
            ${host.step === 2 ? html`<catalog-add-variants
              inspect="${host.inspect}" assets="${host.assets}"
              onselectedpatternschange="${onPatterns}"
              onselectedcolorschange="${onColors}"
              onselectedsizeschange="${onSizes}"></catalog-add-variants>` : html``}
            ${host.step === 3 ? html`<catalog-add-placements
              inspect="${host.inspect}" assets="${host.assets}"
              placements="${host.placements}"
              allover="${host.allover}"
              selectedpatterns="${host.selectedPatterns}"></catalog-add-placements>` : html``}
            ${host.step === 4 ? reviewStep(host) : html``}
            ${host.step > 1 ? html`<button class="btn-sm btn-back" onclick="${handleBack}">← Back</button>` : html``}
            ${host.step < 4 && host.step > 1 ? html`<button class="btn-sm" onclick="${handleNext}">Next →</button>` : html``}
          </div>
          ${productWidget(host.inspect)}
        </div>
      `;
    },
    shadow: false,
  },
});

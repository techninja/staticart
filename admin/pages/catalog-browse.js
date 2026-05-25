import { html, define, router } from 'hybrids';
import CatalogAddView from './catalog-add.js';

async function loadCategories(host) {
  try {
    const res = await fetch('/admin/api/provider/categories');
    host.categories = await res.json();
  } catch (e) { console.error('Categories error:', e); }
}

function handleSearch(host) {
  if (!host.query && !host.activeCategory) return;
  host.searching = true;
  host.detail = undefined;
  const body = {};
  if (host.query) body.query = host.query;
  if (host.activeCategory) body.categoryId = host.activeCategory;
  fetch('/admin/api/provider/browse', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json()).then((d) => { host.results = d; host.searching = false; })
    .catch(() => { host.searching = false; });
}

function handleSubmit(host, e) { e.preventDefault(); handleSearch(host); }
function handleCategory(host, e) { e.preventDefault(); host.activeCategory = parseInt(e.currentTarget.dataset.id); host.detail = undefined; handleSearch(host); }
function clearCategory(host) { host.activeCategory = 0; host.detail = undefined; handleSearch(host); }

async function handleInspect(host, e) {
  host.inspecting = true;
  host.detail = undefined;
  try {
    const res = await fetch(`/admin/api/provider/browse/${e.currentTarget.dataset.id}`);
    host.detail = await res.json();
  } catch (e) { console.error(e); }
  host.inspecting = false;
}

function resultCard(r) {
  return html`
    <div class="browse-item" data-id="${r.id}" onclick="${handleInspect}">
      ${r.image ? html`<img src="${r.image}" alt="" class="browse-thumb" />` : html``}
      <div class="browse-info">
        <div class="browse-title">${r.title}</div>
        <div class="browse-meta">
          ${r.brand ? html`<span class="meta-tag brand">${r.brand}</span>` : html``}
          ${r.type ? html`<span class="meta-tag">${r.type}</span>` : html``}
          ${r.category ? html`<span class="meta-tag">${r.category}</span>` : html``}
          <span class="meta-tag">${r.variants} variant${r.variants !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  `.key(r.id);
}

function placementCard(p) {
  const dim = p.width ? `${p.width}×${p.height}` : 'unknown';
  const price = p.additionalPrice ? `+$${p.additionalPrice}` : 'included';
  const w = p.width ? Math.min(60, Math.round(60 * Math.min(p.ratio || 1, 1))) : 40;
  const h = p.width ? Math.min(60, Math.round(60 / Math.max(p.ratio || 1, 1))) : 40;
  return html`<div class="placement-card">
    <div class="placement-shape" style="width:${w}px;height:${h}px;"></div>
    <div class="placement-info">
      <div class="placement-name">${p.title}</div>
      <div class="placement-dims">${dim}${p.orientation ? ` · ${p.orientation}` : ''}</div>
      <div class="placement-price">${price}</div>
    </div>
  </div>`;
}

function goToAdd(host) { router.resolve(host, router.url(CatalogAddView, { id: host.detail.product.id })); }

function detailView(d) {
  const p = d.pricing;
  return html`
    <div class="inspect-detail">
      <h3>${d.product.title}</h3>
      <div class="detail-grid">
        <div><strong>ID:</strong> ${d.product.id}</div>
        <div><strong>Brand:</strong> ${d.brand || '—'}</div>
        <div><strong>In stock:</strong> ${d.inStock} / ${d.total}</div>
        <div><strong>Techniques:</strong> ${(d.techniques || []).join(', ') || '—'}</div>
      </div>
      ${p ? html`
        <div class="detail-section pricing-row">
          <span><strong>Cost:</strong> $${p.minCost.toFixed(2)}${p.minCost !== p.maxCost ? `–$${p.maxCost.toFixed(2)}` : ''}</span>
          <span><strong>Suggested retail:</strong> $${p.suggestedRetail.toFixed(2)}</span>
        </div>
      ` : html``}
      ${d.colors.length ? html`<div class="detail-section"><strong>Colors (${d.colors.length}):</strong> ${d.colors.join(', ')}</div>` : html``}
      ${d.sizes.length ? html`<div class="detail-section"><strong>Sizes:</strong> ${d.sizes.join(', ')}</div>` : html``}
      ${d.placements && d.placements.length ? html`
        <div class="detail-section"><strong>Print Locations (${d.placements.length}):</strong></div>
        <div class="placement-grid">${d.placements.map((p) => placementCard(p))}</div>
      ` : html``}
      <button class="btn-sm btn-add" onclick="${goToAdd}">Add to Catalog →</button>
    </div>
  `;
}

export default define({
  tag: 'catalog-browse',
  [router.connect]: { url: '/admin/browse' },
  query: '',
  categories: { value: [], connect(host, _k, inv) { loadCategories(host).then(inv); } },
  activeCategory: 0,
  results: { value: [] },
  searching: false,
  detail: { value: undefined },
  inspecting: false,
  render: {
    value: ({ query, categories, activeCategory, results, searching, detail, inspecting }) => html`
      <h1 class="page-title">Browse Catalog</h1>
      <form class="search-bar" onsubmit="${handleSubmit}">
        <input type="text" value="${query}" placeholder="Search by name or brand…"
          oninput="${html.set('query')}" />
        <button class="btn-sm" type="submit" disabled="${searching}">
          ${searching ? 'Searching…' : 'Search'}
        </button>
      </form>
      <div class="browse-layout">
        <aside class="cat-tree">
          ${categories.map((c) => html`
            <div class="cat-group">
              <button class="cat-parent ${activeCategory === c.id ? 'active' : ''}"
                data-id="${c.id}" onclick="${handleCategory}">${c.title}</button>
              ${c.children.map((ch) => html`
                <button class="cat-child ${activeCategory === ch.id ? 'active' : ''}"
                  data-id="${ch.id}" onclick="${handleCategory}">${ch.title}</button>
              `)}
            </div>
          `)}
        </aside>
        <div class="browse-main">
          ${activeCategory ? html`<button class="btn-sm clear-cat" onclick="${clearCategory}">✕ Clear filter</button>` : html``}
          ${searching ? html`<p class="loading">Searching…</p>` : html``}
          ${!searching && results.length ? html`
            <div class="browse-count">${results.length} result${results.length !== 1 ? 's' : ''}</div>
            <div class="browse-results">${results.map(resultCard)}</div>
          ` : html``}
          ${inspecting ? html`<p class="loading">Loading details…</p>` : html``}
          ${detail ? detailView(detail) : html``}
        </div>
      </div>
    `,
    shadow: false,
  },
});

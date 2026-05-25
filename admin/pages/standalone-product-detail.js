/**
 * Standalone product detail — edit product fields + manage variants.
 * @module admin/pages/standalone-product-detail
 */

import { html, define, router } from 'hybrids';

/**
 *
 */
async function loadProduct(host) {
  if (!host.sku) return;
  try {
    const res = await fetch(`/admin/api/standalone/products/${host.sku}`);
    if (res.ok) host.product = await res.json();
  } catch (e) { console.error(e); }
}

/**
 *
 */
function setField(host, e) {
  const { name, value } = e.target;
  host.product = { ...host.product, [name]: name === 'price' ? parseFloat(value) || 0 : value };
}

/**
 *
 */
async function saveProduct(host) {
  const { sku, ...body } = host.product;
  await fetch(`/admin/api/standalone/products/${sku}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  host.saved = true;
  setTimeout(() => { host.saved = false; }, 2000);
}

/**
 *
 */
function addVariant(host) {
  const label = prompt('Variant label (e.g. "Black / M"):');
  if (!label) return;
  const variants = [...(host.product.variants || []), { label, price: host.product.price, images: [] }];
  host.product = { ...host.product, variants };
}

/**
 *
 */
function removeVariant(host, e) {
  const idx = parseInt(e.currentTarget.dataset.idx);
  const variants = [...host.product.variants];
  variants.splice(idx, 1);
  host.product = { ...host.product, variants };
}

/**
 *
 */
function setVariantField(host, e) {
  const idx = parseInt(e.target.dataset.idx);
  const field = e.target.dataset.field;
  const variants = [...host.product.variants];
  variants[idx] = { ...variants[idx], [field]: field === 'price' ? parseFloat(e.target.value) || 0 : e.target.value };
  host.product = { ...host.product, variants };
}

/**
 *
 */
function addVariantImage(host, e) {
  const idx = parseInt(e.currentTarget.dataset.idx);
  const url = prompt('Image URL:');
  if (!url) return;
  const variants = [...host.product.variants];
  variants[idx] = { ...variants[idx], images: [...(variants[idx].images || []), url] };
  host.product = { ...host.product, variants };
}

/**
 *
 */
function removeVariantImage(host, e) {
  const idx = parseInt(e.currentTarget.dataset.idx);
  const imgIdx = parseInt(e.currentTarget.dataset.img);
  const variants = [...host.product.variants];
  const images = [...variants[idx].images];
  images.splice(imgIdx, 1);
  variants[idx] = { ...variants[idx], images };
  host.product = { ...host.product, variants };
}

/**
 *
 */
function variantRow(v, i) {
  return html`<div class="variant-row">
    <input data-idx="${i}" data-field="label" value="${v.label}" oninput="${setVariantField}" placeholder="Label" />
    <input data-idx="${i}" data-field="price" type="number" step="0.01" value="${v.price || ''}" oninput="${setVariantField}" />
    <div class="variant-images">
      ${(v.images || []).map((img, j) => html`
        <span class="vi-thumb"><img src="${img}" alt="" />
          <button class="btn-x" data-idx="${i}" data-img="${j}" onclick="${removeVariantImage}">×</button>
        </span>`)}
      <button class="btn-sm" data-idx="${i}" onclick="${addVariantImage}">+ img</button>
    </div>
    <button class="btn-sm btn-back" data-idx="${i}" onclick="${removeVariant}">Remove</button>
  </div>`;
}

export default define({
  tag: 'standalone-product-detail',
  [router.connect]: { url: '/admin/standalone/product/:sku' },
  sku: '',
  product: { value: undefined, connect(host, _k, inv) { loadProduct(host).then(inv); } },
  saved: false,
  render: {
    value: ({ product, saved }) => {
      if (!product) return html`<p class="loading">Loading…</p>`;
      return html`
        <h1 class="page-title">${product.name}</h1>
        <div class="detail-card">
          <label>Name<input name="name" value="${product.name}" oninput="${setField}" /></label>
          <label>Price<input name="price" type="number" step="0.01" value="${product.price}" oninput="${setField}" /></label>
          <label>Description<textarea name="description" oninput="${setField}">${product.description || ''}</textarea></label>
          <label>Category<input name="category" value="${product.category || ''}" oninput="${setField}" /></label>
          <button class="btn-primary" onclick="${saveProduct}">Save${saved ? ' ✓' : ''}</button>
        </div>
        <h2>Variants (${product.variants?.length || 0})</h2>
        <button class="btn-sm" onclick="${addVariant}">+ Add Variant</button>
        <div class="variant-list">${(product.variants || []).map(variantRow)}</div>
      `;
    },
    shadow: false,
  },
});

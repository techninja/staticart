/**
 * Catalog add step 1 — product basics form.
 * @module admin/pages/catalog-add-basics
 */

import { html } from 'hybrids';

/** @param {any} host @param {Function} handleNext */
export function stepBasics(host, handleNext) {
  const p = host.inspect?.pricing;
  return html`
    <div class="form-group">
      <label>SKU suffix <small>(becomes ${host.skuPrefix}-___)</small></label>
      <input type="text" value="${host.sku}" oninput="${html.set('sku')}" placeholder="e.g. ZIPHOODIE" />
    </div>
    <div class="form-group">
      <label>Product name</label>
      <input type="text" value="${host.name}" oninput="${html.set('name')}" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea rows="2" oninput="${html.set('description')}">${host.description}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Retail ($)</label>
        <input type="number" step="0.01" value="${host.retail}" oninput="${html.set('retail')}" />
        ${p ? html`<small class="cost-hint">
          Cost: $${p.minCost.toFixed(2)}${p.minCost !== p.maxCost ? `–$${p.maxCost.toFixed(2)}` : ''}
          · Min retail: $${p.maxCost.toFixed(2)}
        </small>` : html``}
      </div>
      <div class="form-group">
        <label>Category</label>
        <input type="text" value="${host.category}" oninput="${html.set('category')}" placeholder="apparel, accessories…" />
      </div>
      <div class="form-group">
        <label>Hero style</label>
        <select oninput="${html.set('heroStyle')}">
          <option value="flat" selected="${host.heroStyle === 'flat'}">Flat</option>
          <option value="lifestyle" selected="${host.heroStyle === 'lifestyle'}">Lifestyle</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Tags <small>(comma-separated)</small></label>
      <input type="text" value="${host.tags}" oninput="${html.set('tags')}" />
    </div>
    <button class="btn-sm" onclick="${handleNext}" disabled="${!host.sku || !host.name || !host.retail}">
      Next: Colors & Sizes →</button>
  `;
}

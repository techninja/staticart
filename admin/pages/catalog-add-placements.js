/**
 * Catalog add step 3 — placement & file selection.
 * All-over: shows pre-filled placements with pattern previews.
 * Logo: manual placement picker with file source options.
 * @module admin/pages/catalog-add-placements
 */

import { html, define, dispatch } from 'hybrids';

/**
 *
 */
function togglePlacement(host, e) {
  const id = e.target.value;
  const current = [...host.placements];
  const idx = current.findIndex((p) => p.id === id);
  if (idx >= 0) current.splice(idx, 1);
  else {
    const info = host.inspect.placements.find((p) => p.id === id);
    current.push({ id, title: info?.title || id, mode: 'logo', url: '' });
  }
  host.placements = current;
  dispatch(host, 'placementschange', { detail: current, bubbles: true });
}

/**
 *
 */
function setMode(host, e) {
  const id = e.target.dataset.id;
  host.placements = host.placements.map((p) => (p.id === id ? { ...p, mode: e.target.value, url: '' } : p));
  dispatch(host, 'placementschange', { detail: host.placements, bubbles: true });
}

/**
 *
 */
function setAsset(host, e) {
  const id = e.target.dataset.id;
  const asset = host.assets.find((a) => a.localPath === e.target.value);
  host.placements = host.placements.map((p) =>
    p.id === id ? { ...p, url: asset?.publicUrl || e.target.value, deployed: asset?.deployed ?? true } : p);
  dispatch(host, 'placementschange', { detail: host.placements, bubbles: true });
}

/**
 *
 */
function setCustomUrl(host, e) {
  const id = e.target.dataset.id;
  host.placements = host.placements.map((p) => (p.id === id ? { ...p, url: e.target.value, deployed: true } : p));
  dispatch(host, 'placementschange', { detail: host.placements, bubbles: true });
}

/**
 *
 */
function placementConfig(p, assets) {
  const notDeployed = p.mode === 'asset' && p.deployed === false;
  return html`<div class="placement-config"><div class="form-row">
    <select data-id="${p.id}" oninput="${setMode}">
      <option value="logo" selected="${p.mode === 'logo'}">Store logo</option>
      <option value="asset" selected="${p.mode === 'asset'}">Print asset</option>
      <option value="url" selected="${p.mode === 'url'}">Custom URL</option>
    </select>
    ${p.mode === 'asset' ? html`<select data-id="${p.id}" oninput="${setAsset}">
      <option value="">Select asset…</option>
      ${assets.map((a) => html`<option value="${a.localPath}">${a.deployed ? '✓' : '⚠'} ${a.path}</option>`)}
    </select>` : html``}
    ${p.mode === 'url' ? html`<input type="text" data-id="${p.id}" value="${p.url}" oninput="${setCustomUrl}" placeholder="https://..." />` : html``}
  </div>
  ${notDeployed ? html`<div class="deploy-warn">⚠ Not deployed yet</div>` : html``}
  </div>`;
}

/**
 *
 */
function isLabelPlacement(id) { return /label/i.test(id); }

/**
 *
 */
function allOverView(inspect, selectedpatterns, assets) {
  const available = (inspect.placements || []).filter((p) => p.type !== 'mockup' && p.id !== 'preview');
  const renders = assets.filter((a) => selectedpatterns.includes(a.path));
  const labelAsset = assets.find((a) => /label.logo/i.test(a.name));
  return html`
    <h3>All-Over Print — Placements</h3>
    <p class="hint">Each placement filled with selected pattern renders. Label placements use the label logo.</p>
    <div class="allover-placements">
      ${available.map((p) => {
        const isLabel = isLabelPlacement(p.id);
        const dims = p.width ? `${p.width}×${p.height}` : '';
        return html`<div class="ao-placement">
          <div class="ao-header">
            <strong>${p.title}</strong>
            ${dims ? html`<small class="dims">${dims}</small>` : html``}
            ${p.additionalPrice ? html`<small class="price">+$${p.additionalPrice}</small>` : html``}
          </div>
          <div class="ao-preview">
            ${isLabel
              ? html`<div class="ao-file">
                  ${labelAsset ? html`<img src="${labelAsset.localPath}" class="ao-thumb" />` : html``}
                  <span class="ao-label">${labelAsset ? labelAsset.name : '⚠ No label-logo asset found'}</span>
                  ${labelAsset ? html`<span class="meta-tag ${labelAsset.deployed ? '' : 'warn'}">${labelAsset.deployed ? '✓' : '⚠'}</span>` : html``}
                </div>`
              : renders.map((r) => html`<div class="ao-file">
                  <img src="${r.localPath}" class="ao-thumb" />
                  <span class="ao-label">${r.name.replace(/\.[^.]+$/, '')}</span>
                  <span class="meta-tag ${r.deployed ? '' : 'warn'}">${r.deployed ? '✓' : '⚠'}</span>
                </div>`)}
          </div>
        </div>`;
      })}
    </div>
  `;
}

/**
 *
 */
function logoView(inspect, assets, placements) {
  const available = (inspect.placements || []).filter((p) => p.type !== 'mockup');
  return html`
    <h3>Print Locations</h3>
    <p class="hint">Select placements and choose a file source for each.</p>
    <div class="placement-list">
      ${available.map((p) => html`<div class="placement-row">
        <label class="checkbox-item">
          <input type="checkbox" value="${p.id}" checked="${placements.some((s) => s.id === p.id)}" onchange="${togglePlacement}" />
          <span>${p.title}
            ${p.width ? html`<small class="dims">${p.width}×${p.height}</small>` : html``}
            ${p.additionalPrice ? html`<small class="price">+$${p.additionalPrice}</small>` : html``}
          </span>
        </label>
        ${placements.find((s) => s.id === p.id) ? placementConfig(placements.find((s) => s.id === p.id), assets) : html``}
      </div>`)}
    </div>
  `;
}

export default define({
  tag: 'catalog-add-placements',
  inspect: { value: null },
  assets: { value: [] },
  placements: { value: [] },
  selectedpatterns: { value: [] },
  allover: false,
  render: {
    value: ({ inspect, assets, placements, selectedpatterns, allover }) => {
      if (!inspect) return html``;
      if (allover) return allOverView(inspect, selectedpatterns, assets);
      return logoView(inspect, assets, placements);
    },
    shadow: false,
  },
});

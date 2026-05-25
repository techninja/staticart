/**
 * Catalog add step 2 — color & size selection.
 * Detects logo vs all-over product type.
 * @module admin/pages/catalog-add-variants
 */

import { html, define, dispatch } from 'hybrids';

function emitChange(host, prop) {
  dispatch(host, `${prop}change`, { detail: host[prop], bubbles: true });
}

function toggleColor(host, e) {
  const c = [...host.selectedcolors];
  const i = c.indexOf(e.target.value);
  if (i >= 0) c.splice(i, 1); else c.push(e.target.value);
  host.selectedcolors = c;
  emitChange(host, 'selectedcolors');
}

function toggleSize(host, e) {
  const c = [...host.selectedsizes];
  const i = c.indexOf(e.target.value);
  if (i >= 0) c.splice(i, 1); else c.push(e.target.value);
  host.selectedsizes = c;
  emitChange(host, 'selectedsizes');
}

function togglePattern(host, e) {
  const c = [...host.selectedpatterns];
  const i = c.indexOf(e.target.value);
  if (i >= 0) c.splice(i, 1); else c.push(e.target.value);
  host.selectedpatterns = c;
  emitChange(host, 'selectedpatterns');
}

function allColors(host) { host.selectedcolors = [...host.inspect.colors]; emitChange(host, 'selectedcolors'); }
function noColors(host) { host.selectedcolors = []; emitChange(host, 'selectedcolors'); }
function allSizes(host) { host.selectedsizes = [...host.inspect.sizes]; emitChange(host, 'selectedsizes'); }
function noSizes(host) { host.selectedsizes = []; emitChange(host, 'selectedsizes'); }
function allPatterns(host) {
  host.selectedpatterns = host.assets.filter((a) => a.path.startsWith('renders/') && a.name.endsWith('.png')).map((a) => a.path);
  emitChange(host, 'selectedpatterns');
}
function noPatterns(host) { host.selectedpatterns = []; emitChange(host, 'selectedpatterns'); }

function checkboxes(items, selected, handler) {
  return html`<div class="checkbox-grid">
    ${items.map((v) => html`<label class="checkbox-item">
      <input type="checkbox" value="${v}" checked="${selected.includes(v)}" onchange="${handler}" /> ${v}
    </label>`)}
  </div>`;
}

export default define({
  tag: 'catalog-add-variants',
  inspect: { value: null },
  selectedcolors: { value: [] },
  selectedsizes: { value: [] },
  selectedpatterns: { value: [] },
  assets: { value: [] },
  render: {
    value: ({ inspect, selectedcolors, selectedsizes, selectedpatterns, assets }) => {
      if (!inspect) return html``;
      const isAO = inspect.colors.length <= 1 || (inspect.techniques || []).some((t) => /all.over/i.test(t));
      const renders = assets.filter((a) => a.path.startsWith('renders/') && a.name.endsWith('.png'));
      return html`
        ${isAO ? html`
          <div class="variant-section">
            <h3>Product Type: All-Over Print</h3>
            <p class="hint">Each pattern becomes a color variant (White base on Printful).</p>
            ${renders.length ? html`
              <h4>Pattern Renders
                <button class="btn-sm btn-mini" onclick="${allPatterns}">All</button>
                <button class="btn-sm btn-mini" onclick="${noPatterns}">None</button>
              </h4>
              <div class="pattern-grid">
                ${renders.map((r) => html`
                  <label class="pattern-item ${selectedpatterns.includes(r.path) ? 'selected' : ''}">
                    <input type="checkbox" value="${r.path}" checked="${selectedpatterns.includes(r.path)}" onchange="${togglePattern}" />
                    <img src="${r.localPath}" alt="${r.name}" />
                    <span>${r.name.replace(/\.[^.]+$/, '')}</span>
                  </label>
                `)}
              </div>
            ` : html`<p class="hint">No renders found. Run <code>npm run texture all -- --png</code></p>`}
          </div>
        ` : html`
          <div class="variant-section">
            <h3>Colors
              <button class="btn-sm btn-mini" onclick="${allColors}">All</button>
              <button class="btn-sm btn-mini" onclick="${noColors}">None</button>
            </h3>
            <p class="hint">Each color becomes a separate Printful sync product.</p>
            ${checkboxes(inspect.colors, selectedcolors, toggleColor)}
          </div>
        `}
        ${inspect.sizes.length ? html`
          <div class="variant-section">
            <h3>Sizes
              <button class="btn-sm btn-mini" onclick="${allSizes}">All</button>
              <button class="btn-sm btn-mini" onclick="${noSizes}">None</button>
            </h3>
            <p class="hint">Leave empty for all sizes.</p>
            ${checkboxes(inspect.sizes, selectedsizes, toggleSize)}
          </div>
        ` : html``}
      `;
    },
    shadow: false,
  },
});

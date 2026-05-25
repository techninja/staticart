/**
 * Mockup styles — named config entities with real-time WS status.
 * Re-fetches disk images when storeproductid (color) changes.
 * @module admin/components/mockup-styles
 */
import { html, define } from 'hybrids';
import './mockup-config-card.js';
import './mockup-preview.js';
import {
  loadData, subscribeStatus, matchImage, taskKey, matchTaskStatus,
  handleSave, handleRemove, handleHero, handleAdd, handleGenerate,
} from './mockup-styles-actions.js';

export default define({
  tag: 'mockup-styles',
  catalogid: '',
  sku: '',
  storeproductid: { value: '', observe(host, val, last) {
    if (val && val !== last) {
      fetch(`/admin/api/mockups/images/${val}`).then((r) => r.ok ? r.json() : [])
        .then((imgs) => { host.diskimages = imgs; });
    }
  }},
  images: { value: [] },
  available: { value: undefined, connect(host, _k, inv) {
    loadData(host).then(inv);
    const unsub = subscribeStatus(host, inv);
    return () => unsub();
  }},
  diskimages: { value: [] },
  catfiles: { value: [] },
  configs: { value: [] },
  tasks: { value: {} },
  render: {
    value: ({ available, configs, images, tasks, sku, catfiles, diskimages }) => {
      if (!configs.length && !available) return html`<p class="loading">Loading mockup config…</p>`;
      const groups = available?.optionGroups?.map((g) => g.name) || [];
      const opts = available?.options || [];
      const placements = Object.entries(available?.placements || {});
      const firstPlacement = placements[0]?.[1] || null;
      const firstFile = catfiles[0] || null;
      return html`
        <div class="mockup-styles">
          <h3>Mockup Configurations (${configs.length})</h3>
          <div class="mcc-grid">
            ${configs.map((c, i) => html`
              <mockup-config-card config="${c}" index="${i}"
                image="${matchImage(c, images, diskimages)}" groups="${groups}" options="${opts}"
                taskstatus="${matchTaskStatus(tasks, taskKey(sku, c))}"
                placement="${firstPlacement}" position="${firstFile?.position || null}"
                fileurl="${firstFile?.url || ''}"
                loading="${!available && !matchImage(c, images, diskimages)}"
                onconfigsave="${handleSave}" onconfigremove="${handleRemove}"
                onconfiggenerate="${handleGenerate}" onconfighero="${handleHero}">
              </mockup-config-card>
            `)}
            <div class="mcc mcc-add" onclick="${handleAdd}"><div class="mcc-empty">+ Add</div></div>
          </div>
          ${placements.length ? html`<details class="ms-details">
            <summary>Placement Templates (${placements.length})</summary>
            <div class="ms-placements">
              ${placements.map(([n, d]) => html`<div class="ms-placement">
                <div class="ms-placement-label">${n}</div>
                <mockup-preview placement="${d}" maxwidth="200"></mockup-preview>
              </div>`)}
            </div>
          </details>` : html``}
        </div>
      `;
    },
    shadow: false,
  },
});

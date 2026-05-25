/**
 * Mockup config card — one mockup config with status, error display, retry.
 * @module admin/components/mockup-config-card
 */

import { html, define, dispatch } from 'hybrids';
import './position-preview.js';

/**
 *
 */
function toggleEdit(host) {
  host.editing = !host.editing;
  if (host.editing) {
    host.editgroup = host.config.option_groups?.[0] || '';
    host.editoption = host.config.options?.[0] || '';
  }
}

/**
 *
 */
function setGroup(host, e) { host.editgroup = e.target.value; }
/**
 *
 */
function setOption(host, e) { host.editoption = e.target.value; }

/**
 *
 */
function saveEdit(host) {
  const name = `${host.editgroup} (${host.editoption})`;
  dispatch(host, 'configsave', { bubbles: true, detail: {
    index: host.index,
    config: { name, option_groups: [host.editgroup], options: [host.editoption], hero: host.config.hero },
  }});
  host.editing = false;
}

/**
 *
 */
function toggleHero(host) {
  dispatch(host, 'confighero', { bubbles: true, detail: { index: host.index } });
}

/**
 *
 */
function removeConfig(host) {
  dispatch(host, 'configremove', { bubbles: true, detail: { index: host.index } });
}

/**
 *
 */
function generate(host) {
  dispatch(host, 'configgenerate', { bubbles: true, detail: { index: host.index } });
}

/**
 *
 */
function statusOverlay(s) {
  if (!s) return html``;
  if (s.status === 'queued') return html`<div class="mcc-overlay">Queued #${(s.position || 0) + 1}</div>`;
  if (s.status === 'generating') return html`<div class="mcc-overlay generating">Generating…</div>`;
  if (s.status === 'error') return html`<div class="mcc-overlay error" title="${s.error}">⚠ Error</div>`;
  return html``;
}

export default define({
  tag: 'mockup-config-card',
  config: { value: undefined },
  index: 0,
  image: '',
  groups: { value: [] },
  options: { value: [] },
  taskstatus: { value: undefined },
  placement: { value: undefined },
  position: { value: undefined },
  fileurl: '',
  loading: false,
  editing: false,
  editgroup: '',
  editoption: '',
  render: {
    value: ({ config, image, groups, options, taskstatus, editing, editgroup, editoption, placement, position, fileurl, loading }) => {
      if (!config) return html``;
      const s = taskstatus;
      const doneImage = s?.status === 'done' ? s.image : null;
      const displayImage = doneImage || image;
      const hasError = s?.status === 'error';
      return html`
        <div class="mcc ${hasError ? 'mcc-error' : ''}">
          <div class="mcc-image" onclick="${toggleEdit}">
            ${displayImage ? html`<img src="${displayImage}" alt="${config.name}" />`
              : loading ? html`<div class="mcc-loading">Loading preview…</div>`
              : html`<position-preview placement="${placement}" position="${position}"
                  arturl="${fileurl}" maxwidth="160"></position-preview>`}
            ${statusOverlay(s)}
          </div>
          <div class="mcc-label">${config.name}${config.hero ? html` <span class="badge ok">hero</span>` : html``}</div>
          ${hasError ? html`<div class="mcc-error-msg">${s.error}</div>
            <button class="btn-sm mcc-gen" onclick="${generate}">Retry</button>` : html``}
          ${!editing && !hasError ? html`<div class="mcc-btns">
            ${!displayImage ? html`<button class="btn-sm mcc-gen" onclick="${generate}">Generate</button>` : html``}
            ${displayImage ? html`<button class="btn-sm mcc-gen" onclick="${generate}" title="Regenerate"
              disabled="${s?.status === 'generating' || s?.status === 'queued'}">↻</button>` : html``}
            ${displayImage && !config.hero ? html`<button class="btn-sm mcc-gen" onclick="${toggleHero}">Set Hero</button>` : html``}
          </div>` : html``}
          ${editing ? html`
            <div class="mcc-edit">
              <select oninput="${setGroup}">
                ${groups.map((g) => html`<option value="${g}" selected="${g === editgroup}">${g}</option>`)}
              </select>
              <select oninput="${setOption}">
                ${options.map((o) => html`<option value="${o}" selected="${o === editoption}">${o}</option>`)}
              </select>
              <div class="mcc-actions">
                <button class="btn-sm" onclick="${saveEdit}">Save</button>
                <button class="btn-sm btn-back" onclick="${removeConfig}">Remove</button>
              </div>
            </div>
          ` : html``}
        </div>
      `;
    },
    shadow: false,
  },
});

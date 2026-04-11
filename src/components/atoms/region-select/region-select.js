/**
 * Region select — shipping region picker, auto-detected from locale.
 * Persists via AppState store (localStorage-backed).
 * @module components/atoms/region-select
 */

import { html, define, store } from 'hybrids';
import AppState from '#store/AppState.js';
import '#atoms/app-icon/app-icon.js';

const REGIONS = [
  { code: 'US', label: 'US' },
  { code: 'CA', label: 'CA' },
  { code: 'INT', label: 'Intl' },
];

/** @returns {string} */
function detectRegion() {
  const lang = navigator.language || '';
  if (lang.endsWith('-CA') || lang.endsWith('-ca')) return 'CA';
  if (lang.endsWith('-US') || lang.endsWith('-us')) return 'US';
  if (lang.startsWith('en-')) return 'US';
  return 'INT';
}

/**
 * @typedef {Object} RegionSelectHost
 * @property {any} state
 */

/** @param {RegionSelectHost & HTMLElement} host */
function handleChange(host, e) {
  if (!store.ready(host.state)) return;
  store.set(host.state, { region: e.target.value });
}

/** @type {import('hybrids').Component<RegionSelectHost>} */
export default define({
  tag: 'region-select',
  state: store(AppState),
  render: {
    value: ({ state }) => {
      if (!store.ready(state)) return html``;
      if (!state.region) store.set(state, { region: detectRegion() });
      const current = state.region || 'US';
      return html`
        <div class="region-select">
          <app-icon name="globe" size="sm"></app-icon>
          <select class="region-select__picker" onchange="${handleChange}">
            ${REGIONS.map((r) =>
              html`<option value="${r.code}" selected="${r.code === current}">${r.label}</option>`,
            )}
          </select>
        </div>
      `;
    },
    shadow: false,
  },
});

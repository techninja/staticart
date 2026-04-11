/**
 * Render product metadata as a definition list based on productFields config.
 * @module utils/renderMetadata
 */

import { html } from 'hybrids';

/** @param {boolean} val @returns {string} */
function boolLabel(val) {
  return val ? 'Yes' : 'No';
}

/**
 * @param {any} product
 * @param {any} config
 * @returns {any} hybrids template or empty
 */
export function renderMetadata(product, config) {
  const fields = config?.productFields;
  if (!fields) return '';
  const meta = product.metadata || {};
  const entries = Object.entries(fields)
    .filter(([key]) => meta[key] != null && meta[key] !== '')
    .map(([key, def]) => ({
      label: /** @type {any} */ (def).label || key,
      value: /** @type {any} */ (def).type === 'boolean' ? boolLabel(meta[key]) : meta[key],
    }));
  if (!entries.length) return '';
  return html`
    <dl class="product-detail__metadata">
      ${entries.map(
        (e) => html`<dt>${e.label}</dt><dd>${e.value}</dd>`,
      )}
    </dl>
  `;
}

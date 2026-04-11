/**
 * Shipping breakdown — shows tiered rate tables with active tier highlighted.
 * @module utils/shippingBreakdown
 */

import { html } from 'hybrids';
import { getStoreConfigSync } from '#utils/storeConfig.js';
import { formatPrice } from '#utils/formatPrice.js';

const REGION_LABELS = { us: 'USA', can: 'Canada', intl: 'International' };

/** @param {any} obj @param {string} path @returns {any} */
function getField(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

/** @param {any} shipping @param {any[]} items @returns {Record<string, number>} */
function calcSubtotals(shipping, items) {
  const classes = shipping.classes || {};
  const field = shipping.classField || 'metadata.productType';
  const subs = /** @type {Record<string, number>} */ ({});
  for (const cls of Object.keys(classes)) subs[cls] = 0;
  for (const item of items) {
    const val = getField(item, field);
    let matched = false;
    for (const [cls, def] of Object.entries(classes)) {
      if (/** @type {any} */ (def).match?.includes(val)) {
        subs[cls] += item.price * item.quantity;
        matched = true;
        break;
      }
    }
    if (!matched && shipping.defaultClass)
      subs[shipping.defaultClass] += item.price * item.quantity;
  }
  return subs;
}

/** @param {string} cls @param {any[]} tiers @param {number} sub @param {string[]} rKeys @param {string} activeR */
function buildTableHtml(cls, tiers, sub, rKeys, activeR) {
  let activeTier = -1;
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i].upTo && sub < tiers[i].upTo) {
      activeTier = i;
      break;
    }
    if (!tiers[i].upTo) activeTier = i;
  }
  const ths = rKeys
    .map((r) => `<th class="${r === activeR ? 'active-region' : ''}">${REGION_LABELS[r] || r}</th>`)
    .join('');
  const rows = tiers
    .map((t, i) => {
      const tierLabel = t.upTo
        ? `Under ${formatPrice(t.upTo)}`
        : `${formatPrice(tiers[i - 1]?.upTo || 0)}+`;
      const tds = rKeys
        .map((r) => {
          const isActive = r === activeR && i === activeTier;
          const val = t.rates?.[r] > 0 ? formatPrice(t.rates[r]) : 'Free';
          return `<td class="${isActive ? 'active-cell' : ''}">${val}</td>`;
        })
        .join('');
      return `<tr class="${i === activeTier ? 'active-tier' : ''}"><td>${tierLabel}</td>${tds}</tr>`;
    })
    .join('');
  const label = cls === 'tube' ? 'Poster/Tube Rates' : 'Book/Standard Rates';
  return (
    `<h4>${label} (${formatPrice(sub)} in cart)</h4>` +
    `<table><thead><tr><th>Cart Amount</th>${ths}</tr></thead>` +
    `<tbody>${rows}</tbody></table>`
  );
}

/**
 * @param {Array<{price: number, quantity: number, metadata?: any}>} items
 * @param {string} region
 * @returns {any}
 */
export function renderShippingBreakdown(items, region) {
  const shipping = getStoreConfigSync()?.shipping || {};
  if (shipping.type !== 'tiered') return html``;
  const regions = shipping.regions || {};
  const regionKey = regions[region] || regions['*'] || shipping.defaultRegion || 'us';
  const regionKeys = /** @type {string[]} */ ([...new Set(Object.values(regions))]);
  const subs = calcSubtotals(shipping, items);
  const tableHtmls = Object.entries(shipping.tiers || {})
    .filter(([cls]) => subs[cls] > 0)
    .map(([cls, tiers]) =>
      buildTableHtml(cls, /** @type {any[]} */ (tiers), subs[cls], regionKeys, regionKey),
    );
  if (!tableHtmls.length) return html``;
  const combined = tableHtmls
    .map((t) => `<div class="shipping-breakdown__table">${t}</div>`)
    .join('');
  return html`
    <div class="shipping-breakdown">
      <details class="shipping-breakdown__details">
        <summary class="shipping-breakdown__toggle">View shipping rate breakdown</summary>
        <p class="shipping-breakdown__note">
          Shipped via USPS Priority or First Class. Orders with posters/prints include tube
          packaging. Book and tube rates are added together.
        </p>
        <div innerHTML="${combined}"></div>
      </details>
    </div>
  `;
}

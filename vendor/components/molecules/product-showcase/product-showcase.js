/**
 * Product showcase — horizontal scrolling card row.
 * Usage: ::product-showcase[category=apparel,limit=6]
 *        ::product-showcase[tag=hat,limit=4]
 * @module components/molecules/product-showcase
 */

import { html, define, store } from 'hybrids';
import Product from '#store/Product.js';
import { formatPrice } from '#utils/formatPrice.js';
import { productUrl } from '#utils/routes.js';

/**
 * @typedef {Object} ProductShowcaseHost
 * @property {string} category
 * @property {string} filterTag
 * @property {number} limit
 * @property {string} heading
 * @property {any} products
 */

/** @param {any[]} products @param {string} category @param {string} filterTag @param {number} limit */
function filterProducts(products, category, filterTag, limit) {
  let filtered = products.filter((p) => p.active !== false);
  if (category)
    filtered = filtered.filter((p) =>
      Array.isArray(p.category) ? p.category.includes(category) : p.category === category,
    );
  if (filterTag) filtered = filtered.filter((p) => p.tags?.includes(filterTag));
  return limit > 0 ? filtered.slice(0, limit) : filtered;
}

/** @type {import('hybrids').Component<ProductShowcaseHost>} */
export default define({
  tag: 'product-showcase',
  category: '',
  filterTag: '',
  limit: { value: 8, connect: () => {} },
  heading: '',
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  render: {
    value: ({ category, filterTag, limit, heading, products }) => {
      if (!store.ready(products)) return html``;
      const items = filterProducts(/** @type {any[]} */ (products), category, filterTag, limit);
      if (!items.length) return html``;
      return html`
        <div class="product-showcase">
          ${heading && html`<h2 class="product-showcase__heading">${heading}</h2>`}
          <div class="product-showcase__track">
            ${items.map(
              (p) => html`
                <a href="${productUrl(p.sku)}" class="product-showcase__card">
                  <div class="product-showcase__img">
                    ${p.images?.[0]
                      ? html`<img src="${p.images[0]}" alt="${p.name}" loading="lazy" />`
                      : html`<span class="product-showcase__placeholder"></span>`}
                  </div>
                  <span class="product-showcase__name">${p.name}</span>
                  <span class="product-showcase__price">${formatPrice(p.price, p.currency)}</span>
                </a>
              `,
            )}
          </div>
        </div>
      `;
    },
    shadow: false,
  },
});

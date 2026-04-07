/**
 * Catalog view — product grid with category filter bar.
 * @module pages/catalog
 */

import { html, define, router } from 'hybrids';
import '#organisms/product-grid/product-grid.js';
import ProductDetailView from '#pages/product-detail/product-detail-view.js';

const CATEGORIES = ['all', 'shirts', 'outerwear', 'accessories', 'prints'];

/**
 * @typedef {Object} CatalogViewHost
 * @property {string} activeCategory
 */

/** @param {CatalogViewHost & HTMLElement} host */
function handleFilter(host, e) {
  host.activeCategory = e.target.dataset.category || '';
}

/** @type {import('hybrids').Component<CatalogViewHost>} */
export default define({
  tag: 'catalog-view',
  activeCategory: '',
  [router.connect]: { url: '/', stack: [ProductDetailView] },
  render: {
    value: ({ activeCategory }) => html`
      <div class="catalog-view">
        <h1>Shop</h1>
        <nav class="catalog-view__filters">
          ${CATEGORIES.map(
            (cat) => html`
              <button
                class="btn ${activeCategory === (cat === 'all' ? '' : cat)
                  ? 'btn-primary'
                  : 'btn-secondary'}"
                data-category="${cat === 'all' ? '' : cat}"
                onclick="${handleFilter}"
              >
                ${cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            `,
          )}
        </nav>
        <product-grid category="${activeCategory}"></product-grid>
      </div>
    `,
    shadow: false,
  },
});

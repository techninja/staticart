/**
 * Catalog view — product grid with category filter bar and search.
 * @module pages/catalog
 */

import { html, define, router } from 'hybrids';
import '#organisms/product-grid/product-grid.js';
import { setPageMeta } from '#utils/setPageMeta.js';
import ProductDetailView from '#pages/product-detail/product-detail-view.js';
import CartView from '#pages/cart/cart-view.js';
import OrderSuccessView from '#pages/order-success/order-success-view.js';
import OrderCancelledView from '#pages/order-cancelled/order-cancelled-view.js';
import OrdersView from '#pages/orders/orders-view.js';

const CATEGORIES = ['all', 'shirts', 'outerwear', 'accessories', 'prints'];

/**
 * @typedef {Object} CatalogViewHost
 * @property {string} activeCategory
 * @property {string} searchQuery
 */

/** @type {any} */
let debounceTimer = 0;

/** @param {CatalogViewHost & HTMLElement} host */
function handleFilter(host, e) {
  host.activeCategory = e.target.dataset.category || '';
}

/** @param {CatalogViewHost & HTMLElement} host */
function handleSearch(host, e) {
  clearTimeout(debounceTimer);
  const val = e.target.value;
  debounceTimer = setTimeout(() => {
    host.searchQuery = val;
  }, 250);
}

/** @type {import('hybrids').Component<CatalogViewHost>} */
export default define({
  tag: 'catalog-view',
  activeCategory: '',
  searchQuery: '',
  [router.connect]: {
    url: '/',
    stack: [ProductDetailView, CartView, OrderSuccessView, OrderCancelledView, OrdersView],
  },
  render: {
    value: ({ activeCategory, searchQuery }) => {
      setPageMeta('');
      return html`
        <div class="catalog-view">
          <h1>Shop</h1>
          <input
            type="search"
            class="catalog-view__search"
            placeholder="Search products…"
            oninput="${handleSearch}"
          />
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
          <product-grid category="${activeCategory}" search="${searchQuery}"></product-grid>
        </div>
      `;
    },
    shadow: false,
  },
});

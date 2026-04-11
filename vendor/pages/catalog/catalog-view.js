/**
 * Catalog view — product grid with category filter bar and search.
 * @module pages/catalog
 */

import { html, define, router, store } from 'hybrids';
import { t } from '#utils/i18n.js';
import Product from '#store/Product.js';
import '#organisms/product-grid/product-grid.js';
import { setPageMeta } from '#utils/setPageMeta.js';
import ProductDetailView from '#pages/product-detail/product-detail-view.js';
import CartView from '#pages/cart/cart-view.js';
import OrderSuccessView from '#pages/order-success/order-success-view.js';
import OrderCancelledView from '#pages/order-cancelled/order-cancelled-view.js';
import OrdersView from '#pages/orders/orders-view.js';
import ContentPageView from '#pages/content/content-page-view.js';
import NotFoundView from '#pages/not-found/not-found-view.js';

/** @param {any[]} products @returns {string[]} */
function extractCategories(products) {
  const set = new Set();
  for (const p of products) {
    if (Array.isArray(p.category)) p.category.forEach((c) => set.add(c));
    else if (p.category) set.add(p.category);
  }
  return [...set].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
}

/** @param {string} cat */
function categoryLabel(cat) {
  const key = `category.${cat}`;
  const result = t(key);
  return result !== key ? result : cat.charAt(0).toUpperCase() + cat.slice(1);
}

/**
 * @typedef {Object} CatalogViewHost
 * @property {string} activeCategory
 * @property {string} searchQuery
 * @property {any} products
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
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  [router.connect]: {
    url: '/',
    stack: [ProductDetailView, CartView, OrderSuccessView, OrderCancelledView, OrdersView, ContentPageView, NotFoundView],
  },
  render: {
    value: ({ activeCategory, searchQuery, products }) => {
      setPageMeta('');
      const ready = /** @type {any} */ (store).ready(products);
      const categories = ready ? extractCategories(/** @type {any[]} */ (products)) : [];
      return html`
        <div class="catalog-view">
          <h1>${t('catalog.title')}</h1>
          <input
            type="search"
            class="catalog-view__search"
            placeholder="${t('catalog.search')}"
            value="${searchQuery}"
            oninput="${handleSearch}"
          />
          <nav class="catalog-view__filters">
            <button
              class="btn ${activeCategory === '' ? 'btn-primary' : 'btn-secondary'}"
              data-category=""
              onclick="${handleFilter}"
            >
              ${categoryLabel('all')}
            </button>
            ${categories.map(
              (cat) => html`
                <button
                  class="btn ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}"
                  data-category="${cat}"
                  onclick="${handleFilter}"
                >
                  ${categoryLabel(cat)}
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

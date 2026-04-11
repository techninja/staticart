/**
 * Product grid — renders filtered list of product cards with pagination.
 * @module components/organisms/product-grid
 */

import { html, define, store } from 'hybrids';
import Product from '#store/Product.js';
import { t } from '#utils/i18n.js';
import '#molecules/product-card/product-card.js';

const PAGE_SIZE = 20;

/** @param {any} p @param {string} q */
function matchesSearch(p, q) {
  if (!q) return true;
  const lower = q.toLowerCase();
  if (p.name.toLowerCase().includes(lower)) return true;
  if (p.description.toLowerCase().includes(lower)) return true;
  if (p.tags?.some((tag) => tag.toLowerCase().includes(lower))) return true;
  return false;
}

/**
 * @typedef {Object} ProductGridHost
 * @property {string} category
 * @property {string} search
 * @property {number} visibleCount
 * @property {boolean} showAll
 * @property {any} products
 */

/** @param {ProductGridHost & HTMLElement} host */
function handleShowMore(host) {
  host.visibleCount += PAGE_SIZE;
}

/** @param {ProductGridHost & HTMLElement} host */
function handleShowAll(host) {
  host.showAll = true;
}

/** @type {IntersectionObserver|null} */
let scrollObserver = null;

/** @type {import('hybrids').Component<ProductGridHost>} */
export default define({
  tag: 'product-grid',
  category: {
    value: '',
    observe: (host, val, last) => {
      if (last !== undefined) {
        host.visibleCount = PAGE_SIZE;
        host.showAll = false;
      }
    },
  },
  search: {
    value: '',
    observe: (host, val, last) => {
      if (last !== undefined) {
        host.visibleCount = PAGE_SIZE;
        host.showAll = false;
      }
    },
  },
  visibleCount: PAGE_SIZE,
  showAll: false,
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  render: {
    value: ({ products, category, search, visibleCount, showAll }) => {
      if (!(/** @type {any} */ (store).ready(products)))
        return html`<p>${t('general.loading')}</p>`;
      const filtered = /** @type {any[]} */ (products).filter(
        (p) =>
          p.stock > 0 &&
          (!category ||
            (Array.isArray(p.category)
              ? p.category.includes(category)
              : p.category === category)) &&
          matchesSearch(p, search),
      );
      const total = filtered.length;
      const limit = showAll ? total : Math.min(visibleCount, total);
      const visible = filtered.slice(0, limit);
      const hasMore = limit < total;
      return html`
        <div class="product-grid">
          <p class="product-grid__count">${total} ${total === 1 ? 'product' : 'products'}</p>
          ${visible.map((p) =>
            html`
              <product-card
                sku="${p.sku}"
                name="${p.name}"
                price="${p.price}"
                currency="${p.currency}"
                image="${p.images[0] || ''}"
                stock="${p.stock}"
                detailUrl="${`/product/${p.sku}`}"
                variantsJson="${JSON.stringify(p.variants || [])}"
              ></product-card>
            `.key(p.sku),
          )}
          ${hasMore
            ? html`
                <div class="product-grid__pagination">
                  <button class="btn btn-primary" onclick="${handleShowMore}">
                    Show More (${Math.min(PAGE_SIZE, total - limit)})
                  </button>
                  <button class="btn btn-secondary" onclick="${handleShowAll}">
                    Show All (${total})
                  </button>
                </div>
              `
            : html``}
          ${showAll && hasMore ? html`<div class="product-grid__sentinel"></div>` : html``}
        </div>
      `;
    },
    shadow: false,
    observe: (host) => {
      if (!host.showAll) {
        if (scrollObserver) {
          scrollObserver.disconnect();
          scrollObserver = null;
        }
        return;
      }
      requestAnimationFrame(() => {
        const sentinel = host.querySelector('.product-grid__sentinel');
        if (!sentinel) return;
        if (scrollObserver) scrollObserver.disconnect();
        scrollObserver = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) host.visibleCount += PAGE_SIZE;
          },
          { rootMargin: '400px' },
        );
        scrollObserver.observe(sentinel);
      });
    },
  },
});

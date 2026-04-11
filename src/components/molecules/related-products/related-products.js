/**
 * Related products — horizontal scroll of products sharing tags or category.
 * @module components/molecules/related-products
 */

import { html, define, store, router } from 'hybrids';
import Product from '#store/Product.js';
import { formatPrice } from '#utils/formatPrice.js';
import { t } from '#utils/i18n.js';
import ProductDetailView from '#pages/product-detail/product-detail-view.js';

const MAX_RELATED = 20;

/**
 * @typedef {Object} RelatedProductsHost
 * @property {string} currentSku
 * @property {string} excludeSeries
 * @property {any} products
 */

/** @param {any} current @param {any} candidate @returns {number} */
function relevanceScore(current, candidate) {
  let score = 0;
  const curTags = current.tags || [];
  const canTags = candidate.tags || [];
  for (const tag of canTags) {
    if (curTags.includes(tag)) score += 2;
  }
  const curCat = Array.isArray(current.category) ? current.category : [current.category];
  const canCat = Array.isArray(candidate.category) ? candidate.category : [candidate.category];
  for (const c of canCat) {
    if (curCat.includes(c)) score += 1;
  }
  return score;
}

/** @type {import('hybrids').Component<RelatedProductsHost>} */
export default define({
  tag: 'related-products',
  currentSku: '',
  excludeSeries: '',
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  render: {
    value: ({ currentSku, excludeSeries, products }) => {
      if (!currentSku || !(/** @type {any} */ (store).ready(products))) return html``;
      const all = /** @type {any[]} */ (products);
      const current = all.find((p) => p.sku === currentSku);
      if (!current) return html``;
      const related = all
        .filter(
          (p) =>
            p.sku !== currentSku &&
            p.stock > 0 &&
            (!excludeSeries || p.metadata?.seriesTitle !== excludeSeries),
        )
        .map((p) => ({ product: p, score: relevanceScore(current, p) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RELATED)
        .map((r) => r.product);
      if (!related.length) return html``;
      return html`
        <div class="related-products">
          <h3>${t('product.relatedLabel')}</h3>
          <div class="related-products__scroll">
            ${related.map(
              (p) => html`
                <a
                  href="${router.url(ProductDetailView, { sku: p.sku })}"
                  class="related-products__item"
                  key="${p.sku}"
                >
                  <img
                    src="${p.images[0] || ''}"
                    alt="${p.name}"
                    loading="lazy"
                    class="related-products__img"
                  />
                  <span class="related-products__name">${p.name}</span>
                  <span class="related-products__price"> ${formatPrice(p.price, p.currency)} </span>
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

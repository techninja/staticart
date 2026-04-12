/**
 * Series gallery — horizontal scroll of related products by series title.
 * @module components/molecules/series-gallery
 */

import { html, define, store, router } from 'hybrids';
import Product from '#store/Product.js';
import { formatPrice } from '#utils/formatPrice.js';
import { t } from '#utils/i18n.js';
import ProductDetailView from '#pages/product-detail/product-detail-view.js';

/**
 * @typedef {Object} SeriesGalleryHost
 * @property {string} series
 * @property {string} currentSku
 * @property {any} products
 */

/** @type {import('hybrids').Component<SeriesGalleryHost>} */
export default define({
  tag: 'series-gallery',
  series: '',
  currentSku: '',
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  render: {
    value: ({ series, currentSku, products }) => {
      if (!series || !(/** @type {any} */ (store).ready(products))) return html``;
      const related = /** @type {any[]} */ (products)
        .filter((p) => p.metadata?.seriesTitle === series && p.sku !== currentSku && p.stock !== 0)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (!related.length) return html``;
      return html`
        <div class="series-gallery">
          <h3>${t('product.seriesLabel')}</h3>
          <div class="series-gallery__scroll">
            ${related.map(
              (p) => html`
                <a
                  href="${router.url(ProductDetailView, { sku: p.sku })}"
                  class="series-gallery__item"
                  key="${p.sku}"
                >
                  <img
                    src="${p.images[0] || ''}"
                    alt="${p.name}"
                    loading="lazy"
                    class="series-gallery__img"
                  />
                  <span class="series-gallery__name">${p.name}</span>
                  <span class="series-gallery__price">${formatPrice(p.price, p.currency)}</span>
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

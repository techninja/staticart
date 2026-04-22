/**
 * Product detail page — full product view with gallery, variants, add to cart.
 * @module pages/product-detail
 */

import { html, define, store, router } from 'hybrids';
import Product from '#store/Product.js';
import CartState from '#store/CartState.js';
import { formatPrice } from '#utils/formatPrice.js';
import { setPageMeta } from '#utils/setPageMeta.js';
import { effectivePrice, effectiveStock } from '#utils/productVariants.js';
import { colorImages } from '#utils/variantDimensions.js';
import { t } from '#utils/i18n.js';
import { getStoreConfig } from '#utils/storeConfig.js';
import { renderMetadata } from '#utils/renderMetadata.js';
import {
  stockBadge,
  handleAdd,
  handleIncrement,
  handleDecrement,
  handleThumbClick,
  renderNotFound,
} from './helpers.js';
import { renderVariantSelector, selectColor } from './variant-selector.js';
import '#atoms/app-badge/app-badge.js';
import '#atoms/app-icon/app-icon.js';
import '#molecules/series-gallery/series-gallery.js';
import '#molecules/related-products/related-products.js';

import CatalogView from '#pages/catalog/catalog-view.js';

/** @type {import('hybrids').Component<any>} */
export default define({
  tag: 'product-detail-view',
  sku: '',
  selectedVariant: '',
  selectedColor: '',
  selectedSize: '',
  qty: 1,
  addedLabel: '',
  activeImage: 0,
  product: {
    ...store(Product, { id: 'sku' }),
    observe(host) {
      if (host.selectedColor || !store.ready(host.product)) return;
      const variants = /** @type {any[]} */ (host.product.variants);
      const first = variants.find((v) => v.color && v.stock !== 0);
      if (first) selectColor(host, first.color);
    },
  },
  config: {
    value: /** @type {any} */ (undefined),
    connect: (host) => {
      getStoreConfig().then((c) => {
        host.config = c;
      });
    },
  },
  cart: store(CartState),
  [router.connect]: { url: '/shop/product/:sku', multiple: true, stack: [] },
  render: {
    value: (host) => {
      const { product, config, selectedVariant, qty, addedLabel, activeImage } = host;
      if (!store.ready(product)) {
        if (!store.error(product)) return html`<p>${t('general.loading')}</p>`;
        return renderNotFound(CatalogView);
      }
      const p = /** @type {any} */ (product);
      const price = effectivePrice(p, selectedVariant);
      const stock = effectiveStock(p, selectedVariant);
      const variants = /** @type {any[]} */ (p.variants);
      const images = /** @type {string[]} */ (
        colorImages(p.variants, host.selectedColor, p.images)
      );
      setPageMeta(p.name, p.description);
      return html`
        <div class="product-detail">
          <a href="${router.url(CatalogView)}" class="product-detail__back">
            <app-icon name="arrow-left" size="sm"></app-icon> ${t('product.back')}
          </a>
          <div class="product-detail__layout">
            <div class="product-detail__gallery">
              <img
                class="product-detail__main-img"
                src="${images[activeImage] || ''}"
                alt="${p.name}"
              />
              ${images.length > 1 &&
              html`
                <div class="product-detail__thumbs">
                  ${images.map(
                    (src, i) => html`
                      <img
                        class="product-detail__thumb ${i === activeImage ? 'active' : ''}"
                        src="${src}"
                        alt="${p.name} ${i + 1}"
                        data-index="${i}"
                        onclick="${handleThumbClick}"
                      />
                    `,
                  )}
                </div>
              `}
            </div>
            <div class="product-detail__info">
              <h1>${p.name}</h1>
              <p class="product-detail__price">${formatPrice(price, p.currency)}</p>
              ${stockBadge(stock)}
              <p>${p.description}</p>
              ${renderMetadata(p, config)} ${renderVariantSelector(host)}
              <div class="product-detail__qty">
                <span>${t('product.qty')}</span>
                <button class="btn btn-secondary btn-sm" onclick="${handleDecrement}">
                  <app-icon name="minus" size="sm"></app-icon>
                </button>
                <span>${qty}</span>
                <button class="btn btn-secondary btn-sm" onclick="${handleIncrement}">
                  <app-icon name="plus" size="sm"></app-icon>
                </button>
              </div>
              ${addedLabel
                ? html`<span class="product-detail__added">${addedLabel}</span>`
                : html`<button
                    class="btn btn-primary"
                    onclick="${handleAdd}"
                    disabled="${stock === 0 || (variants.length > 0 && !selectedVariant)}"
                  >
                    <app-icon name="cart" size="sm"></app-icon> ${t('cart.add')}
                  </button>`}
            </div>
          </div>
          <series-gallery
            series="${p.metadata?.seriesTitle || ''}"
            currentSku="${p.sku}"
          ></series-gallery>
          <related-products
            currentSku="${p.sku}"
            excludeSeries="${p.metadata?.seriesTitle || ''}"
          ></related-products>
        </div>
      `;
    },
    shadow: false,
  },
});

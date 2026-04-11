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
import { t } from '#utils/i18n.js';
import { getStoreConfig } from '#utils/storeConfig.js';
import { renderMetadata } from '#utils/renderMetadata.js';
import { parseFrontmatter } from '#utils/parseFrontmatter.js';
import { renderMarkdown } from '#utils/renderMarkdown.js';
import { stockBadge, handleAdd, handleVariantChange, handleQtyChange, handleThumbClick } from './helpers.js';

/** @type {any} */
let load404Cache = null;
fetch('/content/404.md').then((r) => r.ok ? r.text() : null).then((raw) => {
  if (!raw) return;
  const { meta, content } = parseFrontmatter(raw);
  load404Cache = { meta, html: renderMarkdown(content) };
}).catch(() => {});
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
  qty: 1,
  activeImage: 0,
  product: store(Product, { id: 'sku' }),
  config: {
    value: /** @type {any} */ (undefined),
    connect: (host) => { getStoreConfig().then((c) => { host.config = c; }); },
  },
  cart: store(CartState),
  [router.connect]: { url: '/product/:sku', multiple: true, stack: [] },
  render: {
    value: ({ product, config, cart: _cart, selectedVariant, qty, activeImage }) => {
      if (!store.ready(product)) {
        if (!store.error(product)) return html`<p>${t('general.loading')}</p>`;
        setPageMeta('Page Not Found');
        const md = load404Cache;
        return html`
          <div class="content-page">
            <a href="${router.url(CatalogView)}" class="content-page__back">
              <app-icon name="arrow-left" size="sm"></app-icon> ${t('product.back')}
            </a>
            ${md
              ? html`
                  ${md.meta.title ? html`<h1>${md.meta.title}</h1>` : html``}
                  <div class="content-page__body prose" innerHTML="${md.html}"></div>
                `
              : html`<h1>Page Not Found</h1><p>The page you're looking for doesn't exist.</p>`}
            <a href="${router.url(CatalogView)}" class="btn btn-primary">${t('order.continueShopping')}</a>
          </div>
        `;
      }
      const p = /** @type {any} */ (product);
      const price = effectivePrice(p, selectedVariant);
      const stock = effectiveStock(p, selectedVariant);
      const variants = /** @type {any[]} */ (p.variants);
      const images = /** @type {string[]} */ (p.images);
      setPageMeta(p.name, p.description);
      return html`
        <div class="product-detail">
          <a href="${router.url(CatalogView)}" class="product-detail__back">
            <app-icon name="arrow-left" size="sm"></app-icon> ${t('product.back')}
          </a>
          <div class="product-detail__layout">
            <div class="product-detail__gallery">
              <img class="product-detail__main-img" src="${images[activeImage] || ''}" alt="${p.name}" />
              ${images.length > 1 && html`
                <div class="product-detail__thumbs">
                  ${images.map((src, i) => html`
                    <img
                      class="product-detail__thumb ${i === activeImage ? 'active' : ''}"
                      src="${src}" alt="${p.name} ${i + 1}"
                      data-index="${i}" onclick="${handleThumbClick}"
                    />
                  `)}
                </div>
              `}
            </div>
            <div class="product-detail__info">
              <h1>${p.name}</h1>
              <p class="product-detail__price">${formatPrice(price, p.currency)}</p>
              ${stockBadge(stock)}
              <p>${p.description}</p>
              ${renderMetadata(p, config)}
              ${variants.length > 0 && html`
                <label class="product-detail__label">
                  ${t('product.variant')}
                  <select onchange="${handleVariantChange}">
                    <option value="">${t('product.select')}</option>
                    ${variants.map((v) => html`<option value="${v.id}">${v.label}</option>`)}
                  </select>
                </label>
              `}
              <label class="product-detail__label">
                ${t('product.qty')}
                <input type="number" min="1" max="${stock}" value="${qty}" onchange="${handleQtyChange}" />
              </label>
              <button class="btn btn-primary" onclick="${handleAdd}"
                disabled="${stock <= 0 || (variants.length > 0 && !selectedVariant)}">
                <app-icon name="cart" size="sm"></app-icon> ${t('cart.add')}
              </button>
            </div>
          </div>
          <series-gallery series="${p.metadata?.seriesTitle || ''}" currentSku="${p.sku}"></series-gallery>
          <related-products currentSku="${p.sku}" excludeSeries="${p.metadata?.seriesTitle || ''}"></related-products>
        </div>
      `;
    },
    shadow: false,
  },
});

/**
 * Product feature — hero spotlight for a single product by SKU.
 * Usage in markdown: ::product-feature[sku=pf-24]
 * @module components/molecules/product-feature
 */

import { html, define, store } from 'hybrids';
import Product from '#store/Product.js';
import { formatPrice } from '#utils/formatPrice.js';
import { productUrl } from '#utils/routes.js';
import '#atoms/app-icon/app-icon.js';

/**
 * @typedef {Object} ProductFeatureHost
 * @property {string} sku
 * @property {any} products
 */

/** @type {import('hybrids').Component<ProductFeatureHost>} */
export default define({
  tag: 'product-feature',
  sku: '',
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  render: {
    value: ({ sku, products }) => {
      if (!store.ready(products) || !sku) return html``;
      const product = /** @type {any[]} */ (products).find((p) => p.sku === sku);
      if (!product) return html``;
      const img = product.images?.[0] || '';
      return html`
        <div class="product-feature">
          ${img &&
          html`
            <a href="${productUrl(sku)}" class="product-feature__image">
              <img src="${img}" alt="${product.name}" loading="lazy" />
            </a>
          `}
          <div class="product-feature__info">
            <h2 class="product-feature__name">${product.name}</h2>
            <p class="product-feature__price">${formatPrice(product.price, product.currency)}</p>
            ${product.description && product.description !== product.name
              ? html`<p class="product-feature__desc">${product.description}</p>`
              : html``}
            <a href="${productUrl(sku)}" class="btn btn-primary btn-icon">
              <app-icon name="shopping-bag" size="sm"></app-icon> View Product
            </a>
          </div>
        </div>
      `;
    },
    shadow: false,
  },
});

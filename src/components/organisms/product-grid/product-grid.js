/**
 * Product grid — renders filtered list of product cards.
 * @module components/organisms/product-grid
 */

import { html, define, store } from 'hybrids';
import Product from '#store/Product.js';
import '#molecules/product-card/product-card.js';

/**
 * @typedef {Object} ProductGridHost
 * @property {string} category
 * @property {any} products
 */

/** @type {import('hybrids').Component<ProductGridHost>} */
export default define({
  tag: 'product-grid',
  category: '',
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  render: {
    value: ({ products, category }) => html`
      <div class="product-grid">
        ${
          /** @type {any} */ (store).ready(products)
            ? /** @type {any[]} */ (products)
                .filter((p) => !category || p.category === category)
                .map((p) =>
                  html`
                    <product-card
                      sku="${p.sku}"
                      name="${p.name}"
                      price="${p.price}"
                      currency="${p.currency}"
                      image="${p.images[0] || ''}"
                      stock="${p.stock}"
                      detailUrl="${`/product/${p.sku}`}"
                    ></product-card>
                  `.key(p.sku),
                )
            : html`<p>Loading products…</p>`
        }
      </div>
    `,
    shadow: false,
  },
});

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
 * @property {string} search
 * @property {any} products
 */

/** @param {any} p @param {string} q */
function matchesSearch(p, q) {
  if (!q) return true;
  const lower = q.toLowerCase();
  return p.name.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower);
}

/** @type {import('hybrids').Component<ProductGridHost>} */
export default define({
  tag: 'product-grid',
  category: '',
  search: '',
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  render: {
    value: ({ products, category, search }) => html`
      <div class="product-grid">
        ${
          /** @type {any} */ (store).ready(products)
            ? /** @type {any[]} */ (products)
                .filter((p) => (!category || p.category === category) && matchesSearch(p, search))
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
                      variantsJson="${JSON.stringify(p.variants || [])}"
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

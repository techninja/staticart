/**
 * Product detail page — full product view with gallery, variants, add to cart.
 * @module pages/product-detail
 */

import { html, define, store, router } from 'hybrids';
import Product from '#store/Product.js';
import CartState, { addToCart } from '#store/CartState.js';
import { formatPrice } from '#utils/formatPrice.js';
import { setPageMeta } from '#utils/setPageMeta.js';
import { effectivePrice, effectiveStock } from '#utils/productVariants.js';
import '#atoms/app-badge/app-badge.js';
import '#atoms/app-icon/app-icon.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/**
 * @typedef {Object} ProductDetailHost
 * @property {string} sku
 * @property {string} selectedVariant
 * @property {number} qty
 * @property {number} activeImage
 * @property {any} product
 * @property {any} cart
 */

/** @param {ProductDetailHost & HTMLElement} host */
function handleAdd(host) {
  if (!store.ready(host.cart) || !store.ready(host.product)) return;
  const p = host.product;
  const vid = host.selectedVariant;
  const variants = /** @type {any[]} */ (p.variants);
  const stock = vid ? (variants.find((v) => v.id === vid)?.stock ?? 0) : p.stock;
  if (host.qty > stock || stock <= 0) return;
  addToCart(host.cart, p.sku, vid, host.qty);
}

/** @param {ProductDetailHost & HTMLElement} host */
function handleVariantChange(host, e) {
  host.selectedVariant = e.target.value;
  host.qty = 1;
}

/** @param {ProductDetailHost & HTMLElement} host */
function handleQtyChange(host, e) {
  host.qty = Math.max(1, parseInt(e.target.value, 10) || 1);
}

/** @param {ProductDetailHost & HTMLElement} host */
function handleThumbClick(host, e) {
  host.activeImage = parseInt(e.target.dataset.index, 10) || 0;
}

/** @type {import('hybrids').Component<ProductDetailHost>} */
export default define({
  tag: 'product-detail-view',
  sku: '',
  selectedVariant: '',
  qty: 1,
  activeImage: 0,
  product: store(Product, { id: 'sku' }),
  cart: store(CartState),
  [router.connect]: { url: '/product/:sku', stack: [] },
  render: {
    value: ({ product, cart: _cart, selectedVariant, qty, activeImage }) => {
      if (!store.ready(product)) return html`<p>Loading…</p>`;
      const p = /** @type {any} */ (product);
      const price = effectivePrice(p, selectedVariant);
      const stock = effectiveStock(p, selectedVariant);
      const variants = /** @type {any[]} */ (p.variants);
      const images = /** @type {string[]} */ (p.images);
      setPageMeta(p.name, p.description);
      return html`
        <div class="product-detail">
          <a href="${router.url(CatalogView)}" class="product-detail__back">
            <app-icon name="arrow-left" size="sm"></app-icon> Back
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
              <app-badge
                label="${stock <= 0 ? 'Out of Stock' : stock <= 5 ? 'Low Stock' : 'In Stock'}"
                color="${stock <= 0 ? 'danger' : stock <= 5 ? 'warning' : 'success'}"
              ></app-badge>
              <p>${p.description}</p>
              ${variants.length > 0 &&
              html`
                <label class="product-detail__label">
                  Variant
                  <select onchange="${handleVariantChange}">
                    <option value="">Select…</option>
                    ${variants.map((v) => html`<option value="${v.id}">${v.label}</option>`)}
                  </select>
                </label>
              `}
              <label class="product-detail__label">
                Qty
                <input
                  type="number"
                  min="1"
                  max="${stock}"
                  value="${qty}"
                  onchange="${handleQtyChange}"
                />
              </label>
              <button
                class="btn btn-primary"
                onclick="${handleAdd}"
                disabled="${stock <= 0 || (variants.length > 0 && !selectedVariant)}"
              >
                <app-icon name="cart" size="sm"></app-icon> Add to Cart
              </button>
            </div>
          </div>
        </div>
      `;
    },
    shadow: false,
  },
});

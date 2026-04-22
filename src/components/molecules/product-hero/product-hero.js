/**
 * Product hero — rotating product image banner with gradient overlay.
 * Cycles through products, pauses on hover. Uses alternate images when available.
 * Usage: ::product-hero[category=apparel,interval=5000]
 * @module components/molecules/product-hero
 */

import { html, define, store } from 'hybrids';
import Product from '#store/Product.js';
import { formatPrice } from '#utils/formatPrice.js';
import { productUrl } from '#utils/routes.js';

/**
 * @typedef {Object} ProductHeroHost
 * @property {string} category
 * @property {string} filterTag
 * @property {string} heading
 * @property {number} interval
 * @property {number} activeIndex
 * @property {boolean} paused
 * @property {any} products
 */

/** @param {any[]} products @param {string} category @param {string} filterTag */
function getItems(products, category, filterTag) {
  let items = products.filter((p) => p.active !== false && p.images?.length);
  if (category)
    items = items.filter((p) =>
      Array.isArray(p.category) ? p.category.includes(category) : p.category === category,
    );
  if (filterTag) items = items.filter((p) => p.tags?.includes(filterTag));
  return items;
}

/** Build a flat list of slides — each product image gets its own entry. */
function buildSlides(products, category, filterTag) {
  const items = getItems(products, category, filterTag);
  const slides = [];
  for (const p of items) {
    const imgs = p.images || [];
    if (!imgs.length) continue;
    for (let i = 0; i < imgs.length; i++) slides.push({ product: p, image: imgs[i] });
  }
  return slides;
}

/** @type {import('hybrids').Component<ProductHeroHost>} */
export default define({
  tag: 'product-hero',
  category: '',
  filterTag: '',
  heading: '',
  interval: { value: 5000, connect: () => {} },
  activeIndex: {
    value: 0,
    connect(host, _key, invalidate) {
      const tick = () => {
        if (!host.paused) {
          const ready = /** @type {any} */ (store).ready(host.products);
          const slides = ready
            ? buildSlides(/** @type {any[]} */ (host.products), host.category, host.filterTag)
            : [];
          if (slides.length > 1) host.activeIndex = (host.activeIndex + 1) % slides.length;
          invalidate();
        }
      };
      const id = setInterval(tick, host.interval || 5000);
      return () => clearInterval(id);
    },
  },
  paused: false,
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  render: {
    value: ({ category, filterTag, heading, activeIndex, products }) => {
      if (!store.ready(products)) return html``;
      const slides = buildSlides(/** @type {any[]} */ (products), category, filterTag);
      if (!slides.length) return html``;
      const { product, image } = slides[activeIndex % slides.length];
      return html`
        <div
          class="product-hero"
          onmouseenter="${(h) => {
            h.paused = true;
          }}"
          onmouseleave="${(h) => {
            h.paused = false;
          }}"
        >
          ${heading && html`<h2 class="product-hero__heading">${heading}</h2>`}
          <a href="${productUrl(product.sku)}" class="product-hero__slide">
            <img src="${image}" alt="${product.name}" loading="lazy" />
            <span class="product-hero__price">
              <span
                class="product-hero__price-bg"
                innerHTML="${`<svg viewBox='0 0 24 24' fill='currentColor'><path d='M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z'/></svg>`}"
              ></span>
              <span class="product-hero__price-text"
                >${formatPrice(product.price, product.currency)}</span
              >
            </span>
            <div class="product-hero__overlay">
              <span class="product-hero__name">${product.name}</span>
            </div>
          </a>
          ${slides.length > 1 &&
          html`
            <div class="product-hero__dots">
              ${slides.map(
                (_, i) =>
                  html`<span
                    class="product-hero__dot${i === activeIndex % slides.length
                      ? ' product-hero__dot--active'
                      : ''}"
                  ></span>`,
              )}
            </div>
          `}
        </div>
      `;
    },
    shadow: false,
  },
});

/**
 * Product hero — horizontal scroll-snap carousel with fixed price badge.
 * Touch/mouse scrollable, auto-advances, snaps to slides.
 * Usage: ::product-hero[category=apparel,interval=5000]
 * @module components/molecules/product-hero
 */

import { html, define, store } from 'hybrids';
import Product from '#store/Product.js';
import { formatPrice } from '#utils/formatPrice.js';
import { productUrl } from '#utils/routes.js';

/**
 *
 */
function getItems(products, category, filterTag) {
  let items = products.filter((p) => p.active !== false && p.images?.length);
  if (category)
    items = items.filter((p) =>
      Array.isArray(p.category) ? p.category.includes(category) : p.category === category,
    );
  if (filterTag) items = items.filter((p) => p.tags?.includes(filterTag));
  return items;
}

/**
 *
 */
function buildSlides(products, category, filterTag) {
  const items = getItems(products, category, filterTag);
  const slides = [];
  for (const p of items) {
    if (p.carouselImages?.length) {
      for (const entry of p.carouselImages) {
        const img = typeof entry === 'number' ? p.images?.[entry] : entry;
        if (img) slides.push({ product: p, image: img });
      }
    } else {
      const img = p.heroImage || p.images?.[0];
      if (img) slides.push({ product: p, image: img });
    }
  }
  return slides;
}

let scrollTimer = null;
/**
 *
 */
function onScroll(host) {
  const track = host.querySelector('.product-hero__track');
  if (!track) return;
  track.classList.add('scrolling');
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    track.classList.remove('scrolling');
  }, 150);
  const idx = Math.round(track.scrollLeft / track.offsetWidth);
  if (idx !== host.activeIndex) {
    host.activeIndex = idx;
    host.paused = true;
  }
}

/**
 *
 */
function onWheel(host, e) {
  const track = host.querySelector('.product-hero__track');
  if (!track || !e.deltaY) return;
  e.preventDefault();
  track.scrollBy({
    left: e.deltaY > 0 ? track.offsetWidth : -track.offsetWidth,
    behavior: 'smooth',
  });
}

/**
 *
 */
function scrollTo(host, idx) {
  const track = host.querySelector('.product-hero__track');
  if (track) track.scrollTo({ left: idx * track.offsetWidth, behavior: 'smooth' });
}

/**
 *
 */
function dotClick(host, e) {
  const idx = parseInt(e.currentTarget.dataset.idx);
  host.activeIndex = idx;
  host.paused = true;
  scrollTo(host, idx);
}

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
        if (host.paused) return;
        const ready = store.ready(host.products);
        const slides = ready ? buildSlides(host.products, host.category, host.filterTag) : [];
        if (slides.length > 1) {
          const next = (host.activeIndex + 1) % slides.length;
          host.activeIndex = next;
          scrollTo(host, next);
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
      const active = slides[activeIndex % slides.length];
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
          <div class="product-hero__viewport">
            <div class="product-hero__track" onscroll="${onScroll}" onwheel="${onWheel}">
              ${slides.map(
                (s) => html`
                  <a href="${productUrl(s.product.sku)}" class="product-hero__slide">
                    <img
                      src="${s.image}"
                      alt="${s.product.name}"
                      loading="lazy"
                      draggable="false"
                    />
                  </a>
                `,
              )}
            </div>
            <span class="product-hero__price">
              <span
                class="product-hero__price-bg"
                innerHTML="${`<svg viewBox='0 0 24 24' fill='currentColor'><path d='M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z'/></svg>`}"
              >
              </span>
              <span class="product-hero__price-text"
                >${formatPrice(active.product.price, active.product.currency)}</span
              >
            </span>
            <div class="product-hero__overlay">
              <span class="product-hero__name">${active.product.name}</span>
            </div>
          </div>
          ${slides.length > 1 &&
          html`
            <div class="product-hero__dots">
              ${slides.map(
                (_, i) =>
                  html`<span
                    class="product-hero__dot${i === activeIndex % slides.length
                      ? ' product-hero__dot--active'
                      : ''}"
                    data-idx="${i}"
                    onclick="${dotClick}"
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

/**
 * Home page — renders /content/home.md or falls back to catalog redirect.
 * Config-driven: set store.homePage to customize the content slug.
 * @module pages/home
 */

import { html, define, router } from 'hybrids';
import { parseFrontmatter } from '#utils/parseFrontmatter.js';
import { renderMarkdown } from '#utils/renderMarkdown.js';
import { setPageMeta } from '#utils/setPageMeta.js';
import { getStoreConfigSync } from '#utils/storeConfig.js';
import '#molecules/product-feature/product-feature.js';
import '#molecules/product-showcase/product-showcase.js';
import '#molecules/product-hero/product-hero.js';
import '#molecules/content-callout/content-callout.js';
import CatalogView from '#pages/catalog/catalog-view.js';
import ProductDetailView from '#pages/product-detail/product-detail-view.js';
import CartView from '#pages/cart/cart-view.js';
import OrderSuccessView from '#pages/order-success/order-success-view.js';
import OrderCancelledView from '#pages/order-cancelled/order-cancelled-view.js';
import OrdersView from '#pages/orders/orders-view.js';
import ContentPageView from '#pages/content/content-page-view.js';
import NotFoundView from '#pages/not-found/not-found-view.js';

/**
 * @typedef {Object} HomeViewHost
 * @property {any} page
 * @property {boolean} fallback
 */

/** @param {HomeViewHost & HTMLElement} host */
async function loadHome(host) {
  const slug = getStoreConfigSync().store?.homePage || 'home';
  try {
    const res = await fetch(`/content/${slug}.md`);
    if (!res.ok) {
      host.fallback = true;
      return;
    }
    const raw = await res.text();
    const { meta, content } = parseFrontmatter(raw);
    host.page = { meta, html: renderMarkdown(content) };
  } catch {
    host.fallback = true;
  }
}

export default define({
  tag: 'home-view',
  page: {
    value: /** @type {any} */ (undefined),
    connect(host, _key, invalidate) {
      loadHome(host).then(() => invalidate());
    },
  },
  fallback: false,
  [router.connect]: {
    url: '/',
    stack: [
      CatalogView,
      ProductDetailView,
      CartView,
      OrderSuccessView,
      OrderCancelledView,
      OrdersView,
      ContentPageView,
      NotFoundView,
    ],
  },
  render: {
    value: ({ page, fallback }) => {
      if (fallback) {
        setPageMeta('');
        return html`
          <div class="home-view">
            <a href="${router.url(CatalogView)}" class="btn btn-primary">${'Browse the Shop'}</a>
          </div>
        `;
      }
      if (page === undefined)
        return html`<div class="loading-overlay"><span class="spinner"></span></div>`;
      setPageMeta(page.meta.title || '');
      return html`
        <div class="home-view">
          ${page.meta.title ? html`<h1>${page.meta.title}</h1>` : html``}
          <div class="content-page__body prose" innerHTML="${page.html}"></div>
        </div>
      `;
    },
    shadow: false,
  },
});

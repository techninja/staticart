/**
 * Product detail helpers — event handlers and UI fragments.
 * @module pages/product-detail/helpers
 */

import { html, store, router } from 'hybrids';
import { addToCart } from '#store/CartState.js';
import { t } from '#utils/i18n.js';
import { parseFrontmatter } from '#utils/parseFrontmatter.js';
import { renderMarkdown } from '#utils/renderMarkdown.js';
import { setPageMeta } from '#utils/setPageMeta.js';

/** @type {any} */
let notFoundCache = null;
fetch('/content/404.md')
  .then((r) => (r.ok ? r.text() : null))
  .then((raw) => {
    if (!raw) return;
    const { meta, content } = parseFrontmatter(raw);
    notFoundCache = { meta, html: renderMarkdown(content) };
  })
  .catch(() => {});

/**
 * Render the 404 page for unknown products.
 * @param {any} CatalogView
 */
export function renderNotFound(CatalogView) {
  setPageMeta('Page Not Found');
  const md = notFoundCache;
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
        : html`<h1>Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>`}
      <a href="${router.url(CatalogView)}" class="btn btn-primary"
        >${t('order.continueShopping')}</a
      >
    </div>
  `;
}

/** @param {number} s */
export function stockBadge(s) {
  const label =
    s < 0
      ? 'product.inStock'
      : s === 0
        ? 'product.outOfStock'
        : s <= 5
          ? 'product.lowStock'
          : 'product.inStock';
  const color = s < 0 ? 'success' : s === 0 ? 'danger' : s <= 5 ? 'warning' : 'success';
  return html`<app-badge label="${t(label)}" color="${color}"></app-badge>`;
}

/** @param {any} host */
export function handleAdd(host) {
  if (!store.ready(host.cart) || !store.ready(host.product)) return;
  const { product: p, selectedVariant: vid, qty } = host;
  const stock = vid ? (p.variants.find((v) => v.id === vid)?.stock ?? 0) : p.stock;
  if (stock < 0 || (qty <= stock && stock > 0)) addToCart(host.cart, p.sku, vid, qty);
}

/** @param {any} host */
export function handleVariantChange(host, e) {
  host.selectedVariant = e.target.value;
  host.qty = 1;
}

/** @param {any} host */
export function handleQtyChange(host, e) {
  host.qty = Math.max(1, parseInt(e.target.value, 10) || 1);
}

/** @param {any} host */
export function handleThumbClick(host, e) {
  host.activeImage = parseInt(e.target.dataset.index, 10) || 0;
}

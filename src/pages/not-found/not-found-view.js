/**
 * Not found view — 404 page, optionally powered by /content/404.md.
 * @module pages/not-found
 */

import { html, define, router } from 'hybrids';
import { parseFrontmatter } from '#utils/parseFrontmatter.js';
import { renderMarkdown } from '#utils/renderMarkdown.js';
import { setPageMeta } from '#utils/setPageMeta.js';
import { t } from '#utils/i18n.js';
import '#atoms/app-icon/app-icon.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/** @returns {Promise<{meta: any, html: string}|null>} */
async function load404() {
  try {
    const res = await fetch('/content/404.md');
    if (!res.ok) return null;
    const raw = await res.text();
    const { meta, content } = parseFrontmatter(raw);
    return { meta, html: renderMarkdown(content) };
  } catch {
    return null;
  }
}

export default define({
  tag: 'not-found-view',
  [router.connect]: { url: '/:path', stack: [] },
  path: '',
  page: {
    value: /** @type {any} */ (undefined),
    connect(host, _key, invalidate) {
      load404().then((p) => {
        host.page = p;
        invalidate();
      });
    },
  },
  render: {
    value: ({ page }) => {
      setPageMeta('Page Not Found');
      return html`
        <div class="content-page">
          <a href="${router.url(CatalogView)}" class="content-page__back">
            <app-icon name="arrow-left" size="sm"></app-icon> ${t('product.back')}
          </a>
          ${page
            ? html`
                ${page.meta.title ? html`<h1>${page.meta.title}</h1>` : html``}
                <div class="content-page__body prose" innerHTML="${page.html}"></div>
              `
            : html`
                <h1>Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
              `}
          <a href="${router.url(CatalogView)}" class="btn btn-primary">
            ${t('order.continueShopping')}
          </a>
        </div>
      `;
    },
    shadow: false,
  },
});

/**
 * Content page — renders a markdown file from /content/<slug>.md.
 * Supports frontmatter for title and description.
 * @module pages/content
 */

import { html, define, router } from 'hybrids';
import { parseFrontmatter } from '#utils/parseFrontmatter.js';
import { renderMarkdown } from '#utils/renderMarkdown.js';
import { setPageMeta } from '#utils/setPageMeta.js';
import { t } from '#utils/i18n.js';
import '#atoms/app-icon/app-icon.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/** @param {string} slug @returns {Promise<{meta: any, html: string}|null>} */
async function loadPage(slug) {
  try {
    const res = await fetch(`/content/${slug}.md`);
    if (!res.ok) return null;
    const raw = await res.text();
    const { meta, content } = parseFrontmatter(raw);
    return { meta, html: renderMarkdown(content) };
  } catch {
    return null;
  }
}

export default define({
  tag: 'content-page-view',
  [router.connect]: { url: '/page/:slug', stack: [] },
  slug: '',
  page: {
    value: /** @type {any} */ (undefined),
    connect(host, _key, invalidate) {
      if (host.slug)
        loadPage(host.slug).then((p) => {
          host.page = p;
          invalidate();
        });
    },
  },
  render: {
    value: ({ page }) => {
      if (page === undefined) return html`<p>${t('general.loading')}</p>`;
      if (!page) {
        setPageMeta('Not Found');
        return html`
          <div class="content-page">
            <h1>Page not found</h1>
            <a href="${router.url(CatalogView)}" class="btn btn-primary">
              <app-icon name="arrow-left" size="sm"></app-icon> ${t('product.back')}
            </a>
          </div>
        `;
      }
      setPageMeta(page.meta.title || '');
      return html`
        <div class="content-page">
          <a href="${router.url(CatalogView)}" class="content-page__back">
            <app-icon name="arrow-left" size="sm"></app-icon> ${t('product.back')}
          </a>
          ${page.meta.title ? html`<h1>${page.meta.title}</h1>` : html``}
          <div class="content-page__body prose" innerHTML="${page.html}"></div>
        </div>
      `;
    },
    shadow: false,
  },
});

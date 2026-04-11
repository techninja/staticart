/**
 * App footer — config-driven links, logo, and copyright text.
 * @module components/organisms/app-footer
 */

import { html, define } from 'hybrids';
import { getStoreConfigSync } from '#utils/storeConfig.js';

/** @type {import('hybrids').Component<HTMLElement>} */
export default define({
  tag: 'app-footer',
  render: {
    value: () => {
      const cfg = getStoreConfigSync();
      const store = cfg.store || {};
      const footer = cfg.footer || {};
      const links = footer.links || [];
      const text = footer.text || `© ${new Date().getFullYear()} ${store.name || 'StatiCart'}`;
      return html`
        <footer class="app-footer">
          <div class="app-footer__inner">
            ${store.logo
              ? html`<img src="${store.logo}" alt="${store.name}" class="app-footer__logo" />`
              : html`<span class="app-footer__name">${store.name || 'StatiCart'}</span>`}
            ${links.length > 0 &&
            html`
              <nav class="app-footer__links">
                ${links.map(
                  (l) => html`<a href="${l.url}" class="app-footer__link">${l.label}</a>`,
                )}
              </nav>
            `}
            <p class="app-footer__text">${text}</p>
          </div>
        </footer>
      `;
    },
    shadow: false,
  },
});

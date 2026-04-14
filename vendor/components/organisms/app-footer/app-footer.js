/**
 * App footer — config-driven footer with links and copyright.
 * @module components/organisms/app-footer
 */

import { html, define } from 'hybrids';
import { getStoreConfigSync } from '#utils/storeConfig.js';

export default define({
  tag: 'app-footer',
  render: {
    value: () => {
      const cfg = getStoreConfigSync();
      const footer = cfg.footer || {};
      const links = footer.links || [];
      const site = cfg.site || {};
      return html`
        <footer class="app-footer">
          <div class="app-footer__inner">
            ${site.homeUrl &&
            html`<a href="${site.homeUrl}" class="app-footer__brand">
              ${cfg.store?.logo
                ? html`<img src="${cfg.store.logo}" alt="" class="app-footer__logo" />`
                : html`<span>${cfg.store?.name || ''}</span>`}
            </a>`}
            ${links.length > 0 &&
            html`<nav class="app-footer__links">
              ${links.map((l) => html`<a href="${l.url}">${l.label}</a>`)}
            </nav>`}
            ${footer.text && html`<span class="app-footer__bottom">${footer.text}</span>`}
          </div>
        </footer>
      `;
    },
    shadow: false,
  },
});

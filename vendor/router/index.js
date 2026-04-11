/**
 * App router shell — manages view stack with header.
 * Loads store config on init for locale/currency settings.
 * @module router
 */

import { html, define, router } from 'hybrids';
import { getStoreConfig } from '#utils/storeConfig.js';
import { setLocale } from '#utils/formatPrice.js';
import { loadLocale } from '#utils/i18n.js';
import '#organisms/app-header/app-header.js';
import '#organisms/app-footer/app-footer.js';
import CatalogView from '#pages/catalog/catalog-view.js';

let isBack = false;
window.addEventListener('popstate', () => {
  isBack = true;
});

export default define({
  tag: 'app-router',
  stack: router(CatalogView, { url: '/' }),
  configLoaded: {
    value: false,
    connect(host, _key, invalidate) {
      getStoreConfig().then((cfg) => {
        const locale = cfg.store?.locale;
        if (locale) setLocale(locale);
        loadLocale(locale).then(() => {
          host.configLoaded = true;
          invalidate();
        });
      });
    },
  },
  render: {
    value: ({ stack, configLoaded }) => html`
      <div class="app-router">
        ${configLoaded
          ? html`
              <app-header></app-header>
              <main class="app-main">${stack}</main>
              <app-footer></app-footer>
            `
          : html``}
      </div>
    `,
    shadow: false,
    observe: (host, val, last) => {
      if (!last) return;
      const goingBack = isBack;
      isBack = false;
      if (goingBack) return;
      requestAnimationFrame(() => {
        window.scrollTo({ top: 1, behavior: 'instant' });
        const main = host.querySelector('.app-main');
        if (!main) return;
        main.classList.remove('app-main--enter');
        void main.offsetWidth;
        main.classList.add('app-main--enter');
      });
    },
  },
});

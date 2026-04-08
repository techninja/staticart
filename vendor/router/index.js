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
import CatalogView from '#pages/catalog/catalog-view.js';

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
            `
          : html``}
      </div>
    `,
    shadow: false,
  },
});

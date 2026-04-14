/**
 * App header — site name, nav links, cart count, user state, theme toggle.
 * @module components/organisms/app-header
 */

import { html, define, store, router } from 'hybrids';
import UserPrefs from '#store/UserPrefs.js';
import { t } from '#utils/i18n.js';
import { getStoreConfigSync } from '#utils/storeConfig.js';
import '#atoms/cart-count/cart-count.js';
import '#atoms/theme-toggle/theme-toggle.js';
import '#atoms/region-select/region-select.js';
import '#atoms/app-icon/app-icon.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/**
 * @typedef {Object} AppHeaderHost
 * @property {any} prefs
 */

/** @param {AppHeaderHost & HTMLElement} host */
function handleSignOut(host) {
  if (!store.ready(host.prefs)) return;
  store.set(host.prefs, { displayName: '', email: '' });
}

/** @type {import('hybrids').Component<AppHeaderHost>} */
export default define({
  tag: 'app-header',
  prefs: store(UserPrefs),
  render: {
    value: ({ prefs }) => {
      const loggedIn = store.ready(prefs) && prefs.email;
      const name = store.ready(prefs) ? prefs.displayName : '';
      const cfg = getStoreConfigSync();
      const store_cfg = cfg.store || {};
      const navLinks = cfg.nav?.links || [];
      return html`
        <header class="app-header">
          <a href="${router.url(CatalogView)}" class="app-header__brand">
            ${store_cfg.logo
              ? html`<img
                  src="${store_cfg.logo}"
                  alt="${store_cfg.name}"
                  class="app-header__logo"
                />`
              : html`<span class="app-header__name">${store_cfg.name}</span>`}
          </a>
          <nav class="app-header__nav">
            <a href="${router.url(CatalogView)}" class="app-header__link">${t('nav.shop')}</a>
            ${navLinks.map((l) => html`<a href="${l.url}" class="app-header__link">${l.label}</a>`)}
            ${loggedIn && html`<a href="/orders" class="app-header__link">${t('nav.orders')}</a>`}
          </nav>
          <div class="app-header__actions">
            ${loggedIn &&
            html`
              <span class="app-header__user" title="${name || prefs.email}">
                <app-icon name="user" size="sm"></app-icon>
                <span class="app-header__user-name">${name || prefs.email}</span>
              </span>
              <button
                class="btn btn-secondary btn-sm app-header__sign-out"
                onclick="${handleSignOut}"
                title="${t('nav.signOut')}"
              >
                <app-icon name="log-out" size="sm" class="app-header__sign-out-icon"></app-icon>
                <span class="app-header__sign-out-label">${t('nav.signOut')}</span>
              </button>
            `}
            <a href="/cart" class="app-header__cart-link">
              <app-icon name="cart" size="md"></app-icon>
              <cart-count></cart-count>
            </a>
            <theme-toggle></theme-toggle>
            ${cfg.shipping?.regionSelector !== false && html`<region-select></region-select>`}
          </div>
        </header>
      `;
    },
    shadow: false,
  },
});

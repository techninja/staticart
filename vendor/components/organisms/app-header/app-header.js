/**
 * App header — site name, nav links, cart count, user state, theme toggle.
 * @module components/organisms/app-header
 */

import { html, define, store, router } from 'hybrids';
import UserPrefs from '#store/UserPrefs.js';
import { isAuthenticated, clearToken, getTokenEmail, getTokenName } from '#utils/passkey.js';
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
 * @property {number} authTick
 */

/** @param {AppHeaderHost & HTMLElement} host */
function handleSignOut(host) {
  clearToken();
  if (store.ready(host.prefs)) store.set(host.prefs, { displayName: '', email: '' });
}

/** @param {string} href */
function linkClass(href) {
  const active = location.pathname === href || (href !== '/' && location.pathname.startsWith(href));
  return `app-header__link${active ? ' app-header__link--active' : ''}`;
}

/** @type {import('hybrids').Component<AppHeaderHost>} */
export default define({
  tag: 'app-header',
  prefs: store(UserPrefs),
  authTick: {
    value: 0,
    connect(host, _key, invalidate) {
      const handler = () => {
        host.authTick++;
        invalidate();
      };
      addEventListener('staticart:auth-changed', handler);
      addEventListener('popstate', handler);
      // Watch for route changes via DOM mutations in <main>
      const observer = new MutationObserver(handler);
      const startObserving = () => {
        const main = document.querySelector('.app-main');
        if (main) observer.observe(main, { childList: true });
        else requestAnimationFrame(startObserving);
      };
      startObserving();
      return () => {
        removeEventListener('staticart:auth-changed', handler);
        removeEventListener('popstate', handler);
        observer.disconnect();
      };
    },
  },
  render: {
    value: ({ prefs }) => {
      const loggedIn = isAuthenticated();
      const name = getTokenName() || getTokenEmail();
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
            <a href="${router.url(CatalogView)}" class="${linkClass('/')}">${t('nav.shop')}</a>
            ${navLinks.map(
              (l) => html`<a href="${l.url}" class="${linkClass(l.url)}">${l.label}</a>`,
            )}
            <a href="/orders" class="${linkClass('/orders')}">${t('nav.orders')}</a>
          </nav>
          <div class="app-header__actions">
            ${loggedIn
              ? html`
                  <button
                    class="app-header__sign-out"
                    onclick="${handleSignOut}"
                    title="${name} — ${t('nav.signOut')}"
                  >
                    <app-icon name="user-x" size="md"></app-icon>
                  </button>
                `
              : html`
                  <a href="/orders" class="app-header__sign-in" title="${t('nav.signIn')}">
                    <app-icon name="user" size="md"></app-icon>
                  </a>
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

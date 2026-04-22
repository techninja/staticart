/**
 * App header — site name, nav links, cart count, user state, theme toggle.
 * Receives `current-path` from the router on each navigation.
 * @module components/organisms/app-header
 */

import { html, define, store, router } from 'hybrids';
import UserPrefs from '#store/UserPrefs.js';
import { isAuthenticated, clearToken, getTokenEmail, getTokenName } from '#utils/passkey.js';
import { t } from '#utils/i18n.js';
import { routes } from '#utils/routes.js';
import { getStoreConfigSync } from '#utils/storeConfig.js';
import '#atoms/cart-count/cart-count.js';
import '#atoms/theme-toggle/theme-toggle.js';
import '#atoms/region-select/region-select.js';
import '#atoms/app-icon/app-icon.js';
import CatalogView from '#pages/catalog/catalog-view.js';
import HomeView from '#pages/home/home-view.js';
import OrdersView from '#pages/orders/orders-view.js';

/**
 * @typedef {Object} AppHeaderHost
 * @property {any} prefs
 * @property {string} currentPath
 * @property {number} authTick
 */

/** @param {AppHeaderHost & HTMLElement} host */
function handleSignOut(host) {
  clearToken();
  if (store.ready(host.prefs)) store.set(host.prefs, { displayName: '', email: '' });
}

/** Is the path active? Exact match for /, prefix match for everything else. */
function isActive(href, currentPath) {
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(href + '/');
}

/** @type {import('hybrids').Component<AppHeaderHost>} */
export default define({
  tag: 'app-header',
  prefs: store(UserPrefs),
  currentPath: '/',
  authTick: {
    value: 0,
    connect(host, _key, invalidate) {
      const bump = () => {
        host.authTick++;
        invalidate();
      };
      addEventListener('staticart:auth-changed', bump);
      return () => removeEventListener('staticart:auth-changed', bump);
    },
  },
  render: {
    value: ({ prefs, currentPath }) => {
      const loggedIn = isAuthenticated();
      const name = getTokenName() || getTokenEmail();
      const cfg = getStoreConfigSync();
      const storeCfg = cfg.store || {};
      const navLinks = cfg.nav?.links || [];
      const ac = (href) =>
        `app-header__link${isActive(href, currentPath) ? ' app-header__link--active' : ''}`;
      return html`
        <header class="app-header">
          <a
            href="${router.url(HomeView)}"
            class="app-header__brand${currentPath === '/' ? ' app-header__brand--active' : ''}"
          >
            ${storeCfg.logo
              ? html`<img src="${storeCfg.logo}" alt="${storeCfg.name}" class="app-header__logo" />`
              : html`<span class="app-header__name">${storeCfg.name}</span>`}
          </a>
          <nav class="app-header__nav">
            <a href="${router.url(CatalogView)}" class="${ac('/shop')}">${t('nav.shop')}</a>
            ${navLinks.map((l) => html`<a href="${l.url}" class="${ac(l.url)}">${l.label}</a>`)}
            <a href="${router.url(OrdersView)}" class="${ac('/orders')}">${t('nav.orders')}</a>
          </nav>
          <div class="app-header__actions">
            ${loggedIn
              ? html`<button
                  class="app-header__sign-out"
                  onclick="${handleSignOut}"
                  title="${name} — ${t('nav.signOut')}"
                >
                  <app-icon name="user-x" size="md"></app-icon>
                </button>`
              : html`<a
                  href="${router.url(OrdersView)}"
                  class="app-header__sign-in"
                  title="${t('nav.signIn')}"
                >
                  <app-icon name="user" size="md"></app-icon>
                </a>`}
            <a
              href="${routes.cart}"
              class="app-header__cart-link${isActive('/shop/cart', currentPath)
                ? ' app-header__cart-link--active'
                : ''}"
            >
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

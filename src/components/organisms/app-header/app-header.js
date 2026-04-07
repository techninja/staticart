/**
 * App header — site name, nav links, cart count, theme toggle.
 * @module components/organisms/app-header
 */

import { html, define, router } from 'hybrids';
import '#atoms/cart-count/cart-count.js';
import '#atoms/theme-toggle/theme-toggle.js';
import CatalogView from '#pages/catalog/catalog-view.js';

export default define({
  tag: 'app-header',
  render: {
    value: () => html`
      <header class="app-header">
        <a href="${router.url(CatalogView)}" class="app-header__brand">
          <img src="/assets/staticart_logo.svg" alt="StatiCart" class="app-header__logo" />
        </a>
        <nav class="app-header__nav">
          <a href="${router.url(CatalogView)}" class="app-header__link">Shop</a>
        </nav>
        <div class="app-header__actions">
          <a href="/cart" class="app-header__cart-link">
            <cart-count></cart-count>
          </a>
          <theme-toggle></theme-toggle>
        </div>
      </header>
    `,
    shadow: false,
  },
});

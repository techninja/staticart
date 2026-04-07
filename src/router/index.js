/**
 * App router shell — manages view stack with header.
 * @module router
 */

import { html, define, router } from 'hybrids';
import '#organisms/app-header/app-header.js';
import CatalogView from '#pages/catalog/catalog-view.js';

export default define({
  tag: 'app-router',
  stack: router(CatalogView, { url: '/' }),
  render: {
    value: ({ stack }) => html`
      <div class="app-router">
        <app-header></app-header>
        <main class="app-main">${stack}</main>
      </div>
    `,
    shadow: false,
  },
});

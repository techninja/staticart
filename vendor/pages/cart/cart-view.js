/**
 * Cart view — full cart page with item list, subtotal, shipping, checkout.
 * @module pages/cart
 */

import { html, define, store, router } from 'hybrids';
import Product from '#store/Product.js';
import CartState from '#store/CartState.js';
import AppState from '#store/AppState.js';
import { formatPrice } from '#utils/formatPrice.js';
import { requestCheckout } from '#utils/checkout.js';
import { t } from '#utils/i18n.js';
import { estimateShipping } from '#utils/shippingEstimate.js';
import { renderShippingBreakdown } from '#utils/shippingBreakdown.js';
import { findProduct, subtotal, buildLineItems, buildShippingItems } from './helpers.js';
import '#molecules/cart-item/cart-item.js';
import CatalogView from '#pages/catalog/catalog-view.js';

/** @param {any} host */
async function handleCheckout(host) {
  if (!(/** @type {any} */ (store).ready(host.cart))) return;
  const items = /** @type {any[]} */ (host.cart.items);
  const prods = /** @type {any[]} */ (host.products);
  host.checkingOut = true;
  host.checkoutError = '';
  const shippingItems = buildShippingItems(prods, items);
  const { summary } = estimateShipping(shippingItems, host.appState?.region || 'US');
  const result = await requestCheckout(
    buildLineItems(prods, items),
    host.appState?.region || 'US',
    summary,
  );
  host.checkingOut = false;
  if (result.url) window.location.href = result.url;
  else if (result.unavailable) {
    const prods = /** @type {any[]} */ (host.products);
    const names = result.unavailable.map((u) => {
      const p = prods.find((pd) => pd.sku === u.sku);
      return `${p?.name || u.sku} (${u.available} left)`;
    });
    host.checkoutError = `Insufficient stock: ${names.join(', ')}`;
  } else host.checkoutError = result.error || 'Checkout failed';
}

/** @type {import('hybrids').Component<any>} */
export default define({
  tag: 'cart-view',
  cart: store(CartState),
  appState: store(AppState),
  products: /** @type {any} */ (store([Product], { id: () => ({}) })),
  checkoutError: '',
  checkingOut: false,
  [router.connect]: { url: '/cart', stack: [] },
  render: {
    value: ({ cart, products, appState, checkoutError, checkingOut }) => {
      const ready = [cart, products, appState].every((s) => /** @type {any} */ (store).ready(s));
      if (!ready) return html`<p>${t('general.loading')}</p>`;
      const items = /** @type {any[]} */ (cart.items).filter((i) => i.sku);
      const prods = /** @type {any[]} */ (products);
      if (!items.length) {
        return html`
          <div class="cart-view">
            <h1>${t('cart.title')}</h1>
            <p class="cart-view__empty">${t('cart.empty')}</p>
            <a href="${router.url(CatalogView)}" class="btn btn-primary"
              >${t('order.continueShopping')}</a
            >
          </div>
        `;
      }
      const total = subtotal(prods, items);
      const region = appState?.region || 'US';
      const { amount: shipping, summary: shippingSummary } = estimateShipping(
        buildShippingItems(prods, items),
        region,
      );
      return html`
        <div class="cart-view">
          <h1>${t('cart.title')}</h1>
          ${items.map((item) => {
            const p = findProduct(prods, item.sku);
            if (!p) return html``;
            const v = item.variantId ? p.variants.find((v) => v.id === item.variantId) : null;
            return html`
              <cart-item
                sku="${item.sku}"
                variantId="${item.variantId}"
                name="${p.name}"
                variantLabel="${v ? v.label : ''}"
                price="${v && v.price > 0 ? v.price : p.price}"
                currency="${p.currency}"
                image="${p.images[0] || ''}"
                quantity="${item.quantity}"
                maxStock="${v ? v.stock : p.stock}"
              ></cart-item>
            `;
          })}
          ${renderShippingBreakdown(buildShippingItems(prods, items), region)}
          <div class="cart-view__footer">
            <div class="cart-view__totals">
              <span>${t('cart.subtotal')}: ${formatPrice(total)}</span>
              ${shipping > 0 && html`<span>${t('cart.shipping')}: ${formatPrice(shipping)}</span>`}
              ${shippingSummary &&
              html`<span class="cart-view__shipping-detail">${shippingSummary}</span>`}
              <span class="cart-view__total"
                >${t('cart.total')}: ${formatPrice(total + shipping)}</span
              >
            </div>
            <div class="cart-view__buttons">
              <a href="${router.url(CatalogView)}" class="btn btn-secondary"
                >${t('order.continueShopping')}</a
              >
              <button class="btn btn-primary" onclick="${handleCheckout}" disabled="${checkingOut}">
                ${checkingOut ? t('cart.processing') : t('cart.checkout')}
              </button>
            </div>
          </div>
          ${checkoutError && html`<p class="error-message">${checkoutError}</p>`}
        </div>
      `;
    },
    shadow: false,
  },
});

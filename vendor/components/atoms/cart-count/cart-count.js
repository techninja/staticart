/**
 * Cart count badge — displays number of items in cart.
 * @module components/atoms/cart-count
 */

import { html, define, store } from 'hybrids';
import CartState, { cartCount } from '#store/CartState.js';

export default define({
  tag: 'cart-count',
  cart: store(CartState),
  render: {
    value: ({ cart }) => html`
      <span class="cart-count"> ${store.ready(cart) ? cartCount(cart) : 0} </span>
    `,
    shadow: false,
  },
});

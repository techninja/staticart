/**
 * i18n — 4-layer message cascade.
 *
 * Resolution order (last wins):
 * 1. Package defaults (English, hardcoded below)
 * 2. Package locale file (/locales/<lang>.json)
 * 3. Project overrides (/locales/overrides.json) — customizes English
 * 4. Project locale overrides (/locales/overrides.<lang>.json)
 *
 * Implementors add keys for custom components in overrides.json.
 * @module utils/i18n
 */

/** @type {Record<string, string>} */
const DEFAULTS = {
  'cart.add': 'Add to Cart',
  'cart.added': '✓ Added!',
  'cart.addedVariant': '✓ Added {variant}!',
  'cart.empty': 'Your cart is empty.',
  'cart.subtotal': 'Subtotal',
  'cart.checkout': 'Proceed to Checkout',
  'cart.processing': 'Processing…',
  'product.inStock': 'In Stock',
  'product.lowStock': 'Low Stock',
  'product.outOfStock': 'Out of Stock',
  'product.variant': 'Variant',
  'product.qty': 'Qty',
  'nav.shop': 'Shop',
  'nav.orders': 'Orders',
  'nav.signOut': 'Sign out',
  'order.confirmed': 'Order Confirmed!',
  'order.thanks': "Thank you! You'll receive a confirmation email shortly.",
  'order.thanksName': "Thanks, {name}! You'll receive a confirmation email shortly.",
  'order.cancelled': 'Checkout Cancelled',
  'order.cancelledMsg': 'Your cart is still saved. You can return to it anytime.',
  'order.continueShopping': 'Continue Shopping',
  'order.backToCart': 'Back to Cart',
  'orders.title': 'Order History',
  'orders.noAccount': 'Complete a purchase to view your order history.',
  'orders.noOrders': 'No orders found yet.',
  'orders.load': 'Load Orders',
  'orders.startShopping': 'Start Shopping',
};

/** @type {Record<string, string>} */
let active = { ...DEFAULTS };

/** @param {string} url @returns {Promise<Record<string, string>>} */
async function fetchJson(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

/**
 * Load and merge all i18n layers. Call once on app init.
 * @param {string} [locale]
 */
export async function loadLocale(locale) {
  const lang = locale?.split('-')[0] || '';
  const isEnglish = !lang || lang === 'en';

  const [localeStrings, overrides, localeOverrides] = await Promise.all([
    isEnglish ? {} : fetchJson(`/locales/${lang}.json`),
    fetchJson('/locales/overrides.json'),
    isEnglish ? {} : fetchJson(`/locales/overrides.${lang}.json`),
  ]);

  active = { ...DEFAULTS, ...localeStrings, ...overrides, ...localeOverrides };
}

/**
 * Get a translated message with optional interpolation.
 * @param {string} key
 * @param {Record<string, string>} [params]
 * @returns {string}
 */
export function t(key, params) {
  let msg = active[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, v);
    }
  }
  return msg;
}

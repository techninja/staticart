/**
 * Stripe helpers — checkout session creation with shipping + tax.
 * Client is lazy-initialized so the module can be imported without keys.
 * @module api/lib/stripe
 */

import Stripe from 'stripe';

/** @type {Stripe|null} */
let _stripe = null;

/** @returns {Stripe} */
export function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/**
 * @typedef {Object} CheckoutOptions
 * @property {Array<{name: string, price: number, currency: string, quantity: number}>} items
 * @property {string} successUrl
 * @property {string} cancelUrl
 * @property {{type: string, amount?: number}} [shipping]
 * @property {boolean} [automaticTax]
 * @property {string} [locale]
 */

const STRIPE_LOCALES = new Set([
  'auto', 'bg', 'cs', 'da', 'de', 'el', 'en', 'en-GB', 'es', 'es-419',
  'et', 'fi', 'fil', 'fr', 'fr-CA', 'hr', 'hu', 'id', 'it', 'ja', 'ko',
  'lt', 'lv', 'ms', 'mt', 'nb', 'nl', 'pl', 'pt', 'pt-BR', 'ro', 'ru',
  'sk', 'sl', 'sv', 'th', 'tr', 'vi', 'zh', 'zh-HK', 'zh-TW',
]);

/** @param {string} [locale] */
function mapStripeLocale(locale) {
  if (!locale) return 'auto';
  if (STRIPE_LOCALES.has(locale)) return locale;
  const lang = locale.split('-')[0];
  return STRIPE_LOCALES.has(lang) ? lang : 'auto';
}

/** @param {CheckoutOptions} opts */
export async function createCheckoutSession(opts) {
  /** @type {any} */
  const params = {
    mode: 'payment',
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    locale: mapStripeLocale(opts.locale),
    line_items: opts.items.map((item) => ({
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: item.price,
        product_data: { name: item.name },
      },
      quantity: item.quantity,
    })),
  };

  if (opts.automaticTax) {
    params.automatic_tax = { enabled: true };
  }

  if (opts.shipping?.type === 'flat' && opts.shipping.amount > 0) {
    params.shipping_options = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: opts.shipping.displayName || 'Shipping and Handling',
          fixed_amount: { amount: opts.shipping.amount, currency: opts.items[0]?.currency || 'usd' },
        },
      },
    ];
  }

  const session = await getStripe().checkout.sessions.create(params);
  return session.url;
}

/**
 * Verify Stripe webhook signature and parse event.
 * @param {string|Buffer} body
 * @param {string} signature
 * @returns {Stripe.Event}
 */
export function verifyWebhook(body, signature) {
  return getStripe().webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || '',
  );
}

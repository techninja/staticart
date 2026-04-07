/**
 * Format price in cents to display string.
 * @param {number} cents - Price in cents
 * @param {string} [currency='USD'] - ISO 4217 currency code
 * @returns {string}
 */
export function formatPrice(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

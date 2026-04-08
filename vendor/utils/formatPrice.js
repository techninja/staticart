/**
 * Format price in cents to display string, locale-aware.
 * @param {number} cents - Price in cents
 * @param {string} [currency='USD'] - ISO 4217 currency code
 * @param {string} [locale] - BCP 47 locale (defaults to store config)
 * @returns {string}
 */
export function formatPrice(cents, currency = 'USD', locale) {
  const loc = locale || getLocale();
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/** @returns {string} */
function getLocale() {
  try {
    const raw = localStorage.getItem('staticart-config-locale');
    if (raw) return raw;
  } catch {
    /* no localStorage in node */
  }
  return 'en-US';
}

/**
 * Set the locale for price formatting (called once on app init).
 * @param {string} locale
 */
export function setLocale(locale) {
  try {
    localStorage.setItem('staticart-config-locale', locale);
  } catch {
    /* no localStorage in node */
  }
}

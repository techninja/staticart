/**
 * Store config — loads staticart.config.json for frontend use.
 * @module utils/storeConfig
 */

/** @type {any} */
const _config = await fetch('/staticart.config.json')
  .then((r) => r.json())
  .catch(() => ({ store: { locale: 'en-US', currency: 'USD' } }));

/** @returns {Promise<any>} */
export async function getStoreConfig() {
  return _config;
}

/** @returns {any} */
export function getStoreConfigSync() {
  return _config;
}

/** API base URL from config. Falls back to /api only on localhost. */
export function getApiBase() {
  if (_config.api?.baseUrl) return _config.api.baseUrl;
  if (typeof location !== 'undefined' && location.hostname === 'localhost') return '/api';
  throw new Error('api.baseUrl not set in staticart.config.json');
}

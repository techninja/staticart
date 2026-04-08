/**
 * Store config — loads staticart.config.json for frontend use.
 * @module utils/storeConfig
 */

/** @type {any} */
let _config = null;

/** @returns {Promise<any>} */
export async function getStoreConfig() {
  if (_config) return _config;
  try {
    const res = await fetch('/staticart.config.json');
    _config = await res.json();
  } catch {
    _config = { store: { locale: 'en-US', currency: 'USD' } };
  }
  return _config;
}

/** @returns {any} */
export function getStoreConfigSync() {
  return _config || { store: { locale: 'en-US', currency: 'USD' } };
}

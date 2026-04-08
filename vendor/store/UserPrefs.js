/**
 * UserPrefs — localStorage-backed singleton for user preferences.
 * @module store/UserPrefs
 */

import { store } from 'hybrids';

/**
 * @typedef {Object} UserPrefs
 * @property {string} displayName
 * @property {string} email
 * @property {'light'|'dark'} theme
 */

const STORAGE_KEY = 'staticart-prefs';

/** @type {any} */
const UserPrefs = {
  displayName: '',
  email: '',
  theme: 'light',
  [store.connect]: {
    get: () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    },
    set: (id, values) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      return values;
    },
  },
};

export default UserPrefs;

/**
 * Save user info from checkout.
 * @param {any} prefs
 * @param {string} name
 * @param {string} email
 */
export function saveUserInfo(prefs, name, email) {
  return store.set(prefs, { displayName: name, email });
}

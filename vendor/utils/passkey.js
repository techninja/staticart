/**
 * Passkey helpers — token storage, auth state, and base64url encoding.
 * @module utils/passkey
 */

const TOKEN_KEY = 'staticart-auth-token';

/** Get the stored auth token. */
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

/** @param {string} token */
export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
  dispatchEvent(new CustomEvent('staticart:auth-changed'));
}

/** Clear the auth token (sign out). */
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  dispatchEvent(new CustomEvent('staticart:auth-changed'));
}

/** Check if the user has a valid (non-expired) token. */
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  try {
    return JSON.parse(atob(token.split('.')[1])).exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

/** @returns {string} */
export function getTokenEmail() {
  try {
    return JSON.parse(atob(getToken()?.split('.')[1] || '')).sub || '';
  } catch {
    return '';
  }
}

/** @returns {string} */
export function getTokenName() {
  try {
    return JSON.parse(atob(getToken()?.split('.')[1] || '')).name || '';
  } catch {
    return '';
  }
}

/** @param {ArrayBuffer} buf */
export function toB64Url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** @param {string} str */
export function fromB64Url(str) {
  return Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

/**
 * Passkey helpers — token storage and base64url encoding.
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
}

/** @param {ArrayBuffer} buf */
export function toB64Url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Base64url string → Uint8Array. @param {string} str */
export function fromB64Url(str) {
  return Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

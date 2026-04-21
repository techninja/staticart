/**
 * Passkey helpers — token, auth state, encoding, and WebAuthn ceremonies.
 * @module utils/passkey
 */

import { getApiBase, getStoreConfigSync } from '#utils/storeConfig.js';

const TOKEN_KEY = 'staticart-auth-token';

/** Get the stored auth token. */
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

/** @param {string} token */
export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

/** Clear the auth token (sign out). */
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Check if the user has a valid (non-expired) token. */
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  try { return JSON.parse(atob(token.split('.')[1])).exp > Date.now() / 1000; } catch { return false; }
}

/** @returns {string} */
export function getTokenEmail() {
  try { return JSON.parse(atob(getToken()?.split('.')[1] || '')).sub || ''; } catch { return ''; }
}

/** @returns {string} */
export function getTokenName() {
  try { return JSON.parse(atob(getToken()?.split('.')[1] || '')).name || ''; } catch { return ''; }
}

/** @param {ArrayBuffer} buf */
export function toB64Url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string} str */
export function fromB64Url(str) {
  return Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

/** Build assertion payload from a credential. @param {PublicKeyCredential} pkCred */
export function buildAssertion(pkCred) {
  const ar = /** @type {AuthenticatorAssertionResponse} */ (pkCred.response);
  return {
    id: pkCred.id, rawId: toB64Url(pkCred.rawId), type: pkCred.type,
    response: {
      clientDataJSON: toB64Url(ar.clientDataJSON),
      authenticatorData: toB64Url(ar.authenticatorData),
      signature: toB64Url(ar.signature),
      userHandle: ar.userHandle ? new TextDecoder().decode(ar.userHandle) : undefined,
    },
  };
}

/** Verify assertion with the API and store the token. @returns {Promise<string|null>} token or null */
export async function verifyAssertion(email, assertion) {
  const res = await fetch(`${getApiBase()}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, assertion }),
  });
  const body = await res.json();
  if (body.token) { setToken(body.token); return body.token; }
  return null;
}

/** Try discoverable credential (no email). @returns {Promise<'done'|'email-needed'>} */
export async function loginDiscoverable() {
  const rpId = getStoreConfigSync().auth?.rpId || location.hostname;
  const credential = await navigator.credentials.get({
    publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rpId, userVerification: 'preferred', timeout: 60000 },
  });
  const assertion = buildAssertion(/** @type {PublicKeyCredential} */ (credential));
  const email = assertion.response.userHandle || '';
  if (!email) return 'email-needed';
  const token = await verifyAssertion(email, assertion);
  return token ? 'done' : 'email-needed';
}

/** Email-based login. @param {string} email @returns {Promise<'done'|'no-passkey'|'error'>} */
export async function loginWithEmail(email) {
  const base = getApiBase();
  const res = await fetch(`${base}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const { challenge, allowCredentials } = await res.json();
  if (!allowCredentials.length) return 'no-passkey';

  const rpId = getStoreConfigSync().auth?.rpId || location.hostname;
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: fromB64Url(challenge), rpId,
      allowCredentials: allowCredentials.map((c) => ({ id: fromB64Url(c.id), type: c.type })),
      userVerification: 'preferred', timeout: 60000,
    },
  });
  const token = await verifyAssertion(email, buildAssertion(/** @type {PublicKeyCredential} */ (credential)));
  return token ? 'done' : 'error';
}

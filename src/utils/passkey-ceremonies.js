/**
 * Passkey ceremonies — WebAuthn registration, login, and assertion flows.
 * @module utils/passkey-ceremonies
 */

import { getApiBase, getStoreConfigSync } from '#utils/storeConfig.js';
import { toB64Url, fromB64Url, setToken } from '#utils/passkey.js';

/** @param {PublicKeyCredential} pkCred */
function buildAssertion(pkCred) {
  const ar = /** @type {AuthenticatorAssertionResponse} */ (pkCred.response);
  return {
    id: pkCred.id,
    rawId: toB64Url(pkCred.rawId),
    type: pkCred.type,
    response: {
      clientDataJSON: toB64Url(ar.clientDataJSON),
      authenticatorData: toB64Url(ar.authenticatorData),
      signature: toB64Url(ar.signature),
      userHandle: ar.userHandle ? new TextDecoder().decode(ar.userHandle) : undefined,
    },
  };
}

/** @param {string} email @param {any} assertion @returns {Promise<string|null>} */
async function verifyAssertion(email, assertion) {
  const res = await fetch(`${getApiBase()}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, assertion }),
  });
  const body = await res.json();
  if (body.token) {
    setToken(body.token);
    return body.token;
  }
  return null;
}

/** @returns {string} */
function getRpId() {
  return getStoreConfigSync().auth?.rpId || location.hostname;
}

/** Try discoverable credential (no email). @returns {Promise<'done'|'email-needed'>} */
export async function loginDiscoverable() {
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: getRpId(),
      userVerification: 'preferred',
      timeout: 60000,
    },
  });
  const assertion = buildAssertion(/** @type {PublicKeyCredential} */ (credential));
  const email = assertion.response.userHandle || '';
  if (!email) return 'email-needed';
  return (await verifyAssertion(email, assertion)) ? 'done' : 'email-needed';
}

/** @param {string} email @returns {Promise<'done'|'no-passkey'|'error'>} */
export async function loginWithEmail(email) {
  const res = await fetch(`${getApiBase()}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const { challenge, allowCredentials } = await res.json();
  if (!allowCredentials.length) return 'no-passkey';

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: fromB64Url(challenge),
      rpId: getRpId(),
      allowCredentials: allowCredentials.map((c) => ({ id: fromB64Url(c.id), type: c.type })),
      userVerification: 'preferred',
      timeout: 60000,
    },
  });
  return (await verifyAssertion(
    email,
    buildAssertion(/** @type {PublicKeyCredential} */ (credential)),
  ))
    ? 'done'
    : 'error';
}

/** @param {string} email @param {string} name @returns {Promise<'done'|'error'>} */
export async function registerPasskey(email, name) {
  const base = getApiBase();
  const res = await fetch(`${base}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const { challenge } = await res.json();

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: fromB64Url(challenge),
      rp: { name: document.title, id: getRpId() },
      user: { id: new TextEncoder().encode(email), name: email, displayName: email },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      timeout: 60000,
    },
  });

  const pkCred = /** @type {PublicKeyCredential} */ (credential);
  const ar = /** @type {AuthenticatorAttestationResponse} */ (pkCred.response);
  const attestation = {
    id: pkCred.id,
    rawId: toB64Url(pkCred.rawId),
    type: pkCred.type,
    response: {
      clientDataJSON: toB64Url(ar.clientDataJSON),
      attestationObject: toB64Url(ar.attestationObject),
    },
  };

  const regRes = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, attestation, challenge }),
  });
  if (!regRes.ok) return 'error';
  const body = await regRes.json();
  if (body.token) setToken(body.token);
  return 'done';
}

/** Check if credentials exist for an email. @param {string} email @returns {Promise<boolean>} */
export async function hasPasskey(email) {
  const res = await fetch(`${getApiBase()}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const { allowCredentials } = await res.json();
  return !!allowCredentials?.length;
}

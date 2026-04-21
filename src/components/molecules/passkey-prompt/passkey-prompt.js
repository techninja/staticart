/**
 * Passkey prompt — post-purchase passkey registration.
 * Shown on the success page. Calls /api/auth/challenge then navigator.credentials.create().
 * @module components/molecules/passkey-prompt
 */

import { html, define } from 'hybrids';
import { t } from '#utils/i18n.js';
import { getApiBase, getStoreConfigSync } from '#utils/storeConfig.js';

/**
 * @typedef {Object} PasskeyPromptHost
 * @property {string} email
 * @property {'idle'|'prompting'|'done'|'error'|'unsupported'} status
 */

/** @param {ArrayBuffer} buf */
function toB64Url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {PasskeyPromptHost & HTMLElement} host */
async function handleRegister(host) {
  host.status = 'prompting';
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: host.email }),
    });
    const { challenge } = await res.json();

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
          c.charCodeAt(0),
        ),
        rp: { name: document.title, id: getStoreConfigSync().auth?.rpId || location.hostname },
        user: {
          id: new TextEncoder().encode(host.email),
          name: host.email,
          displayName: host.email,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
        timeout: 60000,
      },
    });

    const pkCred = /** @type {PublicKeyCredential} */ (credential);
    const attestationResponse = /** @type {AuthenticatorAttestationResponse} */ (pkCred.response);
    const attestation = {
      id: pkCred.id,
      rawId: toB64Url(pkCred.rawId),
      type: pkCred.type,
      response: {
        clientDataJSON: toB64Url(attestationResponse.clientDataJSON),
        attestationObject: toB64Url(attestationResponse.attestationObject),
      },
    };

    const regRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: host.email, attestation, challenge }),
    });

    host.status = regRes.ok ? 'done' : 'error';
  } catch (e) {
    host.status = e.name === 'NotAllowedError' ? 'idle' : 'error';
  }
}

/** @type {import('hybrids').Component<PasskeyPromptHost>} */
export default define({
  tag: 'passkey-prompt',
  email: '',
  status: {
    value: 'idle',
    connect(host) {
      if (!window.PublicKeyCredential) host.status = 'unsupported';
    },
  },
  render: {
    value: ({ email, status }) => {
      if (!email || status === 'unsupported') return html``;
      if (status === 'done') {
        return html`<div class="passkey-prompt passkey-prompt--done">
          <p>${t('passkey.saved')}</p>
        </div>`;
      }
      if (status === 'prompting') {
        return html`<div class="passkey-prompt">
          <p>${t('general.loading')}</p>
        </div>`;
      }
      return html`
        <div class="passkey-prompt">
          <p>${t('passkey.offer')}</p>
          <button class="btn btn-secondary" onclick="${handleRegister}">
            ${t('passkey.register')}
          </button>
          ${status === 'error' && html`<p class="error-message">${t('passkey.error')}</p>`}
        </div>
      `;
    },
    shadow: false,
  },
});

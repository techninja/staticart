/**
 * Passkey prompt — post-purchase passkey registration.
 * Shown on the success page. Checks for existing credentials first.
 * @module components/molecules/passkey-prompt
 */

import { html, define } from 'hybrids';
import { t } from '#utils/i18n.js';
import { getApiBase, getStoreConfigSync } from '#utils/storeConfig.js';
import { toB64Url, fromB64Url, setToken, isAuthenticated, loginWithEmail } from '#utils/passkey.js';

/**
 * @typedef {Object} PasskeyPromptHost
 * @property {string} email
 * @property {string} name
 * @property {'idle'|'prompting'|'done'|'error'|'unsupported'|'exists'} status
 */

/** @param {PasskeyPromptHost & HTMLElement} host */
async function checkExisting(host) {
  if (isAuthenticated()) { host.status = 'exists'; return; }
  try {
    const res = await fetch(`${getApiBase()}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: host.email }),
    });
    const { allowCredentials } = await res.json();
    if (!allowCredentials?.length) return;
    // Passkey exists — authenticate silently
    host.status = 'prompting';
    const result = await loginWithEmail(host.email);
    host.status = result === 'done' ? 'exists' : 'idle';
  } catch { /* stay idle — offer registration */ }
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
    const rpId = getStoreConfigSync().auth?.rpId || location.hostname;

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: fromB64Url(challenge),
        rp: { name: document.title, id: rpId },
        user: {
          id: new TextEncoder().encode(host.email),
          name: host.email,
          displayName: host.email,
        },
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
      body: JSON.stringify({ email: host.email, name: host.name, attestation, challenge }),
    });
    if (regRes.ok) {
      const body = await regRes.json();
      if (body.token) setToken(body.token);
      host.status = 'done';
    } else {
      host.status = 'error';
    }
  } catch (e) {
    host.status = e.name === 'NotAllowedError' ? 'idle' : 'error';
  }
}

/** @type {import('hybrids').Component<PasskeyPromptHost>} */
export default define({
  tag: 'passkey-prompt',
  email: '',
  name: '',
  status: {
    value: 'idle',
    connect(host, _key, invalidate) {
      if (!window.PublicKeyCredential) {
        host.status = 'unsupported';
        return;
      }
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((ok) => {
          if (!ok) {
            host.status = 'unsupported';
          } else if (host.email) {
            return checkExisting(host);
          }
        })
        .catch(() => {
          host.status = 'unsupported';
        })
        .finally(() => invalidate());
    },
  },
  render: {
    value: ({ email, status }) => {
      if (!email || status === 'unsupported') return html``;
      if (status === 'done' || status === 'exists') {
        return html`<div class="passkey-prompt passkey-prompt--done">
          <p>${status === 'done' ? t('passkey.saved') : t('passkey.alreadySet')}</p>
        </div>`;
      }
      if (status === 'prompting')
        return html`<div class="passkey-prompt"><p>${t('general.loading')}</p></div>`;
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

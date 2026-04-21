/**
 * Passkey login — authenticates via WebAuthn assertion, stores JWT in sessionStorage.
 * Shown on the orders page when no valid token exists.
 * @module components/molecules/passkey-login
 */

import { html, define } from 'hybrids';
import { t } from '#utils/i18n.js';
import { getApiBase, getStoreConfigSync } from '#utils/storeConfig.js';

const TOKEN_KEY = 'staticart-auth-token';

/**
 * @typedef {Object} PasskeyLoginHost
 * @property {string} email
 * @property {'idle'|'prompting'|'done'|'error'|'unsupported'|'no-passkey'} status
 */

/** Check if a valid token already exists. */
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

/** @param {ArrayBuffer} buf */
function toB64Url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {PasskeyLoginHost & HTMLElement} host */
async function handleLogin(host) {
  const email = host.email?.trim();
  if (!email) return;
  host.status = 'prompting';
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const { challenge, allowCredentials } = await res.json();

    if (!allowCredentials.length) {
      host.status = 'no-passkey';
      return;
    }

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
          c.charCodeAt(0),
        ),
        rpId: getStoreConfigSync().auth?.rpId || location.hostname,
        allowCredentials: allowCredentials.map((c) => ({
          id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), (ch) =>
            ch.charCodeAt(0),
          ),
          type: c.type,
        })),
        userVerification: 'preferred',
        timeout: 60000,
      },
    });

    const pkCred = /** @type {PublicKeyCredential} */ (credential);
    const assertionResponse = /** @type {AuthenticatorAssertionResponse} */ (pkCred.response);
    const assertion = {
      id: pkCred.id,
      rawId: toB64Url(pkCred.rawId),
      type: pkCred.type,
      response: {
        clientDataJSON: toB64Url(assertionResponse.clientDataJSON),
        authenticatorData: toB64Url(assertionResponse.authenticatorData),
        signature: toB64Url(assertionResponse.signature),
      },
    };

    const verifyRes = await fetch(`${base}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, assertion }),
    });
    const body = await verifyRes.json();

    if (body.token) {
      sessionStorage.setItem(TOKEN_KEY, body.token);
      host.status = 'done';
      host.dispatchEvent(new CustomEvent('authenticated', { bubbles: true }));
    } else {
      host.status = 'error';
    }
  } catch (e) {
    host.status = e.name === 'NotAllowedError' ? 'idle' : 'error';
  }
}

/** @param {PasskeyLoginHost & HTMLElement} host @param {Event} e */
function handleSubmit(host, e) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (e.target);
  host.email = new FormData(form).get('email')?.toString() || '';
  handleLogin(host);
}

/** @type {import('hybrids').Component<PasskeyLoginHost>} */
export default define({
  tag: 'passkey-login',
  email: '',
  status: {
    value: 'idle',
    connect(host) {
      if (!window.PublicKeyCredential) host.status = 'unsupported';
      else if (getToken()) {
        host.status = 'done';
        host.dispatchEvent(new CustomEvent('authenticated', { bubbles: true }));
      }
    },
  },
  render: {
    value: ({ status }) => {
      if (status === 'unsupported') {
        return html`<p class="error-message">${t('passkey.unsupported')}</p>`;
      }
      if (status === 'done') return html``;
      if (status === 'prompting') {
        return html`<div class="passkey-login"><p>${t('general.loading')}</p></div>`;
      }
      if (status === 'no-passkey') {
        return html`<div class="passkey-login"><p>${t('passkey.noPasskey')}</p></div>`;
      }
      return html`
        <div class="passkey-login">
          <form onsubmit="${handleSubmit}">
            <input
              type="email"
              name="email"
              placeholder="${t('orders.emailPlaceholder')}"
              required
            />
            <button class="btn btn-primary" type="submit">${t('passkey.login')}</button>
          </form>
          ${status === 'error' && html`<p class="error-message">${t('passkey.loginError')}</p>`}
        </div>
      `;
    },
    shadow: false,
  },
});

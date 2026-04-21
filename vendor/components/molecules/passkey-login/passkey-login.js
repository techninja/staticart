/**
 * Passkey login — authenticates via WebAuthn assertion, stores JWT in sessionStorage.
 * Shown on the orders page when no valid token exists.
 * @module components/molecules/passkey-login
 */

import { html, define } from 'hybrids';
import { t } from '#utils/i18n.js';
import { getApiBase, getStoreConfigSync } from '#utils/storeConfig.js';
import { getToken, setToken, toB64Url, fromB64Url } from '#utils/passkey.js';

export { getToken };

/**
 * @typedef {Object} PasskeyLoginHost
 * @property {string} email
 * @property {'idle'|'prompting'|'done'|'error'|'unsupported'|'no-passkey'} status
 */

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

    if (!allowCredentials.length) { host.status = 'no-passkey'; return; }

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: fromB64Url(challenge),
        rpId: getStoreConfigSync().auth?.rpId || location.hostname,
        allowCredentials: allowCredentials.map((c) => ({ id: fromB64Url(c.id), type: c.type })),
        userVerification: 'preferred',
        timeout: 60000,
      },
    });

    const pkCred = /** @type {PublicKeyCredential} */ (credential);
    const ar = /** @type {AuthenticatorAssertionResponse} */ (pkCred.response);
    const assertion = {
      id: pkCred.id,
      rawId: toB64Url(pkCred.rawId),
      type: pkCred.type,
      response: {
        clientDataJSON: toB64Url(ar.clientDataJSON),
        authenticatorData: toB64Url(ar.authenticatorData),
        signature: toB64Url(ar.signature),
      },
    };

    const verifyRes = await fetch(`${base}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, assertion }),
    });
    const body = await verifyRes.json();

    if (body.token) {
      setToken(body.token);
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
  host.email = new FormData(/** @type {HTMLFormElement} */ (e.target)).get('email')?.toString() || '';
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
      if (status === 'unsupported') return html`<p class="error-message">${t('passkey.unsupported')}</p>`;
      if (status === 'done') return html``;
      if (status === 'prompting') return html`<div class="passkey-login"><p>${t('general.loading')}</p></div>`;
      if (status === 'no-passkey') return html`<div class="passkey-login"><p>${t('passkey.noPasskey')}</p></div>`;
      return html`
        <div class="passkey-login">
          <form onsubmit="${handleSubmit}">
            <input type="email" name="email" placeholder="${t('orders.emailPlaceholder')}" required />
            <button class="btn btn-primary" type="submit">${t('passkey.login')}</button>
          </form>
          ${status === 'error' && html`<p class="error-message">${t('passkey.loginError')}</p>`}
        </div>
      `;
    },
    shadow: false,
  },
});

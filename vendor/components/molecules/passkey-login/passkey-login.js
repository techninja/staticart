/**
 * Passkey login — authenticates via WebAuthn assertion, stores JWT in sessionStorage.
 * Attempts discoverable credentials first (no email needed), falls back to email form.
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
 * @property {'idle'|'prompting'|'done'|'error'|'unsupported'|'no-passkey'|'email-needed'} status
 */

/** Build assertion payload from a PublicKeyCredential. */
function buildAssertion(pkCred) {
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

/** @param {PasskeyLoginHost & HTMLElement} host @param {string} email @param {any} assertion */
async function verifyAndStore(host, email, assertion) {
  const res = await fetch(`${getApiBase()}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, assertion }),
  });
  const body = await res.json();
  if (body.token) {
    setToken(body.token);
    host.status = 'done';
    host.dispatchEvent(new CustomEvent('authenticated', { bubbles: true }));
  } else { host.status = 'error'; }
}

/** Try discoverable credential (no email). @param {PasskeyLoginHost & HTMLElement} host */
async function tryDiscoverable(host) {
  host.status = 'prompting';
  try {
    const rpId = getStoreConfigSync().auth?.rpId || location.hostname;
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({
      publicKey: { challenge, rpId, userVerification: 'preferred', timeout: 60000 },
    });
    const pkCred = /** @type {PublicKeyCredential} */ (credential);
    const assertion = buildAssertion(pkCred);
    const email = assertion.response.userHandle || '';
    if (!email) { host.status = 'email-needed'; return; }
    await verifyAndStore(host, email, assertion);
  } catch {
    host.status = 'email-needed';
  }
}

/** Email-based login. @param {PasskeyLoginHost & HTMLElement} host */
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

    const rpId = getStoreConfigSync().auth?.rpId || location.hostname;
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: fromB64Url(challenge), rpId,
        allowCredentials: allowCredentials.map((c) => ({ id: fromB64Url(c.id), type: c.type })),
        userVerification: 'preferred', timeout: 60000,
      },
    });
    await verifyAndStore(host, email, buildAssertion(/** @type {PublicKeyCredential} */ (credential)));
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
      if (status === 'idle') {
        return html`
          <div class="passkey-login">
            <button class="btn btn-primary" onclick="${tryDiscoverable}">${t('passkey.login')}</button>
            <button class="btn btn-secondary" onclick="${(h) => { h.status = 'email-needed'; }}">${t('passkey.useEmail')}</button>
          </div>
        `;
      }
      return html`
        <div class="passkey-login">
          <form onsubmit="${handleSubmit}">
            <input type="email" name="email" placeholder="${t('orders.emailPlaceholder')}" required />
            <button class="btn btn-primary" type="submit">${t('passkey.loginWithEmail')}</button>
          </form>
          ${status === 'error' && html`<p class="error-message">${t('passkey.loginError')}</p>`}
        </div>
      `;
    },
    shadow: false,
  },
});

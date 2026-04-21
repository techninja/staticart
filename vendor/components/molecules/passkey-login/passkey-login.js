/**
 * Passkey login — UI shell for WebAuthn authentication.
 * Attempts discoverable credentials first, falls back to email form.
 * @module components/molecules/passkey-login
 */

import { html, define } from 'hybrids';
import { t } from '#utils/i18n.js';
import { getToken } from '#utils/passkey.js';
import { loginDiscoverable, loginWithEmail } from '#utils/passkey-ceremonies.js';
import '#atoms/app-icon/app-icon.js';

export { getToken };

/**
 * @typedef {Object} PasskeyLoginHost
 * @property {string} email
 * @property {'idle'|'prompting'|'done'|'error'|'unsupported'|'no-passkey'|'email-needed'} status
 */

/** @param {PasskeyLoginHost & HTMLElement} host */
async function tryDiscoverable(host) {
  host.status = 'prompting';
  try {
    host.status = await loginDiscoverable();
  } catch {
    host.status = 'email-needed';
  }
  if (host.status === 'done')
    host.dispatchEvent(new CustomEvent('authenticated', { bubbles: true }));
}

/** @param {PasskeyLoginHost & HTMLElement} host */
async function handleLogin(host) {
  const email = host.email?.trim();
  if (!email) return;
  host.status = 'prompting';
  try {
    host.status = await loginWithEmail(email);
  } catch (e) {
    host.status = e.name === 'NotAllowedError' ? 'idle' : 'error';
  }
  if (host.status === 'done')
    host.dispatchEvent(new CustomEvent('authenticated', { bubbles: true }));
}

/** @param {PasskeyLoginHost & HTMLElement} host @param {Event} e */
function handleSubmit(host, e) {
  e.preventDefault();
  host.email =
    new FormData(/** @type {HTMLFormElement} */ (e.target)).get('email')?.toString() || '';
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
      if (status === 'unsupported')
        return html`<p class="error-message">${t('passkey.unsupported')}</p>`;
      if (status === 'done') return html``;
      if (status === 'prompting')
        return html`<div class="passkey-login">
          <div class="loading-overlay"><span class="spinner"></span></div>
        </div>`;
      if (status === 'no-passkey')
        return html`<div class="passkey-login"><p>${t('passkey.noPasskey')}</p></div>`;
      if (status === 'idle') {
        return html`
          <div class="passkey-login passkey-login__options">
            <button class="btn btn-primary btn-icon" onclick="${tryDiscoverable}">
              <app-icon name="user-key" size="sm"></app-icon> ${t('passkey.login')}
            </button>
            <button
              class="btn btn-secondary btn-icon"
              onclick="${(h) => {
                h.status = 'email-needed';
              }}"
            >
              <app-icon name="mail-check" size="sm"></app-icon> ${t('passkey.useEmail')}
            </button>
          </div>
        `;
      }
      return html`
        <div class="passkey-login">
          <form class="passkey-login__email-form" onsubmit="${handleSubmit}">
            <input
              type="email"
              name="email"
              placeholder="${t('orders.emailPlaceholder')}"
              required
            />
            <button class="btn btn-primary btn-icon" type="submit">
              <app-icon name="mail-check" size="sm"></app-icon> ${t('passkey.loginWithEmail')}
            </button>
          </form>
          <button
            class="btn btn-secondary btn-sm"
            onclick="${(h) => {
              h.status = 'idle';
            }}"
          >
            ${t('general.back')}
          </button>
          ${status === 'error' && html`<p class="error-message">${t('passkey.loginError')}</p>`}
        </div>
      `;
    },
    shadow: false,
  },
});

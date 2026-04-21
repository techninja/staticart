/**
 * Passkey prompt — post-purchase passkey registration.
 * Shown on the success page. Checks for existing credentials first.
 * @module components/molecules/passkey-prompt
 */

import { html, define } from 'hybrids';
import { t } from '#utils/i18n.js';
import { isAuthenticated } from '#utils/passkey.js';
import { registerPasskey, hasPasskey, loginWithEmail } from '#utils/passkey-ceremonies.js';

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
    if (!await hasPasskey(host.email)) return;
    host.status = 'prompting';
    host.status = (await loginWithEmail(host.email)) === 'done' ? 'exists' : 'idle';
  } catch { /* stay idle */ }
}

/** @param {PasskeyPromptHost & HTMLElement} host */
async function handleRegister(host) {
  host.status = 'prompting';
  try {
    host.status = (await registerPasskey(host.email, host.name)) === 'done' ? 'done' : 'error';
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
      if (!window.PublicKeyCredential) { host.status = 'unsupported'; return; }
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((ok) => { if (!ok) { host.status = 'unsupported'; } else if (host.email) { return checkExisting(host); } })
        .catch(() => { host.status = 'unsupported'; })
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
      if (status === 'prompting') return html`<div class="passkey-prompt"><p>${t('general.loading')}</p></div>`;
      return html`
        <div class="passkey-prompt">
          <p>${t('passkey.offer')}</p>
          <button class="btn btn-secondary" onclick="${handleRegister}">${t('passkey.register')}</button>
          ${status === 'error' && html`<p class="error-message">${t('passkey.error')}</p>`}
        </div>
      `;
    },
    shadow: false,
  },
});

/**
 * Icon atom — renders Lucide SVG icons by name.
 * Icons loaded from /icons.json (generated at install from lucide-static).
 * @module components/atoms/app-icon
 */

import { html, define } from 'hybrids';

/** @type {Record<string, string>|null} */
let iconCache = null;
let loaded = false;

/** @type {Set<Function>} */
const waiting = new Set();

fetch('/icons.json')
  .then((r) => r.ok ? r.json() : {})
  .then((data) => { iconCache = data; loaded = true; waiting.forEach((fn) => fn()); })
  .catch(() => { iconCache = {}; loaded = true; });

/**
 * @typedef {Object} AppIconHost
 * @property {string} name
 * @property {'sm'|'md'|'lg'|'xl'} size
 * @property {boolean} ready
 */

/** @type {import('hybrids').Component<AppIconHost>} */
export default define({
  tag: 'app-icon',
  name: '',
  size: 'md',
  ready: {
    value: false,
    connect(host, _key, invalidate) {
      if (loaded) { host.ready = true; return; }
      const cb = () => { host.ready = true; invalidate(); };
      waiting.add(cb);
      return () => waiting.delete(cb);
    },
  },
  render: {
    value: ({ name, size, ready }) => {
      const inner = ready && iconCache?.[name] || '';
      return html`
        <span class="icon icon-${size}" innerHTML="${inner
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
          : ''}"></span>
      `;
    },
    shadow: false,
  },
});

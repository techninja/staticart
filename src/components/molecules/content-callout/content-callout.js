/**
 * Content callout — large icon with heading and body text.
 * Usage: ::content-callout[icon=store,heading=Built Different,text=No build step. No framework.]
 * @module components/molecules/content-callout
 */

import { html, define } from 'hybrids';
import '#atoms/app-icon/app-icon.js';

/**
 * @typedef {Object} ContentCalloutHost
 * @property {string} icon
 * @property {string} heading
 * @property {string} text
 * @property {string} link
 * @property {string} linkText
 */

/** @type {import('hybrids').Component<ContentCalloutHost>} */
export default define({
  tag: 'content-callout',
  icon: 'store',
  heading: '',
  text: '',
  link: '',
  linkText: '',
  render: {
    value: ({ icon, heading, text, link, linkText }) => html`
      <div class="content-callout">
        <app-icon name="${icon}" size="xl"></app-icon>
        ${heading && html`<h2 class="content-callout__heading">${heading}</h2>`}
        ${text && html`<p class="content-callout__text">${text}</p>`}
        ${link &&
        html`<a href="${link}" class="btn btn-primary btn-icon">${linkText || 'Learn more'}</a>`}
      </div>
    `,
    shadow: false,
  },
});

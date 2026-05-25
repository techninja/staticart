/**
 * Dashboard stat card — displays a label and value.
 * @module admin/components/stat-card
 */

import { html, define } from 'hybrids';

export default define({
  tag: 'stat-card',
  label: '',
  value: '',
  alert: false,
  render: {
    value: ({ label, value, alert }) => html`
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    `,
    shadow: false,
  },
});

/**
 * Mockup preview — shows product template with print area + art overlay.
 * @module admin/components/mockup-preview
 */

import { html, define } from 'hybrids';

export default define({
  tag: 'mockup-preview',
  placement: { value: undefined },
  artUrl: '',
  maxWidth: 300,
  render: {
    value: ({ placement, artUrl, maxWidth }) => {
      if (!placement) return html``;
      const p = placement;
      const scale = maxWidth / p.width;
      const w = Math.round(p.width * scale);
      const h = Math.round(p.height * scale);
      const pw = Math.round(p.printWidth * scale);
      const ph = Math.round(p.printHeight * scale);
      const pt = Math.round((p.printTop || (p.height - p.printHeight) / 2) * scale);
      const pl = Math.round((p.printLeft || (p.width - p.printWidth) / 2) * scale);
      return html`
        <div class="mockup-preview" style="width:${w}px;height:${h}px;">
          ${p.background ? html`<img class="mp-bg" src="${p.background}" style="width:${w}px;height:${h}px;" />` : html``}
          ${p.image ? html`<img class="mp-overlay" src="${p.image}" style="width:${w}px;height:${h}px;" />` : html``}
          <div class="mp-print-area" style="top:${pt}px;left:${pl}px;width:${pw}px;height:${ph}px;">
            ${artUrl ? html`<img class="mp-art" src="${artUrl}" />` : html``}
          </div>
          <div class="mp-dims">${p.printWidth}×${p.printHeight}</div>
        </div>
      `;
    },
    shadow: false,
  },
});

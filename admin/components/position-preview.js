/**
 * Position preview — shows art placement zoomed to the print area region.
 * Template image cropped to print area context with logo box overlay.
 * @module admin/components/position-preview
 */

import { html, define } from 'hybrids';

export default define({
  tag: 'position-preview',
  placement: { value: undefined },
  position: { value: undefined },
  arturl: '',
  maxwidth: 160,
  maxheight: 120,
  render: {
    value: ({ placement, position, arturl, maxwidth, maxheight }) => {
      if (!placement) return html``;
      const tw = placement.width, th = placement.height;
      const pw = placement.printWidth, ph = placement.printHeight;
      const pTop = placement.printTop || 0, pLeft = placement.printLeft || 0;
      if (!tw || !th || !pw || !ph) return html``;

      // Show print area with some template context (20% padding)
      const pad = 0.2;
      const viewW = pw * (1 + pad * 2), viewH = ph * (1 + pad * 2);
      const viewX = pLeft - pw * pad, viewY = pTop - ph * pad;
      const scale = Math.min(maxwidth / viewW, maxheight / viewH);
      const w = Math.round(viewW * scale), h = Math.round(viewH * scale);

      // Template image offset (negative because we're cropping)
      const imgW = Math.round(tw * scale), imgH = Math.round(th * scale);
      const imgX = Math.round(-viewX * scale), imgY = Math.round(-viewY * scale);

      // Print area box within our view
      const paX = Math.round((pLeft - viewX) * scale);
      const paY = Math.round((pTop - viewY) * scale);
      const paW = Math.round(pw * scale), paH = Math.round(ph * scale);

      // Art box within print area
      let artBox = null;
      if (position) {
        const as = paW / (position.area_width || pw);
        artBox = {
          x: Math.round(position.left * as), y: Math.round(position.top * as),
          w: Math.round(position.width * as), h: Math.round(position.height * as),
        };
      }

      return html`<div class="pos-preview" style="width:${w}px;height:${h}px;">
        ${placement.image ? html`<img class="pos-tpl" src="${placement.image}"
          style="width:${imgW}px;height:${imgH}px;top:${imgY}px;left:${imgX}px;" />` : html``}
        <div class="pos-print" style="top:${paY}px;left:${paX}px;width:${paW}px;height:${paH}px;">
          ${artBox ? html`<div class="pos-art-box" style="top:${artBox.y}px;left:${artBox.x}px;width:${artBox.w}px;height:${artBox.h}px;">
            ${arturl ? html`<img class="pos-art" src="${arturl}" />` : html``}
          </div>` : html``}
        </div>
        ${position ? html`<div class="pos-dims">${position.width}×${position.height}</div>` : html``}
      </div>`;
    },
    shadow: false,
  },
});

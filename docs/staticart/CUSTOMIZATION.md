# StatiCart — Customization Guide

How to customize your StatiCart-powered store.

## Override Layers

### 1. Configuration (`staticart.config.json`)

Your store config drives branding, currency, shipping, and tax settings.
Edit this file — it is never overwritten by updates.

### 2. Theming (`src/styles/tokens.css`)

Override CSS custom properties to rebrand. All components reference tokens:

```css
:root {
  --color-primary: #8b4513;  /* coffee brown */
}
```

### 3. Component Override (import map)

Replace any platform component by remapping it in `src/index.html`:

```html
<script type="importmap">
{
  "imports": {
    "#molecules/product-card/": "/components/molecules/product-card/",
    "#staticart/": "/vendor/staticart/"
  }
}
</script>
```

### 4. Translation Override (`src/locales/`)

The platform translates UI chrome. Your project translates domain terms:

- `overrides.json` — English project terms (category names, etc.)
- `overrides.<lang>.json` — Translated project terms

## File Ownership

| Owner | Files | Updated on `clearstack update`? |
| --- | --- | --- |
| Platform | `src/vendor/staticart/` | Always overwritten |
| Platform | `docs/staticart/` | Always overwritten |
| Project | `staticart.config.json` | Never |
| Project | `src/styles/tokens.css` | Never |
| Project | `src/data/products.json` | Never |
| Project | `src/locales/overrides*.json` | Never |
| Project | `src/components/` | Never |

## Updating

```bash
npm update @techninja/staticart   # get new platform version
npx clearstack update             # re-vendor + sync docs
```

Your config, tokens, products, and overrides are never touched.

## Shipping Types

StatiCart supports three shipping modes via `staticart.config.json`:

### Flat Rate

```json
{ "shipping": { "type": "flat", "amount": 499 } }
```

### Tiered (by cart subtotal + product class)

See the demo store config for a full example with `classes`, `regions`,
and `tiers`.

### Custom (external API)

```json
{ "shipping": { "type": "custom" } }
```

Create `api/lib/shipping-custom.js` exporting:

```javascript
export async function calculateShipping(ctx) {
  // ctx.items — cart items with metadata
  // ctx.country — ISO country code
  // ctx.config — full staticart.config.json
  return amountInCents;
}
```

The platform calls this automatically when `shipping.type` is `"custom"`.

## Stock Convention

- `stock > 0` — finite inventory, decremented on purchase
- `stock: 0` — out of stock, hidden from catalog
- `stock: -1` — unlimited / dropship (always in stock, never decremented)

Use `stock: -1` for print-on-demand or dropshipped products.

## Post-Checkout Fulfillment

To add fulfillment logic after a successful payment, import your module
in `api/webhook.js` and call it after the order is recorded:

```javascript
import { fulfillOrder } from './lib/fulfillment.js';

// Inside handleCheckoutCompleted, after putItem:
const result = await fulfillOrder({ orderId, email, items, session });
```

Item metadata (from `products.json`) is passed through the Stripe session
and available in the webhook's `items` array.


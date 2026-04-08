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

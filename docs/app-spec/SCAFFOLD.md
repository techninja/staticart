# StatiCart — Scaffold & Override Architecture

How StatiCart ships as an npm package and how implementors customize it.

## Package Structure

```
@techninja/staticart (npm)
├── bin/
│   └── cli.js              # `staticart init`, `staticart update`
├── vendor/
│   ├── components/          # Default UI components
│   ├── store/               # Core store models
│   ├── styles/              # Default tokens + component CSS
│   └── utils/               # Shared utilities (formatPrice, i18n, etc.)
├── api/                     # Lambda handler templates
├── scripts/                 # Build scripts (build-products, update-stock)
├── templates/               # Scaffolded files (index.html, config, .env)
└── docs/staticart/          # Spec docs (synced on update)
```

## User's Project (after `staticart init`)

```
my-store/
├── src/
│   ├── index.html           # Import map with #staticart/ + local overrides
│   ├── components/          # Local overrides (optional)
│   ├── styles/
│   │   └── tokens.css       # Brand colors override
│   ├── data/
│   │   └── products.json    # Seed data
│   └── vendor/
│       └── staticart/       # Vendored from package (gitignored)
├── api/                     # Copied from package, customizable
├── staticart.config.json    # Store configuration
├── locales/                 # Translation overrides (optional)
│   └── es.json
├── .env                     # Defaults
└── .env.local               # Real keys (gitignored)
```

## Configuration: staticart.config.json

Single file declares everything that varies per store:

```json
{
  "store": {
    "name": "My Coffee Shop",
    "locale": "en-US",
    "currency": "USD",
    "logo": "/assets/logo.svg"
  },
  "shipping": {
    "type": "flat",
    "amount": 499
  },
  "tax": {
    "automatic": true
  },
  "productFields": {
    "roastLevel": { "type": "string", "label": "Roast Level" },
    "origin": { "type": "string", "label": "Origin" }
  },
  "i18n": {
    "defaultLocale": "en-US",
    "locales": ["en-US", "es"]
  }
}
```

## Override Layers

### 1. Configuration (staticart.config.json)

No code changes needed. Config drives:

- Stripe checkout locale, currency, shipping, tax
- Product model extension fields
- i18n locale selection
- Store branding (name, logo)

### 2. Theming (tokens.css)

Override CSS custom properties. All components reference tokens:

```css
:root {
  --color-primary: #8b4513;  /* coffee brown */
  --color-accent: #d4a574;
}
```

### 3. Component Override (import map)

To replace a component, create a local version and remap in the import map:

```html
<script type="importmap">
{
  "imports": {
    "#staticart/product-card": "/components/my-product-card/my-product-card.js",
    "#staticart/": "/vendor/staticart/components/"
  }
}
</script>
```

The local component can import the original and extend it, or replace entirely.

### 4. Translation Override (locales/)

The package translates **framework UI** only (buttons, labels, status text).
Store-specific terms — category names, variant labels, product copy — are
**project data** and belong in override files.

Drop a JSON file per locale. Keys match the message catalog:

```json
{
  "cart.add": "Añadir al carrito",
  "cart.empty": "Tu carrito está vacío.",
  "category.shirts": "Camisetas",
  "category.outerwear": "Abrigos"
}
```

Category display names use `category.<slug>` keys. If a key is missing,
the slug is title-cased as a fallback. Variant labels come directly from
`products.json` — translate them in your product data for each locale.

```

### 5. Product Schema Extension (productFields)

Custom fields declared in config flow through automatically:

- Build script includes them in products.json
- Product store model merges them
- Product detail page renders them via a generic metadata display

No model forking needed. The base Product model handles core fields,
config-declared fields are accessible as `product.metadata.roastLevel`.

## CLI Commands

### `staticart init`

Scaffolds a new project:

1. Creates directory structure
2. Copies templates (index.html, config, .env, tokens.css)
3. Vendors staticart components to src/vendor/staticart/
4. Copies API handlers to api/
5. Creates seed products.json
6. Runs npm install

### `staticart update`

Updates an existing project (same pattern as clearstack):

1. Updates vendor files (src/vendor/staticart/)
2. Syncs docs
3. Skips existing configs (use --force to overwrite)
4. Never touches: tokens.css, products.json, staticart.config.json, locales/

### `staticart build`

Production build:

1. Copies src/ to dist/
2. Runs build-products.js (DynamoDB → products.json)
3. Generates OG tag HTML per product
4. Ready for CDN deploy

## What the Package Owns vs What the User Owns

| Layer | Package owns | User owns |
| --- | --- | --- |
| Store models | Product, CartState, UserPrefs | Extended fields via config |
| Components | All default UI | Overrides via import map |
| Styles | Component CSS, shared.css | tokens.css, custom CSS |
| API handlers | checkout, webhook, stock, orders, session | Custom endpoints |
| Build scripts | build-products, update-stock | Custom import scripts |
| Config | Schema, defaults | staticart.config.json |
| Data | Nothing | products.json, images |
| i18n | English UI message catalog | Translation files, category/variant display names |

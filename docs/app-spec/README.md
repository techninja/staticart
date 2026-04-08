# StatiCart — Application Spec

A full-featured e-commerce platform built 99% on static hosting.
Products are code, purchases trigger builds, stock is always in sync.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Static Site (CDN — Cloudflare Pages / S3+CF)       │
│  ┌───────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │ Product   │ │ Cart     │ │ Account/Prefs      │  │
│  │ Pages     │ │ (local)  │ │ (localStorage)     │  │
│  │ (HTML/JS) │ │ store    │ │                    │  │
│  └───────────┘ └────┬─────┘ └────────────────────┘  │
│                     │                                │
└─────────────────────┼────────────────────────────────┘
                      │ checkout
┌─────────────────────▼────────────────────────────────┐
│  Thin API (Lambda / Cloudflare Worker)               │
│  ┌──────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │ POST         │ │ POST       │ │ GET            │  │
│  │ /checkout    │ │ /webhook   │ │ /stock/:sku    │  │
│  │ (create      │ │ (Stripe    │ │ (real-time     │  │
│  │  session)    │ │  confirm)  │ │  stock check)  │  │
│  └──────┬───────┘ └─────┬──────┘ └───────┬────────┘  │
│         │               │                │           │
│         ▼               ▼                ▼           │
│  ┌─────────────────────────────────────────────┐     │
│  │  DynamoDB (single table — stock + orders)   │     │
│  └──────────────────────┬──────────────────────┘     │
│                         │                            │
└─────────────────────────┼────────────────────────────┘
                          │ stock changed
                          ▼
              ┌───────────────────────┐
              │  Build Trigger        │
              │  (GitHub Actions /    │
              │   Cloudflare hook)    │
              │  Reads DynamoDB →     │
              │  Writes products.json │
              │  → Deploys static     │
              └───────────────────────┘
```

## Entities

See [ENTITIES.md](./ENTITIES.md) for field definitions.

## Distribution Model

StatiCart ships as `@techninja/staticart` on npm — the same pattern as
Clearstack. It is a **dependency, not a template**. Projects install it,
scaffold from it, and receive updates without losing customizations.

### What the Package Provides

| Layer | Ships as | Customization |
| --- | --- | --- |
| Core store models | `src/vendor/staticart/store/` | Extend via `schema.json` |
| Core components | `src/vendor/staticart/components/` | Override by tag name |
| Thin API handlers | `src/vendor/staticart/api/` | Import functions, wire your own endpoints |
| Build scripts | `bin/` CLIs | Project adds its own scripts |
| Spec docs + checker | `docs/staticart/` | Synced on update, project docs untouched |

### Product Model Extension

Every store has unique product attributes (roast level, fabric weight,
print size). The base Product model handles universal fields (sku, name,
price, stock, variants). Project-specific fields are declared in a
`staticart.schema.json` at the project root:

```json
{
  "productFields": {
    "roastLevel": { "type": "string", "default": "medium" },
    "origin": { "type": "string", "default": "" }
  }
}
```

The build script and store model both read this schema. Custom fields
flow through to templates via the product object — no model forking.

### Component Overrides

The import map resolves `#staticart/product-card` to the vendor default.
To override, the project defines its own `product-card` component and
points the import map alias to the local version. The vendor component
stays as a reference and fallback.

### Scripts Convention

StatiCart ships base scripts (`build-products`, `sync-stock`). Projects
add their own (`import-from-shopify`, `update-from-csv`) that conform
to a standard interface: read source → write `products.json`. All scripts
live in `scripts/` and are runnable via `npm run staticart <script>`.

### Theming

Same CSS cascade as Clearstack: staticart ships default tokens, the
project overrides them in its own `tokens.css`. Components reference
tokens, never hardcode values.

## Implementation Phases

See [TODO.md](./TODO.md) for the full phased checklist.

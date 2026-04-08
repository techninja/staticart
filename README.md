<p align="center">
  <img src="src/assets/staticart_logo.svg" alt="StatiCart logo" width="240" />
</p>

# staticart

> StatiCart — a full-featured e-commerce platform built 99% on static hosting

Built with the [Clearstack](https://github.com/techninja/clearstack) no-build web component specification.

## Architecture

```
Static Site (CDN)          Thin API (Lambda)         Database
┌──────────────┐           ┌──────────────┐          ┌──────────┐
│ Product pages│  checkout  │POST /checkout│  stock   │ DynamoDB │
│ Cart (local) │ ────────> │POST /webhook │ <──────> │ (single  │
│ SPA (hybrids)│           │GET  /stock   │  orders  │  table)  │
└──────────────┘           │GET  /orders  │          └──────────┘
                           │GET  /session │               │
                           └──────────────┘          stock changed
                                                         │
                                                    Build Trigger
                                                    (GitHub Actions)
```

## Quick Start

```bash
npm install
cd api && npm install && cd ..
npm run dev       # Start dev server (port from .env.local)
npm test          # Run tests (18 node + 31 browser)
npm run spec      # Spec compliance checker (10/10)
```

## Environment

Copy `.env` defaults. Override in `.env.local` (gitignored):

```bash
STRIPE_SECRET_KEY=sk_test_...    # From Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_...  # From `stripe listen` CLI
```

## Deploy

**Static site:** `src/` → CDN (S3+CloudFront or Cloudflare Pages)

**API:** `api/` → AWS Lambda via SAM:

```bash
cd api
sam build && sam deploy --guided
```

**Build pipeline:** GitHub Actions rebuilds on stock changes:

```bash
node scripts/build-products.js   # DynamoDB → dist/data/products.json
```

## i18n

Default language is English. To translate:

1. Set locale in `staticart.config.json`: `{ "store": { "locale": "es" } }`
2. Package translations live in `src/locales/<lang>.json`
3. Project overrides in `src/locales/overrides.json` (English) and `src/locales/overrides.<lang>.json`
4. Add custom keys for your own components in the override files

Cascade: package defaults → locale file → project overrides → project locale overrides.

## Specification

See `docs/` for the full specification this project follows.

## License

MIT

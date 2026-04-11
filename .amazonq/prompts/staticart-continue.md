You are continuing work on **StatiCart** (`staticart` on npm) — a full-featured e-commerce platform built 99% on static hosting, using the Clearstack no-build web component specification.

## Project State

All 8 phases are substantially complete. The app has a working Stripe checkout flow tested with real test-mode payments. 10/10 spec checks pass, 49 tests pass (18 node + 31 browser).

- **Framework:** Clearstack (`@techninja/clearstack` v0.3.17) — static mode. No build step. ES modules served directly. Hybrids.js v9 for components/state/routing.
- **Spec compliance:** `npm run spec check all` passes 10/10 (includes dual tsc domains: frontend + api).
- **Tests:** `npm test` passes 49/49. Import map aliases resolved via custom plugin in `.configs/web-test-runner.config.js`.
- **Dev server:** `npm run dev` — Express serves `src/` with SPA fallback (excludes `/api/`), mounts Lambda handlers locally.
- **Stripe:** Test mode checkout working end-to-end. Session-based user identification saves name + email to UserPrefs.

## What Exists

### Frontend (`src/`)
- **Store models:** Product (enumerable, static JSON), CartState (localStorage), UserPrefs (localStorage), AppState (localStorage)
- **Atoms:** app-button, app-badge, app-icon, theme-toggle, cart-count
- **Molecules:** product-card (inline variant selector, add-to-cart feedback), cart-item (qty stepper, icons)
- **Organisms:** product-grid (search + category filter), app-header (user state, sign out)
- **Pages:** catalog-view, product-detail-view (gallery, variants), cart-view (checkout wired), order-success-view (Stripe session fetch, UserPrefs save), order-cancelled-view, orders-view (auth-gated)
- **Utils:** formatPrice (locale-aware), setPageMeta, productVariants, checkout, storeConfig, i18n (message catalog + `t()`)

### API (`api/`)
- **Handlers:** checkout (stock validation, shipping/tax from config), webhook (idempotent, stock decrement, rebuild trigger), stock, orders (GSI query), session (Stripe customer details)
- **Lib:** dynamo (conditional writes, GSI), stripe (lazy init, shipping/tax), response (CORS), config (reads staticart.config.json)
- **SAM template:** HTTP API Gateway, 5 Lambda functions, DynamoDB table with email GSI, minimal IAM

### Config & Build
- `staticart.config.json` — store name, locale, currency, shipping, tax, product field extensions
- `scripts/build-products.js` — DynamoDB → dist/data/products.json + OG tag HTML pages
- `scripts/update-stock.js` — admin CLI for stock increments
- `.github/workflows/build.yml` — GitHub Actions build + deploy pipeline
- `dist/` — production build output (gitignored)

## Key Architectural Decisions
- SPA fallback must exclude `/api/` paths (bug found and fixed)
- Stripe session ID captured in inline `<script>` before SPA router strips query params, stashed in sessionStorage
- Array model prototype items persist as real data — always filter with `.filter(i => i.sku)`
- Dual jsconfig: `.configs/jsconfig.json` (frontend) + `api/jsconfig.json` (backend)
- AWS SDK installed as devDependency in root (for scripts tsc) + dependency in api/ (for Lambda)

## Next Priorities

1. **npm package extraction** — see `docs/app-spec/SCAFFOLD.md` for the full design. Implement `staticart init` and `staticart update` CLI commands following the clearstack pattern.
2. **Wire i18n `t()` into all component templates** — replace hardcoded strings. The cascade (defaults → locale → project overrides → project locale overrides) and `t(key, params)` are ready, just not used in templates yet.
3. **Component override testing** — verify the import map override pattern works (local component replaces vendor default).
4. **Remaining Phase 7 items** — Lighthouse audit, cache headers, CDN deploy config, monitoring.
5. **Remaining stretch goals** — discount codes, email receipts, inventory alerts, wishlist.

## Critical Clearstack/Hybrids Rules (Quick Reference)
- `shadow: false` on every component. Named event handlers only.
- `#prefix/` import aliases, no `../` in browser JS.
- ≤150 lines per file. Split, don't compress.
- Store arrays need prototype items: `items: [{ sku: '', qty: 0 }]` — and filter out prototypes before use.
- `id: true` models typed as `@type {any}`. List stores need 3 casts.
- `store.connect.get` must return `{}` not `undefined` for localStorage singletons.

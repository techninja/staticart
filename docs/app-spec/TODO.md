# StatiCart — Implementation TODO

Phased by session context. Each phase is a self-contained working state.
Don't skip phases — each builds on the last.

---

## Phase 1 — Static Product Catalog

> Goal: browsable product pages from static JSON data, no server needed.

- [x] Create `src/data/products.json` with 4–6 seed products (varied categories, prices, stock levels, variants)
- [x] Create `Product` store model (`src/store/Product.js`) — reads from static JSON via fetch, list support with category filtering
- [x] Create `CartState` store model (`src/store/CartState.js`) — localStorage-backed singleton, add/remove/update quantity
- [x] Create `cart-count` atom — displays item count in header, reads CartState
- [x] Create `product-card` molecule — image, name, price, stock badge, "Add to Cart" button
- [x] Create `product-grid` organism — renders filtered product-card list from Product store
- [x] Create `product-detail` page — full product view with variant selector, quantity picker, add to cart
- [x] Create `catalog-view` page — product-grid with category filter bar
- [x] Create `app-header` organism — site name, nav links, cart-count, theme-toggle
- [x] Update router to wire: `/` → catalog, `/product/:sku` → product-detail
- [x] Update `index.html` — import map entries, meta tags, stylesheet links
- [x] Verify: dev server serves catalog, products render, cart persists across refresh

---

## Phase 2 — Cart & Checkout UI

> Goal: full cart management UI, ready to connect to Stripe.

- [x] Create `formatPrice` util — cents → display string with currency symbol
- [x] Create `cart-item` molecule — product thumbnail, name, variant, quantity stepper, remove button, line total
- [x] Create `cart-view` page — lists cart-items, shows subtotal, empty state, "Proceed to Checkout" button
- [x] Add cart drawer/flyout or dedicated `/cart` route (pick one, keep it simple)
- [x] Cart quantity validation — can't exceed stock, can't go below 1
- [x] Cart subtotal calculation in CartState (computed from product prices × quantities)
- [ ] "Proceed to Checkout" button — disabled when cart empty, will POST to `/api/checkout` in Phase 4
- [x] Create `order-success` page — shown after Stripe redirect, clears cart
- [x] Create `order-cancelled` page — shown if user cancels Stripe checkout
- [x] Update router: `/cart`, `/order/success`, `/order/cancelled`
- [ ] Verify: full cart lifecycle works — add, update quantity, remove, empty state

---

## Phase 3 — Product Detail Polish & Search

> Goal: the catalog feels like a real store.

- [x] Image gallery on product-detail — multiple images, click to enlarge
- [x] Variant selector — updates displayed price/stock when variant chosen
- [x] Category filter on catalog-view — URL param driven (`/category/shirts`)
- [x] Client-side search — filters products.json by name/description, debounced input
- [x] Stock badge states: "In Stock", "Low Stock" (≤5), "Out of Stock" — with colors
- [x] "Out of Stock" disables Add to Cart button
- [x] Responsive layout — mobile-first grid, collapsing header nav
- [x] SEO: meaningful `<title>`, meta description per product (static HTML or head update)
- [ ] Verify: search works, filters work, stock states display correctly, mobile looks good

---

## Phase 4 — Thin API (Lambda / Cloudflare Worker)

> Goal: 3 endpoints that handle the entire server-side requirement.

### Infrastructure

- [x] Create `api/` directory at project root (separate from `src/` — this deploys to Lambda/Worker)
- [x] Choose runtime: AWS Lambda + API Gateway OR Cloudflare Workers (document decision in app-spec)
- [x] DynamoDB table design: single table, PK=`SKU`, SK=`STOCK` for stock; PK=`ORDER#<id>`, SK=`META` for orders
- [x] Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DYNAMODB_TABLE`, `BUILD_HOOK_URL`
- [ ] Local dev: SAM CLI or Miniflare for local Lambda/Worker testing

### Endpoints

- [x] `POST /api/checkout` — receives cart items array, validates stock against DynamoDB, creates Stripe Checkout Session, returns session URL
- [x] `POST /api/webhook` — Stripe webhook receiver, verifies signature, on `checkout.session.completed`: decrement stock in DynamoDB (conditional writes to prevent oversell), store order record, trigger site rebuild
- [x] `GET /api/stock/:sku` — returns current stock count from DynamoDB (for real-time check before checkout)

### Stock Validation Flow

- [x] Checkout endpoint: for each item, DynamoDB `UpdateItem` with `ConditionExpression: stock >= :qty` — if any fail, return 409 with which items are unavailable
- [x] Frontend handles 409: shows which items need quantity adjustment or removal
- [x] Webhook: atomic decrement on confirmed payment (idempotent — check if order already processed)

### Stripe Integration

- [x] Stripe Checkout Session creation with line items mapped from cart
- [x] Success/cancel URLs pointing to static site pages
- [x] Webhook signature verification
- [x] Handle `checkout.session.completed` event
- [x] Handle `charge.refunded` event (restore stock)

### Verify

- [ ] Local: full checkout flow with Stripe test mode
- [ ] Stock decrements correctly on purchase
- [ ] Double-purchase of last item returns 409
- [x] Webhook is idempotent (replay same event = no double decrement)

---

## Phase 5 — Build Pipeline & Stock Sync

> Goal: purchases and stock updates automatically rebuild the static site.

- [x] Build script: `scripts/build-products.js` — reads all products from DynamoDB, writes `src/data/products.json`
- [x] GitHub Actions workflow OR Cloudflare Pages build hook — triggered by webhook endpoint after stock change
- [ ] Debounce: batch stock changes within 60s window before triggering rebuild (avoid rebuild-per-purchase)
- [x] Incoming stock update: admin script or simple authenticated endpoint that increments stock in DynamoDB + triggers rebuild
- [ ] CDN cache invalidation for `products.json` and affected product pages after deploy
- [ ] Verify: purchase → stock decrements in DynamoDB → rebuild triggers → static site shows updated stock
- [ ] Verify: concurrent purchases don't oversell (DynamoDB conditional writes are the lock)
- [x] Social sharing / OG tags: generate static HTML per product at build time (`/product/:sku/index.html`) with Open Graph + Twitter Card meta tags baked in. SPA takes over after load. Crawlers see correct previews without JS.

---

## Phase 6 — User Preferences & Order History

> Goal: optional "account" experience without a traditional auth backend.

- [x] `UserPrefs` store model — localStorage singleton: display name, email (for order lookup), saved addresses, theme
- [x] "Save my info" prompt at checkout — stores email + name in UserPrefs
- [x] Order lookup page: enter email → calls `GET /api/orders?email=<hash>` → shows order history
- [x] `GET /api/orders` endpoint — queries DynamoDB GSI on email hash, returns order summaries
- [ ] Email-based "magic link" auth (optional stretch): send a one-time link via SES, set a signed cookie/token
- [ ] Verify: returning customer sees their order history, prefs persist across sessions

---

## Phase 7 — Production Hardening

> Goal: deploy-ready, secure, performant.

### Security

- [x] API rate limiting (API Gateway throttling or Worker rate limit)
- [x] Stripe webhook signature verification (already in Phase 4, verify in prod)
- [x] DynamoDB IAM: Lambda role has minimal permissions (read/write stock table only)
- [x] No secrets in static site — all Stripe keys are server-side only
- [x] CSP headers on static site
- [x] CORS: API allows only the static site origin

### Performance

- [ ] Static assets: immutable cache headers for CSS/JS/images, short TTL for products.json
- [ ] Image optimization: responsive `srcset`, WebP/AVIF with fallback
- [x] Lazy load product images below the fold
- [x] Preload critical CSS and fonts
- [ ] Lighthouse audit: target 95+ on all categories

### Deployment

- [ ] Static site: Cloudflare Pages or S3 + CloudFront (document choice)
- [ ] API: Lambda@Edge or Cloudflare Worker (same region as DynamoDB)
- [ ] Custom domain + TLS
- [ ] Monitoring: CloudWatch alarms on Lambda errors, DynamoDB throttling
- [ ] Error tracking: client-side error reporting (simple beacon to Lambda endpoint)

### Documentation

- [x] README with architecture diagram, setup instructions, deploy guide
- [x] `.env` with all required environment variables (`.env.local` for overrides)
- [ ] Cost estimate for expected traffic levels

### npm Package Distribution

- [ ] Extract core store models, components, API handlers, and build scripts into publishable package structure
- [ ] `staticart init` scaffolder — creates project with import map, tokens, seed data, and schema.json
- [ ] `staticart update` — syncs vendor files and docs without overwriting project customizations (same pattern as clearstack)
- [ ] `staticart.schema.json` loader — build script and store model read project-specific product fields
- [ ] Import map convention for component overrides (`#staticart/` prefix)
- [ ] `scripts/` interface contract — document how project scripts plug into the build pipeline
- [ ] Verify: fresh `staticart init` → `npm run dev` → working store with seed data in under 2 minutes

---

## Phase 8 — Stretch Goals

> Nice-to-haves. Only after Phase 7 is solid.

- [ ] Discount codes — stored in DynamoDB, validated at checkout endpoint
- [x] Shipping calculation — config-driven flat rate, integrated into Stripe session
- [ ] Email receipts — SES triggered from webhook after successful payment
- [ ] Inventory alerts — SNS notification when stock drops below threshold
- [ ] Admin dashboard — separate static page, authenticated, shows orders/stock
- [ ] Multi-currency — price stored per currency, geo-detected or user-selected
- [ ] Wishlist — localStorage list, shareable via URL-encoded SKU list
- [ ] Analytics — privacy-respecting, self-hosted (Plausible/Umami) or simple beacon

---

## Cross-Cutting (added during implementation)

- [x] `staticart.config.json` — store config (locale, currency, shipping, tax, product fields)
- [x] i18n foundation — message catalog (`src/utils/i18n.js`), locale-aware `formatPrice`, `localize()` ready
- [x] Stripe automatic tax support (config-driven)
- [x] Scaffold/override architecture documented (`docs/app-spec/SCAFFOLD.md`)
- [x] Inline variant selector on product cards (no page navigation needed)
- [x] Add-to-cart feedback animation with variant label
- [x] Stripe session-based user identification (name + email saved to UserPrefs)
- [x] SPA fallback excludes `/api/` routes
- [x] Dual tsc domains (frontend + api)
- [x] `dist/` build output directory for production artifacts

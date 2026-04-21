# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.4.3] - 2026-04-21

- Spec refactor
- rpID from config
- Correct base64 handling


## [0.4.1] - 2026-04-21

- Fix no passkey bypass

## [0.4.0] - 2026-04-21

- Initial auth release (expect lots of fixes)
- Don't need these

## [0.2.10] - 2026-04-15

- Improve for unified cache busting

## [0.2.9] - 2026-04-15

- Move to migration, unify css import

## [0.2.8] - 2026-04-15

- Manage orders better

## [0.2.7] - 2026-04-14

- Cache bust imports

## [0.2.6] - 2026-04-14

- Tons if tiny tweaks, cache busting, and more!

## [0.2.5] - 2026-04-13

- Fix mobile view size for site

## [0.2.4] - 2026-04-13

- Clean up propogation

## [0.2.3] - 2026-04-13

- Finalize mockup grabbing

## [0.2.2] - 2026-04-13

- More variant images for printful
- Fix and build out proper categories from Printful

## [0.2.1] - 2026-04-13

- Improve product management scripts

## [0.2.0] - 2026-04-13

- Upgrade to latest Clearstack
- Backport Printful integration from merch

### Added

- Fulfillment provider system — config-driven `api/lib/providers/` with auto-discovery
- `shipping.type: "provider"` — delegates shipping calculation to fulfillment provider
- Auto-refund on fulfillment failure (`fulfillment.autoRefundOnFailure` config)
- `refundPayment` helper in `api/lib/stripe.js`
- Session endpoint returns `orderStatus` and `fulfillment` info
- Order success page shows failure/refund state instead of always showing thanks
- i18n keys: `order.failed`, `order.refunded` (English + Spanish)
- Product management menu (`npm run products`) — sync, create, delete, status
- Printful script helpers (`scripts/lib/printful.js`) — API client, variant lookup, product mapping
- Deploy script template (`templates/scripts/deploy-api.js`) — SAM deploy with secret management
- Browse provider catalog action in product manager (`npm run products` → option 4)

### Fixed

- Empty email crashes DynamoDB GSI — fallback chain: `customer_email` → `customer_details.email` → `'unknown'`
- Lambda can't read config/products — dual-path lookup (api/ dir first, then project root)
- Checkout skips stock validation for `stock: -1` (unlimited/dropship) products
- Stock conflict error shows product names instead of SKUs

## [0.1.19] - 2026-04-12

- Correct store and don't default API to same domain

## [0.1.18] - 2026-04-12

- Load config import directly

## [0.1.17] - 2026-04-12

- Build config to src

## [0.1.16] - 2026-04-12

- Various adjustments to validate api pathways

## [0.1.15] - 2026-04-12

- Ya'rr, we shall slay these vendor deps!

## [0.1.14] - 2026-04-12

- :lock: it up!

## [0.1.13] - 2026-04-12

- Fix bug in child project vendor for hybrids

## [0.1.12] - 2026-04-12

- Add related gallery infinite stock support

## [0.1.11] - 2026-04-12

- Complete support for infinite stock
- Don't forget the globe

## [0.1.10] - 2026-04-12

- Fix Icon vendoring for realz this time

## [0.1.9] - 2026-04-12

- Don't forget to vendor!

## [0.1.8] - 2026-04-12

- Learnings from StatiCart Shop

- Fix stock filtering to treat `stock: -1` as unlimited (dropship/POD support)
- Pass item metadata through Stripe session for post-checkout fulfillment
- Document custom shipping module, `stock: -1` convention, and fulfillment hooks

## [0.1.7] - 2026-04-11

- Upgrade spec check to split types

## [0.1.6] - 2026-04-11

- Forgotten repo

## [0.1.5] - 2026-04-11

- Fix logo, try auto release

## [0.1.4] - 2026-04-11

- Another attempt to release.

## [0.1.3] - 2026-04-11

- Try release again
- Audit fix
- Release inheritance, changelog, first release!
- Linting, shipping, cleanup, grid view!
- Major buildout from ROP site example
- Initial stacked scaffolding work
- Wire up translation
- Taxes, shipping, translation strings!
- Phase 7
- Buildout checkout flow, tests and cart bonuses
- Fix typing with latest Clearstack, build to dist
- Phase 6 API shape and tests
- Phase 3 with icons and tests!
- Cart!
- Working tests for work so far
- Initial phase buildout
- Initial readme
- Initial Clearstack scaffolding

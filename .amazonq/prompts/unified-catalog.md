We're restructuring StatiCart's Printful product catalog to use stable, store-controlled SKUs with explicit product groupings. See `docs/app-spec/UNIFIED_CATALOG.md` for the full design.

The current system has problems:
- SKUs are assigned by Printful and change on recreate (mix of `pf-24` and hex IDs)
- Products are defined 1:1 with Printful sync products, then merged post-sync by guessing base names
- Category/tags are guessed from Printful's category tree instead of defined by the store
- No control over which mockup style (flat vs lifestyle) is used as the hero image
- Stale mockup images persist when products are recreated with new Printful IDs

The new catalog format groups Printful sync products under store-defined products with stable SKUs (`SM-TEE`, `SM-MUG`), explicit category/tags, and a `heroStyle` field.

Test against `../merch-staticart` which has 13 products across 19 Printful sync products. The migration table in the spec maps current entries to new SKUs.

Scripts to modify (all in `scripts/lib/`):
- `product-actions.js` — create and sync actions
- `printful.js` — buildSyncVariants needs new catalog shape
- `printful-mapping.js` — toProduct uses catalog metadata instead of guessing
- `product-merge.js` — remove or simplify (catalog defines groupings now)
- `mockup-action.js` — tag images with style, respect heroStyle
- `printful-mockups.js` — pass style tag through to downloaded filenames

Start with the catalog format migration in merch-staticart, then update `create` and `sync` to use it.

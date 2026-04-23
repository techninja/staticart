# Unified Product Catalog

> Stable, store-controlled SKUs with provider-agnostic product definitions.

## Problem

Product SKUs are currently assigned by Printful and change on every
recreate. Some are `pf-24` (merged), some are hex IDs like `69db1c5e`.
This breaks order history, analytics, and makes the catalog fragile.

Products are also defined at the Printful level — one Printful sync
product per catalog entry. But logically, "StatiCart Logo Tee" in
Black/White/Navy is ONE product with color variants, not three separate
products that get merged after sync.

## Design

### Catalog Format

`src/data/printful-catalog.json` is the store's product authority:

```json
{
  "skuPrefix": "SM",
  "products": [
    {
      "sku": "TEE",
      "name": "StatiCart Logo Tee",
      "description": "Classic unisex tee with the StatiCart logo.",
      "category": "apparel",
      "tags": ["tee", "clothing", "wearable"],
      "retail": 27.99,
      "heroStyle": "lifestyle",
      "printful": [
        {
          "label": "Black",
          "catalogId": 71,
          "colors": ["Black"],
          "sizes": ["S", "M", "L", "XL", "2XL"],
          "files": [{ "placement": "front", "position": { ... } }]
        },
        {
          "label": "White",
          "catalogId": 71,
          "colors": ["White"],
          "sizes": ["S", "M", "L", "XL", "2XL"],
          "files": [{ "placement": "front", "position": { ... } }]
        }
      ]
    },
    {
      "sku": "MUG",
      "name": "StatiCart Logo Mug",
      "category": "drinkware",
      "heroStyle": "flat",
      "printful": [
        {
          "label": "11oz",
          "catalogId": 19,
          "sizes": ["11 oz"],
          "retail": 15.99,
          "files": [{ "placement": "default", "url": "https://..." }]
        },
        {
          "label": "15oz",
          "catalogId": 19,
          "sizes": ["15 oz"],
          "retail": 17.99,
          "files": [{ "placement": "default", "url": "https://..." }]
        }
      ]
    }
  ]
}
```

### SKU Structure

```
{prefix}-{product}          → SM-TEE (product level)
{prefix}-{product}-{id}     → SM-TEE-5278789275 (variant level, Printful variant ID)
```

- `skuPrefix` — store-level, configured once (e.g. "SM" for StatiCart Merch)
- `sku` — product-level, stable, human-readable
- Variant SKU suffix — Printful variant ID or external_id

### Key Changes from Previous Format

| Before | After |
|---|---|
| One catalog entry per Printful sync product | One catalog entry per logical product |
| SKU assigned by Printful (`pf-24`, hex IDs) | SKU defined by store (`SM-TEE`) |
| Merge happens post-sync by guessing base name | Grouping defined explicitly in catalog |
| Category/tags guessed from Printful categories | Category/tags defined in catalog |
| `heroStyle` doesn't exist | Controls flat vs lifestyle for product cards |
| `retail` price per catalog entry | `retail` at product level, override per variant |
| Scripts copied into project `scripts/lib/` | Scripts resolve from `@techninja/staticart` package |

### heroStyle

Controls which mockup image is used as the product card hero.
The mockup generator tags images with their style in filenames
(e.g. `5278789275-ghost-main.jpg`). Hero selection cascades:

- `"lifestyle"` → prefers `men-s`, then `lifestyle`
- `"flat"` → prefers `flat`, then `ghost`, then `default`
- `"default"` → prefers `default`, then `flat`, then `ghost`

Falls back to first available image if no style matches.

### printful-store.json

Maps stable SKUs to Printful sync product IDs per variant label:

```json
{
  "logoFileId": 971383951,
  "products": {
    "SM-TEE": {
      "Black": 429395114,
      "White": 427825828,
      "Navy": 427825829
    },
    "SM-MUG": {
      "11oz": 427825832,
      "15oz": 427825833
    }
  }
}
```

## Scripts

All scripts in `scripts/lib/` are platform-owned and resolve from the
`@techninja/staticart` npm package at runtime. Projects do not maintain
local copies. The entry point `scripts/products.js` uses `resolveLib()`
to find scripts in the package first, falling back to local `./lib/`
for development within the staticart repo.

### `products.js create`

- Iterates `products[].printful[]` entries
- Creates one Printful sync product per `printful` entry
- Stores mapping in `printful-store.json`
- Uses `skuPrefix + sku` as the `external_id` on Printful
- Resolves `retail` from variant entry, falling back to product level

### `products.js sync`

- Reads catalog and store mapping, no Printful category guessing
- For each catalog product, fetches all its Printful sync products
- Builds one `products.json` entry per catalog product
- Variants come from all Printful entries combined
- Category, tags, description, heroStyle from catalog
- Runs `enrichOutOfStock` for wanted colors not in stock

### `products.js mockups`

- Generates mockups per Printful sync product (per color)
- Tags each image with style in filename (`{variantId}-{style}-main.jpg`)
- Loads existing mockups from disk when skipping (no re-download needed)
- `heroStyle` from catalog determines hero via cascade
- Sets `heroImage` on each product for card display

### Module Changes

- `product-merge.js` — `mergeByBaseName` removed. Only `enrichOutOfStock`
  remains, adapted for the unified catalog format.
- `printful-mapping.js` — `toProduct`, `resolveCategory`, `resolveTags`
  removed. Only `loadCategories` remains.
- `printful-variants.js` — `buildSyncVariants` accepts a printful
  sub-entry + separate `retail` param for per-variant price override.
- `printful.js` — barrel re-exports updated to match.

## Migration

Existing merch-staticart catalog entries mapped to new format:

| Current entries | New product | Variants |
|---|---|---|
| 3× Logo Tee (Black/White/Navy) | SM-TEE | 3 colors × 5 sizes |
| 1× Logo Hoodie | SM-HOODIE | 1 color × 5 sizes |
| 2× Crewneck (Black/Navy) | SM-CREW | 2 colors × 5 sizes |
| 2× Logo Mug (11oz/15oz) | SM-MUG | 2 sizes |
| 1× Water Bottle | SM-BOTTLE | 1 variant |
| 1× Logo Sticker | SM-STICKER | 1 variant |
| 1× Holographic Sticker | SM-HOLO | 1 variant |
| 1× Sticker Sheet | SM-SHEET | 1 variant |
| 2× Dad Hat (Black/Navy) | SM-DAD | 2 colors |
| 1× Bucket Hat | SM-BUCKET | 1 variant |
| 1× Beanie | SM-BEANIE | 1 variant |
| 1× Tote Bag | SM-TOTE | 1 variant |
| 1× Laptop Sleeve | SM-SLEEVE | 2 sizes |

13 logical products from 19 Printful sync products.

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

`src/data/printful-catalog.json` becomes the store's product authority:

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
{prefix}-{product}-{variant} → SM-TEE-BLK-M (variant level)
```

- `skuPrefix` — store-level, configured once (e.g. "SM" for StatiCart Merch)
- `sku` — product-level, stable, human-readable
- Variant SKU suffix — auto-generated from color + size abbreviations

### Key Changes from Current Format

| Current | New |
|---|---|
| One catalog entry per Printful sync product | One catalog entry per logical product |
| SKU assigned by Printful (`pf-24`, hex IDs) | SKU defined by store (`SM-TEE`) |
| Merge happens post-sync by guessing base name | Grouping defined explicitly in catalog |
| Category/tags guessed from Printful categories | Category/tags defined in catalog |
| `heroStyle` doesn't exist | Controls flat vs lifestyle for product cards |
| `retail` price per catalog entry | `retail` at product level, override per variant |

### heroStyle

Controls which mockup image is used as the product card hero:

- `"flat"` — ghost/flat product shot (default for accessories, stickers)
- `"lifestyle"` — model/lifestyle shot (default for apparel)
- `"default"` — whatever Printful's Default style returns

The mockup generator tags images with their style. The sync step
picks the hero based on this field.

## Scripts Impact

### `products.js create`

- Iterates `products[].printful[]` entries
- Creates one Printful sync product per `printful` entry
- Stores mapping: `{ "SM-TEE": { "Black": 429395114, "White": 429395115 } }`
- Uses `skuPrefix + sku` as the external_id on Printful

### `products.js sync`

- No more `mergeByBaseName` — grouping is defined in catalog
- For each catalog product, fetches all its Printful sync products
- Builds one `products.json` entry per catalog product
- Variants come from all Printful entries combined
- SKU is `SM-TEE`, variant SKUs are `SM-TEE-BLK-M`
- Category, tags, description from catalog (not guessed)

### `products.js mockups`

- Generates mockups per Printful sync product (per color)
- Tags each image with style (flat/lifestyle/ghost)
- `heroStyle` from catalog determines which image becomes the
  product-level hero and variant default

### `product-merge.js`

- Removed or drastically simplified
- No more guessing — catalog defines the grouping

### `printful-mapping.js`

- `toProduct` still maps Printful data to StatiCart shape
- But category/tags/description come from catalog, not Printful
- SKU comes from catalog, not Printful

### `printful-store.json`

New shape:

```json
{
  "logoFileId": 971383951,
  "products": {
    "SM-TEE": {
      "Black": 429395114,
      "White": 429395115,
      "Navy": 429395116
    },
    "SM-MUG": {
      "11oz": 429395120,
      "15oz": 429395121
    }
  }
}
```

## Migration

Existing merch-staticart catalog entries map to new format:

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

13 logical products, matching current merged count.

## Implementation Order

1. New catalog format + migration of merch-staticart catalog
2. Update `create` to read new format
3. Update `printful-store.json` shape
4. Update `sync` to build products from catalog groupings (kill merge)
5. Update `mockups` to tag with style + respect `heroStyle`
6. Update `printful-mapping.js` to use catalog metadata
7. Remove `product-merge.js` (or reduce to variant dimension logic only)

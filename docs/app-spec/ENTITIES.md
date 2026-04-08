# Entities

## Product

The core catalog item. Lives as static data in `src/data/products.json`,
generated from DynamoDB at build time.

| Field       | Type     | Notes                                    |
| ----------- | -------- | ---------------------------------------- |
| sku         | string   | Primary key, URL-safe slug               |
| name        | string   | Display name                             |
| description | string   | Markdown-safe product description        |
| price       | number   | Price in cents (integer, no floats)      |
| currency    | string   | ISO 4217 code, default `USD`             |
| images      | string[] | Relative paths to static image files     |
| category    | string   | Flat category slug for filtering         |
| stock       | number   | Current available quantity                |
| active      | boolean  | Whether product is visible on the site   |
| variants    | Variant[]| Size/color/etc options                   |
| metadata    | object   | Arbitrary key-value pairs for display    |
| createdAt   | string   | ISO 8601 timestamp                       |
| updatedAt   | string   | ISO 8601 timestamp                       |

## Variant

A purchasable option within a product (size, color, etc).

| Field  | Type   | Notes                                |
| ------ | ------ | ------------------------------------ |
| id     | string | Unique within parent product         |
| label  | string | Display name ("Large", "Blue")       |
| sku    | string | Variant-level SKU for Stripe         |
| price  | number | Override price in cents, or 0 = same |
| stock  | number | Variant-level stock count            |

## CartItem (localStorage only)

Lives entirely in the browser. Never touches a server until checkout.

| Field     | Type   | Notes                          |
| --------- | ------ | ------------------------------ |
| sku       | string | Product SKU                    |
| variantId | string | Variant ID if applicable       |
| quantity  | number | Positive integer               |
| addedAt   | string | ISO 8601 timestamp             |

## Order (DynamoDB — thin API only)

Created by the Stripe webhook after payment confirmation.

| Field           | Type       | Notes                          |
| --------------- | ---------- | ------------------------------ |
| orderId         | string     | Stripe checkout session ID     |
| email           | string     | Customer email from Stripe     |
| items           | CartItem[] | Snapshot of purchased items    |
| totalCents      | number     | Total charged                  |
| currency        | string     | ISO 4217                       |
| stripePaymentId | string     | Stripe payment intent ID       |
| status          | enum       | `paid`, `shipped`, `refunded`  |
| createdAt       | string     | ISO 8601                       |

## Relationships

```
Product 1 ──── * Variant
Product 1 ──── * CartItem (client-side only)
Order   1 ──── * CartItem (snapshot)
```

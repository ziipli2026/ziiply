# Lidl source migration boundary — 2026-10-01

Research-only inspection of `src/app/api/lidl/products/route.ts`; no production route changes in this work.

## Existing production contract observed
- GET accepts `search`, `storeId`, `storeName`, `city`, `address`.
- Existing provider is Ruoanhinta.fi; response explicitly identifies `source: "ruoanhinta-lidl"`, and its numeric provider store ID is resolved through provider store search when needed.
- Item mapping exposes `id`, `name`, `ean`, `brandName`, `pictureUrl`, `category`, `price`, `comparisonPrice`, `comparisonPriceUnit`, `storeItems`. Only rows with `getPrice(product)>0` are returned.
- `getEan()` considers `ean`, `gtin`, `eanCode`, `barcode`, and `externalId`, and selects the first value matching 8–14 digits. **This is a format check only**; in particular, a numeric `externalId` is not independent evidence of a product-specific GTIN, and the current helper does not verify the check digit.
- Returned items are also passed to `observeEanProductsBestEffort` with the provider source label.

## Requirements before adding a new official-source adapter
1. Obtain explicit permission and a genuinely useful Finnish regular-product feed. The public-site 226 candidate records are not enough.
2. Keep provider store IDs in separate namespaces: a Ruoanhinta ID must not silently be treated as an official Lidl store ID.
3. Preserve the existing API response contract for callers only after reviewing downstream usage; label each result with its actual source.
4. Treat `productId`, `IAN`, `externalId`, and `GTIN/EAN` as separate fields. Only propagate a product-specific, validated barcode with evidence; do not feed unverified identifiers into the EAN bank.
5. Do not promote missing regular prices to zero, reuse public promotional prices as checkout-verified regular prices, or assert store availability without evidence.
6. Test authorized feed samples offline with `scripts/check-lidl-feed-v48.mjs` and `scripts/test-lidl-feed-gate-v50.mjs`; separately confirm rights, authenticity, product coverage and actual store prices.
7. Keep the existing production route unchanged until the replacement source passes these checks and the integration is expressly approved.

This document records code behavior and a proposed migration boundary, not an authorization to expand use of Ruoanhinta.fi or any other third-party source.

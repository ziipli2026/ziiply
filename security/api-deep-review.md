# Public API deep review — simulation only

No production behavior is changed by this document.

## SSRF / arbitrary URL

No reviewed public route accepts a caller-supplied URL and then fetches that URL.
Reviewed upstream hosts are fixed in code (Ruoanhinta, S-kaupat/K APIs, Tjek/eTarjouslehdet and fixed identity fallbacks).
Result: no direct arbitrary-URL SSRF found in the reviewed routes.

## Input / amplification findings

### store-search
- gps=1 fans one public request out to seven Ruoanhinta store searches in parallel.
- Latitude/longitude are checked only for finite numbers, not geographic bounds.
- Manual search length is not capped.
- Recommended patch model: reject latitude outside [-90,90], longitude outside [-180,180], cap manual search to a conservative length.

### s-products / k-products
- search is forwarded to a fixed Ruoanhinta endpoint and has no explicit length cap.
- store accepts arbitrary digit strings before being inserted as storeIds.
- Recommended patch model: cap search length; cap/validate numeric store id length.

### offers
- storeId is forwarded to a fixed Ruoanhinta endpoint.
- Response exposes upstream endpoint, raw upstream payload, first 800 chars preview, and catch details.
- Recommended patch model: validate storeId and remove raw/preview/endpoint/details from public production responses unless explicitly needed by the client.

### offers/search
- q and multiple store name/id/context values are not explicitly length/count capped at the route boundary.
- Public success response always includes kruokaDebug.
- Public failure returns the caught Error.message.
- Recommended patch model: cap query/context lengths and multi-value counts; suppress kruokaDebug in production; use generic public 500 error.

### s-ean-product
- EAN normalization exists but no explicit GTIN length gate was observed at route entry.
- name hint can drive multiple internal/upstream queries and GraphQL fallback loops.
- Catch response currently returns error.message and up to five stack lines.
- Recommended patch model: require 8–14 digit EAN/GTIN, cap name hint length, suppress stack/error details in production.

### k-weight-product
- Strong canonical EAN regex already constrains the primary identifier.
- storeName is not explicitly length capped.
- Catch returns String(error).
- Recommended patch model: cap storeName and return generic public upstream error.

## Priority

1. Remove production error stacks/raw upstream diagnostics.
2. Validate/cap route parameters before upstream calls.
3. Suppress offers/search kruokaDebug in production.
4. Keep Firewall rate limits as the outer abuse boundary.

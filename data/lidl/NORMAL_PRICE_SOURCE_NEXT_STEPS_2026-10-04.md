# Lidl regular price source follow-up — 2026-10-04

Research-only. No production import or new third-party collection authorized by this note.

## Findings from current main
- `scripts/audit-lidl-official-pages.mjs` collected structured JSON-LD Product/Offer price evidence from the 100 accessible Paistopiste pages: zero offers reported in the completed audit. Repeating this collector is not a route to ordinary prices.
- `src/app/api/lidl/products/route.ts` currently requests `api.ruoanhinta.fi/api/items` with a resolved store ID. `getPrice()` reads `storeItems?.[0]?.price || 0` and filters nonpositive prices. It does not establish source observation time, authorization, or local checkout verification. Do not silently relabel this third-party feed as official Lidl.
- Official public Lidl categories/search/sitemap are discovery subsets, not a complete store-level regular-price feed; see `SOURCE_ASSESSMENT_V47_2026-10-01.md` and `OFFICIAL_DATA_COVERAGE_GATE_2026-10-01.md`.
- `verified-previous-price-observations*.json` contains previous displayed promotional reference prices; these are not verified current regular prices.

## Next acquisition path
1. Check existing permitted source terms and availability of product-level observation timestamps, store IDs, ordinary-versus-offer classification, pack/unit and EAN. Do not expand use of Ruoanhinta without permission.
2. Prefer a directly authorized Lidl FI store-level feed. Accept only independently evidenced current regular prices; test with `scripts/check-lidl-feed-v48.mjs` and separately verify underlying source rights/evidence.
3. Keep names, official images, verified EANs and historical/public price observations as separate nullable fields. Missing price must remain null, never zero, and must not enter basket comparison.
4. Offline fixture should include price-less bakery products, stale prices, promotional/previous prices, multiple store items and ambiguous store resolution. Test that no such price is labeled checkout-verified.
5. Only after source and coverage validation, design a separate source adapter and propose production integration. Do not deploy research datasets into Justiina or Halpuuta.

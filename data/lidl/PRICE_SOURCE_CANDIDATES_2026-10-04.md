# Lidl normal-price acquisition candidates — 2026-10-04

## Current evidence
- Lidl official public Paistopiste catalog: product identities/images, but no complete current checkout-price feed. https://www.lidl.fi/h/paistopiste-leivaet-ja-leivonnaiset/h10096086
- Lidl first-party announcement dated 2026-04-20: seven historical regular-price changes. These cannot establish 2026-10-04 checkout prices. https://www.sttinfo.fi/tiedote/71968449/lidl-laskee-suosituimpien-paistopistetuotteiden-hintoja?lang=fi
- Alennuskartta says it tracks observed Lidl prices for 1,928 products during 2026-06-26 to 2026-10-01. Candidate for investigating coverage and data-access rights, **not** an approved store feed. https://alennuskartta.fi/alennuskoodit/lidl

## Acquisition gate
Before importing a third-party observation, establish permission to reuse data; identify exact product/GTIN, store scope, observation timestamp, promotion/Plus eligibility and checkout-price verification. Never infer normal price from a strikethrough/reference price or a bundle offer. Keep historical observations separate from `regularPriceEur`. Only `authorized-store-feed` or `verified-store-receipt` with the existing contract may become comparable.

## Next concrete source work
1. Seek authorized product-level normal-price access from Lidl or data provider.
2. Determine whether Alennuskartta exposes a licensed feed with store-specific timestamped observations and promotion flags; if not, retain as research lead only.
3. Collect verified current store receipts for a small Paistopiste validation sample; reconcile exact catalog IDs and images.
4. Do not deploy any research prices to production.

## 2026-10-04 follow-up verification
- Alennuskartta's Lidl page explicitly labels its displayed current prices as observed daily prices; examples include **Lidl Plus** and **4-pack** promotions. This cannot be used as a normal-price feed without row-level separation and licensed access. https://alennuskartta.fi/alennuskoodit/lidl
- everydata.io markets a Lidl Online Shop API with search and product detail endpoints, but its published example targets lidl.de online-shop URLs. Finland in-store food price coverage and redistribution rights are **unverified**. https://everydata.io/apis/lidl
- Lidl confirms Lidl Plus prices require scanning the loyalty card; these must not silently be presented as unconditional regular prices. https://www.lidl.fi/c/lidl-plus-tarjoukset/s10036426
- Lidl Finland leaflet archives can support offer timing, not current regular-price acceptance. https://archivana.com/fi/fi/lidl/

**Decision:** neither Alennuskartta nor everydata.io is approved for current Ziiply normal-price ingestion. Next validation must obtain a sample licensed payload demonstrating Finnish food product IDs, store scope, observedAt, promotion status, and permission to republish; otherwise use verified checkout receipts.

## Production adapter inspection (2026-10-04)
Inspected `src/app/api/lidl/products/route.ts`: the current Ruoanhinta adapter reads `storeItems[0].price` and filters positive values, but its payload type does not include `priceKind`, `observedAt`, `checkoutPriceVerified`, `evidenceReference` or authorization provenance. A positive price from this adapter must not be equated to the strict verified-normal-price contract. The store resolver ranks address/city/name matches; it does not itself verify that a selected price row belongs to the intended physical store. This is a source-quality finding, **not a claim that the current API returned an incorrect price**.

Before changing the live adapter, obtain a real redacted sample of `/api/items` and `/api/stores` for the same Lidl location, validate field semantics and permitted reuse, and explicitly decide whether unverified observations may appear as non-comparable research-only prices. Do not silently zero or remove existing production prices without a reviewed UI migration.

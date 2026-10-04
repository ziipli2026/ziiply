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

## IMPORTANT: Ruoanhinta terms-of-use blocker (checked 2026-10-04)
Official terms https://ruoanhinta.fi/kayttoehdot state that the service is intended for personal consumer use through its ordinary browser UI; programmatic/automated use, including calling internal APIs outside that UI, is prohibited, as is commercial reuse without agreement. Commercial enquiries: info@ruoanhinta.fi. This materially affects the existing `src/app/api/lidl/products/route.ts` calls to `api.ruoanhinta.fi`. **Do not expand, automate, or treat this source as authorized for Ziiply unless written permission/license is obtained.** Existing live behavior needs a separately reviewed safe migration, not an untested immediate removal.

Alternative ReefAPI https://reefapi.com/lidl-api describes Finland coverage for weekly **offers**, not a comprehensive Finnish normal-price feed; Lidl Plus member prices are distinct from general offer prices. It does not resolve the regular-price gap. Lidl's own Scan&Go terms https://www.lidl.fi/c/osallistumisehdot-lidl-plus/s10021544 say app-displayed prices may differ from in-store prices, with the store-displayed price prevailing. Treat receipt or verified shelf/checkout observation as the stronger price evidence.

### Next action requiring authorization
Request written B2B permission from Ruoanhinta or replace the adapter with a licensed store-specific source. Confirm whether the current Ziiply integration already has such an agreement before any further API calls. Do not run live Ruoanhinta probe requests as part of research without permission.

## New first-party category-page lead (2026-10-04)
Lidl's own category page https://www.lidl.fi/h/kuivatuotteet/h10096095 currently renders product cards with EUR amount, package weight and EUR/kg, e.g. MAMA Nuudeli 6-pack 3.39 EUR / 330 g / 10.27 EUR/kg, rendered timestamp 2026-09-24T12:56:14Z. This disproves the broad assumption that **no** public official Lidl product category page ever displays a price; the prior 100-page audit was limited to structured Product/Offer JSON-LD on selected Paistopiste product-detail pages. Do not equate category display with store-specific verified regular checkout price or reuse authorization. Investigate first-party category coverage and whether labels distinguish regular price, promotion and Lidl Plus, without crawling or deploying a new scraper until terms and data access are reviewed. Source: https://www.lidl.fi/h/kuivatuotteet/h10096095 . Lidl's Scan&Go terms explicitly say app price may differ from actual store price: https://www.lidl.fi/static/assets/Lidl-Plus_-etuohjelman_kayttoehdot_140426-2204440.pdf .

## First-party category-page spot check: price-type separation
Public category cards (pages rendered 2026-09-24 to 2026-09-28, **not current checkout observations**):
- https://www.lidl.fi/h/kuivatuotteet/h10096095 — MAMA Nuudeli 6-pack 3.39 EUR / 330 g appears without a promotion label, but has only a publication/render timestamp and no exact store checkout evidence.
- Same page: NISSIN Kuppinuudeli 4 kpl shows 5.00 EUR explicitly marked Lidl Plus / four-unit deal, crossed-out 5.96 EUR and single-item 1.49 EUR. The 5.00 EUR must not be imported as a normal unit price, nor 5.96 EUR treated as verified current price.
- https://www.lidl.fi/h/riisit-pastat-ja-palkokasvit/h10096096 — VITASIA Sushiriisi 0.99 EUR explicitly Lidl Plus -23%; KNORR Snack Pot 1.59 EUR explicitly ERÄ, validity 24–27 September. Both unsuitable as current October normal prices.
- https://www.lidl.fi/h/saempylaet-ja-leivonnaiset/h10096090 — Moniviljasiemensämpylä 6 kpl Lidl Plus 2.00 EUR / single 0.49 EUR, validity 28–30 September. This is promotional and expired, not Paistopiste normal-price evidence.

**Interpretation:** first-party cards expose useful price *classification* cues: Lidl Plus, crossed-out reference, multi-buy quantity, ERÄ, SUPERHINTA, explicit validity and standalone price. Preserve these independently. Even an unbadged card price is not automatically a store-specific current regular checkout price. This confirms that the catalog and offer views need distinct ingestion contracts; avoid blindly extracting the first euro amount. No live app adapter changed.

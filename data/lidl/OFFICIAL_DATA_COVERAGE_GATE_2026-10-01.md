# Lidl official data coverage gate (2026-10-01)

Research-only decision record. Do not import this candidate dataset into Justiina's production Lidl endpoint or basket comparison.

## Sources examined
- Lidl public category API (v33/v34/v46): promoted/currently published subset, not the full staple assortment.
- Lidl public search API (v35/v46): returns unrelated results for staple queries; HTTP 200 is not evidence of relevance.
- Lidl official product sitemap and public product pages (v39-v43): 307 sitemap URLs, 200 additional pages processed in v43, including older bakery and nonfood; sitemap listing does not establish store availability.
- Product-page EAN arrays: present for some nonfood variants, absent for sampled bakery/food pages. IAN and Lidl productId are not EAN.
- Lidl Plus shopping-list search: requires authorization; no authentication bypass.

## v46 category diff
Eight official category requests: 43 distinct product IDs; all 43 already existed in the 226-item grocery candidate file. Net new IDs: 0.

## Current research datasets
- Full historical/research collection: data/lidl/official-catalog-research-v43-2026-10-01.json (325 products).
- Grocery candidates: data/lidl/official-grocery-candidates-v44-2026-10-01.json (226 products, excluding 95 nonfood and four separately reviewed beer/long-drink entries).
- New bakery group: 101 products. Their prices are null in the v43 sitemap-page harvest; do not interpret null as zero or a checkout price.

## Release blockers
1. Core grocery staples are missing from the current public catalog: ordinary milk, eggs, butter and pasta.
2. Public website prices are observations, not verified local checkout prices.
3. Food EAN matching is not established; do not infer EAN from IAN/productId.
4. Store-specific availability is not established.
5. Third-party Ruoanhinta.fi data must not be silently treated as Lidl official data or expanded without permission.

## Next data acquisition decision
Stop repeating the same public category/search queries. Seek Lidl's permitted complete product feed, documented public store-specific API, or explicit permission for another reliable data route. Independently sourced products should carry their own provenance, freshness, store scope and price verification state. Until then, this dataset can support research and name discovery, but not authoritative Justiina prices or halpuusvertailu.

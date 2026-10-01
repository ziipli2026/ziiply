# Lidl source assessment v47 — 2026-10-01

Research-only. No production import or third-party scraping authorization implied.

## Verified source limitations
- Lidl Finland states approximately 3,000 products in its regular assortment, and distinguishes basic vs expanded stores: https://www.lidl.fi/c/valikoima/s10021111
- The official public site category and search endpoints return currently published items; v46 eight category requests contained 43 unique IDs, all previously present in the v44 226-item grocery candidate dataset.
- Official search returned unrelated matches for ordinary staples (e.g. milk, eggs, butter, pasta), so a successful HTTP response is not a reliable relevance signal.
- The third-party ReefAPI explicitly states that in countries without a Lidl webshop, including FI, it supplies current/upcoming in-store offers rather than the complete assortment: https://reefapi.com/lidl-api . It is not an independent full-catalog solution.
- The existing Ziiply production Lidl route uses Ruoanhinta.fi, a separate third-party source; do not confuse its provenance with official Lidl information or expand its usage without authorization.

## Technical requirements for a genuinely useful feed
A permitted source should provide: FI store ID or store scope; product ID; exact product name; package quantity and unit; current local regular price and effective period; promotional vs ordinary price; barcode/GTIN when actually known; source timestamp; category; availability limitations; terms for use in Ziiply.

## Acceptance gate
- Search terms maito, kananmuna, voi, pasta, jauheliha, banaani, peruna and juusto must return relevant products without unrelated keyword matches.
- No IAN/productId-to-EAN conversion; no price=0 for missing values; no assumed store availability.
- Public site promotional observations remain separate from verified local regular prices.
- A full catalog claim needs independent completeness evidence, not a growing count of sitemap or historical product URLs.

## Recommended acquisition
Request a direct authorized Finnish Lidl product/pricing feed or written terms for a permitted integration. Keep any partner feed behind a source adapter and run coverage tests offline before enabling it in Justiina.

# EAN-first offer categorization — rollout plan (17 Nov 2026)

## Goal
One shared category resolver for mobile and desktop, independent of individual product-name exception rules. Keep provider collection and pricing unchanged.

## Current state
- `enrichOfferCategoriesFromNeon` already looks up `ziiply_ean_products` by EAN, then exact name, and attaches `neonCategoryMatch`, `neonDisplayCategory`, `neonCategoryPath`.
- `getOfferCategoryV106` previously evaluated title-based overrides before those Neon fields. This branch gives *verified EAN matches* first priority **only for selected-store K-Citymarket Tjek campaigns** (`provider=kcitymarket-local`, `source=K-Citymarket kauppakohtainen julkaisu`). All other offer sources retain their prior precedence.
- Tjek Citymarket ingestion still assigns a preliminary category from the title. The EAN-first override only applies where a trustworthy EAN is present and resolved to a known Ziiply category.

## Evidence and precedence
1. Exact valid EAN/GTIN -> existing Neon catalog category -> known Ziiply display category (authoritative).
2. Provider's structured taxonomy when available and mapped.
3. Existing conservative fallback for records without a confirmed EAN category.
4. Do not promote an exact-name match to authoritative EAN evidence. Do not infer EAN from similar names.
5. Separate category from daily-grocery visibility: an accurately classified non-food item must not be mislabeled as food just to hide it.

## Before rollout
- Build a labeled audit sample across S, K, Lidl and Tokmanni/Spar, including Citymarket local Tjek campaigns.
- Count coverage: EAN present, EAN found in catalog, EAN with usable category, exact-name-only, unresolved, conflicting classifications.
- Validate category outcomes and non-food visibility separately; verify mobile and desktop use the same returned offer categories.
- Test collisions: same name/different EAN, same EAN/different provider title, missing EAN, invalid EAN, opaque category codes and ambiguous exact names.
- Compare category distributions and offer counts with main; do not merge until validated.
- Long term: replace title-regex fallbacks with a taxonomy-mapping table and review queue for uncertain products. Avoid new per-product special cases.

## Safety
This branch gates EAN-first behavior to local Citymarket Tjek campaigns. This branch does not alter DB schema, stored catalog categories, Tjek scraping, prices, or production main. It does not remove existing legacy fallbacks; they remain for products without a confirmed catalog EAN category.

## Live Hyvinkää coverage audit — 17 Nov 2026
Read-only Neon query of `ziiply_kcitymarket_tjek_snapshots`, store key `k citymarket hyvinkaa`: **139 local offer rows; 0 rows with a numeric 8–14-digit EAN**. Thus the EAN-first override in this PR cannot currently classify these local campaigns. **Do not merge as a fix for Citymarket categorization** until reliable product-to-EAN resolution exists and is measured.

The Tjek provider builds its offer records with a title-derived preliminary category and no EAN field. A future resolver must match to a catalog product using verified identity (e.g. uniquely matching exact normalized name, brand and package size, or source-provided product identifiers), reject ambiguous collisions, and record evidence/coverage. It must not assign guessed EANs or silently persist uncertain matches. Existing exact-name-only catalog enrichment is not proof of EAN identity.

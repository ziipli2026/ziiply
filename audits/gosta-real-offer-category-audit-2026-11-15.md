# Gösta real-offer grocery-category audit — 2026-11-15

## Scope and method
Read-only SQL against Ziiply Neon project floral-recipe-40673204, public.ziiply_offer_publications. Selected approved publications where valid_from <= 2026-11-15 and valid_until >= 2026-11-15; expanded jsonb offers. Distinct Lidl offers by id, latest parsed publication. This is a **coverage audit**, not an end-to-end production acceptance.

| Source | Publication rows | Offer rows | Distinct offer ids |
|---|---:|---:|---:|
| Lidl FI0218 | 21 | 692 | 123 |
| K-Citymarket | 1 | 49 | 49 |

All 741 expanded rows lack a non-empty sourceCategoryPath, so original per-product source taxonomy is **not available** for this stored sample. Existing saved offers are not rewritten by code changes.

## Verified defects in stored source data
- Lidl: Crelando Sukkalanka 2 kerää => Kala; source /h/ompelukone-ja-tarvikkeet
- Lidl: Crelando Säilytys- tai ompelutarvikelaatikko => Valmisruoka; same source
- Lidl: Ultimate Speed Pullotunkki => Leipomo; source /h/auto-ja-moottoripyoerae
- Lidl: Crivit Juomapullo => Leipomo; source /h/kuntoilu
- Lidl Plus: Klementiini 1 kg => Muut (should be Hevi)
- Lidl: Joulukaktus, Kotimainen tulilatva => Juomat (ornamental plants, not beverages)
- K-Citymarket: perunat => Kuivatuotteet (should be Hevi)
- K-Citymarket: suihkumousset => Maitotuotteet (should be hygiene)
- K-Citymarket: uunirapeat ranskalaiset => Kala (should be frozen potatoes)
- Lidl: ATRIA Hornet-siipipalat appears in Lemmikit from a pet-accessories URL, showing conflicting title/source taxonomy that needs upstream investigation.

## Verdict: NOT APPROVED for main
The test suite passes on isolated cases, but actual stored active offers contain false positives, false negatives and category mismatches. Scope does not include a full product-level current S/K/Tokmanni/EUROSPAR inventory, so **no claim of full all-store coverage**. To approve, refresh source publications with source taxonomy, run per-item allow/reject/category audit across each chain and review discrepancies, then validate mobile and desktop separately. Do not merge PR #276 yet.

## Follow-up: source taxonomy integrity (read-only Neon verification)

Rechecked the active approved publication rows on 2026-11-15: 21 Lidl publications (692 expanded rows) and one K-Citymarket publication (49 expanded rows). No approved active S-market, Prisma, K-Supermarket, Tokmanni or EUROSPAR publications are represented **in this particular table**; their other providers must be audited separately.

Important distinction: all 692 Lidl rows have a `categoryPath`, but it is **the same derived display label** as `category` in observed defective examples, not the original source hierarchy. For example, `Crelando Sukkalanka 2 kerää` has both `category` and `categoryPath` = `Kala`, while `sourceUrl` points to `/h/ompelukone-ja-tarvikkeet/`. `Ultimate Speed Pullotunkki` has both fields = `Leipomo`, while `sourceUrl` points to `/h/auto-ja-moottoripyoerae/`. `Joulukaktus` has both fields = `Juomat` and a generic `/c/ruoka-ja-juoma/` URL. None of these rows contains `sourceCategoryPath`. Therefore `categoryPath` must **not** be treated as authoritative source taxonomy. The source URL can block known non-food Lidl departments, but cannot repair every product-level misclassification under a broad food URL.

This verification is read-only; no publication rows were changed. Do not approve full category accuracy until upstream parsers persist the actual original product taxonomy and all relevant providers are audited.

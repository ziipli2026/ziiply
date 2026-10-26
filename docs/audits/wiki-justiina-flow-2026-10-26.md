# Wiki → Justiina flow, 2026-10-26

Local validation on preview/legacy-desktop-ui (base 5729f92).

## Verified

- Online transfer of 20 source recipes, 211 ingredient rows: no lost ingredients and the same canonical search terms as the shared editor parser.
- Product snapshot audit: 195 searchable ingredient steps, 189 with compatible products, six unavailable requirements remain explicitly missing.
- Seven freshly retrieved Wikibooks pages: Makaronilaatikko, Makkarakeitto, Amerikkalainen pannukakku, Lihapullat, Bataatti-porkkanakeitto, Valkosipulipasta, Munakas.
- Wiki quantities, fractions, mixed fractions, written units, quantity ranges, section headings, and tap-water exclusion.
- Thirteen title relevance cases across soups, pies, vegetables and ambiguous word fragments. Recipe body mentions cannot make an unrelated title pass.
- Existing 10-recipe / 87-product-selection regression, servings/cart quantities, protein states, seasoning adversarial fixtures and search coverage.

## Changes supported by failures

The online route used a second, less capable quantity parser. It produced a zero for an unspecified quantity, interpreted written litres as item names, failed slash fractions, and split quantity ranges into invalid units. The online route now uses the shared ingredient parser for both display and transfer. Headings such as Tarvikkeet and headingless ingredient lists are recognized; subsection labels are excluded.

Generic search normalization also recognizes inflected egg names and trailing culinary purposes such as "vuoan voiteluun". Specific potato requirements retain their existing specialized category before the generic potato fallback.

## Limits

These are local source and recorded-product tests, not a deployed browser-to-live-store end-to-end pass. The newly retrieved wiki recipes have been checked through ingredient interpretation and search planning, not live product availability or actual browser cart interactions. Full app build was not run: npm ci rejects the repository's pre-existing package/lockfile mismatch. Shared module strict TypeScript checking and desktop TSX syntax checking passed.

Some wiki entries are ambiguous source material: "rasvaa", "mausteita", "nokare", or unspecified fillings. Unknown amounts are retained as null and marked for review. These should not be represented as verified automatic product matches. No release was performed in this test-only step.

Wikibooks test fixtures include source URLs and CC BY-SA attribution.

## Follow-up: six missing ingredient steps

Fresh Ruoanhinta provider requests for store 3221 found exact ancho chili, green pepper, emmental–mozzarella grated cheese, and Italian-herb cream cheese. The grated cheese occurs in two recipes, so these account for five of the six previously missing steps. The old regression fixture was a sampled response corpus for S store 292; it was not evidence of nationwide unavailability or a broken rejection filter.

Qualified ingredients now generate qualifier-preserving provider queries before their existing category/fallback queries. Known category nouns are normalized inside compounds, keeping flavour/blend words. This is shared query generation, not a recipe-title or brand exception. Existing protein expansion remains intact. The green-pepper vocabulary also covers provider word order. Wild-rice blend coverage includes spaced and English names, with matching vocabulary for rice blends and continued rejection of unrelated rice foods and pet food.

Fresh K-store requests for `villiriisi`, `villi riisi`, and `wild rice` returned no products. Broader `villi` and `wild` requests likewise contained no rice items. No substitute is automatically represented as wild-rice blend. A product unavailable from the tested provider/store remains missing.

Validation: test-recipe-qualified-search.cjs replays the new full provider responses and confirms the five exact ingredient steps plus adversarial rejections. This does not replace a deployed browser/cart end-to-end test. Changes remain local.

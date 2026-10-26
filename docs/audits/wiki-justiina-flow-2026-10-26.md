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

Some wiki entries are ambiguous source material: "rasvaa", "mausteita", "nokare", or unspecified fillings. Unknown amounts are retained as null and marked for review. These should not be represented as verified automatic product matches. The initial test-only step was followed by the preview release and browser verification below.

Wikibooks test fixtures include source URLs and CC BY-SA attribution.

## Follow-up: six missing ingredient steps

Fresh Ruoanhinta provider requests for store 3221 found exact ancho chili, green pepper, emmental–mozzarella grated cheese, and Italian-herb cream cheese. The grated cheese occurs in two recipes, so these account for five of the six previously missing steps. The old regression fixture was a sampled response corpus for S store 292; it was not evidence of nationwide unavailability or a broken rejection filter.

Qualified ingredients now generate qualifier-preserving provider queries before their existing category/fallback queries. Known category nouns are normalized inside compounds, keeping flavour/blend words. This is shared query generation, not a recipe-title or brand exception. Existing protein expansion remains intact. The green-pepper vocabulary also covers provider word order. Wild-rice blend coverage includes spaced and English names, with matching vocabulary for rice blends and continued rejection of unrelated rice foods and pet food.

Fresh K-store requests for `villiriisi`, `villi riisi`, and `wild rice` returned no products. Broader `villi` and `wild` requests likewise contained no rice items. No substitute is automatically represented as wild-rice blend. A product unavailable from the tested provider/store remains missing.

Validation: test-recipe-qualified-search.cjs replays the new full provider responses and confirms the five exact ingredient steps plus adversarial rejections. This does not replace a deployed browser/cart end-to-end test. The changes were subsequently released to the desktop preview branch.


## Browser verification on the preview URL

The current preview was exercised through its visible UI using K-Citymarket Hyvinkää. Wiki search returned the Makkarakeitto recipe, displayed eight source ingredients, and transferred seven purchasable ingredients to Justiina. Tap water remained in the displayed recipe and was skipped during product search. Carrot, swede, celeriac, onion, salt, potatoes, and ring sausage were selected in sequence. The cart contained all seven ingredient rows. The 400 g sausage requirement correctly generated two 250 g packages. Total in this test cart was 24.71 euros. Proof: wiki-recipe-cart-2026-10-26.jpg.

The browser test also exposed two failures not covered by the sampled ingredient tests: K route mapping removed product category metadata, and the potato fallback returned success before shared category rejection. K category metadata is now retained; the potato fallback rejects non-potatoes early but valid raw potatoes continue through shared category checks. Vegetable-mixture category metadata also participates in the existing single-vegetable requirement.

The actual K route regression uses 80 live carrot response rows. Thirteen appropriate carrot products remain; child food, breads, pet food, and vegetable mixtures are rejected. Potato regression covers baby meals, vegetable mixtures and prepared fish/potato meals while retaining raw potatoes and Siikli food potatoes.

This is one completed browser recipe flow, supported by the broader offline source/product tests; it is not a claim that every wiki recipe has been exercised in a browser.

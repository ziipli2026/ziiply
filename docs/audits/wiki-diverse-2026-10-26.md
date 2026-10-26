# Diverse wiki recipe tests — 2026-10-26

## New source and live-product checks

Three source recipes were run through the same onlineRecipeSearchPlan and product compatibility functions used by the desktop page:

- Amerikkalainen pannukakku: seven shopping requirements. All eight source rows remain in the displayed recipe; the optional extra frying fat is retained as a note on the measured oil requirement.
- Bataatti-porkkanakeitto: eight shopping requirements, with tap water omitted only from shopping.
- Valkosipulipasta: nine shopping requirements.

All 24 search steps obtained compatible products from newly retrieved K-store 3221 Ruoanhinta responses. The regression fixture samples accepted and rejected rows from those full response checks. It is not a claim about availability at every store.

The additional Tomaatti-kalakeitto source exposed a heading containing a written serving count. All eight ingredient rows are now retained. Unspecified fish and vague herb requirements remain reviewable; this source was not declared an automatic product-selection success.

## General corrections supported by failures

- Preserve preparation form: garlic powder and onion powder are separate from fresh bulbs.
- Extend food-group vocabulary for ordinary broccoli, walnuts, spaghetti/string pasta and Parmesan.
- Treat `ja/tai` like `tai`, preserve complete alternatives and their quantities in the displayed recipe, and query the alternative ingredient groups.
- An optional unmeasured extra must not erase the measured requirement or cause a duplicate retail purchase. Preserve the original optional line in ingredient metadata.
- Reject prepared meals and meal mixes when the requested ingredient is a plain pantry item; vegetable gratins and sprouts are distinct from whole vegetables.
- A condiment lemon juice requirement must not accept a mixed-fruit beverage.
- Cooking oil must not accept oil-flavoured margarines/spreads.
- Non-food accessory categories (including feeding accessories and kitchen utensils) must never qualify as recipe ingredients just because their name contains a food word.

## Browser evidence

The pancake was searched from Wikibooks through the visible UI on the preview URL and completed into a seven-row cart: wheat flour, sugar, baking powder, salt, eggs, milk and cooking oil. The oil was purchased only once. The real measured requirement remained 30 ml. Retail cart total in this test was 8.85 euros. Proof: wiki-pancake-cart-2026-10-26.jpg.

This browser test exposed a `Pirkka pullotutti (maito)` feeding accessory appearing as milk. It was not selected; the ordinary milk was selected. The accessory-family regression now covers those real product categories as well as a kitchen-utensil adversarial example.

## Checks

The new diverse live fixture, eight wiki source fixtures, 20-recipe / 195-step existing product fixture, 10-recipe product-choice regressions, K-route category mapping, query coverage, protein states, servings/cart quantities, and strict TypeScript checks passed locally. Preview build and latest-alias checks accompany release. Broader offline tests do not substitute for browser verification of every individual recipe.

## Completed pasta browser run

Valkosipulipasta completed from the visible wiki search through all nine product selections into the cart at K-Citymarket Hyvinkää. Cart: butter, dried basil, lemon juice, garlic powder, salt, spaghetti, broccoli, walnuts and Parmesan. The 430 g broccoli requirement correctly produced two 300 g packs. Nine distinct ingredient rows / ten retail packs; total 16.91 euros. Parmesan has no source quantity and remains a reviewable requirement rather than an invented measured amount. Proof: wiki-pasta-cart-2026-10-26.jpg.

The browser observation connection timed out during broccoli twice. Resetting the automation kernel and rebinding the same tab recovered the six existing cart rows and completed the remaining three without restarting or double-adding those rows.

Two further irrelevant candidates appeared and were not selected: Kukkakaali-parsakaali 350g/2kpl for a single broccoli requirement, and Old Irish Creamery Cheddar saksanpähkinä 150g for walnuts. General rules now reject multi-vegetable names without a mix label when additional vegetables were not requested, and reject nut-flavoured dairy products as pantry ingredients. Tests cover multiple vegetable pairs, whole garlic/red onion, plain walnuts and soup-root mixtures.

Query-change UI check: switching from Valkosipulipasta to lihakeitto removed the old recipe immediately; the latter showed no recipes rather than unrelated dishes.

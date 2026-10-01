/** Research-only audit of Lidl public API relevance; observed 2026-10-01 from staples v46. */
export const lidlStapleCoverageV47 = {
 observedDate:"2026-10-01",
 source:"LIDL-STAPLES-v46-20261001 official public API",
 queries:16,
 categoryQueries:8,
 searchQueries:8,
 http200:16,
 distinctObservedIds:70,
 warnings:[
  "Public search q=maito returned cereals, pastry, soup, juice and pastilles, not plain milk.",
  "Public search q=kananmuna returned chicken, Calluna, gum and a thermos, not eggs.",
  "Public search q=pasta returned unrelated non-food and other grocery items.",
  "Category endpoint lists promoted products, not the full store assortment.",
  "No API response verifies store-level current inventory or checkout price."
 ],
 missingBasicExactNameQueries:["maito","kananmuna","voi","pasta","riisi","kerma"],
 policy:{
  requireExactOrReviewedProductName:true,
  neverUseUnfilteredSearchResultsAsMatches:true,
  preserveNullPrice:true,
  checkoutPriceVerified:false,
  productionIntegrationAllowed:false
 }
} as const;

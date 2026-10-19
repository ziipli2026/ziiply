#!/usr/bin/env node
// Live source audit only: never writes product data or publishes prices.
const terms = ["maito", "kahvi", "kananmuna", "kananmunat", "munat", "munia"];
const ticket = "klevu-15488592134928913";
const groceryEvidence = {
  maito: /(?:^|\s)(?:kevytmaito|täysmaito|rasvaton maito|maitojuoma|laktoositon maito|luomumaito|kondensoitu maito)(?:\s|$)/i,
  kahvi: /(?:kahvi|coffee|café|espresso)/i,
  kananmuna: /(?:kananmunat|kananmunia|kananmunapak|kananmuna\s+\d|kananmunia\s+\d|munia\s+\d)/i,
  kananmunat: /(?:kananmunat|kananmunia|kananmunapak|kananmuna\s+\d|munia\s+\d)/i,
  munat: /(?:kananmunat|kananmunia|kananmunapak|kananmuna\s+\d|munia\s+\d)/i,
  munia: /(?:kananmunat|kananmunia|kananmunapak|kananmuna\s+\d|munia\s+\d)/i,
};
let failures = 0;
let eggCandidates = 0;
for (const term of terms) {
  const url = new URL("https://eucs11.ksearchnet.com/cloud-search/n-search/search");
  for (const [key, value] of Object.entries({
    ticket, analyticsApiKey: ticket, term, paginationStartsFrom: "0",
    noOfResults: "100", klevuSort: "rel", responseType: "json",
    category: "KLEVU_PRODUCT", visibility: "search",
    showOutOfStockProducts: "true", fetchMinMaxPrice: "true"
  })) url.searchParams.set(key, value);
  try {
    const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "Ziiply/1.0" }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    const items = Array.isArray(data?.result) ? data.result : [];
    const relevant = items.filter(item => String(item?.name || "").toLocaleLowerCase("fi").includes(term));
    const rows = relevant.slice(0, 10).map(item => ({
      name: item.name,
      salePrice: item.salePrice ?? null,
      oldPrice: item.oldPrice ?? null,
      basePrice: item.basePrice ?? null,
      price: item.price ?? null,
      sku: item.sku ?? null
    }));
    const groceryCandidates = relevant.filter(item => groceryEvidence[term].test(String(item?.name || "")) && !/(?:leikkuri|automaatti|keitin|puhdistus|sukat|seinämaali)/i.test(String(item?.name || "")));
    console.log(JSON.stringify({ term, total: items.length, nameMatches: relevant.length, groceryCandidateCount: groceryCandidates.length, groceryExamples: groceryCandidates.slice(0,5).map(item => item.name), examples: rows }));
    if (["kananmuna", "kananmunat", "munat", "munia"].includes(term)) eggCandidates += groceryCandidates.length;
    else if (!groceryCandidates.length) { console.error("NO_GROCERY_CANDIDATES " + term); failures++; }
    if (!items.length) { console.error("NO_SOURCE_RESULTS " + term); failures++; }
  } catch (error) {
    console.error("SOURCE_ERROR " + term + " " + String(error));
    failures++;
  }
}
if (!eggCandidates) { console.warn("SOURCE_COVERAGE_WARNING: NO_EGG_PRODUCTS_ACROSS_VARIANTS; SPAR physical-store assortment is not verified by Klevu"); }
if (failures) { console.error("Live source audit failed: " + failures + " source/search errors"); process.exitCode = 1; }
else console.log("Live source requests passed; missing eggs remain a source-coverage warning, not a verified product absence.");

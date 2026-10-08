// Read-only diagnostic for a separately verified K-Ruoka offers service.
// Set KR_OFFERS_SERVICE_URL to your own trusted service URL.
const base = process.env.KR_OFFERS_SERVICE_URL;
if (!base) { console.error("SERVICE_NOT_CONFIGURED: KR_OFFERS_SERVICE_URL missing"); process.exitCode = 2; }
else {
  const get = async (path, options) => {
    const response = await fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error("HTTP " + response.status + " for " + path);
    return response.json();
  };
  try {
    const stores = await get("/bulk/stores");
    const matches = (stores.stores || []).filter(s => s.slug === "k-citymarket-oulu-rusko");
    if (matches.length !== 1) throw new Error("Exact Oulu Rusko store match count: " + matches.length);
    const store = matches[0];
    if (!store.id || !/citymarket/i.test(store.name)) throw new Error("Store identity mismatch");
    const data = await get("/bulk/store-offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.id }) });
    if (data.storeId !== store.id) throw new Error("Response storeId mismatch");
    const rows = (data.categories || []).flatMap(c => c.offers || []);
    const unique = [...new Map(rows.filter(o => o.id).map(o => [o.id, o])).values()];
    console.log(JSON.stringify({ status: "OK", storeId: store.id, storeName: store.name, totalOffers: unique.length, storeOffers: unique.filter(o => o.offerType === "store").length, chainOffers: unique.filter(o => o.offerType === "chain").length, categories: (data.categories || []).map(c => ({ category: c.category, count: (c.offers || []).length })) }, null, 2));
  } catch (error) { console.error("AUDIT_FAILED:", String(error)); process.exitCode = 1; }
}

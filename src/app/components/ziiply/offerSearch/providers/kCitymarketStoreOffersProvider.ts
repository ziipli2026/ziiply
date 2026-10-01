/**
 * Isolated K-Citymarket store-offers research probe.
 * Not imported by public offer search; national leaflet remains untouched.
 * Never infer store identity from a session-dependent /kauppa/tarjoushaku page.
 */
export type KCitymarketStoreOfferProbe = {
  storeId: string;
  sourceUrl: string;
  status: "NOT_CONFIGURED" | "HTTP_ERROR" | "UNVERIFIED_STORE" | "UNSUPPORTED_SHAPE" | "OK";
  httpStatus: number | null;
  offers: unknown[];
  diagnostic: string;
  evidence?: { storePageUrl: string; storePageHttp: number; storeIdentitySeen: boolean; offerLinkSeen: boolean };
};

export async function probeKCitymarketStoreOffers(options: {
  storeId: string;
  endpoint?: string;
}): Promise<KCitymarketStoreOfferProbe> {
  const storeId = String(options.storeId ?? "").trim();
  const endpoint = String(options.endpoint ?? "").trim();
  const base = { storeId, sourceUrl: endpoint, httpStatus: null, offers: [] as unknown[] };
  if (!storeId || !endpoint) return {
    ...base, status: "NOT_CONFIGURED" as const,
    diagnostic: "Explicit store slug and verified store-page URL required; no default store.",
  };
  let url: URL;
  try { url = new URL(endpoint); }
  catch { return { ...base, status: "NOT_CONFIGURED", diagnostic: "Invalid URL." }; }
  // The selected store's canonical page is the only acceptable probe entry.
  // The generic offer-search page may silently show a previously selected OTHER store.
  if (url.protocol !== "https:" || url.hostname !== "www.k-ruoka.fi" ||
      url.pathname !== `/kauppa/${storeId}` ||
      !/^k-citymarket-[a-z0-9-]+$/.test(storeId)) {
    return { ...base, status: "NOT_CONFIGURED", diagnostic: "Require canonical /kauppa/k-citymarket-<slug> URL matching storeId." };
  }
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: "text/html", "User-Agent": "ZiiplyStoreOfferResearch/1.0" },
      redirect: "follow", cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    return { ...base, status: "HTTP_ERROR", diagnostic: String(error) };
  }
  const received = { ...base, sourceUrl: response.url, httpStatus: response.status };
  if (!response.ok) return { ...received, status: "HTTP_ERROR", diagnostic: `Store page HTTP ${response.status}` };
  const finalUrl = new URL(response.url);
  if (finalUrl.hostname !== "www.k-ruoka.fi" || finalUrl.pathname !== url.pathname) {
    return { ...received, status: "UNVERIFIED_STORE", diagnostic: "Store page redirected to another context." };
  }
  const html = await response.text();
  const identitySeen = html.toLowerCase().includes(storeId.replace(/^k-citymarket-/, "").replace(/-/g, " "));
  const offerLinkSeen = /tarjoushaku|>Edut<|edut-ja-tarjoukset/i.test(html);
  const evidence = { storePageUrl: response.url, storePageHttp: response.status, storeIdentitySeen: identitySeen, offerLinkSeen };
  if (!identitySeen) return {
    ...received, evidence, status: "UNVERIFIED_STORE",
    diagnostic: "Canonical URL responded but selected store identity was not confirmed in HTML.",
  };
  return {
    ...received, evidence, status: "UNSUPPORTED_SHAPE",
    diagnostic: offerLinkSeen
      ? "Store page and offers navigation found. Offer API and store-scoped response still unverified; zero offers intentionally emitted."
      : "Store page verified, but offers navigation/API not identified; zero offers intentionally emitted.",
  };
}

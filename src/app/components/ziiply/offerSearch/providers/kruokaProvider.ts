// ============================================================================
// ZIIPLY_KRUOKA_PROVIDER_V53_ETARJOUSLEHDET_NULL_PRICE_FIX
// Revision: V53-ETARJOUSLEHDET-NULL-PRICE-FIX
// Date: 2026-09-21
//
// Muutos V51:een:
// - Korvaa Vercelissä 403:een pysähtyvän K-Ruoka fetch-offers/product-map -ketjun.
// - Käyttää V15-V19 testeissä varmennettua eTarjouslehdet/Tjek data-transporttia.
// - Ratkaisee valitun K-Market/K-Supermarketin nimen perusteella Tjek-storeksi.
// - Hakee K-ketjun tarjoukset ja rajaa publicationit valittuun myymälään.
// - Säilyttää fetchKruokaOffers(), KruokaOfferProviderOptionsV10 ja debug-exportin.
// - V53 korjaa Tjekin null-hintojen käsittelyn: Number(null) ei enää muutu 0:ksi.
 // - Näin tavallinen price ja appPrice eivät jää aiemman null-kentän taakse.
 // ============================================================================

 // src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

export type KruokaOfferProviderOptionsV10 = {
  storeId?: string | number | null;
  storeName?: string | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
  kStoreIds?: Array<string | number | null | undefined> | null;
  kStoreNames?: Array<string | null | undefined> | null;
};

type UnknownRecord = Record<string, unknown>;

export type KruokaPipelineDebugV49 = {
  selectedStoreName: string;
  selectedStoreId: string;
  brochureUrl: string;
  brochureHttp: number | null;
  applicationState: "NOT_RUN" | "OK" | "FAIL";
  fetchOffersHttp?: number | null;
  fetchOffersShape?: string | null;
  kStoreId: string | null;
  brochureOffers: number | null;
  eans: number | null;
  productMapHttp: number | null;
  productMapProducts: number | null;
  activeOffers: number | null;
  error: string | null;
};

let lastKruokaPipelineDebugV49: KruokaPipelineDebugV49 | null = null;
export function getLastKruokaPipelineDebugV49(): KruokaPipelineDebugV49 | null {
  return lastKruokaPipelineDebugV49 ? { ...lastKruokaPipelineDebugV49 } : null;
}

const ETARJOUSLEHDET_ORIGIN = "https://etarjouslehdet.fi";
const K_SUPERMARKET_BUSINESS_ID = "f305U8";

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-").replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö]+/gi, " ").replace(/\s+/g, " ").trim();
}

function getSelectedStoreName(options?: KruokaOfferProviderOptionsV10): string {
  return String(options?.kStoreName ?? options?.storeName ?? options?.kStoreNames?.[0] ?? "").trim();
}

function businessForStore(storeName: string): { businessId: string; chain: string } | null {
  const n = normalize(storeName);
  if (n.includes("citymarket")) return null; // pidetään erillisenä kuten ennen
  if (n.includes("supermarket")) return { businessId: K_SUPERMARKET_BUSINESS_ID, chain: "K-Supermarket" };
  // K-Market businessId selvitetään erikseen; V52 ei arvaa tunnistetta.
  if (n.includes("k market")) return null;
  return null;
}

function stableBase64(value: unknown): string {
  const plain = (v: unknown): v is Record<string, unknown> =>
    Object.prototype.toString.call(v) === "[object Object]";
  const json = JSON.stringify(value, (_k, v) =>
    plain(v) ? Object.keys(v).sort().reduce<Record<string, unknown>>((o, k) => { o[k] = v[k]; return o; }, {}) : v,
  );
  return Buffer.from(json, "utf8").toString("base64");
}

async function fetchTjekData(name: string, params: UnknownRecord): Promise<unknown> {
  const key = stableBase64([name, params]);
  const response = await fetch(`${ETARJOUSLEHDET_ORIGIN}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      Referer: `${ETARJOUSLEHDET_ORIGIN}/K-Supermarket`,
    },
    body: JSON.stringify({ data: [key] }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`eTarjouslehdet data HTTP ${response.status}`);
  const text = await response.text();
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    try {
      const row = JSON.parse(line) as UnknownRecord;
      if (row.key === key) return row.value;
    } catch { /* NDJSON: ohita virheellinen rivi */ }
  }
  throw new Error(`eTarjouslehdet data-avain ${name} puuttui vastauksesta`);
}

function dataArray(value: unknown): UnknownRecord[] {
  if (!value || typeof value !== "object") return [];
  const data = (value as UnknownRecord).data;
  return Array.isArray(data) ? data.filter((x): x is UnknownRecord => !!x && typeof x === "object") : [];
}

async function resolveSelectedStore(businessId: string, selectedName: string): Promise<UnknownRecord | null> {
  const value = await fetchTjekData("stores", { businessId, pagination: { offset: 0, limit: 1000 } });
  const stores = dataArray(value);
  const wanted = normalize(selectedName);
  const exact = stores.find(s => normalize(s.name) === wanted);
  if (exact) return exact;
  const tokens = wanted.split(" ").filter(t => t !== "k" && t !== "supermarket" && t !== "market");
  const matches = stores.filter(s => tokens.length > 0 && tokens.every(t => normalize(s.name).includes(t)));
  return matches.length === 1 ? matches[0] : null;
}

function num(v: unknown): number | null {
  // Tjek käyttää puuttuvissa hintakentissä null-arvoa. Number(null) === 0,
  // joten V52:ssa ensimmäinen null-kenttä peitti myöhemmän oikean price/appPrice-arvon.
  if (v == null || (typeof v === "string" && !v.trim())) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function priceText(v: unknown): string { const n = num(v); return n == null ? "" : n.toFixed(2).replace(".", ","); }
function validityText(v: unknown): string | undefined {
  if (!v) return undefined; const d = new Date(String(v)); if (Number.isNaN(d.getTime())) return undefined;
  return `Voimassa ${d.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" })} asti`;
}
function matchesQuery(result: ZiiplyOfferSearchResult, query: string): boolean {
  const q = normalize(query); if (!q || String(query).trim().startsWith("__ziiply")) return true;
  const x = result as unknown as UnknownRecord;
  return normalize([x.title,x.name,x.productName,x.brand,x.category,x.categoryPath,x.productGroup,x.subCategory].filter(Boolean).join(" ")).includes(q);
}

function mapTjekOffer(offer: UnknownRecord, index: number, displayStoreId: string, displayStoreName: string, chain: string): ZiiplyOfferSearchResult | null {
  const title = String(offer.name ?? offer.title ?? "").trim();
  if (!title) return null;
  const membership = num(offer.membershipPrice);
  const app = num(offer.appPrice);
  const regular = num(offer.price);
  const from = num(offer.fromPrice);
  const effective = app ?? membership ?? regular ?? from;
  if (effective == null || effective <= 0) return null;
  const offerId = String(offer.publicId ?? `${index}`);
  const publicationId = String(offer.publicationPublicId ?? "");
  const image = String(offer.imageLarge ?? offer.image ?? "") || null;
  const unit = String(offer.baseUnit ?? "").trim();
  const unitPriceValue = num(offer.unitPrice);
  const unitPrice = unitPriceValue == null ? "" : `${priceText(unitPriceValue)}${unit ? `/${unit}` : ""}`;
  const isPlussa = membership != null;
  const category = String(offer.departmentSlug ?? "Muut");
  return {
    id: `etarjouslehdet-v53-${displayStoreId}-${offerId}-${index}`,
    title, name: title, productName: title,
    price: effective, priceText: priceText(effective), offerPrice: priceText(effective),
    previousPrice: regular != null && regular !== effective ? regular : null,
    unitPrice, unitPriceText: unitPrice, unitPriceUnit: unit || null,
    imageUrl: image, image, pictureUrl: image,
    storeId: displayStoreId, storeName: displayStoreName, storeLabel: displayStoreName,
    chain: "K", source: "etarjouslehdet", provider: "kruoka", offerId,
    additionalInfo: offer.description ?? null,
    benefitText: isPlussa ? "Plussa-tarjous" : app != null ? "Mobiilitarjous" : undefined,
    validityText: validityText(offer.validUntil),
    category, categoryPath: category, productGroup: category, mainCategory: category, subCategory: category,
    validFrom: offer.validFrom ?? null, validUntil: offer.validUntil ?? null, isPlussaOffer: isPlussa,
    url: `${ETARJOUSLEHDET_ORIGIN}/K-Supermarket`, productUrl: `${ETARJOUSLEHDET_ORIGIN}/K-Supermarket`,
    debug: { providerVersion: "V53_ETARJOUSLEHDET_NULL_PRICE_FIX", publicationId, tjekStoreId: displayStoreId, chain },
  } as unknown as ZiiplyOfferSearchResult;
}

export async function fetchKruokaOffers(
  query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const displayStoreName = getSelectedStoreName(options);
  const ziiplyStoreId = String(options?.kStoreId ?? options?.storeId ?? "").trim();
  const debug: KruokaPipelineDebugV49 = { selectedStoreName: displayStoreName, selectedStoreId: ziiplyStoreId, brochureUrl: `${ETARJOUSLEHDET_ORIGIN}/K-Supermarket`, brochureHttp: null, applicationState: "NOT_RUN", fetchOffersHttp: null, fetchOffersShape: null, kStoreId: null, brochureOffers: null, eans: null, productMapHttp: null, productMapProducts: null, activeOffers: null, error: null };
  lastKruokaPipelineDebugV49 = debug;
  try {
    if (!displayStoreName) return [];
    const business = businessForStore(displayStoreName);
    if (!business) { debug.error = "V52: vain K-Supermarket on tässä revisiossa varmennettu eTarjouslehdet/Tjekillä"; lastKruokaPipelineDebugV49={...debug}; return []; }
    const selected = await resolveSelectedStore(business.businessId, displayStoreName);
    if (!selected) throw new Error(`eTarjouslehdet: valittua kauppaa ei löytynyt yksiselitteisesti: ${displayStoreName}`);
    const tjekStoreId = String(selected.id ?? "").trim();
    debug.kStoreId = tjekStoreId;

    const offersValue = await fetchTjekData("offers", { businessIds: [business.businessId], sources: ["publication", "business_product"], pagination: { limit: 1000, offset: 0 }, sort: ["score_desc"] });
    const offers = dataArray(offersValue); debug.brochureOffers = offers.length; debug.fetchOffersHttp = 200; debug.fetchOffersShape = "etarjouslehdet:offers";
    const publicationIds = Array.from(new Set(offers.map(o => String(o.publicationPublicId ?? "")).filter(Boolean)));
    const allowed = new Set<string>();
    for (const publicationId of publicationIds) {
      const storesValue = await fetchTjekData("stores", { publicationId, businessId: business.businessId, pagination: { offset: 0, limit: 1000 } });
      if (dataArray(storesValue).some(s => String(s.id ?? "") === tjekStoreId)) allowed.add(publicationId);
    }
    const results: ZiiplyOfferSearchResult[] = [];
    const seen = new Set<string>();
    for (const [index, offer] of offers.entries()) {
      const publicationId = String(offer.publicationPublicId ?? "");
      if (!allowed.has(publicationId)) continue;
      const mapped = mapTjekOffer(offer,index,ziiplyStoreId || tjekStoreId,displayStoreName,business.chain);
      if (!mapped || !matchesQuery(mapped,query)) continue;
      const key=String((mapped as unknown as UnknownRecord).offerId ?? mapped.id); if(seen.has(key)) continue; seen.add(key); results.push(mapped);
    }
    debug.activeOffers=results.length; lastKruokaPipelineDebugV49={...debug}; return results;
  } catch(error) {
    debug.error=error instanceof Error?error.message:String(error); lastKruokaPipelineDebugV49={...debug};
    console.error("[Ziiply K provider V53] eTarjouslehdet/Tjek haku epäonnistui",{selectedStoreName:displayStoreName,error:debug.error}); return [];
  }
}

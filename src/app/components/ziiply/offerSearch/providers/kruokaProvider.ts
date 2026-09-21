// ============================================================================
// ZIIPLY_KRUOKA_PROVIDER_V60_KMARKET_DOMINANT_PUBLICATION
// Revision: V60-KMARKET-DOMINANT-PUBLICATION
// Date: 2026-09-21
//
// V55 pohjana. Muutos vain K-Marketin testaamiseksi eTarjouslehdet/Tjekillä:
// - K-Market business ID 9c56Y8
// - K-Market sallitaan businessForStore()-reitityksessä
// - URL/Referer muodostetaan ketjun mukaan
// - K-Supermarket-logiikka säilyy
// - V55 rawOffers/rawOfferAnalysis säilyvät
// ============================================================================

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
  rawOffers?: UnknownRecord[];
  tjekStoreProbeDebug?: Array<{ name: string; params: UnknownRecord; ok: boolean; count: number | null; preview: unknown; error: string | null }>;
  kMarketDominantPublicationDebug?: { publicationPublicId: string | null; offerCount: number; secondOfferCount: number; acceptedAsChainPublication: boolean; reason: string };
  publicationStoreDebug?: Array<{
    publicationPublicId: string;
    offerCount: number;
    selectedTjekStoreId: string;
    selectedStoreName: string;
    returnedStoreCount: number;
    containsSelectedStoreById: boolean;
    containsSelectedStoreByName: boolean;
    returnedStores: Array<{
      id: string;
      name: string;
      city: string;
      streetAddress: string;
      postalCode: string;
    }>;
    error: string | null;
  }>;
  rawOfferAnalysis?: Array<{
    index: number;
    publicId: string;
    publicationPublicId: string;
    name: string;
    publicationAllowedForSelectedStore: boolean;
    membershipPrice: unknown;
    appPrice: unknown;
    price: unknown;
    fromPrice: unknown;
    effectivePrice: number | null;
    hasTitle: boolean;
    mapWouldAccept: boolean;
    rejectReason: string | null;
  }>;
};

let lastKruokaPipelineDebugV49: KruokaPipelineDebugV49 | null = null;
export function getLastKruokaPipelineDebugV49(): KruokaPipelineDebugV49 | null {
  return lastKruokaPipelineDebugV49 ? { ...lastKruokaPipelineDebugV49 } : null;
}

const ETARJOUSLEHDET_ORIGIN = "https://etarjouslehdet.fi";
const K_SUPERMARKET_BUSINESS_ID = "f305U8";
const K_MARKET_BUSINESS_ID = "9c56Y8";

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[‐-‒–—−]/g, "-").replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö]+/gi, " ").replace(/\s+/g, " ").trim();
}

function getSelectedStoreName(options?: KruokaOfferProviderOptionsV10): string {
  return String(options?.kStoreName ?? options?.storeName ?? options?.kStoreNames?.[0] ?? "").trim();
}

function businessForStore(storeName: string): { businessId: string; chain: string; slug: string } | null {
  const n = normalize(storeName);
  if (n.includes("citymarket")) return null;
  if (n.includes("supermarket")) return { businessId: K_SUPERMARKET_BUSINESS_ID, chain: "K-Supermarket", slug: "K-Supermarket" };
  if (n.includes("k market")) return { businessId: K_MARKET_BUSINESS_ID, chain: "K-Market", slug: "K-Market" };
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

async function fetchTjekData(name: string, params: UnknownRecord, slug = "K-Supermarket"): Promise<unknown> {
  const key = stableBase64([name, params]);
  const response = await fetch(`${ETARJOUSLEHDET_ORIGIN}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      Referer: `${ETARJOUSLEHDET_ORIGIN}/${slug}`,
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
    } catch { }
  }
  throw new Error(`eTarjouslehdet data-avain ${name} puuttui vastauksesta`);
}

function dataArray(value: unknown): UnknownRecord[] {
  if (!value || typeof value !== "object") return [];
  const data = (value as UnknownRecord).data;
  return Array.isArray(data) ? data.filter((x): x is UnknownRecord => !!x && typeof x === "object") : [];
}

async function resolveSelectedStore(businessId: string, selectedName: string, slug: string): Promise<UnknownRecord | null> {
  const value = await fetchTjekData("stores", { businessId, pagination: { offset: 0, limit: 1000 } }, slug);
  const stores = dataArray(value);
  const wanted = normalize(selectedName);
  const exact = stores.find(s => normalize(s.name) === wanted);
  if (exact) return exact;
  const tokens = wanted.split(" ").filter(t => t !== "k" && t !== "supermarket" && t !== "market");
  const matches = stores.filter(s => tokens.length > 0 && tokens.every(t => normalize(s.name).includes(t)));
  return matches.length === 1 ? matches[0] : null;
}

function num(v: unknown): number | null {
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

function mapTjekCategoryV54(offer: UnknownRecord): string {
  const department = normalize(offer.departmentSlug ?? offer.department ?? "");
  const productText = normalize([offer.name, offer.title, offer.description].filter(Boolean).join(" "));
  if (/mikroateria|valmisateria|valmisruoka|keitto|pasta|lasagne|laatikko|risotto|ateria/.test(productText)) return "Valmisruoka";
  if (/jaatelo|pakaste|pakastettu|nugget|ranskalaiset|wokvihannes|pakastevihannes|pakastemarja/.test(productText)) return "Pakasteet";
  if (/lohi|kirjolohi|silakka|muikku|tonnikala|katkarapu|seiti|turska|kala/.test(productText)) return "Kala";
  if (/jauheliha|makkara|lenkkimakkara|nakki|broileri|kana|kanan |nauta|porsas|possu|pekoni|kinkku|leikkele|liha/.test(productText)) return "Liha & makkarat";
  if (/jogurtti|jugurtti|maito|piima|rahka|juusto|kerma|voi\b|kananmuna/.test(productText)) return "Maitotuotteet";
  if (/mehu|limu|virvoitusjuoma|cola|vichy|vesi|energiajuoma|smoothie/.test(productText)) return "Juomat";
  if (/salaatti|peruna|tomaatti|kurkku|omena|banaani|appelsiini|sipuli|porkkana|paprika|kaali|hedelma|vihannes|marja/.test(productText)) return "Hevi";
  if (department === "frozen" || department.includes("frozen")) return "Pakasteet";
  if (department.includes("fruits and vegetables") || department.includes("fruit") || department.includes("vegetable")) return "Hevi";
  if (department.includes("beverage") || department.includes("drink")) return "Juomat";
  if (department.includes("meat and fish") || department.includes("meat")) return "Liha & makkarat";
  if (department.includes("fish") || department.includes("seafood")) return "Kala";
  if (department.includes("dairy and cold") || department.includes("dairy")) return "Maitotuotteet";
  if (department.includes("bakery") || department.includes("bread")) return "Leipomo";
  if (department.includes("candy") || department.includes("confection") || department.includes("sweet")) return "Makeiset & keksit";
  return "Muut";
}

function mapTjekOffer(offer: UnknownRecord, index: number, displayStoreId: string, displayStoreName: string, chain: string, slug: string): ZiiplyOfferSearchResult | null {
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
  const category = mapTjekCategoryV54(offer);
  return {
    id: `etarjouslehdet-v59-${displayStoreId}-${offerId}-${index}`,
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
    url: `${ETARJOUSLEHDET_ORIGIN}/${slug}`, productUrl: `${ETARJOUSLEHDET_ORIGIN}/${slug}`,
    debug: { providerVersion: "V60_KMARKET_DOMINANT_PUBLICATION", publicationId, tjekStoreId: displayStoreId, chain },
  } as unknown as ZiiplyOfferSearchResult;
}

export async function fetchKruokaOffers(
  query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const displayStoreName = getSelectedStoreName(options);
  const ziiplyStoreId = String(options?.kStoreId ?? options?.storeId ?? "").trim();
  const preliminaryBusiness = businessForStore(displayStoreName);
  const preliminarySlug = preliminaryBusiness?.slug ?? "K-Supermarket";
  const debug: KruokaPipelineDebugV49 = {
    selectedStoreName: displayStoreName, selectedStoreId: ziiplyStoreId,
    brochureUrl: `${ETARJOUSLEHDET_ORIGIN}/${preliminarySlug}`, brochureHttp: null,
    applicationState: "NOT_RUN", fetchOffersHttp: null, fetchOffersShape: null,
    kStoreId: null, brochureOffers: null, eans: null, productMapHttp: null,
    productMapProducts: null, activeOffers: null, error: null,
    rawOffers: [], rawOfferAnalysis: [], publicationStoreDebug: [], tjekStoreProbeDebug: [],
  };
  lastKruokaPipelineDebugV49 = debug;

  try {
    if (!displayStoreName) return [];
    const business = businessForStore(displayStoreName);
    if (!business) {
      debug.error = "V56: K-Citymarket ei ole tässä revisiossa mukana; K-Supermarket ja K-Market on sallittu";
      lastKruokaPipelineDebugV49 = { ...debug };
      return [];
    }

    const selected = await resolveSelectedStore(business.businessId, displayStoreName, business.slug);
    if (!selected) throw new Error(`eTarjouslehdet: valittua kauppaa ei löytynyt yksiselitteisesti: ${displayStoreName}`);
    const tjekStoreId = String(selected.id ?? "").trim();
    debug.kStoreId = tjekStoreId;

    // V59: probe Tjek/eTarjouslehdet store-scoped query shapes BEFORE generic offers.
    // Debug only: probe results are never mapped into Ziiply results.
    const probe = async (name: string, params: UnknownRecord) => {
      try {
        const value = await fetchTjekData(name, params, business.slug);
        const rows = dataArray(value);
        debug.tjekStoreProbeDebug?.push({
          name, params, ok: true, count: rows.length,
          preview: rows.slice(0, 5).map(r => ({
            id: r.id ?? r.publicId ?? null,
            publicId: r.publicId ?? null,
            name: r.name ?? r.label ?? r.title ?? null,
            publicationPublicId: r.publicationPublicId ?? null,
            businessPublicId: r.businessPublicId ?? null,
            storeId: r.storeId ?? null,
            validFrom: r.validFrom ?? null, validUntil: r.validUntil ?? null,
          })),
          error: null,
        });
      } catch (error) {
        debug.tjekStoreProbeDebug?.push({
          name, params, ok: false, count: null, preview: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    if (business.chain === "K-Market") {
      const page = { offset: 0, limit: 1000 };
      await probe("publications", { businessId: business.businessId, storeId: tjekStoreId, pagination: page });
      await probe("publications", { businessIds: [business.businessId], storeIds: [tjekStoreId], pagination: page });
      await probe("publications", { businessId: business.businessId, locationId: tjekStoreId, pagination: page });
      await probe("offers", { businessIds: [business.businessId], storeId: tjekStoreId, sources: ["publication", "business_product"], pagination: page, sort: ["score_desc"] });
      await probe("offers", { businessIds: [business.businessId], storeIds: [tjekStoreId], sources: ["publication", "business_product"], pagination: page, sort: ["score_desc"] });
      await probe("offers", { businessIds: [business.businessId], locationId: tjekStoreId, sources: ["publication", "business_product"], pagination: page, sort: ["score_desc"] });
      await probe("stores", { businessId: business.businessId, storeId: tjekStoreId, pagination: page });
    }

    const offersValue = await fetchTjekData("offers", {
      businessIds: [business.businessId],
      sources: ["publication", "business_product"],
      pagination: { limit: 1000, offset: 0 },
      sort: ["score_desc"],
    }, business.slug);

    const offers = dataArray(offersValue);
    debug.brochureOffers = offers.length;
    debug.fetchOffersHttp = 200;
    debug.fetchOffersShape = `etarjouslehdet:offers:${business.chain}`;
    debug.rawOffers = offers.map(o => ({ ...o }));

    const publicationIds = Array.from(new Set(
      offers.map(o => String(o.publicationPublicId ?? "")).filter(Boolean)
    ));
    const allowed = new Set<string>();

    // V60 K-Market:
    // Tjekin publication->stores -kytkentä ei kata ketjun yhteisiä tarjouksia oikein.
    // Hakalantorin K-Ruoka-näkymän ja raw offer -datan vertailussa suurin publication
    // sisältää samat ketjutarjoukset (esim. Teho, Santa Maria, mango, pensasmustikka,
    // suippopaprika, Kartanon salaatti, Caesar-salaatti), vaikka stores(publicationId)
    // palauttaa vain yhden muun K-Marketin.
    //
    // Älä kovakoodaa publication-ID:tä: tunnista ketjupublication selvästi dominoivasta
    // offer-määrästä. Turvaraja: vähintään 10 tarjousta ja vähintään 2x seuraavaksi suurin.
    const publicationCounts = publicationIds
      .map(publicationPublicId => ({
        publicationPublicId,
        offerCount: offers.filter(o => String(o.publicationPublicId ?? "") === publicationPublicId).length,
      }))
      .sort((a, b) => b.offerCount - a.offerCount);

    const dominant = publicationCounts[0] ?? null;
    const secondOfferCount = publicationCounts[1]?.offerCount ?? 0;
    const acceptDominantAsChainPublication =
      business.chain === "K-Market" &&
      !!dominant &&
      dominant.offerCount >= 10 &&
      (secondOfferCount === 0 || dominant.offerCount >= secondOfferCount * 2);

    debug.kMarketDominantPublicationDebug = {
      publicationPublicId: dominant?.publicationPublicId ?? null,
      offerCount: dominant?.offerCount ?? 0,
      secondOfferCount,
      acceptedAsChainPublication: acceptDominantAsChainPublication,
      reason: acceptDominantAsChainPublication
        ? "K-Market dominant publication accepted as chain/common offers; publication->stores mapping is incomplete"
        : "Dominant-publication safety criteria not met",
    };

    if (acceptDominantAsChainPublication && dominant) {
      allowed.add(dominant.publicationPublicId);
    }

    for (const publicationId of publicationIds) {
      const offerCount = offers.filter(o => String(o.publicationPublicId ?? "") === publicationId).length;
      try {
        const storesValue = await fetchTjekData("stores", {
          publicationId,
          businessId: business.businessId,
          pagination: { offset: 0, limit: 1000 },
        }, business.slug);
        const publicationStores = dataArray(storesValue);
        const containsSelectedStoreById = publicationStores.some(
          s => String(s.id ?? "") === tjekStoreId
        );
        const containsSelectedStoreByName = publicationStores.some(
          s => normalize(s.name) === normalize(selected.name ?? displayStoreName)
        );

        debug.publicationStoreDebug?.push({
          publicationPublicId: publicationId,
          offerCount,
          selectedTjekStoreId: tjekStoreId,
          selectedStoreName: String(selected.name ?? displayStoreName),
          returnedStoreCount: publicationStores.length,
          containsSelectedStoreById,
          containsSelectedStoreByName,
          returnedStores: publicationStores.map(s => ({
            id: String(s.id ?? ""),
            name: String(s.name ?? ""),
            city: String(s.city ?? ""),
            streetAddress: String(s.streetAddress ?? ""),
            postalCode: String(s.postalCode ?? ""),
          })),
          error: null,
        });

        if (containsSelectedStoreById) allowed.add(publicationId);
      } catch (error) {
        debug.publicationStoreDebug?.push({
          publicationPublicId: publicationId,
          offerCount,
          selectedTjekStoreId: tjekStoreId,
          selectedStoreName: String(selected.name ?? displayStoreName),
          returnedStoreCount: 0,
          containsSelectedStoreById: false,
          containsSelectedStoreByName: false,
          returnedStores: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    debug.rawOfferAnalysis = offers.map((offer, index) => {
      const title = String(offer.name ?? offer.title ?? "").trim();
      const membership = num(offer.membershipPrice);
      const app = num(offer.appPrice);
      const regular = num(offer.price);
      const from = num(offer.fromPrice);
      const effective = app ?? membership ?? regular ?? from;
      const publicationId = String(offer.publicationPublicId ?? "");
      const publicationAllowedForSelectedStore = allowed.has(publicationId);
      let rejectReason: string | null = null;
      if (!publicationAllowedForSelectedStore) rejectReason = "PUBLICATION_NOT_FOR_SELECTED_STORE";
      else if (!title) rejectReason = "NO_TITLE";
      else if (effective == null) rejectReason = "NO_NUMERIC_PRICE";
      else if (effective <= 0) rejectReason = "PRICE_ZERO_OR_NEGATIVE";
      return {
        index,
        publicId: String(offer.publicId ?? ""),
        publicationPublicId: publicationId,
        name: title,
        publicationAllowedForSelectedStore,
        membershipPrice: offer.membershipPrice ?? null,
        appPrice: offer.appPrice ?? null,
        price: offer.price ?? null,
        fromPrice: offer.fromPrice ?? null,
        effectivePrice: effective,
        hasTitle: !!title,
        mapWouldAccept: rejectReason == null,
        rejectReason,
      };
    });

    const results: ZiiplyOfferSearchResult[] = [];
    const seen = new Set<string>();

    for (const [index, offer] of offers.entries()) {
      const publicationId = String(offer.publicationPublicId ?? "");
      if (!allowed.has(publicationId)) continue;
      const mapped = mapTjekOffer(
        offer, index, ziiplyStoreId || tjekStoreId, displayStoreName, business.chain, business.slug
      );
      if (!mapped || !matchesQuery(mapped, query)) continue;
      const key = String((mapped as unknown as UnknownRecord).offerId ?? mapped.id);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(mapped);
    }

    debug.activeOffers = results.length;
    lastKruokaPipelineDebugV49 = { ...debug };
    return results;
  } catch (error) {
    debug.error = error instanceof Error ? error.message : String(error);
    lastKruokaPipelineDebugV49 = { ...debug };
    console.error("[Ziiply K provider V59 K-Market Tjek store probes DEBUG] eTarjouslehdet/Tjek haku epäonnistui", {
      selectedStoreName: displayStoreName,
      error: debug.error,
    });
    return [];
  }
}

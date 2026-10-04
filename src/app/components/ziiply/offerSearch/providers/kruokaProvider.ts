// ============================================================================
// ZIIPLY_KRUOKA_PROVIDER_V65_KMARKET_PRODUCTION
// Revision: V65-KMARKET-PRODUCTION
// Date: 2026-09-21
//
// Production cleanup V64:stä:
// - poistettu V59:n 7 ylimääräistä Tjek store-probe -kutsua
// - säilytetty K-Market common + store-specific publication -logiikka
// - säilytetty V64:n validoitu category-mapitus
// - K-Supermarket-logiikka säilyy ennallaan
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
  campaignProbe?: { activePublicationIds: string[]; campaignPublicationIds: string[]; fetchedCampaignRows: number; mappedCampaignRows: number; returnedCampaignRows: number };
  publicationPipeline?: Array<{ publicationId: string; raw: number; allowed: number; mapped: number; queryMatched: number; duplicate: number; returned: number }>;
  kTabClassificationAuditV1?: Array<{ publicationId: string; offerId: string; title: string; campaignType: string; validFrom: string | null; validUntil: string | null }>;
  publicationFetch?: Array<{ publicationId: string; fetchedRows: number; uniqueOfferIds: number; addedAfterBaseDedupe: number; skippedAsDuplicate: number }>;
  error: string | null;
  rawOffers?: UnknownRecord[];
  kSupermarketPublicationResolverDebug?: {
    selectedTjekStoreId: string;
    selectedStoreName: string;
    totalPublicationCount: number;
    activePublicationCount: number;
    publications: Array<{
      id: string;
      label: string;
      validFrom: string;
      validUntil: string;
      publish: string;
      active: boolean;
      consideredRegional: boolean;
    }>;
    chosenPublicationIds: string[];
  };
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
    sourceTaxonomy?: string;
    mappedCategory?: string;
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
const TJEK_PUBLICATION_VIEWER_ORIGIN = "https://publication-viewer.tjek.com";

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

async function resolveKLocalPublicationIds(
  selected: UnknownRecord,
  businessId: string,
  slug: string,
): Promise<{ ids: string[]; campaignIds: string[]; debug: NonNullable<KruokaPipelineDebugV49["kSupermarketPublicationResolverDebug"]> }> {
  const storeId = String(selected.id ?? "").trim();
  const coordinates = selected.coordinates;
  if (!storeId || !coordinates || typeof coordinates !== "object") {
    return {
      ids: [], campaignIds: [],
      debug: {
        selectedTjekStoreId: storeId,
        selectedStoreName: String(selected.name ?? ""),
        totalPublicationCount: 0,
        activePublicationCount: 0,
        publications: [],
        chosenPublicationIds: [],
      },
    };
  }

  const value = await fetchTjekData("fronts", {
    businessIds: [businessId],
    localBusinessIds: [storeId],
    coordinates,
  }, slug);
  const fronts = Array.isArray(value) ? value : [];
  const now = Date.now();
  const publications = fronts.flatMap(front => {
    if (!front || typeof front !== "object") return [];
    const rows = (front as UnknownRecord).publications;
    return Array.isArray(rows) ? rows.filter((p): p is UnknownRecord => !!p && typeof p === "object") : [];
  });
  const active = publications.filter(publication => {
    const from = Date.parse(String(publication.validFrom ?? ""));
    const until = Date.parse(String(publication.validUntil ?? ""));
    return Number.isFinite(from) && Number.isFinite(until) && from <= now && now <= until;
  });

  // V67: fronts is already scoped with localBusinessIds=[selected store].
  // A store can legitimately have both a common/regional brochure and a store-specific
  // brochure active at the same time. Read all active publications and merge/dedupe later.
  const regional = active
    .filter(publication => !normalize(publication.label).includes(normalize(selected.name)))
    .sort((a, b) => Date.parse(String(b.publish ?? b.validFrom ?? "")) - Date.parse(String(a.publish ?? a.validFrom ?? "")));

  const ids = Array.from(
    new Set(active.map(publication => String(publication.id ?? "").trim()).filter(Boolean)),
  );
  const regionalIds = new Set(regional.map(publication => String(publication.id ?? "").trim()).filter(Boolean));
  // Match the proven K-Citymarket split: a publication explicitly addressed to
  // the selected individual store belongs in Kampanjat; regional/chain-wide
  // leaflets stay in Tarjoukset. Never classify a regional PKS leaflet as local.
  const selectedName = normalize(selected.name);
  const campaignIds = active.filter(publication => {
    const label = normalize(publication.label ?? publication.title ?? "");
    const storeSpecific = selectedName.length > 0 && label.includes(selectedName);
    const explicitlyCampaign = /(?:kampanj|campaign|teema|sesonki|erikoisjulkaisu)/i.test(
      [publication.label, publication.title, publication.type, publication.category].map(v => String(v ?? "")).join(" "));
    return storeSpecific || explicitlyCampaign;
  }).map(publication => String(publication.id ?? "").trim()).filter(Boolean);
  return {
    ids, campaignIds,
    debug: {
      selectedTjekStoreId: storeId,
      selectedStoreName: String(selected.name ?? ""),
      totalPublicationCount: publications.length,
      activePublicationCount: active.length,
      publications: publications.map(publication => {
        const publicationId = String(publication.id ?? "").trim();
        const from = Date.parse(String(publication.validFrom ?? ""));
        const until = Date.parse(String(publication.validUntil ?? ""));
        return {
          id: publicationId,
          label: String(publication.label ?? ""),
          validFrom: String(publication.validFrom ?? ""),
          validUntil: String(publication.validUntil ?? ""),
          publish: String(publication.publish ?? ""),
          active: Number.isFinite(from) && Number.isFinite(until) && from <= now && now <= until,
          consideredRegional: regionalIds.has(publicationId),
        };
      }),
      chosenPublicationIds: ids,
    },
  };
}

async function fetchKSupermarketRegionalOffers(publicationId: string): Promise<UnknownRecord[]> {
  const offerIds: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(`${TJEK_PUBLICATION_VIEWER_ORIGIN}/api/paged-publications/${encodeURIComponent(publicationId)}/${page}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      if (page > 1 && (response.status === 400 || response.status === 404)) break;
      throw new Error(`K-Supermarket regional publication ${publicationId} page ${page} HTTP ${response.status}`);
    }
    const payload = await response.json() as UnknownRecord;
    const hotspots = Array.isArray(payload.hotspots) ? payload.hotspots : [];
    for (const hotspot of hotspots) {
      if (!hotspot || typeof hotspot !== "object") continue;
      const offer = (hotspot as UnknownRecord).offer;
      if (!offer || typeof offer !== "object") continue;
      const id = String((offer as UnknownRecord).id ?? "").trim();
      if (id && !offerIds.includes(id)) offerIds.push(id);
    }
  }
  const rows: UnknownRecord[] = [];
  const concurrency = 8;
  for (let offset = 0; offset < offerIds.length; offset += concurrency) {
    const batch = offerIds.slice(offset, offset + concurrency);
    const values = await Promise.all(batch.map(async publicId => {
      try {
        const value = await fetchTjekData("offer", { publicId }, "K-Supermarket");
        return value && typeof value === "object"
          ? { ...(value as UnknownRecord), publicationPublicId: publicationId }
          : null;
      } catch {
        return null;
      }
    }));
    for (const value of values) {
      if (value != null) rows.push(value as UnknownRecord);
    }
  }
  return rows;
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

function tjekTaxonomyTextV67(offer: UnknownRecord): string {
  // V67: Tjek/eTarjouslehdet does not consistently populate departmentSlug.
  // Read the taxonomy-like source fields themselves before falling back to product-name inference.
  const fields = [
    offer.departmentSlug,
    offer.department,
    offer.category,
    offer.categoryName,
    offer.categorySlug,
    offer.categoryPath,
    offer.productGroup,
    offer.productGroupName,
    offer.subCategory,
    offer.subCategoryName,
    offer.section,
    offer.aisle,
    offer.tags,
  ];
  return normalize(fields.map(value => {
    if (value == null) return "";
    if (typeof value === "object") {
      try { return JSON.stringify(value); } catch { return ""; }
    }
    return String(value);
  }).join(" "));
}

function mapTjekCategoryV54(offer: UnknownRecord): string {
  const department = tjekTaxonomyTextV67(offer);
  const productText = normalize([offer.name, offer.title, offer.description].filter(Boolean).join(" "));

  // V68: product-name rules are authoritative when the product can be identified.
  // Tjek taxonomy is only a fallback because weekly publications may contain incorrect categories.

  // V64: validated against the 34 active K-Market Hakalantori offers.
  // Specific product rules must precede broad department fallbacks.

  // V65: context guards before food-name inference. A product such as pet food
  // may contain "lohi", so pet context must win before the fish rule.
  if (/\b(koiran|kissan|dog|cat|puppy|kitten|lemmikki|lemmikin|lemmikkien|sheba)\b/.test(productText) || department.includes("pet")) return "Lemmikit";

  // V69: explicit product identities must beat unreliable Tjek publication
  // departments (observed K-Supermarket Kaukajärvi, 1 Oct 2026).
  // Match only the product title: descriptions often mention unrelated products.
  const productTitle = normalize(offer.name ?? offer.title ?? "");
  // Produce-filled harvest buckets/bags are HEVI despite Tjek's "Muut".
  // Do not classify an ordinary empty bucket as fresh produce.
  if (/\\bsadonkorjuu\\s*(?:amp[a-z]*ri\\w*|kassi\\w*)\\b/.test(productTitle)) return "Hevi";
  if (/\b(oreo|taytekeksi\w*|suklaakeksi\w*|voileipakeksi\w*)\b/.test(productTitle)) return "Makeiset & keksit";
  if (/\b(harkis\w*|harkapapumurska\w*|nyhtokaura\w*|kasviproteiinimurska\w*)\b/.test(productTitle)) return "Valmisruoka";
  if (/\b(burgeri\w*|hampurilais\w*|mikroburgeri\w*|valmisateria\w*)\b/.test(productTitle)) return "Valmisruoka";
  if (/\b(kahvi\w*|papukahvi\w*|suodatinkahvi\w*|pikakahvi\w*|espresso\w*|kahvikapseli\w*)\b/.test(productTitle)) return "Kahvi & tee";

  // V70: K-Market Martti 1 Oct 2026 cross-store category audit.
  // Identity guards before Tjek's sometimes incorrect department.
  if (/\b(piltti\w*|lastenruoka\w*|vauvanruoka\w*)\b/.test(productTitle) || (/\b(smoothie\w*)\b/.test(productTitle) && /\b(?:1\s*5\s*v|kk|kuukau\w*|vauva\w*|laps\w*)\b/.test(productTitle))) return "Lastenruoat";
  if (/\b(neulelan(?:k|g)\w*|lankakera\w*|lampokynttila\w*|tuikku\w*)\b/.test(productTitle)) return "Koti & vapaa-aika";
  if (/\b(fasupala\w*|fasupalat|suklaavohveli\w*)\b/.test(productTitle)) return "Makeiset & keksit";
  if (/\b(panini\w*|paninit|pitaleipa\w*)\b/.test(productTitle)) return "Valmisruoka";
  if (/\b(minikalapihvi\w*|kalapihvi\w*)\b/.test(productTitle)) return "Kala";

  // Ready meals / ready-to-eat products.
  if (/\b(mikroateria|valmisateria|valmisruoka|keitto|keitot|lasagne|laatikko|risotto|wrap|wrapit|cesarsalaatti|caesarsalaatti|taco-salaattisekoitus)\b/.test(productText)) return "Valmisruoka";

  // Fish.
  if (/\b(lohi|lohta|lohen|kirjolohi|kirjolohta|kirjolohen|nieria|nierian|silakka|silakat|muikku|muikut|tonnikala|katkarapu|katkaravut|seiti|turska)\b/.test(productText)) return "Kala";

  // V65: meat and cold cuts. Match common Finnish inflections and compounds
  // before an unreliable Tjek department fallback can put meat under fish.
  if (/(?:^|\s|-)(?:jauheliha\w*|siskonmakkara\w*|grillimakkara\w*|lenkkimakkara\w*|makkara\w*|nakki\w*|broileri\w*|kananpoja\w*|kanan(?:\s|$)|kalkkuna\w*|naudan\w*|nauta\w*|viljaporsaan\w*|porsaan\w*|porsas\w*|possu\w*|pekoni\w*|palvileikkele\w*|palvikinkku\w*|saunapalvikinkku\w*|uunikinkku\w*|korppukinkku\w*|kinkku\w*|leikkele\w*|karjalanpaisti-liha\w*|lihasuikale\w*|ulkofilee\w*|sisafilee\w*|fileepihvi\w*|minuuttifilee\w*)/.test(productText)) return "Liha & makkarat";

  // Dairy.
  if (/\b(jogurtti|jugurtti|maito|piima|rahka|juusto|juustoraaste|juustoraasteet|kerma|kananmuna|vanukas|vanukkaat|mousse)\b/.test(productText)) return "Maitotuotteet";

  // Drinks.
  if (/\b(mehu|mehut|limu|limsat|virvoitusjuoma|virvoitusjuomat|cola|vichy|vesi|energiajuoma|energiajuomat|smoothie|palautusjuoma|palautusjuomat|seltzer)\b/.test(productText)) return "Juomat";

  // Frozen.
  if (/\b(jaatelo|jaatelot|pakaste|pakastettu|nugget|nuggetit|ranskalaiset|wokvihannes|pakastevihannes|pakastemarja)\b/.test(productText)) return "Pakasteet";

  // Pets.
  if (/\b(kissan|koiran|kissanhiekka|lemmikki|sheba)\b/.test(productText)) return "Lemmikit";

  // Hygiene.
  if (/\b(hammastahna|hammastahnat|shampoo|deodorantti|colgate|elmex|suuvesi|suuvedet|hammasharja|hammasharjat)\b/.test(productText)) return "Hygienia & kosmetiikka";

  // Household.
  if (/\b(wc-paperi|talouspaperi|pesuaine|pesuaineet|astianpesu)\b/.test(productText)) return "Kodinhoito";

  // Home / leisure. Calluna is a plant, not grocery produce.
  if (/\b(calluna|krysanteemi|paristo|paristot)\b/.test(productText) || department.includes("garden")) return "Koti & vapaa-aika";

  // Dry groceries: plain tortillas, granola/muesli, salsa and canned fruit.
  if (/\b(vehnatortilla|vehnatortillat|granola|granolat|mysli|myslit|salsa|salsat|ananakset|ananas)\b/.test(productText)) return "Kuivatuotteet";

  // Snacks and sweets BEFORE generic tortilla/bakery handling.
  if (/\b(perunalastu|perunalastut|lastu|lastut|chips|suklaa|suklaat|karkki|karkit|makeinen|makeiset|keksi|keksit|purukumi|purukumit)\b/.test(productText)) return "Makeiset & keksit";

  // Fresh produce. Pickled cucumbers are kept in Hevi for Ziiply's grocery grouping.
  if (/\b(salaatti|salaatit|tomaatti|tomaatit|kurkku|kurkut|suolakurkku|suolakurkut|maustekurkku|maustekurkut|omena|omenat|banaani|banaanit|appelsiini|appelsiinit|satsuma|satsumat|sipuli|sipulit|porkkana|porkkanat|paprika|paprikat|kaali|hedelma|hedelmat|vihannes|vihannekset|marja|marjat|mustikka|mustikat|mango|mangot|rucola)\b/.test(productText)) return "Hevi";

  // Bakery.
  if (/\b(leipa|leivat|sampyla|sampylat|patonki|patongit|pulla|pullat|munkki|munkit|donitsi|donitsit)\b/.test(productText)) return "Leipomo";

  // Department fallback for products not identifiable by name.
  if (department.includes("snack") || department.includes("candy") || department.includes("confection") || department.includes("sweet")) return "Makeiset & keksit";
  if (department.includes("frozen")) return "Pakasteet";
  if (department.includes("fruit") || department.includes("vegetable")) return "Hevi";
  if (department.includes("beverage") || department.includes("drink")) return "Juomat";
  if (department.includes("fish") || department.includes("seafood")) return "Kala";
  if (department.includes("meat")) return "Liha & makkarat";
  if (department.includes("bakery") || department.includes("bread")) return "Leipomo";
  if (department.includes("dairy")) return "Maitotuotteet";
  if (department.includes("pet")) return "Lemmikit";
  if (department.includes("household") || department.includes("clean")) return "Kodinhoito";
  if (department.includes("personal care") || department.includes("beauty") || department.includes("hygiene")) return "Hygienia & kosmetiikka";
  if (department.includes("colonial")) return "Kuivatuotteet";

  // V68: source taxonomy fallback only after the general product-name rules above.
  if (/\b(lemmik|pet|dog|cat)\w*/.test(department)) return "Lemmikit";
  if (/\b(valmisruo|ready meal|ready food|ateria|deli)\w*/.test(department)) return "Valmisruoka";
  if (/\b(kala|fish|seafood)\w*/.test(department)) return "Kala";
  if (/\b(liha|makkara|meat|cold cut|charcuterie)\w*/.test(department)) return "Liha & makkarat";
  if (/\b(maito|maitotuot|dairy|cheese|yogurt)\w*/.test(department)) return "Maitotuotteet";
  if (/\b(juoma|beverage|drink|soft drink)\w*/.test(department)) return "Juomat";
  if (/\b(pakaste|frozen)\w*/.test(department)) return "Pakasteet";
  if (/\b(hygienia|kosmetiikka|personal care|beauty|hygiene)\w*/.test(department)) return "Hygienia & kosmetiikka";
  if (/\b(kodinhoito|household|cleaning|clean)\w*/.test(department)) return "Kodinhoito";
  if (/\b(koti|vapaa aika|home|leisure|garden)\w*/.test(department)) return "Koti & vapaa-aika";
  if (/\b(kuivatuot|kuiva aine|colonial|pantry|grocery)\w*/.test(department)) return "Kuivatuotteet";
  if (/\b(makei|keksi|snack|candy|confection|sweet|biscuit)\w*/.test(department)) return "Makeiset & keksit";
  if (/\b(hedel|vihanne|hevi|fruit|vegetable|produce)\w*/.test(department)) return "Hevi";
  if (/\b(leip|leipomo|bakery|bread)\w*/.test(department)) return "Leipomo";

  return "Muut";
}

// A local leaflet can mix short weekly offers with longer monthly benefits.
// Classify by the item's own validity, never by its publication ID alone.
function localBenefitType(offer: UnknownRecord): "offer" | "campaign" {
  const from = Date.parse(String(offer.validFrom ?? ""));
  const until = Date.parse(String(offer.validUntil ?? ""));
  if (Number.isFinite(from) && Number.isFinite(until) && until >= from) {
    return until - from > 7 * 24 * 60 * 60 * 1000 ? "campaign" : "offer";
  }
  // Unknown validity must not be presented as a confirmed monthly campaign.
  return "offer";
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
  const pieceCountFrom = num(offer.pieceCountFrom);
  const pieceCountTo = num(offer.pieceCountTo);
  const offerQuantity = pieceCountFrom != null && pieceCountFrom > 1 && pieceCountTo === pieceCountFrom
    ? pieceCountFrom
    : null;
  const effectivePriceText = offerQuantity == null
    ? priceText(effective)
    : `${priceText(effective)} € / ${offerQuantity} kpl`;
  const category = mapTjekCategoryV54(offer);
  // Only explicit source campaign metadata may move an item to Gösta's
  // campaign tab. Plussa/app prices and multi-buy alone are still offers.
  const campaignMarker = [
    offer.campaignType, offer.offerType, offer.promotionType,
    offer.campaignLabel, offer.publicationLabel,
  ].map(value => String(value ?? "").trim().toLowerCase());
  const isCampaign = offer.isCampaign === true ||
    campaignMarker.some(value => /(?:^|[\s:_-])(campaign|kampanja|teema|sesonki|erikoisjulkaisu)(?:$|[\s:_-])/.test(value));
  return {
    id: `etarjouslehdet-v59-${displayStoreId}-${offerId}-${index}`,
    title, name: title, productName: title,
    price: effective, priceText: effectivePriceText, offerPrice: effectivePriceText,
    previousPrice: regular != null && regular !== effective ? regular : null,
    unitPrice, unitPriceText: unitPrice, unitPriceUnit: unit || null,
    imageUrl: image, image, pictureUrl: image,
    storeId: displayStoreId, storeName: displayStoreName, storeLabel: displayStoreName,
    chain: "K", source: "etarjouslehdet", provider: "kruoka", offerId,
    campaignType: isCampaign ? "campaign" : "offer",
    additionalInfo: offer.description ?? null,
    benefitText: isPlussa ? "Plussa-tarjous" : app != null ? "Mobiilitarjous" : undefined,
    validityText: validityText(offer.validUntil),
    category, categoryPath: category, productGroup: category, mainCategory: category, subCategory: category,
    validFrom: offer.validFrom ?? null, validUntil: offer.validUntil ?? null, isPlussaOffer: isPlussa,
    url: `${ETARJOUSLEHDET_ORIGIN}/${slug}`, productUrl: `${ETARJOUSLEHDET_ORIGIN}/${slug}`,
    debug: { providerVersion: "V66_KSUPERMARKET_MULTIBUY", publicationId, tjekStoreId: displayStoreId, chain, offerQuantity },
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
    rawOffers: [], rawOfferAnalysis: [], publicationStoreDebug: [],
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

    const regionalOffers: UnknownRecord[] = [];
    const publicationFetch: NonNullable<typeof debug.publicationFetch> = [];
    debug.publicationFetch = publicationFetch;
    const resolvedPublications = await resolveKLocalPublicationIds(selected, business.businessId, business.slug);
    debug.kSupermarketPublicationResolverDebug = resolvedPublications.debug;
    const campaignPublicationIds = new Set(resolvedPublications.campaignIds);
    // Both K-Market and K-Supermarket can have selected-store publications whose
    // label contains no campaign keyword. Fetch every store-scoped active publication;
    // retain the source's campaign classification rather than inventing one.
    for (const publicationId of resolvedPublications.ids) {
      // Store-specific leaflets have no viewer hotspots, although the Tjek
      // offer index exposes their products when filtered by publicationIds.
      // Fetch campaigns from that index directly; retain the established
      // viewer route for regional/chain-wide leaflets.
      const rows = campaignPublicationIds.has(publicationId)
        ? dataArray(await fetchTjekData("offers", {
            publicationIds: [publicationId],
            sources: ["publication", "business_product"],
            pagination: { limit: 1000, offset: 0 },
            sort: ["score_desc"],
          }, business.slug)).filter(row => String(row.publicationPublicId ?? "") === publicationId)
        : await fetchKSupermarketRegionalOffers(publicationId);
      publicationFetch.push({ publicationId, fetchedRows: rows.length, uniqueOfferIds: new Set(rows.map(row => String(row.publicId ?? "")).filter(Boolean)).size, addedAfterBaseDedupe: 0, skippedAsDuplicate: 0 });
      regionalOffers.push(...rows.map(row => ({ ...row, publicationPublicId: publicationId,
        campaignType: campaignPublicationIds.has(publicationId) ? localBenefitType(row) : row.campaignType })));
    }

    const offersValue = await fetchTjekData("offers", {
      businessIds: [business.businessId],
      sources: ["publication", "business_product"],
      pagination: { limit: 1000, offset: 0 },
      sort: ["score_desc"],
    }, business.slug);

    debug.campaignProbe = { activePublicationIds: resolvedPublications.ids, campaignPublicationIds: resolvedPublications.campaignIds, fetchedCampaignRows: regionalOffers.filter(row => row.campaignType === "campaign").length, mappedCampaignRows: 0, returnedCampaignRows: 0 };
    const baseOffers = dataArray(offersValue);
    const offers: UnknownRecord[] = baseOffers.map(offer => ({ ...offer,
      campaignType: campaignPublicationIds.has(String(offer.publicationPublicId ?? "")) ? localBenefitType(offer) : offer.campaignType,
    }));
    const knownOfferIds = new Set(offers.map(o => `${String(o.publicId ?? "")}|${String(o.campaignType ?? "offer")}`).filter(Boolean));
    for (const offer of regionalOffers) {
      const id = String(offer.publicId ?? "");
      const key = `${id}|${String(offer.campaignType ?? "offer")}`;
      const fetchEntry = publicationFetch.find(entry => entry.publicationId === String(offer.publicationPublicId ?? ""));
      if (!id || knownOfferIds.has(key)) {
        if (fetchEntry) fetchEntry.skippedAsDuplicate++;
        continue;
      }
      if (fetchEntry) fetchEntry.addedAfterBaseDedupe++;
      knownOfferIds.add(key);
      offers.push(offer);
    }
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

    // A campaign publication must still belong to the selected store: fronts was scoped
    // by localBusinessIds above. Preserve its rows even if Tjek stores(publicationId)
    // omits the local store (a known issue for shared K-chain publications).
    for (const id of campaignPublicationIds) allowed.add(id);
    // The same scoped fronts response also establishes selected-store eligibility
    // for other active publications. Do not discard their offers solely because the
    // separate publication->stores lookup is incomplete.
    for (const id of resolvedPublications.ids) allowed.add(id);
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
        sourceTaxonomy: tjekTaxonomyTextV67(offer),
        mappedCategory: mapTjekCategoryV54(offer),
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
    const publicationPipeline = new Map<string, { publicationId: string; raw: number; allowed: number; mapped: number; queryMatched: number; duplicate: number; returned: number }>();
    for (const offer of offers) {
      const publicationId = String(offer.publicationPublicId ?? "");
      const entry = publicationPipeline.get(publicationId) ?? { publicationId, raw: 0, allowed: 0, mapped: 0, queryMatched: 0, duplicate: 0, returned: 0 };
      entry.raw++;
      publicationPipeline.set(publicationId, entry);
    }

    for (const [index, offer] of offers.entries()) {
      const publicationId = String(offer.publicationPublicId ?? "");
      const entry = publicationPipeline.get(publicationId)!;
      if (!allowed.has(publicationId)) continue;
      entry.allowed++;
      const mapped = mapTjekOffer(
        offer, index, ziiplyStoreId || tjekStoreId, displayStoreName, business.chain, business.slug
      );
      if (!mapped) continue;
      entry.mapped++;
      if (!matchesQuery(mapped, query)) continue;
      entry.queryMatched++;
      const key = `${String((mapped as unknown as UnknownRecord).campaignType ?? "offer")}|${String((mapped as unknown as UnknownRecord).offerId ?? mapped.id)}`;
      if (seen.has(key)) { entry.duplicate++; continue; }
      seen.add(key);
      entry.returned++;
      results.push(mapped);
    }
    debug.publicationPipeline = Array.from(publicationPipeline.values());
    debug.kTabClassificationAuditV1 = results.map(result => ({ publicationId: String((result as any).debug?.publicationId ?? ""), offerId: String((result as any).offerId ?? ""), title: result.title, campaignType: (result as any).campaignType ?? "offer", validFrom: (result as any).validFrom ?? null, validUntil: (result as any).validUntil ?? null }));

    if (debug.campaignProbe) {
      debug.campaignProbe.mappedCampaignRows = offers.filter(offer => offer.campaignType === "campaign").length;
      debug.campaignProbe.returnedCampaignRows = results.filter(result => (result as unknown as UnknownRecord).campaignType === "campaign").length;
    }
    debug.activeOffers = results.length;
    lastKruokaPipelineDebugV49 = { ...debug };
    return results;
  } catch (error) {
    debug.error = error instanceof Error ? error.message : String(error);
    lastKruokaPipelineDebugV49 = { ...debug };
    console.error("[Ziiply K provider V65] eTarjouslehdet/Tjek haku epäonnistui", {
      selectedStoreName: displayStoreName,
      error: debug.error,
    });
    return [];
  }
}

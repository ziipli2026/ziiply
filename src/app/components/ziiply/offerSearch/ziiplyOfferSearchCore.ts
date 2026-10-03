// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V178_KCITYMARKET_BRANCH
// Revision: V178-KCITYMARKET-BRANCH
// Date: 2026-09-21
//
// Muutos V177:een:
// - K-Citymarket valitaan omalle /api/offers/search -provider-haaralle store-nimen perusteella.
// - Lisää provider=kcitymarket API-parametrin vain K-Citymarket-kontekstissa.
// - K-Market ja K-Supermarket jatkavat nykyisellä kruokaProvider-haaralla.
// - Korjaa samalla V177:n puuttuneen 'koti vapaa-aika' trusted-category aliasin.
//
// Muutos V176:een:
// - Korjattu trusted category -alias: 'Koti & vapaa-aika' säilyy eikä putoa Muut-luokkaan.
// - Luottaa kruokaProviderin jo normalisoimaan category-arvoon.
// - S-Market/eTarjouslehdet-haaran tunnistus ja mapitus jätetty ennalleen.
// - Ei muutoksia provider-hakuun, store-resolveriin, master-hakuun tai cacheen.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V174_KRUOKA_DEBUG_CAPTURE
// Revision: V174-KRUOKA-DEBUG-CAPTURE
// Date: 2026-09-20
//
// Muutos V173:een:
// - Lukee /api/offers/search-vastauksen erillisen kruokaDebug-kentän.
// - Tarjoaa debugtilan page.tsx:lle getterillä.
// - Ei muuta tarjouslistaa, kategorioita, provider-valintaa tai master-hakua.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V173_CATEGORY_GATE_REGRESSION_FIX
// Revision: V173
// Date: 2026-09-20
//
// V173:
// - Korjaa V172:ssa takaisin lipsahtaneen page.tsx compatibility-gaten.
// - isZiiplyGostaCategorySelectionV147() käyttää nyt samaa nykyisten
//   kategorioiden tunnistusta kuin master-listan paikallinen suodatus:
//   isCurrentGostaCategorySelectionV167().
// - Korjaa tilanteen, jossa kategoriassa näkyy count > 0 mutta klikkaus
//   avaa tyhjän näkymän uusilla kategorianimillä.
// - Ei muutoksia CategoryCoreen, Cardiin, page.tsx:ään, provideriin,
//   store-resolveriin tai kategorioiden luokitteluun.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V172_LOCAL_MASTER_CATEGORY_FILTER_FIX
// Revision: V172
// Date: 2026-09-19
//
// V172:
// - Pohja: V167.
// - Korjaa V533/page.tsx:n master-listasta paikallisesti avattavien kategorioiden
//   suodatuksen filterZiiplyGostaOfferResultsV146()-funktiossa.
// - Nykyiset GOSTA_CATEGORY_LABELS_V136 -kategoriat tunnistetaan samalla
//   current-label-aware gatella kuin V167:n search core.
// - Ei V169/V170/V171 kokeilumuutoksia.
// - Ei muutoksia page.tsx:ään, Cardiin, CategoryCoreen, provideriin,
//   store-ID:ihin tai kategorioiden luokitteluun.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V167_CURRENT_CATEGORY_SELECTION_FIX
// Revision: V167
// Date: 2026-09-19
//
// Fix:
// - Category click recognition now accepts the CURRENT category labels exported
//   by ziiplyOfferCategoryCore, not only the old isKnownOfferCategoryFilter list.
// - Fixes empty category views for:
//   Liha & makkarat
//   Vitamiinit & ravinteet
//   Hygienia & kosmetiikka
//   Koti & vapaa-aika
// - Keeps legacy category aliases working.
// - Does not change provider fetching, store context, master dataset or caching.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V166_TRUST_ETARJOUS_CATEGORY
// Revision: V162
// Date: 2026-07-04
//
// Muutokset:
// - Palauttaa Göstan master-tarjousdatan välimuistin käyttöön.
// - Kun tuoteryhmät on kerran haettu samalla kauppakontekstilla, takaisin
//   tuoteryhmiin palaaminen käyttää samaa master-datasettiä eikä lataa sitä
//   uudelleen joka kerta.
// - Välimuisti on kontekstikohtainen: eri kauppa/alue saa oman cache-avaimen.
// - Ei muutoksia kuviin, skanneriin, äänihakuun eikä kauppavalintaan.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_SEARCH_CORE_V160_CATEGORY_FROM_MASTER_RESTORED
// Revision: V160
// Date: 2026-06-07
//
// Purpose:
// - Keeps V146 Gösta offer search orchestration.
// - V156: Kaikki/category searches use one master offer dataset and local category filtering.
// - V152: store/area context is included in request URLs so old Varkaus/Mikkeli results cannot be reused silently.
// - V153: category seed searches use the food-basket scoped S-kanava map from ziiplyOfferCategoryCore.
// - V153: keeps cache-busting/store context params ready for S-kanava Kampanjat/offer route support.
// - V154: explicitly types optional context in searchZiiplyGostaOffersV146 options so page.tsx can pass active area/store context without TypeScript build failure.
// - V155: fixes missing comment prefix in header that broke webpack parsing.
// - Keeps V147 compatibility exports required by page.tsx:
//   - GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147
//   - isZiiplyGostaCategorySelectionV147
//   - mapZiiplyGostaOfferToCardOfferV147
//
// Install path:
// src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore.ts
// ============================================================================

// src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore.ts
// V146_GOSTA_SEARCH_CORE_ORCHESTRATOR
// Göstan tarjoushaun orkestrointi pois page.tsx:stä.
// Vastuut:
// - Kaikki / tuoteryhmä / vapaa tekstihaku
// - tuoteryhmäkohtaisten siemenhakujen ajo
// - API-vastausten parsiminen
// - dedupe
// - roskasuodatus
// - näkyvien tulosten suodatus

import {
  GOSTA_CATEGORY_LABELS_V136,
  getGostaCategoryLabelFromFilterV136,
  getOfferCategoryV106,
  getOfferProductTitleV113,
  isBadOfferSearchResultV106,
  isGostaCategorySelectionV136,
  isKnownOfferCategoryFilterV113,
  type ZiiplyGostaOfferLike,
} from "./ziiplyOfferCategoryCore";

export type ZiiplyGostaOfferSearchContextV152 = {
  areaLabel?: string;
  storeMode?: string;
  storeCompareScope?: string;
  withinChain?: string | null;
  sStoreId?: string | number;
  sStoreName?: string;
  sStoreIds?: Array<string | number | null | undefined>;
  sStoreNames?: Array<string | null | undefined>;
  kStoreId?: string | number;
  kStoreName?: string;
  kStoreIds?: Array<string | number | null | undefined>;
  kStoreNames?: Array<string | null | undefined>;
  eurosparStoreId?: string | number;
  eurosparStoreName?: string;
  eurosparStoreChain?: string;
  lidlStoreKey?: string;
  lidlStoreName?: string;
  tokmanniStoreId?: string | number;
  tokmanniStoreName?: string;
};

export type ZiiplyGostaOfferSearchCoreResult = {
  results: ZiiplyGostaOfferLike[];
  querySnapshot: string;
  cardFilter: string;
  showingAllAreaOffers: boolean;
  trackingKey: string;
  searchAllAreaOffers: boolean;
  searchByCategory: boolean;
  categoryLabel: string;
};

function normalizeGostaCoreText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCurrentGostaCategorySelectionV167(value: string) {
  const normalized = normalizeGostaCoreText(value).trim();
  if (!normalized) return false;

  // Current visible labels are the primary source of truth.
  if (
    GOSTA_CATEGORY_LABELS_V136.some(
      (label) => normalizeGostaCoreText(label) === normalized,
    )
  ) {
    return true;
  }

  // Preserve old aliases/legacy category names.
  return isGostaCategorySelectionV136(value) || isKnownOfferCategoryFilterV113(normalized);
}

const TRUSTED_GOSTA_CATEGORY_LABELS_V166 = new Map<string, string>([
  ["kahvi", "Kahvi"],
  ["maitotuotteet", "Maitotuotteet"],
  ["liha", "Liha"],
  ["kala", "Kala"],
  ["leipomo", "Leipomo"],
  ["hevi", "Hevi"],
  ["juomat", "Juomat"],
  ["pakasteet", "Pakasteet"],
  ["valmisruoka", "Valmisruoka"],
  ["kuivatuotteet", "Kuivatuotteet"],
  ["makeiset keksit", "Makeiset & keksit"],
  ["makeiset ja keksit", "Makeiset & keksit"],
  ["makeisetkeksit", "Makeiset & keksit"],
  ["lemmikit", "Lemmikit"],
  ["koti", "Koti"],
  ["muut", "Muut"],
]);

function getTrustedETarjousCategoryV166(item: ZiiplyGostaOfferLike) {
  const anyItem = item as any;
  const sourceUrl = normalizeGostaCoreText(anyItem?.sourceUrl || "");
  const store = normalizeGostaCoreText(
    [anyItem?.storeLabel, anyItem?.storeName, anyItem?.shopName]
      .filter(Boolean)
      .join(" "),
  );

  // S-Market: pidä V174:n toimiva haara ennallaan.
  // eTarjouslehdet-provider käyttää source-id:tä "skaupat" build-yhteensopivuuden takia,
  // joten luotettava tunniste on URL tai S-market-kauppanimi, ei pelkkä source.
  const isETarjousSMarket =
    sourceUrl.includes("etarjouslehdet") ||
    store.includes("s market") ||
    store.includes("s-market");

  const rawCategory = String(anyItem?.category || "").trim();
  const normalized = normalizeGostaCoreText(rawCategory)
    .replace(/\bja\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (isETarjousSMarket) {
    return TRUSTED_GOSTA_CATEGORY_LABELS_V166.get(normalized) || "";
  }

  // V176: K-Supermarket + K-Market / Tjek.
  // kruokaProvider V54 on jo normalisoinut category-kentän Ziiplyn
  // kategorianimeksi. Älä aja sitä enää vanhan CategoryCore-regexin läpi.
  const source = normalizeGostaCoreText(anyItem?.source || "");
  const provider = normalizeGostaCoreText(anyItem?.provider || "");
  const isKStoreTjek =
    (
      store.includes("k supermarket") ||
      store.includes("k-supermarket") ||
      store.includes("k market") ||
      store.includes("k-market")
    ) &&
    (source === "etarjouslehdet" || provider === "kruoka");

  if (!isKStoreTjek) return "";

  const kTrustedCategories = new Map<string, string>([
    ["kahvi", "Kahvi"],
    ["kahvi tee", "Kahvi & tee"],
    ["maitotuotteet", "Maitotuotteet"],
    ["liha", "Liha & makkarat"],
    ["liha makkarat", "Liha & makkarat"],
    ["kala", "Kala"],
    ["leipomo", "Leipomo"],
    ["hevi", "Hevi"],
    ["juomat", "Juomat"],
    ["pakasteet", "Pakasteet"],
    ["valmisruoka", "Valmisruoka"],
    ["kuivatuotteet", "Kuivatuotteet"],
    ["makeiset keksit", "Makeiset & keksit"],
    ["makeiset ja keksit", "Makeiset & keksit"],
    ["makeisetkeksit", "Makeiset & keksit"],
    ["lemmikit", "Lemmikit"],
    ["hygienia kosmetiikka", "Hygienia & kosmetiikka"],
    ["kodinhoito", "Kodinhoito"],
    ["koti", "Koti & vapaa-aika"],
    ["koti & vapaa aika", "Koti & vapaa-aika"],
    ["koti vapaa-aika", "Koti & vapaa-aika"],
    ["koti vapaa-aika", "Koti & vapaa-aika"],
    ["muut", "Muut"],
  ]);

  return kTrustedCategories.get(normalized) || "";
}

function getResolvedGostaCategoryV166(item: ZiiplyGostaOfferLike) {
  const anyItem = item as any;
  // V181: K-Citymarket must be resolved before the generic trusted-category
  // branch. Otherwise a stale top-level category such as "Muut" wins before
  // the authoritative nested provider category can be read.
  const sourceItem = (anyItem?.__sourceOfferSearchResult || anyItem) as any;
  const storeType = normalizeGostaCoreText(sourceItem?.storeType || anyItem?.storeType || "");
  const source = normalizeGostaCoreText(sourceItem?.source || anyItem?.source || "");
  // Prisma CMS supplies its own hierarchy, unlike DISCOUNTED search results.
  // Resolve its top-level department to the same category buttons as Gösta.
  if (sourceItem?.campaignType === "campaign" && /^prisma/i.test(String(sourceItem?.storeLabel || ""))) {
    const department = normalizeGostaCoreText(sourceItem?.category || "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
    const mapped: Record<string, string> = {
      "hedelmat ja vihannekset": "Hevi", "liha ja kasviproteiinit": "Liha & makkarat",
      "kala ja merenelavat": "Kala", "leivat ja leivonnaiset": "Leipomo",
      "maito munat ja rasvat": "Maitotuotteet", "juustot tofut ja kasvipohjaiset": "Maitotuotteet",
      "kahvit teet ja mehut": "Juomat", "karkit suklaat ja keksit": "Makeiset & keksit",
      "pakasteet": "Pakasteet", "lemmikit": "Lemmikit",
      "kosmetiikka ja hygienia": "Hygienia & kosmetiikka",
      "kodinhoito ja taloustarvikkeet": "Kodinhoito",
      "lapset": "Lastenruoat", "urheiluravinteet terveys ja itsehoito": "Vitamiinit & ravinteet",
      "kuivatuotteet ja leivonta": "Kuivatuotteet", "pastat riisit ja nuudelit": "Kuivatuotteet",
      "oljyt maustaminen ja kastikkeet": "Kuivatuotteet",
      "keittio ja kattaus": "Koti & vapaa-aika", "kukat ja koti": "Koti & vapaa-aika",
      "vapaa aika": "Koti & vapaa-aika", "ruokatori": "Valmisruoka"
    };
    return mapped[department] || getOfferCategoryV106(item);
  }
  const isKCitymarket = storeType === "k citymarket" || storeType === "k-citymarket" || source.includes("k citymarket tarjouslehti");
  // V182: EUROSPAR provider already emits Ziiply's authoritative category.
  // Preserve it instead of reclassifying leaflet titles with generic regexes.
  const isEurospar =
    storeType === "eurospar" ||
    source.includes("eurospar tarjouslehti") ||
    normalizeGostaCoreText(sourceItem?.chain || anyItem?.chain || "") === "eurospar";
  if (isEurospar) {
    // Provider output is already in Ziiply's canonical taxonomy. Do not run it
    // through title-based classification or text normalization that may alter
    // punctuation such as "&".
    const providerCategory = String(sourceItem?.category || "").trim();
    if (providerCategory) return providerCategory;
  }

  // V184: Lidl provider also emits Ziiply's canonical category. Preserve the
  // provider category; generic title classification can otherwise turn e.g.
  // Siskonmakkara / Pulled pork from "Liha & makkarat" into "Muut".
  const isLidl =
    source === "lidl plus" ||
    source === "lidl-plus" ||
    normalizeGostaCoreText(sourceItem?.chain || anyItem?.chain || "") === "lidl";
  if (isLidl) {
    const providerCategory = String(sourceItem?.category || "").trim();
    if (providerCategory) return providerCategory;
  }

  if (isKCitymarket) {
    const raw = normalizeGostaCoreText(sourceItem?.category || anyItem?.category || "").split(" ").filter((part) => part !== "ja").join(" ");
    const trusted = new Map<string, string>([
      ["kahvi tee", "Kahvi & tee"], ["maitotuotteet", "Maitotuotteet"], ["liha makkarat", "Liha & makkarat"],
      ["kala", "Kala"], ["leipomo", "Leipomo"], ["hevi", "Hevi"], ["juomat", "Juomat"], ["pakasteet", "Pakasteet"],
      ["valmisruoka", "Valmisruoka"], ["kuivatuotteet", "Kuivatuotteet"], ["makeiset keksit", "Makeiset & keksit"],
      ["lemmikit", "Lemmikit"], ["hygienia kosmetiikka", "Hygienia & kosmetiikka"], ["kodinhoito", "Kodinhoito"],
      ["koti vapaa-aika", "Koti & vapaa-aika"], ["muut", "Muut"],
    ]).get(raw);
    if (trusted) return trusted;
  }

  const trustedExistingProviderCategory = getTrustedETarjousCategoryV166(item);
  if (trustedExistingProviderCategory) return trustedExistingProviderCategory;
  return getOfferCategoryV106(item);
}

function normalizeGostaContextListV164(values: unknown, fallback?: unknown): string[] {
  const rawValues = Array.isArray(values) ? values : [];
  const normalizedFallback = String(fallback ?? "")
    .replaceAll("\r", "")
    .replaceAll("\n", "||")
    .replaceAll(";", "||");

  const splitFallback = normalizedFallback
    .split("||")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const combined = [
    ...rawValues.map((value) => String(value ?? "").trim()).filter(Boolean),
    ...splitFallback,
  ];

  return Array.from(new Set(combined));
}

async function parseOfferSearchResponse(response: Response) {
  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    throw new Error(String(data?.error || `Tarjoushaku epäonnistui: ${response.status}`));
  }
  return Array.isArray(data?.results) ? (data.results as ZiiplyGostaOfferLike[]) : [];
}

function buildOfferSearchContextKeyV152(context?: ZiiplyGostaOfferSearchContextV152) {
  if (!context) return "";

  return [
    context.areaLabel,
    context.storeMode,
    context.storeCompareScope,
    context.withinChain,
    ...normalizeGostaContextListV164(context.sStoreIds, context.sStoreId),
    ...normalizeGostaContextListV164(context.sStoreNames, context.sStoreName),
    ...normalizeGostaContextListV164(context.kStoreIds, context.kStoreId),
    ...normalizeGostaContextListV164(context.kStoreNames, context.kStoreName),
    context.eurosparStoreId,
    context.eurosparStoreName,
    context.eurosparStoreChain,
    context.lidlStoreKey,
    context.lidlStoreName,
    context.tokmanniStoreId,
    context.tokmanniStoreName,
  ]
    .map((value) => normalizeGostaCoreText(value))
    .filter(Boolean)
    .join("|");
}

const ZIIPLY_GOSTA_MASTER_QUERY_V156 = "__ziiply_all_offers__";
const ZIIPLY_GOSTA_MASTER_CACHE_TTL_MS_V156 = 5 * 60 * 1000;
const ziiplyGostaMasterCacheV156 = new Map<string, { expiresAt: number; promise: Promise<ZiiplyGostaOfferLike[]> }>();

export type ZiiplyKruokaDebugV174 = {
  deploy?: {
    gitCommitSha?: string | null;
    gitCommitRef?: string | null;
    vercelEnv?: string | null;
    deploymentId?: string | null;
  };
  selectedStoreName?: string;
  selectedStoreId?: string;
  brochureUrl?: string;
  brochureHttp?: number | null;
  applicationState?: string;
  kStoreId?: string | null;
  brochureOffers?: number | null;
  eans?: number | null;
  productMapHttp?: number | null;
  productMapProducts?: number | null;
  activeOffers?: number | null;
  error?: string | null;
};

let lastZiiplyKruokaDebugV174: ZiiplyKruokaDebugV174 | null = null;
const ziiplyKruokaDebugByContextV183 = new Map<string, ZiiplyKruokaDebugV174 | null>();

export function getLastZiiplyKruokaDebugV174(
  context?: ZiiplyGostaOfferSearchContextV152,
): ZiiplyKruokaDebugV174 | null {
  const contextKey = buildOfferSearchContextKeyV152(context);
  const debug = contextKey && ziiplyKruokaDebugByContextV183.has(contextKey)
    ? ziiplyKruokaDebugByContextV183.get(contextKey) ?? null
    : lastZiiplyKruokaDebugV174;
  return debug ? { ...debug } : null;
}

function isKCitymarketContextV179(context?: ZiiplyGostaOfferSearchContextV152) {
  // V179: Citymarket-provider may only activate when the request actually
  // contains a selected K-store. A stale K-store name must never route an
  // S/Prisma-only Gösta request into the K-Citymarket provider.
  const ids = normalizeGostaContextListV164(context?.kStoreIds, context?.kStoreId);
  const names = normalizeGostaContextListV164(context?.kStoreNames, context?.kStoreName)
    .map((value) => normalizeGostaCoreText(value));

  if (ids.length === 0 || names.length === 0) return false;

  return names.some(
    (name) =>
      name.includes("k citymarket") ||
      name.includes("k-citymarket") ||
      name.includes("citymarket"),
  );
}

async function fetchOfferSearchResults(query: string, context?: ZiiplyGostaOfferSearchContextV152) {
  const params = new URLSearchParams();
  params.set("q", query);

  // V152: nämä parametrit toimivat vähintään cache-avaimena selaimelle/Vercelille.
  // Jos route tukee niitä myöhemmin, sama koodi rajaa tarjoukset myös oikeaan aktiiviseen alueeseen/kauppaan.
  const contextKey = buildOfferSearchContextKeyV152(context);
  if (contextKey) params.set("ctx", contextKey);
  if (context?.areaLabel) params.set("area", String(context.areaLabel));
  if (context?.storeMode) params.set("storeMode", String(context.storeMode));
  if (context?.storeCompareScope) params.set("scope", String(context.storeCompareScope));
  if (context?.withinChain) params.set("withinChain", String(context.withinChain));

  // V178: Citymarket has its own provider. The API route must dispatch
  // provider=kcitymarket to providers/kCitymarketProvider.ts.
  if (isKCitymarketContextV179(context)) {
    params.set("provider", "kcitymarket");
  }

  const sStoreIdsV162 = normalizeGostaContextListV164(context?.sStoreIds, context?.sStoreId);
  const sStoreNamesV162 = normalizeGostaContextListV164(context?.sStoreNames, context?.sStoreName);
  const kStoreIdsV162 = normalizeGostaContextListV164(context?.kStoreIds, context?.kStoreId);
  const kStoreNamesV162 = normalizeGostaContextListV164(context?.kStoreNames, context?.kStoreName);
  const eurosparChain = normalizeGostaCoreText(context?.eurosparStoreChain);
  const isEurosparSelection = eurosparChain === "eurospar" && Boolean(context?.eurosparStoreName);

  // EUROSPAR is an isolated provider branch. Ordinary Tokmanni selections must
  // not receive the EUROSPAR Ruokasanomat leaflet.
  if (isEurosparSelection) {
    params.set("provider", "eurospar");
    params.set("eurosparStoreName", String(context?.eurosparStoreName || ""));
  }

  const isLidlSelection = Boolean(context?.lidlStoreKey);
  if (isLidlSelection) {
    params.set("provider", "lidl");
    params.set("lidlStoreKey", String(context?.lidlStoreKey || ""));
    params.set("lidlStoreName", String(context?.lidlStoreName || "Lidl"));
  }

  const isTokmanniSelection = Boolean(context?.tokmanniStoreId || context?.tokmanniStoreName);
  if (isTokmanniSelection) {
    params.set("provider", "tokmanni");
    params.set("tokmanniStoreName", String(context?.tokmanniStoreName || "Tokmanni"));
  }

  if (sStoreIdsV162.length > 0) params.set("sStoreId", sStoreIdsV162.join("||"));
  if (sStoreNamesV162.length > 0) params.set("sStoreName", sStoreNamesV162.join("||"));
  if (kStoreIdsV162.length > 0) params.set("kStoreId", kStoreIdsV162.join("||"));
  if (kStoreNamesV162.length > 0) params.set("kStoreName", kStoreNamesV162.join("||"));
  params.set("_", `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const response = await fetch(`/api/offers/search?${params.toString()}`, {
    cache: "no-store",
  });

  const clonedForDebugV174 = response.clone();
  try {
    const payloadV174 = await clonedForDebugV174.json();
    const deployV184 =
      payloadV174 && typeof payloadV174 === "object" && payloadV174.deploy
        ? { ...payloadV174.deploy }
        : undefined;
    lastZiiplyKruokaDebugV174 =
      payloadV174 && typeof payloadV174 === "object"
        ? {
            ...(payloadV174.kruokaDebug ? { ...payloadV174.kruokaDebug } : {}),
            ...(deployV184 ? { deploy: deployV184 } : {}),
            ...(payloadV174.sEvidenceRouteV228 ? { sEvidenceRouteV228: payloadV174.sEvidenceRouteV228 } : {}),
          }
        : null;
    if (contextKey) {
      ziiplyKruokaDebugByContextV183.set(contextKey, lastZiiplyKruokaDebugV174);
    }
  } catch {
    lastZiiplyKruokaDebugV174 = null;
    if (contextKey) {
      ziiplyKruokaDebugByContextV183.set(contextKey, null);
    }
  }

  return parseOfferSearchResponse(response);
}

async function fetchGostaMasterOfferResultsV156(context?: ZiiplyGostaOfferSearchContextV152) {
  const contextKey = buildOfferSearchContextKeyV152(context) || "global";
  const now = Date.now();
  const cached = ziiplyGostaMasterCacheV156.get(contextKey);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetchOfferSearchResults(ZIIPLY_GOSTA_MASTER_QUERY_V156, context)
    .then((results) => cleanZiiplyGostaOfferResultsV146(results))
    .catch((error) => {
      ziiplyGostaMasterCacheV156.delete(contextKey);
      throw error;
    });

  ziiplyGostaMasterCacheV156.set(contextKey, {
    expiresAt: now + ZIIPLY_GOSTA_MASTER_CACHE_TTL_MS_V156,
    promise,
  });

  return promise;
}

export async function warmZiiplyGostaOfferCacheV182(
  context?: ZiiplyGostaOfferSearchContextV152,
) {
  // Selection warmup deliberately reuses the exact same master-cache function
  // as the visible Gösta search. This means a later search gets the same
  // promise/data instead of starting a second provider request.
  // Warm both tabs from the same in-flight master request. The Prisma CMS
  // campaign provider runs alongside discounted offers in that master request;
  // do not issue a second network request when preparing the campaign tab.
  const masterResults = await fetchGostaMasterOfferResultsV156(context);
  const campaigns = masterResults.filter((item) => (item as any)?.campaignType === "campaign");
  const offers = masterResults.filter((item) => (item as any)?.campaignType !== "campaign");
  return { offers, campaigns };
}


function getCompactGostaTitleKeyV149(value: unknown) {
  const normalized = normalizeGostaCoreText(value)
    .replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g, " ")
    .replace(/\b\d+\s*x\s*\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 1);

  return words.slice(0, 4).join(" ");
}


function getUltraCompactGostaTitleKeyV150(value: unknown) {
  const stopWords = new Set([
    "snellmanin",
    "snellman",
    "hk",
    "atria",
    "saarioinen",
    "kotimaista",
    "rainbow",
    "xtra",
    "pirkka",
    "coop",
    "s",
    "k",
  ]);

  const normalized = normalizeGostaCoreText(value)
    .replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g, " ")
    .replace(/\b\d+\s*x\s*\d+\b/g, " ")
    .replace(/\b(grilli|grillattu|marinoitu|maustettu|nopea|ohut|filee|suikale|pala|viipale|pakkaus|rasia)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  return words.slice(0, 3).join(" ");
}

function getGostaOfferDedupeKeyV148(item: ZiiplyGostaOfferLike) {
  const anyItem = item as any;
  const ean = normalizeGostaCoreText(anyItem?.ean || anyItem?.gtin || anyItem?.barcode || "");

  // CMS campaigns and discounted-master offers are independent tab datasets.
  // The same EAN must survive once in each tab, not dedupe across tabs.
  const sourceTab = anyItem?.campaignType === "campaign" ? "campaign" : "offer";
  if (ean) return `${sourceTab}:ean:${ean}`;

  const title =
    item?.title || item?.name || item?.productName || "";
  const title3 = getUltraCompactGostaTitleKeyV150(title);
  const store = normalizeGostaCoreText(item?.storeLabel || "");
  const price = normalizeGostaCoreText(item?.priceText || "");

  if (title3) return `${sourceTab}:title3:${title3}|price:${price}|store:${store}`;

  return `${sourceTab}:${normalizeGostaCoreText([item?.id, title, price].filter(Boolean).join("|"))}`;
}

export function dedupeZiiplyGostaOfferResultsV146(results: ZiiplyGostaOfferLike[]) {
  const seen = new Set<string>();

  return results.filter((item) => {
    const key = getGostaOfferDedupeKeyV148(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cleanZiiplyGostaOfferResultsV146(results: ZiiplyGostaOfferLike[]) {
  const seen = new Set<string>();

  return results.filter((item) => {
    if (isBadOfferSearchResultV106(item)) return false;

    const key = getGostaOfferDedupeKeyV148(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterZiiplyGostaOfferResultsV146(
  results: ZiiplyGostaOfferLike[],
  filterValue: string,
) {
  const filter = normalizeGostaCoreText(filterValue).trim();
  if (!filter || filter === "kaikki" || filter === "all") return results;

  return results.filter((item) => {
    const category = normalizeGostaCoreText(getResolvedGostaCategoryV166(item));

    // V172:
    // V533/page.tsx avaa tuoteryhmät paikallisesti jo ladatusta master-listasta.
    // Käytä tässä nykyistä kategoriatunnistusta, ei legacy
    // isKnownOfferCategoryFilterV113()-listaa. Muuten esim.
    // "Hygienia & kosmetiikka" -> "hygienia ja kosmetiikka" putoaa
    // virheellisesti vapaatekstihakuun ja masterin oikeat kategoriakortit katoavat.
    //
    // Tunnettu tuoteryhmächip ei ole vapaatekstihaku koko tarjousriviin.
    if (isCurrentGostaCategorySelectionV167(filterValue)) {
      return category === filter;
    }

    const title = normalizeGostaCoreText(getOfferProductTitleV113(item));
    const categoryMeta = normalizeGostaCoreText(
      [item?.category, item?.department, item?.productGroup].filter(Boolean).join(" "),
    );

    return title.includes(filter) || categoryMeta.includes(filter);
  });
}

export async function searchZiiplyGostaOffersV146(options: {
  query: string;
  terms?: string[];
  context?: ZiiplyGostaOfferSearchContextV152;
}) {
  const cleanedQuery = String(options.query || "").trim();
  const termSnapshot = (options.terms || []).join(", ").trim();
  const offerQuerySnapshot = termSnapshot || cleanedQuery;

  const categorySearchLabel = isCurrentGostaCategorySelectionV167(offerQuerySnapshot)
    ? getGostaCategoryLabelFromFilterV136(offerQuerySnapshot)
    : "";

  const normalizedCategorySearch = normalizeGostaCoreText(categorySearchLabel).trim();
  const searchAllAreaOffers = !offerQuerySnapshot || normalizedCategorySearch === "kaikki";
  const searchByCategory =
    !!categorySearchLabel &&
    normalizedCategorySearch !== "kaikki" &&
    isCurrentGostaCategorySelectionV167(categorySearchLabel);

  const trackingKey = searchAllAreaOffers
    ? "__all_area_offers_category_seeded__"
    : searchByCategory
      ? `__category_${normalizedCategorySearch}__`
      : offerQuerySnapshot;

  let nextResults: ZiiplyGostaOfferLike[] = [];

  if (searchAllAreaOffers || searchByCategory) {
    // V160:
    // Category chips must not run a direct text search like q="Liha" or q="Hevi".
    // They use the full Gösta master offer dataset and then filter locally by
    // the category classifier. This restores the earlier working category behavior.
    const masterResults = await fetchGostaMasterOfferResultsV156(options.context);

    nextResults = searchByCategory
      ? masterResults.filter(
          (item) =>
            normalizeGostaCoreText(getResolvedGostaCategoryV166(item)) === normalizedCategorySearch,
        )
      : masterResults;
  } else {
    nextResults = await fetchOfferSearchResults(offerQuerySnapshot, options.context);
  }

  const results = searchAllAreaOffers || searchByCategory
    ? dedupeZiiplyGostaOfferResultsV146(nextResults)
    : cleanZiiplyGostaOfferResultsV146(nextResults);

  return {
    results,
    querySnapshot: searchByCategory ? categorySearchLabel : offerQuerySnapshot,
    cardFilter: searchAllAreaOffers ? "" : searchByCategory ? categorySearchLabel : offerQuerySnapshot,
    showingAllAreaOffers: searchAllAreaOffers,
    trackingKey,
    searchAllAreaOffers,
    searchByCategory,
    categoryLabel: categorySearchLabel,
  } satisfies ZiiplyGostaOfferSearchCoreResult;
}

// V147 compatibility exports for thin page.tsx.
export { GOSTA_CATEGORY_LABELS_V136 as GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147 } from "./ziiplyOfferCategoryCore";

export function isZiiplyGostaCategorySelectionV147(value: string) {
  // V173: use the same current-label-aware category gate end-to-end.
  return isCurrentGostaCategorySelectionV167(value);
}

export function mapZiiplyGostaOfferToCardOfferV147(item: ZiiplyGostaOfferLike) {
  return {
    id: item.id,
    name: item.title,
    title: item.title,
    productName: item.title,
    storeName: item.storeLabel,
    chain: item.chain,
    price: item.priceText ?? item.price,
    offerPrice: item.priceText ?? item.price,
    normalPrice: item.normalPrice,
    originalPrice: item.normalPrice,
    ean: item.ean,
    comparisonPrice: item.comparisonPrice,
    comparisonPriceText: item.unitPriceText,
    unitPrice: item.unitPriceText,
    comparisonUnit: item.comparisonUnit,
    discountText:
      item.benefitText ||
      item.validityText ||
      (item.validFrom && item.validTo ? `Voimassa ${String(item.validFrom)}–${String(item.validTo)}` : ""),
    image: item.imageUrl,
    imageUrl: item.imageUrl,
    pictureUrl: item.imageUrl,
    productUrl: item.productUrl,
    category: getResolvedGostaCategoryV166(item),
    __sourceOfferSearchResult: item,
  };
}

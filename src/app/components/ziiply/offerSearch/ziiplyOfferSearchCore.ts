import { classifyTokmanniOfferCategory } from "./tokmanniOfferCategory";
import { citymarketFailureNotice, type CitymarketAvailabilityNotice } from "./citymarketAvailability";
import { fetchZiiplyRecoverableOfferSearch } from "../ziiplyRecoverableOfferFetch";
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

// Convert legacy category chips to the same canonical display labels used by
// verified Neon taxonomy and the shared category resolver.
function canonicalGostaFilterCategory(value: string) {
  const normalized = normalizeGostaCoreText(value).replace(/\\bja\\b/g, " ").replace(/\\s+/g, " ").trim();
  const aliases: Record<string, string> = {
    kahvi: "Kahvi & tee",
    "kahvi tee": "Kahvi & tee",
    liha: "Liha & makkarat",
    "liha makkarat": "Liha & makkarat",
    koti: "Koti & vapaa-aika",
    "koti vapaa aika": "Koti & vapaa-aika",
    makeiset: "Makeiset & keksit",
    "makeiset keksit": "Makeiset & keksit",
  };
  const candidate = aliases[normalized] || getGostaCategoryLabelFromFilterV136(value);
  return GOSTA_CATEGORY_LABELS_V136.find(
    (label) => normalizeGostaCoreText(label) === normalizeGostaCoreText(candidate),
  ) || candidate;
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
  ["kahvi", "Kahvi & tee"],
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
  ["lemmikit", "Lemmikit"],
  ["lastenruoat", "Lastenruoat"],
  ["lastenhoito", "Lastenhoito"],
  ["vitamiinit ravinteet", "Vitamiinit & ravinteet"],
  ["hygienia kosmetiikka", "Hygienia & kosmetiikka"],
  ["kodinhoito", "Kodinhoito"],
  ["koti", "Koti & vapaa-aika"],
  ["koti vapaa aika", "Koti & vapaa-aika"],
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

// S-kaupat provides a structured product hierarchy. Prefer its product form
// over title keyword guesses (e.g. chocolate-flavoured protein is not candy).
// Only classify recognized provider departments; unknown paths fall back.
function getStructuredSKaupatCategoryV232(sourceItem: any): string {
  const fields = [sourceItem?.categoryPath, sourceItem?.mainCategory,
    sourceItem?.department, sourceItem?.productGroup, sourceItem?.subCategory]
    .filter(Boolean).map((v: unknown) => normalizeGostaCoreText(v));
  const hierarchy = fields.join(" ");
  // The categoryPath repeats the broad parent. Read only the actual nested
  // product groups here; otherwise "Kahvit, teet ja mehut" and similar
  // departments can override the precise product classification.
  // Cached rows can contain the full hierarchy only in categoryPath.
  // Extract child segments without treating the broad parent as a child.
  const pathParts = String(sourceItem?.categoryPath || "").split(/\s*[>/]\s*/).filter(Boolean);
  const detailed = [...pathParts.slice(1), sourceItem?.productGroup, sourceItem?.subCategory]
    .filter(Boolean).map((v: unknown) => normalizeGostaCoreText(v)).join(" ");
  const parent = normalizeGostaCoreText(sourceItem?.mainCategory ||
    pathParts[0] || "");
  if (!hierarchy || !parent) return "";
  // Mixed S-kaupat departments must use their precise child group.
  if (/\btofu(?:t|jen)?\b/.test(detailed)) return "Liha & makkarat";
  if (/pastakastikkeet|pastakastike/.test(detailed)) return "Kuivatuotteet";
  if (/lastenruo|vauvanruo|lasten valipala|lasten sose/.test(detailed)) return "Lastenruoat";
  if (/vaipat|lastenhoito|vauvan hoito/.test(detailed)) return "Lastenhoito";
  if (/vitamiini|ravintolisa|kivennaisaine|proteiinijauhe|urheiluravinne|elektrolyyt/.test(detailed)) return "Vitamiinit & ravinteet";
  if (/kodinhoito|siivous|astianpesu|pyykinpesu|konetiski|pesuaine/.test(detailed)) return "Kodinhoito";
  if (/kosmetiikka|hygienia|kauneus|hiustenhoito|vartalonhoito|ihonhoito/.test(parent) || /hiustenhoito|vartalonhoito|ihonhoito|kasvovoiteet|meikit/.test(detailed)) return "Hygienia & kosmetiikka";
  if (/lemmik|koiran|kissan/.test(parent) || /koiranruo|kissanruo|lemmikkitarvik/.test(detailed)) return "Lemmikit";
  // Department-level fallbacks must precede generic "koti": kodinhoito
  // contains that word but belongs to cleaning and household supplies.
  if (/kodinhoito|taloustarvikkeet|siivous/.test(parent)) return "Kodinhoito";
  if (/urheiluravinteet|ravintolisat|terveys ja itsehoito/.test(parent)) return "Vitamiinit & ravinteet";
  if (/^lapset$/.test(parent) && /sose|vauvanruo|lasten valipala|lastenruo/.test(detailed)) return "Lastenruoat";
  // Ruokatori is a mixed service-counter department. Only its precise child
  // group can determine the display category; never classify all of it alike.
  if (/^ruokatori$/.test(parent)) {
    if (/valmisruo|valmisater|salaatit|hummus/.test(detailed)) return "Valmisruoka";
    if (/kala|kalatiski|merenelav/.test(detailed)) return "Kala";
    if (/liha|makkara|leikkele|broileri/.test(detailed)) return "Liha & makkarat";
    if (/leipa|leivonnais|paistopiste/.test(detailed)) return "Leipomo";
    return "";
  }

  if (/kukat|koti|kayttotavarat|vapaa aika|puutarha|keittio ja kattaus/.test(parent)) return "Koti & vapaa-aika";
  if (/hedelmat|vihannekset|hevi/.test(parent)) return "Hevi";
  if (/mausteet|maustaminen|kastikkeet|texmex|kuivat elintarvikkeet|kuivatuotteet|pastat|riisit|sailykkeet|hillot|leivonta|maailman makuja|snacksit|oljy(t|t,)/.test(parent)) return "Kuivatuotteet";
  // The S-kaupat department "Kahvit, teet ja mehut" mixes distinct products.
  // Use the child group, not the shared parent, to separate drinks from coffee.
  if (/kahvit.*teet.*mehut/.test(parent)) {
    if (/mehu|smoothie|nektari|mehujuoma/.test(detailed)) return "Juomat";
    // Match tea as a word or category prefix, never as the ending of
    // "tuotteet", "mausteet" or "voiteet".
    if (/kahvi|suodatinpuss|(?:^|\s)tee(?:\s|$)|(?:^|\s)teet(?:\s|$)|teejuom/.test(detailed)) return "Kahvi & tee";
    // Do not fall through to the broad "mehut" parent check below.
    return "";
  }
  // A mixed coffee/juice department is not enough to classify an unknown
  // child group; leave it for the existing Neon/provider fallback.
  if (/maito|juusto|jogurt|kananmun|rasvat/.test(parent)) return "Maitotuotteet";
  if (/kala|merenelav/.test(parent)) return "Kala";
  if (/liha|makkara|leikkele|kasviproteiin/.test(parent)) return "Liha & makkarat";
  if (/leipa|leivonnais|paistopiste/.test(parent)) return "Leipomo";
  if (/pakaste|jaatelo/.test(parent)) return "Pakasteet";
  if (/valmisruo/.test(parent)) return "Valmisruoka";
  if (/makeiset|karkit|suklaat|keksit/.test(parent)) return "Makeiset & keksit";
  if (/juomat|mehut|virvoitus/.test(parent)) return "Juomat";
  return "";
}

function getResolvedGostaCategoryV166(item: ZiiplyGostaOfferLike) {
  const anyItem = item as any;
  // V181: K-Citymarket must be resolved before the generic trusted-category
  // branch. Otherwise a stale top-level category such as "Muut" wins before
  // the authoritative nested provider category can be read.
  const sourceItem = (anyItem?.__sourceOfferSearchResult || anyItem) as any;
  // Tokmanni: use the same product identity rules as the weekly-offer parser.
  // Run before legacy title rules and stale EAN labels, including cached rows.
  const tokmanniSource = normalizeGostaCoreText(sourceItem?.source || anyItem?.source || "");
  if (tokmanniSource === "tokmanni-viikkotarjoukset" || tokmanniSource === "tokmanni viikkotarjoukset") {
    const productCategory = classifyTokmanniOfferCategory(String(
      sourceItem?.title || sourceItem?.name || sourceItem?.productName ||
      anyItem?.title || anyItem?.name || anyItem?.productName || "",
    ));
    if (productCategory !== "Muut") return productCategory;
    const fallbackCategory = String(sourceItem?.neonDisplayCategory || sourceItem?.category || "").trim();
    return GOSTA_CATEGORY_LABELS_V136.includes(fallbackCategory) ? fallbackCategory : "Muut";
  }

  // Apply source taxonomy for Prisma offers AND campaigns. A source-provided
  // hierarchy is more specific than the legacy title-based classifier.
  const isStructuredSKaupat =
    normalizeGostaCoreText(sourceItem?.source || "") === "skaupat" &&
    Boolean(sourceItem?.categoryPath || sourceItem?.mainCategory);
  if (isStructuredSKaupat) {
    const structured = getStructuredSKaupatCategoryV232(sourceItem);
    if (structured) return structured;
  }
  // Neon EAN match takes precedence over legacy category rules and provider labels.
  const neonCategory = String(sourceItem?.neonDisplayCategory || anyItem?.neonDisplayCategory || "").trim();
  // Preserve the canonical display group supplied by the verified Neon taxonomy.
  // A detailed Neon category path is not itself a top-level UI chip label.
  if (neonCategory && GOSTA_CATEGORY_LABELS_V136.includes(neonCategory)) return neonCategory;
  const storeType = normalizeGostaCoreText(sourceItem?.storeType || anyItem?.storeType || "");
  const source = normalizeGostaCoreText(sourceItem?.source || anyItem?.source || "");
  // Prisma CMS and cached campaign rows use the same taxonomy rules as offers.
  // The broad "Kahvit, teet ja mehut" parent cannot decide the product bucket.
  if (sourceItem?.campaignType === "campaign" && /^prisma/i.test(String(sourceItem?.storeLabel || ""))) {
    const path = String(sourceItem?.categoryPath || "").split(/\s*[>/]\s*/).filter(Boolean);
    return getOfferCategoryV106({
      ...sourceItem,
      sourceUrl: "https://www.s-kaupat.fi/tuotteet/kampanjat",
      mainCategory: sourceItem?.mainCategory || path[0] || sourceItem?.category,
      productGroup: sourceItem?.productGroup || path[1] || "",
      subCategory: sourceItem?.subCategory || (path.length > 1 ? path[path.length - 1] : "") || "",
    });
  }
  // S-local CMS: source taxonomy wins over fruit-related words in processed
  // products (e.g. omenasose must not become fresh produce / Hevi).
  if (source === "skaupat" && sourceItem?.debugLocalCampaignEvidenceV231) {
    const taxonomy = normalizeGostaCoreText(
      [sourceItem?.categoryPath, sourceItem?.mainCategory, sourceItem?.department,
        sourceItem?.productGroup, sourceItem?.subCategory].filter(Boolean).join(" "),
    );
    const productTitle = normalizeGostaCoreText(sourceItem?.title || anyItem?.title || "");
    if (/\b(vaipat|vaippa|pampers|housuvaipat|teippivaipat)\b/.test(`${taxonomy} ${productTitle}`)) {
      return "Lastenhoito";
    }
    if (/hillot|sailykkeet|soseet|hyytelot|marmeladit/.test(taxonomy)) {
      return "Kuivatuotteet";
    }
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

  // Tokmanni weekly offers carry canonical product-form categories. Use the
  // same supplier result for mobile cards, desktop counts and category filters.
  if (source === "tokmanni-viikkotarjoukset" || source === "tokmanni viikkotarjoukset") {
    const category = String(sourceItem?.category || "").trim();
    if (GOSTA_CATEGORY_LABELS_V136.includes(category)) return category;
  }

  // V184: Lidl provider also emits Ziiply's canonical category. Preserve the
  // provider category; generic title classification can otherwise turn e.g.
  // Siskonmakkara / Pulled pork from "Liha & makkarat" into "Muut".
  const lidlIdentity = normalizeGostaCoreText(
    [sourceItem?.source, anyItem?.source, sourceItem?.chain, anyItem?.chain, sourceItem?.storeType, anyItem?.storeType, sourceItem?.storeLabel, anyItem?.storeLabel]
      .filter(Boolean)
      .join(" "),
  );
  const isLidl =
    source === "lidl plus" ||
    source === "lidl-plus" ||
    source.startsWith("lidl ") ||
    source.startsWith("lidl-") ||
    /(?:^| )lidl(?: |$)/.test(lidlIdentity);
  if (isLidl) {
    // Lidl final UI guard: product form outranks a stale/provider ingredient
    // category. This runs in the exact resolver used by category counts and
    // opened category views, so cached/staged source rows cannot put e.g.
    // rahkapulla back into Maitotuotteet.
    const productTitle = normalizeGostaCoreText(
      sourceItem?.title || sourceItem?.name || sourceItem?.productName ||
      anyItem?.title || anyItem?.name || anyItem?.productName || "",
    );
    if (/halloween[- ]?asu|koiran[- ]?asu|kissan[- ]?asu|lemmikin[- ]?asu/.test(productTitle)) return "Muut";
    if (/lihapulla/.test(productTitle)) return "Liha & makkarat";
    if (/mehu|nektari|smoothie|limonadi|limu|cola|vichy|energiajuoma/.test(productTitle)) return "Juomat";
    if (/maustekur|hapankurk|hapankaali|ajvar|paprikapyree/.test(productTitle)) return "Kuivatuotteet";
    if (/valkokaalisalaatti/.test(productTitle)) return "Valmisruoka";
    if (/keitto|lihapata|nyytti|pelmeni|pizza|lasagne|wokki|risotto|valmisateria/.test(productTitle)) return "Valmisruoka";
    if (/paistopiste|leip|croissant|pulla|munkki|piirakka|sampyl|rieska|patonki|karjalanpiirakka/.test(productTitle)) return "Leipomo";

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

  // Product-specific correction must run before trusting a generic K/Tjek category.
  // The shared CategoryCore rule alone is insufficient because the trusted
  // provider category otherwise returns early (e.g. Kivikylän PIZZAT -> dairy).
  const isKLocalTjek = source === "etarjouslehdet" &&
    /k supermarket|k-supermarket|k market|k-market/.test(normalizeGostaCoreText(
      [sourceItem?.storeLabel, sourceItem?.storeName, anyItem?.storeLabel, anyItem?.storeName].filter(Boolean).join(" "),
    ));
  if (isKLocalTjek) {
    const productTitle = normalizeGostaCoreText(sourceItem?.title || sourceItem?.name || anyItem?.title || anyItem?.name || "");
    if (/\b(pizza|pizzat|pizzapala|pizzapalat|pitsa|pitsat)\b/.test(productTitle)) {
      return /\b(pakaste|pakastettu|pakastepizza|pakastepitsa)\b/.test(productTitle) ? "Pakasteet" : "Valmisruoka";
    }
    // The K-local provider has already resolved product form and source taxonomy.
    // Cards omit provider metadata, so retain the canonical nested source category.
    const category = String(sourceItem?.category || "").trim();
    if (GOSTA_CATEGORY_LABELS_V136.includes(category)) return category;
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

  // V238: the selected store NAME is the stable identity for the browser-side
  // master cache. Store IDs can legitimately differ between the location/store
  // picker (Ruoanhinta ID) and the provider (S-kaupat ID / externalId), while
  // the name is the same physical store. If the ID participates in this key,
  // selection warmup can fill one key and the visible Gösta search can open a
  // second slow master request for the same store.
  const sNames = normalizeGostaContextListV164(context.sStoreNames, context.sStoreName)
    .map((value) => normalizeGostaCoreText(value))
    .filter(Boolean);
  const kNames = normalizeGostaContextListV164(context.kStoreNames, context.kStoreName)
    .map((value) => normalizeGostaCoreText(value))
    .filter(Boolean);

  if (sNames.length || kNames.length) {
    return [
      "stores",
      "s", ...sNames,
      "k", ...kNames,
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

  return [
    context.areaLabel,
    context.storeMode,
    context.storeCompareScope,
    context.withinChain,
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
  citymarketNotice?: CitymarketAvailabilityNotice | null;
};

let lastZiiplyKruokaDebugV174: ZiiplyKruokaDebugV174 | null = null;
const ziiplyKruokaDebugByContextV183 = new Map<string, ZiiplyKruokaDebugV174 | null>();

export function getLastZiiplyKruokaDebugV174(
  context?: ZiiplyGostaOfferSearchContextV152,
): ZiiplyKruokaDebugV174 | null {
  const contextKey = buildOfferSearchContextKeyV152(context);
  // A selected store must never inherit another store's last debug response.
  // Only callers without a store context may use the global fallback.
  const debug = contextKey
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
  if (isTokmanniSelection && !isEurosparSelection) {
    params.set("provider", "tokmanni");
    params.set("tokmanniStoreName", String(context?.tokmanniStoreName || "Tokmanni"));
  }

  if (sStoreIdsV162.length > 0) params.set("sStoreId", sStoreIdsV162.join("||"));
  if (sStoreNamesV162.length > 0) params.set("sStoreName", sStoreNamesV162.join("||"));
  if (kStoreIdsV162.length > 0) params.set("kStoreId", kStoreIdsV162.join("||"));
  if (kStoreNamesV162.length > 0) params.set("kStoreName", kStoreNamesV162.join("||"));
  params.set("_", `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // A single request must read the existing server-side weekly leaflet cache.
  // Repeating the request while Tjek is running can restart work on another
  // serverless instance and prevent the mobile offer list from ever opening.
  let response: Response;
  try {
    response = await fetchZiiplyRecoverableOfferSearch(`/api/offers/search?${params.toString()}`);
  } catch (error) {
    if (!isKCitymarketContextV179(context) || (error instanceof Error && error.name === "AbortError")) throw error;
    lastZiiplyKruokaDebugV174 = { citymarketNotice: citymarketFailureNotice(null) };
    if (contextKey) ziiplyKruokaDebugByContextV183.set(contextKey, lastZiiplyKruokaDebugV174);
    return [];
  }
  if (!response.ok && isKCitymarketContextV179(context)) {
    lastZiiplyKruokaDebugV174 = { citymarketNotice: citymarketFailureNotice(null) };
    if (contextKey) ziiplyKruokaDebugByContextV183.set(contextKey, lastZiiplyKruokaDebugV174);
    return [];
  }
  const clonedForDebugV174 = response.clone();
  try {
    const payloadV174 = await clonedForDebugV174.json();
    const deployV184 = payloadV174?.deploy ? { ...payloadV174.deploy } : undefined;
    lastZiiplyKruokaDebugV174 = payloadV174 && typeof payloadV174 === "object"
      ? {
          ...(payloadV174.kruokaDebug ? { ...payloadV174.kruokaDebug } : {}),
          ...(deployV184 ? { deploy: deployV184 } : {}),
          citymarketNotice: payloadV174.citymarketNotice ?? null,
          ...(payloadV174.sEvidenceRouteV228 ? { sEvidenceRouteV228: payloadV174.sEvidenceRouteV228 } : {}),
          ...(payloadV174.kOfferStageAuditV1 ? { kOfferStageAuditV1: payloadV174.kOfferStageAuditV1 } : {}),
        }
      : null;
    if (contextKey) ziiplyKruokaDebugByContextV183.set(contextKey, lastZiiplyKruokaDebugV174);
  } catch {
    lastZiiplyKruokaDebugV174 = isKCitymarketContextV179(context) ? { citymarketNotice: citymarketFailureNotice(null) } : null;
    if (contextKey) ziiplyKruokaDebugByContextV183.set(contextKey, lastZiiplyKruokaDebugV174);
    if (isKCitymarketContextV179(context)) return [];
  }
    const parsedResults = await parseOfferSearchResponse(response);
  // Citymarket has two independent publication sources. The tab is defined by
  // the publication origin, never by a percentage-discount/price heuristic.
  // Keep this scoped to Citymarket so other chains retain their existing rules.
  if (isKCitymarketContextV179(context)) {
    for (const item of parsedResults) {
      const row = item as any;
      const source = row.__sourceOfferSearchResult ?? row;
      if (source?.provider === "kcitymarket-local" ||
          source?.source === "K-Citymarket kauppakohtainen julkaisu") {
        row.campaignType = "campaign";
        source.campaignType = "campaign";
      } else if (source?.source === "K-Citymarket tarjouslehti") {
        row.campaignType = "offer";
        source.campaignType = "offer";
      }
    }
  }
  // Audit after source-authoritative tab classification, not before it.
  if (isKCitymarketContextV179(context)) {
    const bySource: Record<string, { total: number; campaign: number; offer: number }> = {};
    for (const item of parsedResults) {
      const row = item as any;
      const source = row.__sourceOfferSearchResult ?? row;
      const name = String(source?.source ?? source?.provider ?? "unknown");
      const bucket = bySource[name] ?? (bySource[name] = { total: 0, campaign: 0, offer: 0 });
      bucket.total++;
      if (row.campaignType === "campaign") bucket.campaign++;
      else bucket.offer++;
    }
    const audit = lastZiiplyKruokaDebugV174 as any;
    if (audit) audit.kOfferSourceSplitAuditV1 = { received: parsedResults.length, bySource };
  }
  return parsedResults;
}

async function fetchGostaMasterOfferResultsV156(context?: ZiiplyGostaOfferSearchContextV152) {
  const contextKey = buildOfferSearchContextKeyV152(context) || "global";
  const now = Date.now();
  const cached = ziiplyGostaMasterCacheV156.get(contextKey);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetchOfferSearchResults(ZIIPLY_GOSTA_MASTER_QUERY_V156, context)
    .then((results) => {
      // A source-owned Citymarket publication is authoritative: do not let
      // generic title/price heuristics remove its rows before tab splitting.
      const cleaned = isKCitymarketContextV179(context)
        ? dedupeZiiplyGostaOfferResultsV146(results)
        : cleanZiiplyGostaOfferResultsV146(results);
      const identity = (item: ZiiplyGostaOfferLike) => {
        const source = (item as any).__sourceOfferSearchResult ?? item;
        return [String(source?.debug?.publicationId ?? ""), String(source?.offerId ?? ""), String((item as any).campaignType ?? "offer")].join("|");
      };
      const cleanedIds = new Set(cleaned.map(identity));
      const removed = results.filter(item => !cleanedIds.has(identity(item)));
      const stageAudit = lastZiiplyKruokaDebugV174 as any;
      if (stageAudit && stageAudit.kOfferStageAuditV1) {
        stageAudit.kOfferClientAuditV1 = {
          received: results.length,
          cleaned: cleaned.length,
          removed: removed.map(item => ({
            id: identity(item),
            title: String(item.title ?? ""),
            badTitle: isBadOfferSearchResultV106(item),
            dedupeKey: getGostaOfferDedupeKeyV148(item),
          })),
        };
      }
      if (stageAudit && isKCitymarketContextV179(context)) {
        stageAudit.kOfferMasterTabAuditV1 = {
          beforeClean: {
            total: results.length,
            campaigns: results.filter(item => (item as any).campaignType === "campaign").length,
            offers: results.filter(item => (item as any).campaignType !== "campaign").length,
          },
          afterClean: {
            total: cleaned.length,
            campaigns: cleaned.filter(item => (item as any).campaignType === "campaign").length,
            offers: cleaned.filter(item => (item as any).campaignType !== "campaign").length,
          },
        };
      }
      // An empty master result is not a usable cached publication. Keep only
      // in-flight deduplication so the next user request can recover immediately.
      if (cleaned.length === 0) ziiplyGostaMasterCacheV156.delete(contextKey);
      return cleaned;
    })
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

/** Invalidate one selected-store master before a scheduled local-publication refresh. */
export function invalidateZiiplyGostaOfferCacheV804(context?: ZiiplyGostaOfferSearchContextV152) {
  const key=buildOfferSearchContextKeyV152(context)||"global";
  ziiplyGostaMasterCacheV156.delete(key);
  gostaPreparedAllV803.delete(key);
}

// V803: cache the final deduplicated all-offers list during background warmup.
// Opening Gösta can reuse it without running full-list deduplication on the UI path.
const gostaPreparedAllV803 = new Map<string, { source: ZiiplyGostaOfferLike[]; results: ZiiplyGostaOfferLike[] }>();
function preparedGostaAllV803(context: ZiiplyGostaOfferSearchContextV152 | undefined, source: ZiiplyGostaOfferLike[]) {
  const key = buildOfferSearchContextKeyV152(context) || "global";
  const existing = gostaPreparedAllV803.get(key);
  if (existing?.source === source) return existing.results;
  const results = dedupeZiiplyGostaOfferResultsV146(source);
  if (isKCitymarketContextV179(context)) {
    const audit = lastZiiplyKruokaDebugV174 as any;
    if (audit) audit.kOfferPreparedTabAuditV1 = {
      before: { total: source.length, campaigns: source.filter(item => (item as any).campaignType === "campaign").length },
      after: { total: results.length, campaigns: results.filter(item => (item as any).campaignType === "campaign").length },
    };
  }
  gostaPreparedAllV803.set(key, { source, results });
  return results;
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
  preparedGostaAllV803(context, masterResults);
  const prepared = preparedGostaAllV803(context, masterResults);
  const campaigns = prepared.filter((item) => (item as any)?.campaignType === "campaign");
  const offers = prepared.filter((item) => (item as any)?.campaignType !== "campaign");
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
  const sourceOffer = anyItem?.__sourceOfferSearchResult ?? anyItem;
  const origin = [sourceOffer?.source ?? sourceOffer?.provider ?? "unknown", sourceOffer?.sourceUrl ?? "", sourceOffer?.debug?.publicationId ?? sourceOffer?.publicationId ?? "", sourceOffer?.storeId ?? sourceOffer?.storeName ?? ""].map(String).join("|");
  // Tjek rows already carry a stable, publication-specific offer identity. Do not
  // collapse different leaflet offers just because their shortened names/prices match.
  if ((sourceOffer?.provider === "kcitymarket-local" || sourceOffer?.source === "K-Citymarket kauppakohtainen julkaisu" || sourceOffer?.source === "etarjouslehdet") && sourceOffer?.offerId) {
    return `${sourceTab}:tjek:${normalizeGostaCoreText(sourceOffer.storeId || anyItem.storeId || "")}:${String(sourceOffer.debug?.publicationId || "")}:${String(sourceOffer.offerId)}`;
  }
  // National leaflet cards have distinct prices, packs and page identities.
  // Preserve them through API and UI deduplication using the parser identity.
  if (sourceOffer?.source === "K-Citymarket tarjouslehti" && String(sourceOffer.id || "").startsWith("kcm:spatial:")) {
    return `${sourceTab}:kcm-national:${String(sourceOffer.id)}`;
  }
  // Source-scoped IDs distinguish product variants even when titles/prices match.
  const sourceId = String(sourceOffer?.id ?? sourceOffer?.offerId ?? "").trim();
  if (sourceId) return `${sourceTab}:${origin}:id:${sourceId}`;
  if (ean) return `${sourceTab}:${origin}:ean:${ean}`;

  const title =
    item?.title || item?.name || item?.productName || "";
  const title3 = getUltraCompactGostaTitleKeyV150(title);
  const store = normalizeGostaCoreText(item?.storeLabel || "");
  const price = normalizeGostaCoreText(item?.priceText || "");

  if (title3) return `${sourceTab}:${origin}:title3:${title3}|price:${price}|store:${store}`;

  return `${sourceTab}:${origin}:${normalizeGostaCoreText([item?.id, title, price].filter(Boolean).join("|"))}`;
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

// Gösta: sort every category and text search by the actual offer total price.
// Missing/ambiguous prices go last; unit prices (€/kg, €/l) are not the item price.
function gostaOfferSortPrice(item: ZiiplyGostaOfferLike): number {
  const raw = (item as any)?.__sourceOfferSearchResult ?? item;
  // The structured offer price is the transaction total, including multi-buy
  // deals. Never use €/kg or a "2 kpl" quantity as the sorting price.
  const numericCandidates = [
    raw?.offerPrice, (item as any)?.offerPrice, raw?.price, (item as any)?.price,
  ];
  for (const candidate of numericCandidates) {
    if (candidate == null || candidate === "") continue;
    const normalized = String(candidate).trim().replace(/\s*€$/, "").replace(",", ".");
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) continue;
    const price = Number(normalized);
    if (Number.isFinite(price) && price > 0) return price;
  }
  for (const candidate of [raw?.priceText, item?.priceText]) {
    const value = String(candidate ?? "").trim();
    if (!value) continue;
    // A unit comparison price is not the payable transaction price.
    if (/€\s*\/\s*(?:kg|l|kpl|100\s*g|100\s*ml)\b/i.test(value)) continue;
    // Match an amount tied to €, regardless of whether quantity precedes it.
    const euro = value.match(/(\d{1,5}(?:[,.]\d{1,2})?)\s*(?:€|eur)(?!\w)/i);
    if (euro) {
      const price = Number(euro[1].replace(",", "."));
      if (Number.isFinite(price) && price > 0) return price;
    }
    // No currency marker: only accept a standalone numeric price, not unit rates.
    if (/^\d{1,5}(?:[,.]\d{1,2})?$/.test(value)) {
      const price = Number(value.replace(",", "."));
      if (Number.isFinite(price) && price > 0) return price;
    }
  }
  return Number.POSITIVE_INFINITY;
}

export function sortZiiplyGostaOffersByPrice(results: ZiiplyGostaOfferLike[]) {
  return [...results].sort((a, b) => {
    const left = gostaOfferSortPrice(a);
    const right = gostaOfferSortPrice(b);
    if (left === right) return 0;
    if (!Number.isFinite(left)) return 1;
    if (!Number.isFinite(right)) return -1;
    return left - right;
  });
}

export function filterZiiplyGostaOfferResultsV146(
  results: ZiiplyGostaOfferLike[],
  filterValue: string,
) {
  const filter = normalizeGostaCoreText(filterValue).trim();
  if (!filter || filter === "kaikki" || filter === "all") return sortZiiplyGostaOffersByPrice(results);
  const canonicalCategoryFilter = normalizeGostaCoreText(canonicalGostaFilterCategory(filterValue));

  return sortZiiplyGostaOffersByPrice(results.filter((item) => {
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
      return category === canonicalCategoryFilter;
    }

    const title = normalizeGostaCoreText(getOfferProductTitleV113(item));
    const categoryMeta = normalizeGostaCoreText(
      [item?.category, item?.department, item?.productGroup].filter(Boolean).join(" "),
    );

    return title.includes(filter) || categoryMeta.includes(filter);
  }));
}

// Preserve publisher multi-buy terms when the parallel campaign feed contains only a section label.
export function enrichPrismaCampaignMultiBuyV233(
  visible: ZiiplyGostaOfferLike[], master: ZiiplyGostaOfferLike[], selectedStoreName?: string,
): ZiiplyGostaOfferLike[] {
  if (!/^prisma(?:\s|$)/i.test(String(selectedStoreName ?? "").trim())) return visible;
  const normalize = (v: unknown) => String(v ?? "").trim().toLocaleLowerCase("fi-FI");
  const multiBuy = (v: unknown) => String(v ?? "").replace(/\u00a0/g, " ").match(/\b\d+\s*(?:kpl|pkt|ps|plo|prk)\s*=\s*\d+(?:[,.]\d+)?\s*€/i)?.[0] ?? "";
  const terms = new Map<string, string>();
  for (const item of master) {
    const raw = (item as any).__sourceOfferSearchResult ?? item;
    if (raw.campaignType === "campaign" || !raw.ean) continue;
    if (normalize(raw.storeLabel ?? raw.storeName) !== normalize(selectedStoreName)) continue;
    const term = multiBuy(raw.benefitText) || multiBuy(raw.debugOfferEvidenceV226?.rawLabels);
    if (term) terms.set(String(raw.ean), term);
  }
  if (!terms.size) return visible;
  return visible.map((item) => {
    const raw = (item as any).__sourceOfferSearchResult ?? item;
    if (raw.campaignType !== "campaign" || !raw.ean) return item;
    if (normalize(raw.storeLabel ?? raw.storeName) !== normalize(selectedStoreName)) return item;
    const term = terms.get(String(raw.ean));
    if (!term || multiBuy(raw.benefitText)) return item;
    return { ...item, benefitText: term };
  });
}

export function hidePrismaOfferCopiesAlreadyInCampaignTabV805(
  visibleResults: ZiiplyGostaOfferLike[],
  masterResults: ZiiplyGostaOfferLike[],
  selectedStoreName?: string,
) {
  const text = (value: unknown) => String(value ?? "").trim();
  const norm = (value: unknown) => normalizeGostaCoreText(value);

  const numericPrice = (item: ZiiplyGostaOfferLike) => {
    const raw = (item as any)?.__sourceOfferSearchResult ?? item;
    const direct = Number(raw?.price);
    if (Number.isFinite(direct)) return direct;
    const parsed = Number(text(raw?.priceText).replace(/[^0-9,.-]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const validity = (item: ZiiplyGostaOfferLike) => {
    const raw = (item as any)?.__sourceOfferSearchResult ?? item;
    const rawValidity = text(
      raw?.validUntil ??
      raw?.validTo ??
      raw?.debugPrismaCampaignEvidenceV2?.campaignPriceValidUntil ??
      raw?.debugOfferEvidenceV226?.campaignPriceValidUntil,
    );
    const isoDate = rawValidity.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    return isoDate || rawValidity;
  };

  const storeIdentity = (item: ZiiplyGostaOfferLike) => {
    const raw = (item as any)?.__sourceOfferSearchResult ?? item;
    return norm(raw?.storeLabel ?? raw?.storeName ?? raw?.storeId ?? "");
  };

  const ean = (item: ZiiplyGostaOfferLike) => {
    const raw = (item as any)?.__sourceOfferSearchResult ?? item;
    return text(raw?.ean ?? raw?.gtin ?? raw?.barcode);
  };

  const selectedStore = norm(selectedStoreName);
  if (!/^prisma(?:\s|$)/i.test(selectedStore)) return visibleResults;

  const campaignKeys = new Set(
    masterResults
      .filter((item) => {
        const raw = (item as any)?.__sourceOfferSearchResult ?? item;
        const campaignStore = norm(raw?.storeLabel ?? raw?.storeName ?? raw?.storeId ?? "");
        return raw?.campaignType === "campaign" &&
          /^prisma(?:\s|$)/i.test(campaignStore) &&
          campaignStore === selectedStore &&
          Boolean(ean(item)) &&
          numericPrice(item) !== null &&
          Boolean(validity(item));
      })
      .map((item) => [
        storeIdentity(item),
        ean(item),
        numericPrice(item)!.toFixed(4),
        validity(item),
      ].join("|")),
  );

  if (!campaignKeys.size) return visibleResults;

  return visibleResults.filter((item) => {
    const raw = (item as any)?.__sourceOfferSearchResult ?? item;
    if (raw?.campaignType === "campaign") return true;

    const price = numericPrice(item);
    const validUntil = validity(item);
    const itemEan = ean(item);
    if (!itemEan || price === null || !validUntil) return true;

    const key = [
      storeIdentity(item),
      itemEan,
      price.toFixed(4),
      validUntil,
    ].join("|");

    return !campaignKeys.has(key);
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
    ? canonicalGostaFilterCategory(offerQuerySnapshot)
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

  const results = searchAllAreaOffers
    ? preparedGostaAllV803(options.context, nextResults)
    : searchByCategory
      ? dedupeZiiplyGostaOfferResultsV146(nextResults)
      : cleanZiiplyGostaOfferResultsV146(nextResults);

  const selectedStoreNameV805 = options.context?.sStoreName;
  const isPrismaSelectionV805 = /^prisma(?:\s|$)/i.test(String(selectedStoreNameV805 ?? "").trim());
  const prismaDedupeMasterV805 = isPrismaSelectionV805
    ? (searchAllAreaOffers || searchByCategory
        ? nextResults
        : await fetchGostaMasterOfferResultsV156(options.context))
    : results;
  const finalResultsV805 = isPrismaSelectionV805
    ? hidePrismaOfferCopiesAlreadyInCampaignTabV805(
        results,
        prismaDedupeMasterV805,
        selectedStoreNameV805,
      )
    : results;

  return {
    results: sortZiiplyGostaOffersByPrice(enrichPrismaCampaignMultiBuyV233(finalResultsV805, prismaDedupeMasterV805, selectedStoreNameV805)),
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

function resolveOfferCardDiscountTextV232(item: ZiiplyGostaOfferLike): string {
  const benefit = String(item.benefitText ?? "").trim();
  const categoryLabels = [item.category, (item as any).categoryPath, (item as any).productGroup,
    (item as any).mainCategory, (item as any).subCategory, (item as any).department]
    .map((value) => String(value ?? "").trim().toLocaleLowerCase("fi-FI"));
  const isCategory = Boolean(benefit) && (categoryLabels.includes(benefit.toLocaleLowerCase("fi-FI")) || benefit === String((item as any).campaignSection ?? "").trim());
  // K-Citymarket publisher uses the price field for bundle totals; preserve the
  // bundle condition separately so it is not mistaken for a single-item price.
  const bundlePrice = String(item.priceText ?? "").replace(/\u00a0/g, " ").match(/(\d+(?:[,.]\d+)?\s*€)\s*\/\s*(\d+)\s*(kpl|pkt|ps|plo|prk)/i);
  if (bundlePrice) {
    const condition = `${bundlePrice[2]} ${bundlePrice[3]} = ${bundlePrice[1]}`;
    return benefit && !isCategory && !benefit.includes(condition) ? `${benefit} · ${condition}` : condition;
  }
  // Percentage-only offers have no reliable absolute euro price.
  const reverseBundlePrice = String(item.priceText ?? "").replace(/\u00a0/g, " ").match(/(\d+)\s*(kpl|pkt|ps|plo|prk)\s*(?:=|\/)\s*(\d+(?:[,.]\d+)?\s*€)/i);
  if (reverseBundlePrice) {
    const condition = `${reverseBundlePrice[1]} ${reverseBundlePrice[2]} = ${reverseBundlePrice[3]}`;
    return benefit && !isCategory && !benefit.includes(condition) ? `${benefit} · ${condition}` : condition;
  }
  const percent = String(item.priceText ?? "").match(/^\s*[−-]\s*\d+(?:[,.]\d+)?\s*%\s*$/);
  if (percent) return benefit && !isCategory && !benefit.includes(percent[0].trim()) ? `${benefit} · ${percent[0].trim()}` : percent[0].trim();
  const evidence = (item as any).debugOfferEvidenceV226;
  const sourceLabels = String(evidence?.rawLabels ?? "").replace(/\u00a0/g, " ");
  const explicitMultiBuy = sourceLabels.match(/\b(\d+\s*(?:kpl|pkt|ps|plo|prk)\s*=\s*\d+(?:[,.]\d+)?\s*€)/i)?.[1] ?? "";
  if (isCategory && explicitMultiBuy) return explicitMultiBuy;
  if (benefit && !isCategory) return benefit;
  if (explicitMultiBuy) return explicitMultiBuy;
  return String(item.validityText ||
    (item.validFrom && item.validTo ? `Voimassa ${String(item.validFrom)}–${String(item.validTo)}` : "")).trim();
}

export function mapZiiplyGostaOfferToCardOfferV147(item: ZiiplyGostaOfferLike) {
  const source = item as any;
  const textPrice = String(item.priceText ?? "");
  const bundle = textPrice.match(/(\d+(?:[,.]\d+)?)\s*€\s*\/\s*(\d+)\s*(?:kpl|pkt|ps|plo|prk)/i);
  const reverseBundle = textPrice.match(/(\d+)\s*(?:kpl|pkt|ps|plo|prk)\s*(?:=|\/)\s*(\d+(?:[,.]\d+)?)\s*€/i);
  const structuredQuantity = Number(source.offerQuantity ?? source.multiBuyQuantity);
  const bundleQuantity = bundle ? Number(bundle[2]) : reverseBundle ? Number(reverseBundle[1]) :
    Number.isInteger(structuredQuantity) && structuredQuantity > 1 ? structuredQuantity : null;
  const rawTotal = bundle?.[1] ?? reverseBundle?.[2];
  const structuredTotal = typeof item.price === "number" ? item.price : Number.NaN;
  const bundleTotal = rawTotal ? Number(rawTotal.replace(",", ".")) :
    bundleQuantity && Number.isFinite(structuredTotal) ? structuredTotal : null;
  return {
    id: item.id,
    name: item.title,
    title: item.title,
    productName: item.title,
    storeName: item.storeLabel,
    chain: item.chain,
    price: item.priceText ?? item.price,
    offerPrice: item.priceText ?? item.price,
    // Explicit metadata: bundle total is not the price of one item.
    bundleTotalPrice: bundleTotal,
    bundleQuantity,
    normalPrice: item.normalPrice,
    originalPrice: item.normalPrice,
    ean: item.ean,
    comparisonPrice: item.comparisonPrice,
    comparisonPriceText: item.unitPriceText,
    unitPrice: item.unitPriceText,
    comparisonUnit: item.comparisonUnit,
    // Never render a category label as a price promotion. For S-group rows,
    // recover explicit multi-buy wording from the publisher evidence when the
    // mapped benefitText was overwritten by a category in a parallel feed.
    discountText: resolveOfferCardDiscountTextV232(item),
    image: item.imageUrl,
    imageUrl: item.imageUrl,
    pictureUrl: item.imageUrl,
    productUrl: item.productUrl,
    category: getResolvedGostaCategoryV166(item),
    campaignType: (item as any).campaignType,
    __sourceOfferSearchResult: item,
  };
}

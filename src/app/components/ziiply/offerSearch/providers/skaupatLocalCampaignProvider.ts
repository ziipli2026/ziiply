// ============================================================================
// SKAUPAT_LOCAL_CAMPAIGN_PROVIDER_V4_VISIBLE_DEBUG_REMOVED
// Revision: V4-VISIBLE-DEBUG-REMOVED
// Date: 2026-09-20
//
// Muutos V3:een:
// - Poistaa käyttäjälle tarjousrivinä näkyvän S-LOCAL V2 DEBUG -diagnostiikan.
// - Resolver/input/HTTP/response/products/exception -epäonnistumisissa palautetaan [].
// - V3:n resolver-, RemoteGetPageContent-, tuote-, dedupe- ja muu hakulogiikka säilyy.
// - Export-nimi fetchSKaupatLocalCampaignOffersV1 säilyy.
// ============================================================================

// ============================================================================
// SKAUPAT_LOCAL_CAMPAIGN_PROVIDER_V3_LOCAL_NAME_CITY_RESOLVER
// Revision: V3-LOCAL-NAME-CITY-RESOLVER
// Date: 2026-09-20
//
// Korjaus V2:een:
// - remotePickupSlots / Nominatim -rakenne säilyy.
// - Korjaa lähikaupan nimen turvallisen osuman, kun Ziiplyn nimi sisältää
//   sekä kaupunginosan/myymälän että kaupungin, esim.
//   "S-market Kommila Varkaus".
// - V2/V216:n yksi yhtenäinen wantedPlace ("kommila varkaus") ei voi osua
//   pickup-nimeen "S-market Kommilan lastaussilta", vaikka city on "Varkaus".
// - V3 vertaa ketjun jälkeisiä paikkanimitokeneita erikseen pickup-nimeen ja
//   cityyn. Hyväksyntä vaatii oikean brandin sekä turvallisen paikkaosuman.
// - Ei kovakoodattuja store-ID:itä.
// - Näkyvä debug säilyy, jos resolver/pageContent vielä pysähtyy.
// ============================================================================

// ============================================================================
// SKAUPAT_LOCAL_CAMPAIGN_PROVIDER_V2_VISIBLE_DIAGNOSTICS
// Revision: V2-VISIBLE-DIAGNOSTICS
// Date: 2026-09-20
//
// Diagnostiikka V1:n päälle:
// - Varsinainen S-market/Alepa/Sale resolver + RemoteGetPageContent säilyy.
// - Jos resolver, HTTP tai response-rakenne pysäyttää haun, palautetaan yksi
//   näkyvä S-LOCAL V2 DEBUG -tulos eikä tyhjää listaa.
// - Näyttää resolvedStoreId:n, HTTP-statuksen, GraphQL data-avaimet,
//   pageContent-avaimet, section-määrän ja product-määrän.
// - Export-nimi fetchSKaupatLocalCampaignOffersV1 säilyy, joten Sources V32:ta
//   EI tarvitse muuttaa tämän testin vuoksi.
// ============================================================================

// ============================================================================
// SKAUPAT_LOCAL_CAMPAIGN_PROVIDER_V1_REMOTEGETPAGECONTENT
// Revision: V1-REMOTEGETPAGECONTENT
// Date: 2026-09-20
//
// UUSI ERILLINEN S-LÄHIKAUPPA-PROVIDER:
// - S-market / Alepa / Sale haetaan S-kaupat GraphQL RemoteGetPageContent -kutsulla.
// - path = "tuotteet/kampanjat", skipProducts = false.
// - Kaupan S-kaupat-ID ratkaistaan dynaamisesti valitun kaupan nimestä
//   remotePickupSlots-kyselyllä (sama todistettu resolveriperiaate kuin Prisma V216:ssa).
// - Ei kovakoodattuja yksittäisiä kauppa-ID:itä.
// - HAR-varmennettu S-market Kommila: 708276035, HTTP 200.
// - Tuotteet luetaan pageContent.sections[].products[] ja dedupoidaan EANilla.
// - Tukee nimissä S-market, Alepa ja Sale.
// - EI muuta Prisma-provideria, page.tsx:ää, normaalia tuotehakua, GPS:ää,
//   /api/store-searchia, Justiinaa eikä K-ryhmää.
// ============================================================================

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

type UnknownRecord = Record<string, any>;

export type SKaupatLocalCampaignProviderOptionsV1 = {
  storeId?: string | number | null;
  storeName?: string | null;
  sStoreId?: string | number | null;
  sStoreName?: string | null;
  areaLabel?: string | null;
  storeMode?: string | null;
  storeCompareScope?: string | null;
};

const SKAUPAT_REMOTE_GET_PAGE_CONTENT_HASH_V1 =
  "f6d87786fda8fb5c233c4eaed08f37b0c5b87dc0d8d4c44c33c5529e446369d1";

const SKAUPAT_REMOTE_PICKUP_SLOTS_HASH_V1 =
  "6da249b0fd87c05275a239ed490976c851d7aff90ead0f3a3978e8283f21252d";

const SKAUPAT_CLIENT_VERSION_V1 =
  "production-14a82a5b48cd1dd42c0592db0037514ed3c84de8";

const resolverCacheV1 = new Map<string, string | null>();

function currentFinnishDateV1() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeV1(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstStringV1(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function formatPriceV1(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2).replace(".", ",")} €` : "";
}

function formatComparisonPriceV1(value: unknown, unit: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const normalizedUnit = String(unit ?? "").toUpperCase();
  const suffix =
    normalizedUnit === "KG" || normalizedUnit === "KGM"
      ? "kg"
      : normalizedUnit === "L" || normalizedUnit === "LTR"
        ? "l"
        : normalizedUnit.toLowerCase();
  return suffix
    ? `${number.toFixed(2).replace(".", ",")} €/${suffix}`
    : `${number.toFixed(2).replace(".", ",")} €`;
}

function getBrandFromStoreNameV1(storeName: string) {
  const text = normalizeV1(storeName);
  if (text.startsWith("s market ") || text.startsWith("smarket ")) return "s-market";
  if (text.startsWith("alepa ") || text === "alepa") return "alepa";
  if (text.startsWith("sale ") || text === "sale") return "sale";
  return "";
}

function getPlaceFromStoreNameV1(storeName: string) {
  return normalizeV1(storeName)
    .replace(/^s\s*market\s+/, "")
    .replace(/^smarket\s+/, "")
    .replace(/^alepa\s+/, "")
    .replace(/^sale\s+/, "")
    .trim();
}

function isSupportedLocalSStoreV1(storeName: string) {
  return Boolean(getBrandFromStoreNameV1(storeName));
}

async function geocodeStoreV1(storeName: string) {
  const place = getPlaceFromStoreNameV1(storeName);
  const queries = Array.from(
    new Set(
      [`${storeName}, Finland`, place ? `${place}, Finland` : ""].filter(Boolean),
    ),
  );

  for (const query of queries) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("countrycodes", "fi");
      url.searchParams.set("q", query);
      url.searchParams.set("limit", "1");

      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "accept-language": "fi",
          "user-agent": "Ziiply/1.0 (+https://ziiply.fi)",
        },
      });
      if (!response.ok) continue;

      const data = await response.json();
      const first = Array.isArray(data) ? data[0] : null;
      const latitude = Number(first?.lat);
      const longitude = Number(first?.lon);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    } catch {
      // Kokeile seuraavaa determinististä hakua.
    }
  }

  return null;
}

type PickupCandidateV1 = {
  storeId: string;
  brand: string;
  pickupName: string;
  city: string;
  postalCode: string;
  distance: number | null;
};

async function fetchPickupCandidatesV1(
  latitude: number,
  longitude: number,
): Promise<PickupCandidateV1[]> {
  const date = currentFinnishDateV1();
  const variables = {
    startDate: date,
    endDate: date,
    location: { latitude, longitude },
    limit: 20,
  };
  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: SKAUPAT_REMOTE_PICKUP_SLOTS_HASH_V1,
    },
  };

  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", "remotePickupSlots");
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify(extensions));

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/graphql-response+json,application/json;q=0.9",
      "accept-language": "fi",
      origin: "https://www.s-kaupat.fi",
      referer: "https://www.s-kaupat.fi/",
      "x-client-name": "skaupat-web",
      "x-client-version": SKAUPAT_CLIENT_VERSION_V1,
    },
  });

  if (!response.ok) {
    throw new Error(`S-local remotePickupSlots failed: ${response.status}`);
  }

  const data = await response.json();
  const rows = data?.data?.pickupSlotsForCoordinates?.slotsInPickupPoints;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row: any) => ({
      storeId: String(row?.store?.id || "").trim(),
      brand: String(row?.store?.brand || "").trim().toLowerCase(),
      pickupName: String(row?.pickupPoint?.name || "").trim(),
      city: String(row?.pickupPoint?.address?.city || "").trim(),
      postalCode: String(row?.pickupPoint?.address?.postalCode || "").trim(),
      distance: Number.isFinite(Number(row?.distance)) ? Number(row.distance) : null,
    }))
    .filter((row: PickupCandidateV1) => /^\d{5,}$/.test(row.storeId));
}

function scorePickupCandidateV1(storeName: string, candidate: PickupCandidateV1) {
  const wantedBrand = getBrandFromStoreNameV1(storeName);
  const wantedPlace = getPlaceFromStoreNameV1(storeName);
  const pickup = normalizeV1(candidate.pickupName);
  const city = normalizeV1(candidate.city);
  let score = 0;

  if (wantedBrand && candidate.brand === wantedBrand) score += 100;
  else if (wantedBrand) score -= 100;

  if (wantedPlace) {
    if (pickup.includes(wantedPlace)) score += 100;
    if (city === wantedPlace) score += 50;
    else if (city && (wantedPlace.includes(city) || city.includes(wantedPlace))) score += 25;
  }

  if (candidate.distance != null) {
    if (candidate.distance <= 0.25) score += 50;
    else if (candidate.distance <= 1) score += 30;
    else if (candidate.distance <= 5) score += 10;
  }

  return score;
}

async function resolveLocalSStoreIdV1(storeName: string): Promise<string | null> {
  const cleanName = String(storeName || "").trim();
  if (!cleanName || !isSupportedLocalSStoreV1(cleanName)) return null;

  const key = normalizeV1(cleanName);
  if (resolverCacheV1.has(key)) return resolverCacheV1.get(key) ?? null;

  const coords = await geocodeStoreV1(cleanName);
  if (!coords) {
    resolverCacheV1.set(key, null);
    return null;
  }

  const candidates = await fetchPickupCandidatesV1(coords.latitude, coords.longitude);
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scorePickupCandidateV1(cleanName, candidate),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.candidate.distance ?? 999999) - (b.candidate.distance ?? 999999),
    );

  const best = ranked[0];
  const wantedBrand = getBrandFromStoreNameV1(cleanName);
  const wantedPlace = getPlaceFromStoreNameV1(cleanName);
  const pickupName = normalizeV1(best?.candidate.pickupName);
  const candidateCity = normalizeV1(best?.candidate.city);

  // V3: lähikaupan valintanimi voi olla muodossa "Kommila Varkaus".
  // S-kaupat palauttaa pickup-nimeksi esim. "S-market Kommilan lastaussilta"
  // ja cityksi "Varkaus". Yhtenäinen "kommila varkaus" ei siksi voi olla
  // pickupName.includes(...) -osuma. Verrataan merkityksellisiä tokeneita
  // erikseen pickup-nimeen ja cityyn.
  const wantedTokensV3 = wantedPlace
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  const pickupTokenHitsV3 = wantedTokensV3.filter((token) =>
    pickupName.includes(token),
  );
  const cityTokenHitsV3 = wantedTokensV3.filter(
    (token) =>
      candidateCity === token ||
      candidateCity.includes(token) ||
      token.includes(candidateCity),
  );

  const exactPlaceHitV3 = Boolean(
    wantedPlace && pickupName.includes(wantedPlace),
  );
  const splitPlaceHitV3 = Boolean(
    pickupTokenHitsV3.length > 0 && cityTokenHitsV3.length > 0,
  );
  const singleTokenCityHitV3 = Boolean(
    wantedTokensV3.length === 1 &&
      cityTokenHitsV3.length === 1 &&
      best?.candidate.distance != null &&
      best.candidate.distance <= 0.5,
  );
  const veryNear =
    best?.candidate.distance != null && best.candidate.distance <= 0.25;
  const brandOk = Boolean(
    best && (!wantedBrand || best.candidate.brand === wantedBrand),
  );
  const safePlaceHitV3 =
    exactPlaceHitV3 || splitPlaceHitV3 || singleTokenCityHitV3 || veryNear;

  if (!best || !brandOk || !safePlaceHitV3 || best.score < 100) {
    resolverCacheV1.set(key, null);
    return null;
  }

  resolverCacheV1.set(key, best.candidate.storeId);
  return best.candidate.storeId;
}

function buildRemoteGetPageContentUrlV1(storeId: string) {
  const availabilityDate = currentFinnishDateV1();

  const variables = {
    preview: false,
    storeId,
    skipProducts: false,
    availabilityDate,
    where: {
      storeId,
      path: "tuotteet/kampanjat",
      platform: "WEB",
      availabilityDate,
      userConsent: {
        marketing: false,
        marketingId: "ziiply-gosta",
        useCustomerId: false,
        sessionId: "ziiply-gosta",
        loop54: true,
      },
    },
  };

  const extensions = {
    clientLibrary: {
      name: "@apollo/client",
      version: "4.2.12",
    },
    persistedQuery: {
      version: 1,
      sha256Hash: SKAUPAT_REMOTE_GET_PAGE_CONTENT_HASH_V1,
    },
  };

  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", "RemoteGetPageContent");
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify(extensions));
  return url.toString();
}

function productImageUrlV1(product: UnknownRecord) {
  const template =
    product?.productDetails?.productImages?.mainImage?.urlTemplate ||
    product?.productDetails?.productImages?.mobileReadyHeroImage?.urlTemplate ||
    "";
  if (!template) return "";

  return String(template)
    .replace("{MODIFIERS}", "w360h360@_q75")
    .replace("{EXTENSION}", "webp");
}

function productUrlV1(product: UnknownRecord) {
  const slug = firstStringV1(product?.slug);
  return slug ? `https://www.s-kaupat.fi/tuote/${slug}` : "";
}

function hierarchyNamesV1(product: UnknownRecord) {
  const rows = Array.isArray(product?.hierarchyPath) ? product.hierarchyPath : [];
  return rows.map((row: any) => firstStringV1(row?.name)).filter(Boolean);
}

function getCategoryMetaV1(product: UnknownRecord, sectionTitle: string) {
  const hierarchy = hierarchyNamesV1(product);
  const topLevel = hierarchy.length ? hierarchy[hierarchy.length - 1] : "";
  const leaf = hierarchy.length ? hierarchy[0] : "";
  const category = topLevel || sectionTitle || "Muut";
  const categoryPath = hierarchy.length
    ? [...hierarchy].reverse().join(" > ")
    : category;

  return {
    category,
    categoryPath,
    breadcrumbs: hierarchy,
    hierarchy,
    taxonomy: hierarchy,
    department: topLevel || category,
    productGroup: leaf || category,
    mainCategory: topLevel || category,
    subCategory: leaf || category,
  };
}

function matchScoreV1(query: string, product: UnknownRecord, categoryText: string) {
  const clean = normalizeV1(query);
  if (!clean || clean === "ziiply all offers") return 1;

  const haystack = normalizeV1(
    [
      product?.name,
      product?.brandName,
      categoryText,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const words = clean.split(" ").filter(Boolean);
  if (!words.length) return 1;
  if (haystack.includes(clean)) return 100;
  const hits = words.filter((word) => haystack.includes(word)).length;
  return hits > 0 ? hits * 10 : 0;
}

function mapProductV1(
  product: UnknownRecord,
  section: UnknownRecord,
  config: ZiiplyOfferSearchSourceConfig,
  storeId: string,
  storeName: string,
  query: string,
  index: number,
): ZiiplyOfferSearchResult | null {
  const title = firstStringV1(product?.name);
  if (!title) return null;

  const pricing = product?.pricing || product?.store?.pricing || {};
  const currentPrice =
    pricing?.campaignPrice ??
    pricing?.currentPrice ??
    product?.price;
  const regularPrice =
    pricing?.regularPrice ??
    product?.price;
  const comparisonPrice =
    pricing?.comparisonPrice ??
    product?.comparisonPrice;
  const comparisonUnit =
    pricing?.comparisonUnit ??
    product?.comparisonUnit;

  const sectionTitle = firstStringV1(section?.title);
  const sectionDescription = firstStringV1(section?.description);
  const categoryMeta = getCategoryMetaV1(product, sectionTitle);
  const priceText = formatPriceV1(currentPrice);
  const unitPriceText = formatComparisonPriceV1(comparisonPrice, comparisonUnit);
  const campaignUntil = firstStringV1(pricing?.campaignPriceValidUntil);
  const imageUrl = productImageUrlV1(product);
  const ean = firstStringV1(product?.ean);
  const id = ean || firstStringV1(product?.id, product?.sokId) || `s-local-${storeId}-${index}`;

  const hasLowerCampaignPrice =
    Number.isFinite(Number(currentPrice)) &&
    Number.isFinite(Number(regularPrice)) &&
    Number(currentPrice) < Number(regularPrice);

  const benefitText = hasLowerCampaignPrice
    ? `Kampanja, normaalisti ${formatPriceV1(regularPrice)}`
    : sectionTitle;

  const rawText = [
    title,
    product?.brandName,
    priceText,
    unitPriceText,
    sectionTitle,
    sectionDescription,
    categoryMeta.category,
    categoryMeta.categoryPath,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id,
    source: config.id,
    sourceUrl: config.url,
    chain: config.chain,
    storeLabel: storeName,
    storeName,
    shopName: storeName,
    title,
    priceText,
    unitPriceText,
    benefitText,
    validityText: campaignUntil ? `Voimassa ${campaignUntil}` : sectionDescription,
    imageUrl,
    image: imageUrl,
    pictureUrl: imageUrl,
    productUrl: productUrlV1(product),
    rawText,
    matchScore: matchScoreV1(query, product, `${categoryMeta.category} ${sectionTitle}`),
    category: categoryMeta.category,
    categoryPath: categoryMeta.categoryPath,
    breadcrumbs: categoryMeta.breadcrumbs,
    hierarchy: categoryMeta.hierarchy,
    taxonomy: categoryMeta.taxonomy,
    department: categoryMeta.department,
    productGroup: categoryMeta.productGroup,
    mainCategory: categoryMeta.mainCategory,
    subCategory: categoryMeta.subCategory,
    brandName: firstStringV1(product?.brandName),
    ean,
  } as unknown as ZiiplyOfferSearchResult;
}

function makeLocalDebugV2(
  config: ZiiplyOfferSearchSourceConfig,
  storeName: string,
  detail: string,
): ZiiplyOfferSearchResult {
  const text = `S-LOCAL V2 DEBUG | store=${storeName || "-"} | ${detail}`;
  return {
    id: `s-local-v2-debug-${Date.now()}`,
    source: "debug",
    sourceUrl: config.url,
    chain: "S",
    storeLabel: storeName || "S-LOCAL DEBUG",
    storeName: storeName || "S-LOCAL DEBUG",
    shopName: storeName || "S-LOCAL DEBUG",
    title: text,
    priceText: "0,00 €",
    unitPriceText: "",
    benefitText: "S-local provider diagnostics",
    validityText: "DEBUG",
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: "",
    rawText: text,
    matchScore: 999999,
    category: "Muut",
    categoryPath: "Muut",
    breadcrumbs: "Muut",
    hierarchy: "Muut",
    taxonomy: "Muut",
    department: "Muut",
    productGroup: "Muut",
    mainCategory: "Muut",
    subCategory: "Muut",
    brandName: "DEBUG",
    ean: `s-local-v2-debug-${Date.now()}`,
  } as unknown as ZiiplyOfferSearchResult;
}

export async function fetchSKaupatLocalCampaignOffersV1(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
  options?: SKaupatLocalCampaignProviderOptionsV1,
): Promise<ZiiplyOfferSearchResult[]> {
  const storeName = firstStringV1(options?.storeName, options?.sStoreName);

  if (!storeName) {
    return [];
  }

  try {
    // Ziiply/Ruoanhinta storeId:tä ei käytetä S-kaupat-ID:nä.
    const resolvedStoreId = await resolveLocalSStoreIdV1(storeName);

    if (!resolvedStoreId) {
      return [];
    }

    const response = await fetch(buildRemoteGetPageContentUrlV1(resolvedStoreId), {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/graphql-response+json,application/json;q=0.9",
        "accept-language": "fi",
        origin: "https://www.s-kaupat.fi",
        referer: "https://www.s-kaupat.fi/",
        "x-client-name": "skaupat-web",
        "x-client-version": SKAUPAT_CLIENT_VERSION_V1,
      },
    });

    const httpStatus = response.status;

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const dataKeys =
      data?.data && typeof data.data === "object"
        ? Object.keys(data.data).join(",")
        : "-";
    const pageContent = data?.data?.pageContent;
    const pageKeys =
      pageContent && typeof pageContent === "object"
        ? Object.keys(pageContent).join(",")
        : "-";
    const sections = pageContent?.sections;

    if (!Array.isArray(sections)) {
      return [];
    }

    const mapped: ZiiplyOfferSearchResult[] = [];
    let index = 0;
    let rawProductCount = 0;

    for (const section of sections) {
      const products = Array.isArray(section?.products) ? section.products : [];
      rawProductCount += products.length;

      for (const product of products) {
        const item = mapProductV1(
          product,
          section,
          config,
          resolvedStoreId,
          storeName,
          query,
          index++,
        );
        if (item) mapped.push(item);
      }
    }

    const seen = new Set<string>();
    const deduped = mapped.filter((item: any) => {
      const key = item?.ean
        ? `ean:${String(item.ean).trim()}`
        : `id:${String(item?.id || "").trim()}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!deduped.length) {
      return [];
    }

    return deduped;
  } catch (error) {
    return [];
  }
}


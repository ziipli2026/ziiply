// ZIIPLY_OFFER_SEARCH_SOURCES_V24_VISIBLE_ET_DEBUG_PROVIDERLESS
// Pohja: käyttäjän V15 strict category query + V21.
// Korjaus V23:
// - EI käytetä olematonta /api/ziiply/etarjouslehdet/offers-reittiä.
// - S-marketin eTarjouslehdet/Tjek-haku tehdään tässä samassa serverissä suoraan.
// - Prisma pidetään S-kaupat.fi-providerissa.
// - S-marketit poistetaan S-kaupat.fi-providerilta ja haetaan valittujen S-market-nimien perusteella eTarjouslehdet-fronts-datasta.
// - Ei kovakoodata Vehkojaa. K-provider säilyy ennallaan.

// src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts
// ZIIPLY_OFFER_SEARCH_SOURCES_V15_STRICT_CATEGORY_QUERY_NO_RERANK_CATEGORY
//
// V15 korjaus:
// - Göstan tuoteryhmähaussa tunnettu kategoria (Liha, Valmisruoka jne.) suodatetaan providerin omasta category-kentästä.
// - Non-food kuten paistinpannu/muovilaatikko ei enää pääse Liha/Valmisruoka-hakuun vain siksi, että hakusana/ranker osuu.
// - Ranking ei enää ylikirjoita result.category-kenttää rawTextillä, koska se sotki kortin tuoteryhmämerkintöjä.
//
// V11 korjaus:
// - Gösta ei enää aja S-kaupat-provideria, kun kauppavalinta on Ketjun sisältä -> K-ryhmä.
// - K-provider valitaan mukaan scope/withinChain/kStoreId-kontekstin perusteella.
// - K-lähde valitaan kStoreName-nimen mukaan: K-Market / K-Supermarket / K-Citymarket.
// - Ketjujen väliltä voi ajaa sekä S- että K-providerit rinnakkain.
//
// V6 korjaus:
// - Special query __ziiply_all_offers__ runs a broad S-kaupat seed sweep once and bypasses intent ranking/matchScore filtering.
// - Gösta master dataset gets the provider offer list as-is, so local category counts are not based on a tiny ranked sample.
//
// V5 korjaus:
// - Vanhaa pelkän hakusanan välimuistia ei käytetä oletuksena, jotta Varkaus/Mikkeli-tyyppinen
//   stale tarjousdata ei voi jäädä kummittelemaan Göstan tuloksiin.
// - Tulosikkuna nostettu 40 -> 500, jotta kategoriat muodostuvat koko tarjouskirjosta eivätkä vain
//   ensimmäisestä pienestä ranked-otoksesta.
// - Säilyttää S-kaupat MVP -polun ja K-Ruoka-funktiot ennallaan.
//
// Debugin perusteella K-Ruoka palauttaa Vercel-serverille Cloudflare 403 -sivun,
// joten K-Market ja K-Supermarket pidetään mukana funktioina mutta ei ajeta
// yhdistetyssä MVP-haussa. S-kaupat palauttaa HTML:n oikein ja toimii ensin.

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "./types";
import { fetchKruokaOffers, type KruokaOfferProviderOptionsV10 } from "./providers/kruokaProvider";
import { fetchSKaupatOffers, type SKaupatOfferProviderOptionsV173 } from "./providers/skaupatProvider";
import {
  getCachedOfferResults,
  setCachedOfferResults,
} from "./ziiplyOfferSearchCache";

import {
  resolveSearchIntentAI,
} from "../searchIntentAI";

import {
  rankProductsWithIntentMemory,
} from "../searchIntentMemory";

export type {
  ZiiplyOfferChain,
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
  ZiiplyOfferSource,
} from "./types";

export type ZiiplyOfferSearchSourceContextV8 = SKaupatOfferProviderOptionsV173 & KruokaOfferProviderOptionsV10 & {
  areaLabel?: string | null;
  storeMode?: string | null;
  storeCompareScope?: string | null;
  withinChain?: string | null;
  selectedChain?: string | null;
  sStoreId?: string | number | null;
  sStoreName?: string | null;
  sStoreIds?: Array<string | number | null | undefined> | null;
  sStoreNames?: Array<string | null | undefined> | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
  kStoreIds?: Array<string | number | null | undefined> | null;
  kStoreNames?: Array<string | null | undefined> | null;
};

function splitOfferMultiValueV13(value: unknown): string[] {
  const normalized = String(value ?? "")
    .replaceAll("\r", "")
    .replaceAll("\n", "||")
    .replaceAll(";", "||");

  return normalized
    .split("||")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeOfferStoreListV11(arrayValue: unknown, fallbackValue: unknown): string[] {
  const fromArray = Array.isArray(arrayValue)
    ? arrayValue.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];

  return Array.from(new Set([...fromArray, ...splitOfferMultiValueV13(fallbackValue)]));
}

function hasAnyOfferStoreV11(arrayValue: unknown, fallbackValue: unknown): boolean {
  return normalizeOfferStoreListV11(arrayValue, fallbackValue).some(isRealStoreIdV10);
}

function normalizeSKaupatProviderOptionsV8(
  options?: ZiiplyOfferSearchSourceContextV8,
): SKaupatOfferProviderOptionsV173 | undefined {
  if (!options) return undefined;

  // Route/page context uses sStoreId/sStoreName, while skaupatProvider expects
  // storeId/storeName. Without this bridge the provider cannot resolve the
  // selected S-store and may return [] or leave the UI showing stale results.
  return {
    ...options,
    storeId: options.storeId ?? options.sStoreId ?? null,
    storeName: options.storeName ?? options.sStoreName ?? null,
  };
}


function normalizeKruokaProviderOptionsV9(
  options?: ZiiplyOfferSearchSourceContextV8,
): KruokaOfferProviderOptionsV10 | undefined {
  if (!options) return undefined;

  return {
    ...options,
    storeId: options.kStoreId ?? options.storeId ?? null,
    storeName: options.kStoreName ?? options.storeName ?? null,
    kStoreId: options.kStoreId ?? null,
    kStoreName: options.kStoreName ?? null,
  };
}

const ZIIPLY_OFFER_SOURCES = {
  kmarket: {
    id: "kmarket",
    chain: "K",
    storeLabel: "K-Market",
    url: "https://www.k-ruoka.fi/k-market/tarjouslehti",
  },
  ksupermarket: {
    id: "ksupermarket",
    chain: "K",
    storeLabel: "K-Supermarket",
    url: "https://www.k-ruoka.fi/k-supermarket/tarjouslehti",
  },
  kcitymarket: {
    // ZiiplyOfferSource-type ei tunne erillistä kcitymarket-id:tä; käytetään ksupermarket-id:tä kuten aiemmassa build-ok versiossa.
    id: "ksupermarket",
    chain: "K",
    storeLabel: "K-Citymarket",
    url: "https://www.k-ruoka.fi/k-citymarket/tarjouslehti",
  },
  skaupat: {
    id: "skaupat",
    chain: "S",
    storeLabel: "S-kaupat",
    url: "https://www.s-kaupat.fi/tuotteet/kampanjat",
  },
} satisfies Record<string, ZiiplyOfferSearchSourceConfig>;

const OFFER_SEARCH_SOURCE_REVISION = "v24-visible-et-debug";
const ENABLE_OFFER_SEARCH_CACHE = false;
const MAX_OFFER_SEARCH_RESULTS = 1000;
const ZIIPLY_GOSTA_MASTER_QUERY_V6 = "__ziiply_all_offers__";

const ETARJOUSLEHDET_BATCH_URL_V23 = "https://etarjouslehdet.fi/";
const TJEK_RPC_URL_V23 = "https://squid-api.tjek.com/v4/rpc";
type ETUnknownRecordV23 = Record<string, unknown>;

// V8: master query is passed directly to provider; provider handles DISCOUNTED filter.


const STRICT_GOSTA_CATEGORY_QUERIES_V15 = new Set([
  "kahvi",
  "maitotuotteet",
  "liha",
  "kala",
  "leipomo",
  "hevi",
  "juomat",
  "pakasteet",
  "valmisruoka",
  "kuivatuotteet",
  "makeiset keksit",
  "lemmikit",
  "koti",
  "muut",
]);

function normalizeGostaCategoryKeyV15(value: unknown) {
  return normalizeOfferUniqueText(value)
    .replace(/&/g, " ")
    .replace(/\bja\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getResultCategoryTextV15(result: ZiiplyOfferSearchResult) {
  const anyResult = result as any;
  return String(
    anyResult.category ||
      anyResult.categoryLabel ||
      anyResult.group ||
      anyResult.department ||
      anyResult.productGroup ||
      "",
  ).trim();
}

function isStrictGostaCategoryQueryV15(query: string) {
  return STRICT_GOSTA_CATEGORY_QUERIES_V15.has(normalizeGostaCategoryKeyV15(query));
}

function offerMatchesStrictGostaCategoryV15(result: ZiiplyOfferSearchResult, query: string) {
  const queryKey = normalizeGostaCategoryKeyV15(query);
  const categoryKey = normalizeGostaCategoryKeyV15(getResultCategoryTextV15(result));

  if (!queryKey || !categoryKey) return false;
  if (categoryKey === queryKey) return true;

  // Makeiset & keksit voi tulla eri lähteistä muodossa "Makeiset", "Keksit" tai "Makeiset ja keksit".
  if (queryKey === "makeiset keksit") {
    return categoryKey === "makeiset" || categoryKey === "keksit" || categoryKey === "makeiset keksit";
  }

  return false;
}

function getOfferSearchCacheKey(query: string) {
  return `${OFFER_SEARCH_SOURCE_REVISION}:${query}`;
}

function normalizeOfferUniqueText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUniqueOfferKeyV4(result: ZiiplyOfferSearchResult) {
  const anyResult = result as any;
  const ean = normalizeOfferUniqueText(anyResult.ean || anyResult.gtin || anyResult.barcode || "");

  if (ean) return `ean:${ean}`;

  const title = normalizeOfferUniqueText(result.title);
  const store = normalizeOfferUniqueText(result.storeLabel);

  if (title) return `title:${title}|store:${store}`;

  return normalizeOfferUniqueText(
    [result.source, result.title, result.priceText].filter(Boolean).join("|"),
  );
}

function uniqueOfferResults(results: ZiiplyOfferSearchResult[]) {
  const seen = new Set<string>();
  const unique: ZiiplyOfferSearchResult[] = [];

  for (const result of results) {
    const key = getUniqueOfferKeyV4(result);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }

  return unique;
}

async function safelySearchSource(
  label: string,
  task: () => Promise<ZiiplyOfferSearchResult[]>,
) {
  try {
    return await task();
  } catch (error) {
    console.warn(`[Ziiply offers] ${label} epäonnistui`, error);
    return [];
  }
}

export async function searchKMarketOffers(
  query: string,
  options?: KruokaOfferProviderOptionsV10,
) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.kmarket, options);
}

export async function searchKSupermarketOffers(
  query: string,
  options?: KruokaOfferProviderOptionsV10,
) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.ksupermarket, options);
}


export async function searchKCitymarketOffers(
  query: string,
  options?: KruokaOfferProviderOptionsV10,
) {
  return fetchKruokaOffers(query, ZIIPLY_OFFER_SOURCES.kcitymarket, options);
}

function isRealStoreIdV10(value: unknown) {
  const text = String(value ?? "").trim();
  return Boolean(text && text !== "0" && !/^valitse/i.test(text));
}

function normalizeChainValueV10(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function getProviderScopeV10(options?: ZiiplyOfferSearchSourceContextV8) {
  const scope = String(options?.storeCompareScope ?? "").trim();
  const withinChain = normalizeChainValueV10((options as any)?.withinChain ?? (options as any)?.selectedChain);
  const hasS = hasAnyOfferStoreV11(options?.sStoreIds, options?.sStoreId ?? options?.storeId);
  const hasK = hasAnyOfferStoreV11(options?.kStoreIds, options?.kStoreId);

  if (scope === "within_chain") {
    // Tärkein korjaus:
    // Ketjun sisältä / K-ryhmässä vanha activeStores voi edelleen sisältää S-kaupan.
    // Silloin S-provider EI saa ajaa, koska Gösta näyttää muuten Prisma/S-kaupat-osumia.
    if (withinChain === "K") return { useS: false, useK: hasK };
    if (withinChain === "S") return { useS: hasS, useK: false };

    // Fallback vanhoille page-versioille, joissa withinChain ei vielä tule contextiin.
    if (hasK) return { useS: false, useK: true };
    if (hasS) return { useS: true, useK: false };
  }

  return {
    useS: hasS || scope !== "within_chain",
    useK: hasK,
  };
}

function getKruokaSourceByStoreNameV10(options?: ZiiplyOfferSearchSourceContextV8): ZiiplyOfferSearchSourceConfig {
  const name = normalizeOfferUniqueText(options?.kStoreName ?? options?.storeName ?? "");

  if (name.includes("citymarket") || name.includes("k citymarket")) {
    return {
      ...ZIIPLY_OFFER_SOURCES.kcitymarket,
      storeLabel: String(options?.kStoreName || ZIIPLY_OFFER_SOURCES.kcitymarket.storeLabel),
    };
  }

  if (name.includes("supermarket") || name.includes("k supermarket")) {
    return {
      ...ZIIPLY_OFFER_SOURCES.ksupermarket,
      storeLabel: String(options?.kStoreName || ZIIPLY_OFFER_SOURCES.ksupermarket.storeLabel),
    };
  }

  return {
    ...ZIIPLY_OFFER_SOURCES.kmarket,
    storeLabel: String(options?.kStoreName || ZIIPLY_OFFER_SOURCES.kmarket.storeLabel),
  };
}

export async function searchSelectedKruokaOffersV10(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const source = getKruokaSourceByStoreNameV10(options);
  const kOptions = normalizeKruokaProviderOptionsV9(options);
  return fetchKruokaOffers(query, source, kOptions);
}


function isSMarketOfferStoreNameV21(value: unknown) {
  const text = normalizeOfferUniqueText(value);
  return text.includes("s market") || text.includes("s-market");
}

function isPrismaOfferStoreNameV21(value: unknown) {
  return normalizeOfferUniqueText(value).includes("prisma");
}

function normalizeSKaupatProviderOptionsPrismaOnlyV21(
  options?: ZiiplyOfferSearchSourceContextV8,
): ZiiplyOfferSearchSourceContextV8 | undefined {
  if (!options) return undefined;

  const ids = normalizeOfferStoreListV11(options.sStoreIds, options.sStoreId ?? options.storeId);
  const names = normalizeOfferStoreListV11(options.sStoreNames, options.sStoreName ?? options.storeName);
  const maxLength = Math.max(ids.length, names.length);
  const nextIds: string[] = [];
  const nextNames: string[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const id = ids[index] || "";
    const name = names[index] || "";

    // S-kaupat.fi-provider saa jatkossa S-puolelta vain Prismat.
    // S-marketit menevät V23:n suoraan eTarjouslehdet/Tjek-hakuun.
    if (isSMarketOfferStoreNameV21(name)) continue;
    if (isPrismaOfferStoreNameV21(name) || id) {
      nextIds.push(id);
      nextNames.push(name);
    }
  }

  return {
    ...options,
    storeId: nextIds[0] || null,
    storeName: nextNames[0] || null,
    sStoreId: nextIds[0] || null,
    sStoreName: nextNames[0] || null,
    sStoreIds: nextIds,
    sStoreNames: nextNames,
  } as ZiiplyOfferSearchSourceContextV8;
}

function getSelectedSMarketNamesV21(options?: ZiiplyOfferSearchSourceContextV8): string[] {
  const names = normalizeOfferStoreListV11(options?.sStoreNames, options?.sStoreName ?? options?.storeName);
  return Array.from(new Set(names.filter(isSMarketOfferStoreNameV21)));
}

function etAsRecordV23(value: unknown): ETUnknownRecordV23 | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ETUnknownRecordV23)
    : null;
}

function etFirstStringV23(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) return text;
      continue;
    }

    const record = etAsRecordV23(value);
    if (record) {
      const text = etFirstStringV23(record.name, record.title, record.label, record.displayName, record.id, record.value);
      if (text) return text;
    }
  }
  return "";
}

function etEncodeQueryKeyV23(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function etDecodeQueryKeyV23(value: unknown): string {
  try {
    return Buffer.from(String(value || ""), "base64").toString("utf8");
  } catch {
    return "";
  }
}

async function etPostQueriesV23(queries: unknown[]): Promise<ETUnknownRecordV23[]> {
  const response = await fetch(ETARJOUSLEHDET_BATCH_URL_V23, {
    method: "POST",
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
      referer: "https://etarjouslehdet.fi/S-market",
      origin: "https://etarjouslehdet.fi",
    },
    body: JSON.stringify({ data: queries.map(etEncodeQueryKeyV23) }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`eTarjouslehdet batch failed: ${response.status}`);
  }

  const text = await response.text();
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ETUnknownRecordV23);
}

function etGetBatchValueV23(results: ETUnknownRecordV23[], queryName: string): unknown {
  const result = results.find((entry) => etDecodeQueryKeyV23(entry.key).includes(`"${queryName}"`));
  return result?.value;
}

function etPublicationMatchesStoreNameV23(publication: ETUnknownRecordV23, storeName: string): boolean {
  const label = normalizeOfferUniqueText(
    etFirstStringV23(publication.label, publication.name, publication.title, publication.publicationName),
  );
  const wanted = normalizeOfferUniqueText(storeName);
  if (!label || !wanted) return false;

  if (label === wanted) return true;
  if (label.includes(wanted) || wanted.includes(label)) return true;

  const wantedWithoutChain = wanted.replace(/^s\s*market\s+/, "").replace(/^s-market\s+/, "").trim();
  const labelWithoutChain = label.replace(/^s\s*market\s+/, "").replace(/^s-market\s+/, "").trim();

  return Boolean(
    wantedWithoutChain &&
      labelWithoutChain &&
      (labelWithoutChain.includes(wantedWithoutChain) || wantedWithoutChain.includes(labelWithoutChain)),
  );
}

async function etResolveSMarketPublicationsV23(storeNames: string[]) {
  const results = await etPostQueriesV23([
    ["fronts", { businessSlugs: ["S-market"] }],
  ]);

  const fronts = etGetBatchValueV23(results, "fronts");
  const publications = Array.isArray(fronts)
    ? fronts.flatMap((front) => {
        const record = etAsRecordV23(front);
        return Array.isArray(record?.publications) ? record.publications : [];
      })
    : [];

  return storeNames
    .map((storeName) => {
      const publication = publications
        .map(etAsRecordV23)
        .filter(Boolean)
        .find((entry) => etPublicationMatchesStoreNameV23(entry as ETUnknownRecordV23, storeName)) as ETUnknownRecordV23 | undefined;

      if (!publication) return null;

      return {
        storeName,
        publicationId: etFirstStringV23(publication.id, publication.publicId),
        publicationName: etFirstStringV23(publication.label, publication.name, storeName),
        validFrom: etFirstStringV23(publication.validFrom),
        validUntil: etFirstStringV23(publication.validUntil),
      };
    })
    .filter(Boolean) as Array<{
      storeName: string;
      publicationId: string;
      publicationName: string;
      validFrom: string;
      validUntil: string;
    }>;
}

async function etGeneratePublicationV23(publicationId: string): Promise<ETUnknownRecordV23 | null> {
  const response = await fetch(`${TJEK_RPC_URL_V23}/generate_incito_from_publication`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://etarjouslehdet.fi",
      referer: "https://etarjouslehdet.fi/",
    },
    body: JSON.stringify({
      id: publicationId,
      device_category: "desktop",
      pointer: "fine",
      orientation: "horizontal",
      pixel_ratio: 2,
      max_width: 1400,
      viewport_width: 1400,
      viewport_height: 900,
      versions_supported: ["1.0.0"],
      locale_code: "fi-FI",
      time: new Date().toISOString(),
      feature_labels: [],
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Tjek publication failed: ${response.status}`);
  return etAsRecordV23(await response.json());
}

function etCollectOfferIdsV23(value: unknown): string[] {
  const ids: string[] = [];

  function walk(node: unknown) {
    const record = etAsRecordV23(node);
    if (!record) return;

    const id = etFirstStringV23(record.id);
    if (/^\d{6,}/.test(id)) ids.push(id);

    const children = Array.isArray(record.child_views) ? record.child_views : [];
    for (const child of children) walk(child);
  }

  walk(value);
  return Array.from(new Set(ids));
}

function etCollectSectionsV23(publication: ETUnknownRecordV23) {
  const toc = Array.isArray(publication.table_of_contents) ? publication.table_of_contents : [];
  const titleById = new Map<string, string>();

  for (const entry of toc) {
    const record = etAsRecordV23(entry);
    const id = etFirstStringV23(record?.view_id, record?.id);
    const title = etFirstStringV23(record?.title, record?.label);
    if (id) titleById.set(id, title);
  }

  const root = etAsRecordV23(publication.root_view);
  const pages = Array.isArray(root?.child_views) ? root.child_views : [];

  return pages
    .map((page, pageIndex) => {
      let sectionId = "";

      function findSectionId(node: unknown) {
        if (sectionId) return;
        const record = etAsRecordV23(node);
        if (!record) return;

        const id = etFirstStringV23(record.id);
        if (id && titleById.has(id)) {
          sectionId = id;
          return;
        }

        const children = Array.isArray(record.child_views) ? record.child_views : [];
        for (const child of children) findSectionId(child);
      }

      findSectionId(page);

      return {
        sectionId,
        title: titleById.get(sectionId) || "Muut",
        pageNumber: pageIndex + 1,
        pageCount: pages.length,
        offerIds: etCollectOfferIdsV23(page),
      };
    })
    .filter((section) => section.sectionId && section.offerIds.length > 0);
}

async function etGenerateSectionV23(
  publicationId: string,
  section: { sectionId: string; pageNumber: number; pageCount: number; offerIds: string[] },
) {
  const response = await fetch(`${TJEK_RPC_URL_V23}/generate_incito_from_publication_section`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://etarjouslehdet.fi",
      referer: "https://etarjouslehdet.fi/",
    },
    body: JSON.stringify({
      id: publicationId,
      section_id: section.sectionId,
      page_number: section.pageNumber,
      page_count: section.pageCount,
      offer_ids: section.offerIds,
      a_offer_ids: [],
      pixel_ratio: 2,
      scale: 0.6,
      modest_branding: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return etAsRecordV23(await response.json());
}

function etFindOfferNodesV23(value: unknown): ETUnknownRecordV23[] {
  const found: ETUnknownRecordV23[] = [];

  function walk(node: unknown) {
    const record = etAsRecordV23(node);
    if (!record) return;

    if (etFirstStringV23(record.role) === "offer" && etFirstStringV23(record.accessibility_label)) {
      found.push(record);
    }

    const children = Array.isArray(record.child_views) ? record.child_views : [];
    for (const child of children) walk(child);
  }

  walk(value);
  return found;
}

function etParseOfferLabelV23(label: string) {
  const match = String(label || "").match(/^(.*?),\s*EUR\s*([\d,.]+)\s*$/i);
  if (!match) return { title: String(label || "").trim(), priceText: "" };

  return {
    title: match[1].trim(),
    priceText: `${Number(match[2].replace(",", ".")).toFixed(2).replace(".", ",")} €`,
  };
}

function etClassifyCategoryV23(title: string, sectionTitle: string) {
  const text = normalizeOfferUniqueText(`${title} ${sectionTitle}`);
  if (/kahvi|espresso|juhla mokka|presidentti|kulta katriina/.test(text)) return "Kahvi";
  if (/maito|juusto|jogurtti|jogurt|rahka|kerma|voi|raejuusto|viili|piima/.test(text)) return "Maitotuotteet";
  if (/lohi|kirjolohi|kala|tonnikala|silakka|seiti|ahven|siika|katkarapu|rapu/.test(text)) return "Kala";
  if (/jauheliha|nauta|porsas|possu|broileri|kana|kalkkuna|makkara|nakki|pekoni|kinkku|liha/.test(text)) return "Liha";
  if (/leipa|leipä|sampyla|sämpylä|pull|pitko|croissant|karjalanpiirakka|ruis|patonki/.test(text)) return "Leipomo";
  if (/tomaatti|kurkku|salaatti|omena|banaani|appelsiini|peruna|sipuli|porkkana|marja|hedel|vihanne|kasvis|kaali|paprika/.test(text)) return "Hevi";
  if (/limu|juoma|mehu|vesi|vichy|energiajuoma|olut|siideri|cola|maitojuoma/.test(text)) return "Juomat";
  if (/pakaste|jaatelo|jäätelö|pakastettu/.test(text)) return "Pakasteet";
  if (/valmis|ateria|pizza|keitto|salaattiateria|mikro/.test(text)) return "Valmisruoka";
  if (/pasta|riisi|jauho|hiutale|muro|mysli|sailyke|säilyke|kastike|öljy|oljy|mauste/.test(text)) return "Kuivatuotteet";
  if (/kark|makeis|suklaa|keksi|lakritsi|salmiakki|purukumi/.test(text)) return "Makeiset & keksit";
  if (/koira|kissa|lemmik/.test(text)) return "Lemmikit";
  if (/pesu|pyykin|tisk|talouspaperi|wc-paperi|koti|siivous|vaippa/.test(text)) return "Koti";
  return "Muut";
}

function etOfferMatchesQueryV23(query: string, offer: ETUnknownRecordV23) {
  const q = normalizeOfferUniqueText(query);
  if (!q || q === normalizeOfferUniqueText(ZIIPLY_GOSTA_MASTER_QUERY_V6)) return true;

  const haystack = normalizeOfferUniqueText([offer.title, offer.category, offer.rawText].join(" "));
  return q.split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function etMapOfferNodeV23(args: {
  node: ETUnknownRecordV23;
  storeName: string;
  publicationId: string;
  publicationName: string;
  validUntil: string;
  sectionTitle: string;
  query: string;
  index: number;
}): ZiiplyOfferSearchResult | null {
  const label = etFirstStringV23(args.node.accessibility_label);
  const parsed = etParseOfferLabelV23(label);
  if (!parsed.title) return null;

  const rawId = etFirstStringV23(args.node.id, `etarjous-${args.index}`);
  const ean = rawId.replace(/__.*$/, "");
  const category = etClassifyCategoryV23(parsed.title, args.sectionTitle);
  const rawText = [parsed.title, parsed.priceText, args.sectionTitle, category, args.storeName].join(" ");

  const result = {
    id: `etarjous-${args.publicationId}-${rawId}`,
    source: "etarjouslehdet",
    sourceUrl: "https://etarjouslehdet.fi/S-market",
    chain: "S-market",
    storeLabel: args.storeName,
    storeName: args.storeName,
    shopName: args.storeName,
    title: parsed.title,
    name: parsed.title,
    productName: parsed.title,
    priceText: parsed.priceText,
    price: parsed.priceText,
    offerPrice: parsed.priceText,
    unitPriceText: "",
    benefitText: "Tarjouslehti",
    discountText: "Tarjouslehti",
    validityText: args.validUntil ? `Voimassa ${args.validUntil.slice(0, 10)}` : "",
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: "https://etarjouslehdet.fi/S-market",
    rawText,
    matchScore: 100,
    category,
    categoryPath: category,
    breadcrumbs: category,
    hierarchy: category,
    taxonomy: category,
    department: category,
    productGroup: category,
    mainCategory: category,
    subCategory: category,
    brandName: "",
    ean,
    publicationName: args.publicationName,
  } as unknown as ZiiplyOfferSearchResult;

  if (!etOfferMatchesQueryV23(args.query, result as unknown as ETUnknownRecordV23)) return null;
  return result;
}


function makeVisibleETDebugResultV24(title: string, detail: string): ZiiplyOfferSearchResult {
  return {
    id: `etdbg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: "etarjouslehdet",
    sourceUrl: "https://etarjouslehdet.fi/S-market",
    chain: "S-market",
    storeLabel: "ET DEBUG",
    storeName: "ET DEBUG",
    shopName: "ET DEBUG",
    title,
    name: title,
    productName: title,
    priceText: "0,00 €",
    price: "0,00 €",
    offerPrice: "0,00 €",
    unitPriceText: "",
    benefitText: detail,
    discountText: detail,
    validityText: "DEBUG",
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: "https://etarjouslehdet.fi/S-market",
    rawText: `${title} ${detail}`,
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
    ean: "",
  } as unknown as ZiiplyOfferSearchResult;
}

async function searchSelectedSMarketETarjouslehdetOffersV23(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
): Promise<ZiiplyOfferSearchResult[]> {
  const storeNames = getSelectedSMarketNamesV21(options);
  const firstName = String(storeNames[0] || "-").slice(0, 18);

  if (storeNames.length === 0) {
    return [makeVisibleETDebugResultV24("ETDBG N0", "S-market-nimeä ei tullut sourcesiin")];
  }

  try {
    const publications = await etResolveSMarketPublicationsV23(storeNames);
    const allResults: ZiiplyOfferSearchResult[] = [
      makeVisibleETDebugResultV24(
        `ETDBG N${storeNames.length} P${publications.length}`,
        `name=${firstName} q=${String(query || "").slice(0, 18)}`,
      ),
    ];

    if (typeof console !== "undefined") {
      console.warn("[Ziiply offers V24 eTarjouslehdet] resolved publications", {
        query,
        storeNames,
        publications,
      });
    }

    for (const publicationMeta of publications) {
      if (!publicationMeta.publicationId) continue;

      const publication = await etGeneratePublicationV23(publicationMeta.publicationId);
      if (!publication) {
        allResults.push(makeVisibleETDebugResultV24("ETDBG PUBNULL", `pub=${publicationMeta.publicationId}`));
        continue;
      }

      const sections = etCollectSectionsV23(publication);
      allResults.push(makeVisibleETDebugResultV24("ETDBG SEC" + sections.length, `pub=${publicationMeta.publicationId}`));

      for (const section of sections) {
        const sectionData = await etGenerateSectionV23(publicationMeta.publicationId, section);
        if (!sectionData) continue;

        const nodes = etFindOfferNodesV23(sectionData);
        for (let index = 0; index < nodes.length; index += 1) {
          const mapped = etMapOfferNodeV23({
            node: nodes[index],
            storeName: publicationMeta.storeName || publicationMeta.publicationName,
            publicationId: publicationMeta.publicationId,
            publicationName: publicationMeta.publicationName,
            validUntil: publicationMeta.validUntil,
            sectionTitle: section.title,
            query,
            index,
          });

          if (mapped) allResults.push(mapped);
        }
      }
    }

    return allResults;
  } catch (error) {
    return [
      makeVisibleETDebugResultV24(
        "ETDBG ERR",
        String(error instanceof Error ? error.message : error).slice(0, 80),
      ),
    ];
  }
}

export async function searchSKaupatOffers(
  query: string,
  options?: SKaupatOfferProviderOptionsV173,
) {
  return fetchSKaupatOffers(query, ZIIPLY_OFFER_SOURCES.skaupat, options);
}

export async function searchSelectedSKaupatOffersV11(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const ids = normalizeOfferStoreListV11(options?.sStoreIds, options?.sStoreId ?? options?.storeId);
  const names = normalizeOfferStoreListV11(options?.sStoreNames, options?.sStoreName ?? options?.storeName);
  const maxLength = Math.max(ids.length, names.length);

  if (maxLength <= 1) {
    return searchSKaupatOffers(query, normalizeSKaupatProviderOptionsV8(options));
  }

  const allResults: ZiiplyOfferSearchResult[] = [];
  const seenStores = new Set<string>();

  for (let index = 0; index < maxLength; index += 1) {
    const storeId = ids[index] || "";
    const storeName = names[index] || "";
    const key = `${storeId}|${storeName}`.toLowerCase();
    if (!storeId && !storeName) continue;
    if (seenStores.has(key)) continue;
    seenStores.add(key);

    const storeResults = await searchSKaupatOffers(query, {
      ...(normalizeSKaupatProviderOptionsV8(options) as any),
      storeId: storeId || null,
      storeName: storeName || null,
      sStoreId: storeId || null,
      sStoreName: storeName || null,
    } as SKaupatOfferProviderOptionsV173);

    allResults.push(...storeResults);
  }

  return allResults;
}

export async function searchZiiplyOffers(
  query: string,
  options?: ZiiplyOfferSearchSourceContextV8,
) {
  const cleanQuery = query.trim();

  if (!cleanQuery) return [];

  const isGostaMasterQuery = normalizeOfferUniqueText(cleanQuery) === normalizeOfferUniqueText(ZIIPLY_GOSTA_MASTER_QUERY_V6);

  const providerOptions = normalizeSKaupatProviderOptionsPrismaOnlyV21(options);
  const kProviderOptions = normalizeKruokaProviderOptionsV9(options);
  const hasSelectedKStoreV9 = Boolean(kProviderOptions?.storeId || kProviderOptions?.kStoreId);

  const cacheKey = getOfferSearchCacheKey(cleanQuery);
  const cached = ENABLE_OFFER_SEARCH_CACHE ? getCachedOfferResults(cacheKey) : null;
  if (cached) return cached;

  const providerScopeV10 = getProviderScopeV10(options);

  if (typeof console !== "undefined") {
    console.warn("[Ziiply offers V23 provider scope]", {
      query: cleanQuery,
      storeCompareScope: options?.storeCompareScope,
      withinChain: (options as any)?.withinChain,
      sStoreId: options?.sStoreId,
      sStoreName: options?.sStoreName,
      kStoreId: options?.kStoreId,
      kStoreName: options?.kStoreName,
      providerScopeV10,
    });
  }

  const sKaupatResults = providerScopeV10.useS
    ? await safelySearchSource(
        isGostaMasterQuery ? "S-kaupat master V10" : "S-kaupat V10",
        () => searchSelectedSKaupatOffersV11(cleanQuery, providerOptions),
      )
    : [];

  const eTarjouslehdetResults = providerScopeV10.useS
    ? await safelySearchSource(
        isGostaMasterQuery ? "S-market eTarjouslehdet master V23" : "S-market eTarjouslehdet V23",
        () => searchSelectedSMarketETarjouslehdetOffersV23(cleanQuery, options),
      )
    : [];

  const kResults = providerScopeV10.useK && hasSelectedKStoreV9
    ? await safelySearchSource(
        isGostaMasterQuery ? "K-Ruoka master V10" : "K-Ruoka V10",
        () => searchSelectedKruokaOffersV10(cleanQuery, options),
      )
    : [];

  const uniqueAllResults = uniqueOfferResults([
    ...sKaupatResults,
    ...eTarjouslehdetResults,
    ...kResults,
  ]);

  const strictCategoryQueryV15 = isStrictGostaCategoryQueryV15(cleanQuery);

  const results = isGostaMasterQuery
    ? uniqueAllResults.slice(0, MAX_OFFER_SEARCH_RESULTS)
    : strictCategoryQueryV15
      ? uniqueAllResults
          .filter((result) => offerMatchesStrictGostaCategoryV15(result, cleanQuery))
          .sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0))
          .slice(0, MAX_OFFER_SEARCH_RESULTS)
      : (() => {
          const intent = resolveSearchIntentAI(cleanQuery);

          const rankedResults = rankProductsWithIntentMemory(
            uniqueAllResults
              .filter((result) => Number(result.matchScore || 0) > 0)
              .map((result) => ({
                ...result,
                // Älä ylikirjoita result.category-kenttää rawTextillä.
                // Kortti ja tuoteryhmäcountit käyttävät alkuperäistä providerin category-arvoa.
                brandName: (result as any).brandName || result.storeLabel,
              })),
            cleanQuery,
            (product) => Number(product.matchScore || 0),
          );

          return rankedResults
            .sort((a, b) => {
              const aExact =
                a.title?.toLowerCase().includes(intent.canonicalQuery.toLowerCase()) ? 1 : 0;
              const bExact =
                b.title?.toLowerCase().includes(intent.canonicalQuery.toLowerCase()) ? 1 : 0;

              if (aExact !== bExact) {
                return bExact - aExact;
              }

              return Number(b.matchScore || 0) - Number(a.matchScore || 0);
            })
            .slice(0, MAX_OFFER_SEARCH_RESULTS);
        })();

  if (ENABLE_OFFER_SEARCH_CACHE) {
    setCachedOfferResults(cacheKey, results);
  }

  return results;
}

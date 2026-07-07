// src/app/components/ziiply/offerSearch/providers/etarjouslehdetProvider.ts
// ETARJOUSLEHDET_PROVIDER_V19_STORE_INDEX_VISIBLE_DEBUG
// Debug-versio S-market tarjouslehtihakuun.
// - V19: Näyttää näkyvässä debug-kortissa storeIndex-countin ja ensimmäiset ehdokkaat, jotta nähdään löytyykö /S-market/kaupat-sivulta kauppalista.
// - V18: Ratkaisee eTarjouslehdet-storeId:n myös pelkän S-market-nimen perusteella.
// - Ei koske Prismaan eikä skaupatProvideriin.
// - Palauttaa näkyvän DBG-kortin, jos eTarjouslehdet-storeId puuttuu.
// - Lisää console.warn-lokit joka vaiheesta.
// - Käyttää Tjek X-Api-Key -headeria HAR:n mukaisesti.
// - Rajaa section-haun debugissa max 6 sivuun, ettei haku jää roikkumaan.

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const ET_BASE = "https://etarjouslehdet.fi";
const TJEK_INCITO = "https://squid-api.tjek.com/v4/rpc/generate_incito_from_publication";
const TJEK_SECTION = "https://squid-api.tjek.com/v4/rpc/generate_incito_from_publication_section";
const TJEK_API_KEY = "152000596c6e45d9983eab0c14afebea";
const GOSTA_MASTER_QUERY = "__ziiply_all_offers__";
const MAX_DEBUG_SECTIONS = 8;
const FETCH_TIMEOUT_MS = 9000;

export type ETarjouslehdetProviderOptions = {
  storeId?: string | number | null;
  storeName?: string | null;
  stores?: Array<{
    storeId?: string | number | null;
    storeName?: string | null;
    etarjouslehdetStoreId?: string | null;
    eTarjouslehdetStoreId?: string | null;
    tjekStoreId?: string | null;
    chain?: string | null;
  }> | null;
  etarjouslehdetStoreId?: string | null;
  eTarjouslehdetStoreId?: string | null;
  tjekStoreId?: string | null;
};

type SelectedETStore = {
  storeId: string;
  storeName: string;
};

const ETARJOUS_STORE_INDEX_CACHE = new Map<string, SelectedETStore[]>();
const ETARJOUS_NAME_ID_CACHE = new Map<string, string>();
let ETARJOUS_LAST_STORE_INDEX_DEBUG = "storeIndex=not-run";
let ETARJOUS_LAST_RESOLVE_DEBUG = "resolve=not-run";

type PublicationMeta = {
  id: string;
  name: string;
  validFrom: string;
  validUntil: string;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) return text;
      continue;
    }

    const record = asRecord(value);
    if (record) {
      const text = firstString(record.name, record.title, record.label, record.id, record.value);
      if (text) return text;
    }
  }
  return "";
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSMarketName(value: unknown) {
  const text = normalizeText(value).replace(/\s+/g, "");
  return text.includes("smarket");
}

function collectRequestedSMarketNames(options?: ETarjouslehdetProviderOptions): string[] {
  const names: string[] = [];

  for (const store of options?.stores ?? []) {
    const name = firstString(store.storeName, options?.storeName);
    const chain = normalizeText(store.chain);
    if (chain && !chain.includes("s market") && !chain.includes("s-market") && !chain.includes("smarket")) continue;
    if (name && isSMarketName(name)) names.push(name);
  }

  const directName = firstString(options?.storeName);
  if (directName && isSMarketName(directName)) names.push(directName);

  return Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
}

function getExplicitSelectedStores(options?: ETarjouslehdetProviderOptions): SelectedETStore[] {
  const stores: SelectedETStore[] = [];

  for (const store of options?.stores ?? []) {
    const name = firstString(store.storeName, options?.storeName, "S-market");
    const chain = normalizeText(store.chain);
    if (chain && !chain.includes("s market") && !chain.includes("s-market") && !chain.includes("smarket")) continue;
    if (name && !isSMarketName(name)) continue;

    const id = firstString(
      store.etarjouslehdetStoreId,
      store.eTarjouslehdetStoreId,
      store.tjekStoreId,
      // Jos storeId näyttää jo eTarjouslehdetin id:ltä, sitä saa käyttää.
      // S-kaupat numeric id:tä ei käytetä eTarjouslehdet-id:nä.
      /^\d+$/.test(firstString(store.storeId)) ? "" : store.storeId,
    );

    if (!id) continue;
    stores.push({ storeId: id, storeName: name });
  }

  const directId = firstString(
    options?.etarjouslehdetStoreId,
    options?.eTarjouslehdetStoreId,
    options?.tjekStoreId,
  );

  if (directId) {
    stores.push({ storeId: directId, storeName: firstString(options?.storeName, "S-market") });
  }

  const seen = new Set<string>();
  return stores.filter((store) => {
    const key = `${store.storeId}|${normalizeText(store.storeName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getStoreSlugFromHref(value: unknown): string {
  const text = firstString(value);
  if (!text) return "";

  const match = text.match(/\/S-market\/kaupat\/([a-z0-9_-]+)/i);
  if (match?.[1]) return match[1];

  // eTarjouslehdet store id:t ovat yleensä lyhyitä alfanumeerisia tunnisteita kuten f327lvi.
  if (/^[a-z0-9_-]{5,12}$/i.test(text) && !/^\d+$/.test(text)) return text;

  return "";
}

function looksLikeETarjousStoreRecord(record: UnknownRecord): boolean {
  const name = firstString(record.name, record.title, record.label, record.storeName, record.displayName);
  const href = firstString(record.href, record.url, record.path, record.link, record.slug, record.id, record.storeId);
  return isSMarketName(name) && Boolean(getStoreSlugFromHref(href));
}

function extractStoresFromText(text: string): SelectedETStore[] {
  const stores: SelectedETStore[] = [];

  // 1) HTML-linkit: /S-market/kaupat/<id> ... S-market Foo
  const linkPattern = /<a[^>]+href=["']([^"']*\/S-market\/kaupat\/([a-z0-9_-]+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of text.matchAll(linkPattern)) {
    const slug = match[2];
    const rawLabel = match[3]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (slug && isSMarketName(rawLabel)) stores.push({ storeId: slug, storeName: rawLabel });
  }

  // 2) JSON/Next data -kävely.
  for (const candidate of parseJsonCandidatesFromText(text)) {
    walk(candidate, (record) => {
      if (!looksLikeETarjousStoreRecord(record)) return;
      const storeName = firstString(record.name, record.title, record.label, record.storeName, record.displayName);
      const storeId = getStoreSlugFromHref(
        firstString(record.href, record.url, record.path, record.link, record.slug, record.id, record.storeId),
      );
      if (storeName && storeId) stores.push({ storeId, storeName });
    });
  }

  // 3) Raakatekstin fallback: jos vieressä esiintyy slug ja S-market nimi.
  const rawPattern = /\/S-market\/kaupat\/([a-z0-9_-]+)[\s\S]{0,500}?(S-market\s+[^"'<>\\]{2,80})/gi;
  for (const match of text.matchAll(rawPattern)) {
    const slug = match[1];
    const name = match[2].replace(/\\u00e4/g, "ä").replace(/\\u00f6/g, "ö").replace(/\\u00c4/g, "Ä").replace(/\\u00d6/g, "Ö").trim();
    if (slug && isSMarketName(name)) stores.push({ storeId: slug, storeName: name });
  }

  const seen = new Set<string>();
  return stores.filter((store) => {
    const key = `${store.storeId}|${normalizeText(store.storeName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchStoreIndex(): Promise<SelectedETStore[]> {
  const cacheKey = "s-market-store-index";
  const cached = ETARJOUS_STORE_INDEX_CACHE.get(cacheKey);
  if (cached) return cached;

  const candidateUrls = [
    `${ET_BASE}/S-market/kaupat`,
    `${ET_BASE}/S-market`,
  ];

  const allStores: SelectedETStore[] = [];

  for (const url of candidateUrls) {
    try {
      const text = await fetchText(url);
      const stores = extractStoresFromText(text);
      console.warn("[ETARJOUS DEBUG V19 provider] store index", {
        url,
        count: stores.length,
        sample: stores.slice(0, 8),
      });
      allStores.push(...stores);
    } catch (error) {
      console.warn("[ETARJOUS DEBUG V19 provider] store index fetch failed", { url, error });
    }
  }

  const seen = new Set<string>();
  const unique = allStores.filter((store) => {
    const key = `${store.storeId}|${normalizeText(store.storeName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  ETARJOUS_LAST_STORE_INDEX_DEBUG = `storeIndex=${unique.length} sample=${unique
    .slice(0, 5)
    .map((store) => `${store.storeName}:${store.storeId}`)
    .join(" | ") || "none"}`;

  ETARJOUS_STORE_INDEX_CACHE.set(cacheKey, unique);
  return unique;
}

function scoreStoreNameMatch(requestedName: string, candidateName: string): number {
  const requested = normalizeText(requestedName);
  const candidate = normalizeText(candidateName);
  const requestedTail = requested.replace(/^s\s*-?\s*market\s+/, "").trim();
  const candidateTail = candidate.replace(/^s\s*-?\s*market\s+/, "").trim();

  if (!requested || !candidate) return 0;
  if (candidate === requested) return 1000;
  if (candidateTail && requestedTail && candidateTail === requestedTail) return 950;
  if (candidate.includes(requested) || requested.includes(candidate)) return 850;
  if (candidateTail && requestedTail && (candidateTail.includes(requestedTail) || requestedTail.includes(candidateTail))) return 800;

  const requestedWords = requestedTail.split(/\s+/).filter((word) => word.length > 2);
  const candidateWords = candidateTail.split(/\s+/).filter((word) => word.length > 2);
  const hits = requestedWords.filter((word) => candidateWords.includes(word)).length;
  return hits > 0 ? hits * 100 : 0;
}

async function resolveStoreIdByName(requestedName: string): Promise<string> {
  const cacheKey = normalizeText(requestedName);
  const cached = ETARJOUS_NAME_ID_CACHE.get(cacheKey);
  if (cached) return cached;

  const storeIndex = await fetchStoreIndex();
  const best = storeIndex
    .map((store) => ({ ...store, score: scoreStoreNameMatch(requestedName, store.storeName) }))
    .filter((store) => store.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  ETARJOUS_LAST_RESOLVE_DEBUG = `resolve name=${requestedName} best=${best?.storeName || "none"} id=${best?.storeId || ""} score=${best?.score || 0}`;

  console.warn("[ETARJOUS DEBUG V19 provider] resolve store by name", {
    requestedName,
    best,
    candidates: storeIndex.slice(0, 10),
    storeIndexDebug: ETARJOUS_LAST_STORE_INDEX_DEBUG,
  });

  if (!best?.storeId || best.score < 100) return "";
  ETARJOUS_NAME_ID_CACHE.set(cacheKey, best.storeId);
  return best.storeId;
}

async function getSelectedStores(options?: ETarjouslehdetProviderOptions): Promise<SelectedETStore[]> {
  const explicitStores = getExplicitSelectedStores(options);
  const requestedNames = collectRequestedSMarketNames(options);
  const stores = [...explicitStores];

  for (const requestedName of requestedNames) {
    const alreadyExists = stores.some((store) => normalizeText(store.storeName) === normalizeText(requestedName));
    if (alreadyExists) continue;

    const resolvedId = await resolveStoreIdByName(requestedName);
    if (resolvedId) {
      stores.push({ storeId: resolvedId, storeName: requestedName });
    }
  }

  const seen = new Set<string>();
  return stores.filter((store) => {
    const key = `${store.storeId}|${normalizeText(store.storeName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeDebugResult(args: {
  query: string;
  config: ZiiplyOfferSearchSourceConfig;
  storeName?: string;
  storeId?: string;
  title: string;
  detail: string;
  index?: number;
}): ZiiplyOfferSearchResult {
  const title = `DBG ETARJOUS: ${args.title}`;
  const storeLabel = args.storeName || "S-market DEBUG";
  return {
    id: `dbg-etarjous-${Date.now()}-${args.index ?? 0}`,
    source: args.config.id,
    sourceUrl: args.config.url,
    chain: "S-market",
    storeLabel,
    storeName: storeLabel,
    shopName: storeLabel,
    title,
    priceText: "0,00 €",
    unitPriceText: "",
    benefitText: args.detail,
    validityText: "DEBUG",
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: args.storeId ? `${ET_BASE}/S-market/kaupat/${args.storeId}` : `${ET_BASE}/S-market/kaupat`,
    rawText: `${title} ${args.detail}`,
    matchScore: 999999,
    category: "DEBUG",
    categoryPath: "DEBUG",
    breadcrumbs: "DEBUG",
    hierarchy: "DEBUG",
    taxonomy: "DEBUG",
    department: "DEBUG",
    productGroup: "DEBUG",
    mainCategory: "DEBUG",
    subCategory: "DEBUG",
    brandName: "DEBUG",
    ean: "",
  } as unknown as ZiiplyOfferSearchResult;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      accept: "text/x-component,text/html,application/json;q=0.9,*/*;q=0.8",
      referer: `${ET_BASE}/`,
      "user-agent": "Mozilla/5.0 ZiiplyOfferDebug/18",
    },
  });

  if (!response.ok) throw new Error(`GET ${response.status} ${url}`);
  return response.text();
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      accept: "*/*",
      "content-type": "application/json",
      origin: ET_BASE,
      referer: `${ET_BASE}/`,
      "x-api-key": TJEK_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`POST ${response.status} ${url}`);
  return response.json();
}

function parseJsonCandidatesFromText(text: string): unknown[] {
  const values: unknown[] = [];

  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;

    try {
      const object = JSON.parse(trimmed) as UnknownRecord;
      if (object && "value" in object) values.push(object.value);
      else values.push(object);
    } catch {
      // ignore
    }
  }

  // Fallback: poimi page-scriptistä publication-id:t, jos JSONL ei ollut rivitetty.
  const publicationMatches = text.matchAll(/"(?:publicId|id)"\s*:\s*"([A-Za-z0-9_-]{6,})"/g);
  for (const match of publicationMatches) values.push({ id: match[1] });

  return values;
}

function walk(value: unknown, visitor: (node: UnknownRecord) => void) {
  if (Array.isArray(value)) {
    for (const child of value) walk(child, visitor);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  visitor(record);
  for (const child of Object.values(record)) walk(child, visitor);
}

function findPublicationsFromStorePage(text: string): PublicationMeta[] {
  const candidates = parseJsonCandidatesFromText(text);
  const publications: PublicationMeta[] = [];

  for (const candidate of candidates) {
    walk(candidate, (record) => {
      const id = firstString(record.publicId, record.publicationId, record.id);
      const name = firstString(record.publicationName, record.label, record.name, record.title);
      const validFrom = firstString(record.validFrom, record.valid_from);
      const validUntil = firstString(record.validUntil, record.valid_until);

      // Tjek publication id HAR:ssa: coRfb3CQ. Hyväksytään vain järkevän näköiset.
      if (!id || id.length < 6) return;
      if (!name && !validFrom && !validUntil) return;

      publications.push({ id, name, validFrom, validUntil });
    });
  }

  const seen = new Set<string>();
  return publications.filter((publication) => {
    if (seen.has(publication.id)) return false;
    seen.add(publication.id);
    return true;
  });
}

async function getActivePublication(storeId: string): Promise<PublicationMeta | null> {
  const pageUrl = `${ET_BASE}/S-market/kaupat/${encodeURIComponent(storeId)}`;
  const text = await fetchText(pageUrl);
  const publications = findPublicationsFromStorePage(text);

  console.warn("[ETARJOUS DEBUG V19 provider] store page publications", {
    storeId,
    pageUrl,
    count: publications.length,
    sample: publications.slice(0, 3),
  });

  const now = Date.now();
  return publications
    .sort((a, b) => scorePublication(b, now) - scorePublication(a, now))[0] || null;
}

function scorePublication(publication: PublicationMeta, now: number): number {
  const from = publication.validFrom ? Date.parse(publication.validFrom) : 0;
  const until = publication.validUntil ? Date.parse(publication.validUntil) : 0;
  let score = 0;
  if (from && from <= now) score += 10;
  if (until && until >= now) score += 100;
  if (from) score += from / 1_000_000_000_000;
  return score;
}

async function generatePublication(publicationId: string): Promise<unknown> {
  return postJson(TJEK_INCITO, {
    id: publicationId,
    device_category: "desktop",
    pointer: "fine",
    orientation: "horizontal",
    pixel_ratio: 2,
    max_width: 1418,
    viewport_width: 1432,
    viewport_height: 900,
    versions_supported: ["1.0.0"],
    locale_code: "fi-FI",
    time: new Date().toISOString(),
    feature_labels: [],
  });
}

type IncitoSection = {
  body: UnknownRecord;
  title: string;
};

function extractIncitoSections(incito: unknown): IncitoSection[] {
  const sections: IncitoSection[] = [];
  const titleByViewId = new Map<string, string>();

  walk(incito, (record) => {
    const viewId = firstString(record.view_id);
    const title = firstString(record.title);
    if (viewId && title) titleByViewId.set(viewId, title);
  });

  walk(incito, (record) => {
    if (record.view_name !== "IncitoEmbedView" || typeof record.body !== "string") return;

    try {
      const body = JSON.parse(record.body) as UnknownRecord;
      const sectionId = firstString(body.section_id);
      if (!firstString(body.id) || !sectionId) return;

      sections.push({
        body,
        title: titleByViewId.get(sectionId) || "Tarjouslehti",
      });
    } catch {
      // ignore
    }
  });

  return sections;
}

function findOfferLabels(sectionView: unknown): Array<{ id: string; label: string }> {
  const labels: Array<{ id: string; label: string }> = [];

  walk(sectionView, (record) => {
    const role = firstString(record.role);
    const label = firstString(record.accessibility_label);
    const id = firstString(record.id);
    if (role === "offer" && label) labels.push({ id, label });
  });

  return labels;
}

function parseOfferLabel(label: string): { title: string; priceText: string; priceNumber: number | null } | null {
  const match = label.match(/^(.*?),\s*EUR\s*([0-9]+(?:[,.][0-9]{1,2})?)\s*$/i);
  if (!match) return null;

  const priceNumber = Number(match[2].replace(",", "."));
  return {
    title: match[1].trim(),
    priceText: `${priceNumber.toFixed(2).replace(".", ",")} €`,
    priceNumber: Number.isFinite(priceNumber) ? priceNumber : null,
  };
}

function stripTop4Suffix(id: string): string {
  return id.replace(/__top4$/, "");
}

function getMatchScore(query: string, title: string, category: string): number {
  const q = normalizeText(query);
  const t = normalizeText(title);
  const c = normalizeText(category);

  if (!q || q === normalizeText(GOSTA_MASTER_QUERY)) return 1;

  let score = 1;
  if (t === q) score += 120;
  if (t.includes(q)) score += 80;
  if (c.includes(q)) score += 25;

  for (const word of q.split(/\s+/).filter((part) => part.length > 2)) {
    if (t.includes(word)) score += 20;
    if (c.includes(word)) score += 8;
  }

  return score;
}

function resultMatchesQuery(query: string, result: ZiiplyOfferSearchResult): boolean {
  const q = normalizeText(query);
  if (!q || q === normalizeText(GOSTA_MASTER_QUERY)) return true;

  const haystack = normalizeText([
    result.title,
    result.rawText,
    (result as any).category,
    (result as any).categoryPath,
  ].join(" "));

  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function mapOfferToResult(args: {
  query: string;
  config: ZiiplyOfferSearchSourceConfig;
  store: SelectedETStore;
  publication: PublicationMeta;
  section: IncitoSection;
  id: string;
  label: string;
  index: number;
}): ZiiplyOfferSearchResult | null {
  const parsed = parseOfferLabel(args.label);
  if (!parsed) return null;

  const cleanId = stripTop4Suffix(args.id);
  const ean = /^\d{8,14}$/.test(cleanId) ? cleanId : "";
  const category = args.section.title || "Tarjouslehti";
  const validityText = args.publication.validUntil
    ? `Voimassa ${args.publication.validUntil.slice(0, 10)}`
    : "";

  const rawText = [
    parsed.title,
    parsed.priceText,
    category,
    args.store.storeName,
    args.publication.name,
    ean,
  ].filter(Boolean).join(" ");

  return {
    id: `etarjous-${args.publication.id}-${cleanId || args.index}`,
    source: args.config.id,
    sourceUrl: args.config.url,
    chain: "S-market",
    storeLabel: args.store.storeName,
    storeName: args.store.storeName,
    shopName: args.store.storeName,
    title: parsed.title,
    priceText: parsed.priceText,
    unitPriceText: "",
    benefitText: "Tarjouslehti / eTarjouslehdet",
    validityText,
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: `${ET_BASE}/S-market/kaupat/${args.store.storeId}`,
    rawText,
    matchScore: getMatchScore(args.query, parsed.title, category),
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
  } as unknown as ZiiplyOfferSearchResult;
}

function uniqueResults(results: ZiiplyOfferSearchResult[]): ZiiplyOfferSearchResult[] {
  const seen = new Set<string>();
  const output: ZiiplyOfferSearchResult[] = [];

  for (const result of results) {
    const key = `${(result as any).ean || result.id}|${normalizeText(result.title)}|${result.priceText}|${normalizeText(result.storeLabel)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(result);
  }

  return output;
}

export async function fetchETarjouslehdetOffers(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
  options?: ETarjouslehdetProviderOptions,
): Promise<ZiiplyOfferSearchResult[]> {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  const selectedStores = await getSelectedStores(options);

  console.warn("[ETARJOUS DEBUG V19 provider] start", {
    query: cleanQuery,
    selectedStores,
    optionsStoreName: options?.storeName,
    directStoreId: options?.etarjouslehdetStoreId ?? options?.eTarjouslehdetStoreId ?? options?.tjekStoreId,
    storesRaw: options?.stores,
  });

  if (selectedStores.length === 0) {
    return [makeDebugResult({
      query: cleanQuery,
      config,
      title: `NO_ID IDX ${ETARJOUS_LAST_STORE_INDEX_DEBUG.match(/storeIndex=([^ ]+)/)?.[1] || "?"}`,
      detail: `${ETARJOUS_LAST_STORE_INDEX_DEBUG} | ${ETARJOUS_LAST_RESOLVE_DEBUG} | names=${collectRequestedSMarketNames(options).join(" || ") || "none"}`,
    })];
  }

  const allResults: ZiiplyOfferSearchResult[] = [];

  for (const store of selectedStores) {
    const started = Date.now();

    try {
      const publication = await getActivePublication(store.storeId);
      if (!publication?.id) {
        allResults.push(makeDebugResult({
          query: cleanQuery,
          config,
          storeName: store.storeName,
          storeId: store.storeId,
          title: "NO_PUBLICATION",
          detail: `Kauppasivu löytyi mutta aktiivista publicationId:tä ei löytynyt. storeId=${store.storeId}`,
        }));
        continue;
      }

      const incito = await generatePublication(publication.id);
      const sections = extractIncitoSections(incito);
      const sectionsToFetch = sections.slice(0, MAX_DEBUG_SECTIONS);

      console.warn("[ETARJOUS DEBUG V19 provider] publication", {
        store,
        publication,
        sections: sections.length,
        fetching: sectionsToFetch.length,
      });

      let parsedOfferCount = 0;
      let rawLabelCount = 0;

      for (const section of sectionsToFetch) {
        try {
          const sectionView = await postJson(TJEK_SECTION, section.body);
          const labels = findOfferLabels(sectionView);
          rawLabelCount += labels.length;

          for (const label of labels) {
            const result = mapOfferToResult({
              query: cleanQuery,
              config,
              store,
              publication,
              section,
              id: label.id,
              label: label.label,
              index: parsedOfferCount,
            });

            if (!result) continue;
            parsedOfferCount += 1;

            if (resultMatchesQuery(cleanQuery, result)) {
              allResults.push(result);
            }
          }
        } catch (sectionError) {
          console.warn("[ETARJOUS DEBUG V19 provider] section failed", {
            store,
            sectionTitle: section.title,
            sectionBody: section.body,
            sectionError,
          });
        }
      }

      allResults.push(makeDebugResult({
        query: cleanQuery,
        config,
        storeName: store.storeName,
        storeId: store.storeId,
        title: "OK_PROVIDER_RAN",
        detail: `storeId=${store.storeId} publication=${publication.id} sections=${sections.length} fetched=${sectionsToFetch.length} labels=${rawLabelCount} parsed=${parsedOfferCount} matched=${allResults.length} ms=${Date.now() - started}`,
        index: allResults.length,
      }));
    } catch (error) {
      console.warn("[ETARJOUS DEBUG V19 provider] failed", { store, error });
      allResults.push(makeDebugResult({
        query: cleanQuery,
        config,
        storeName: store.storeName,
        storeId: store.storeId,
        title: "ERROR",
        detail: String(error instanceof Error ? error.message : error),
      }));
    }
  }

  return uniqueResults(allResults).sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0));
}

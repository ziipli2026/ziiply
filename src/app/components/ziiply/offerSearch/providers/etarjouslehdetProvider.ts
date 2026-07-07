// src/app/components/ziiply/offerSearch/providers/etarjouslehdetProvider.ts
// ETARJOUSLEHDET_PROVIDER_V21_OPTIONS_SHAPE_FIX
// Korjaus V18: ei enää luoteta /S-market/kaupat HTML-listan parsimiseen.
// - Ratkaisee S-marketin eTarjouslehdet-storeId:n batch-queryllä: ["stores", { businessId, pagination, query/search }]
// - Hakee aktiivisen julkaisun samalla tavalla kuin HAR:ssa: ["fronts", { businessIds, coordinates, localBusinessIds }]
// - Jatkaa Tjek/Incito-section-parserilla.
// - Ei koske Prismaan eikä skaupatProvideriin.
// - V21: lukee S-market-nimet myös sStoreName/sStoreNames/name/title/label-aliasteista ja näyttää options-avaimet debugissa.
// - Debug näkyy korteissa kategoriassa "Muut".

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

type UnknownRecord = Record<string, unknown>;

type SelectedETStore = {
  storeId: string;
  storeName: string;
  latitude?: number | null;
  longitude?: number | null;
};

type PublicationMeta = {
  id: string;
  name: string;
  validFrom: string;
  validUntil: string;
  storeName: string;
  storeId: string;
};

export type ETarjouslehdetProviderOptions = {
  storeId?: string | number | null;
  storeName?: string | null;
  sStoreId?: string | number | null;
  sStoreName?: string | null;
  sStoreIds?: Array<string | number | null | undefined> | string | null;
  sStoreNames?: Array<string | null | undefined> | string | null;
  names?: Array<string | null | undefined> | string | null;
  selectedSMarketNames?: Array<string | null | undefined> | string | null;
  stores?: Array<{
    storeId?: string | number | null;
    storeName?: string | null;
    sStoreName?: string | null;
    name?: string | null;
    title?: string | null;
    label?: string | null;
    etarjouslehdetStoreId?: string | null;
    eTarjouslehdetStoreId?: string | null;
    tjekStoreId?: string | null;
    chain?: string | null;
  }> | null;
  etarjouslehdetStoreId?: string | null;
  eTarjouslehdetStoreId?: string | null;
  tjekStoreId?: string | null;
};

const ET_BASE = "https://etarjouslehdet.fi";
const ET_BATCH_URL = "https://etarjouslehdet.fi/";
const TJEK_RPC_URL = "https://squid-api.tjek.com/v4/rpc";
const TJEK_API_KEY = "152000596c6e45d9983eab0c14afebea";
const S_MARKET_BUSINESS_ID = "d8ccs8";
const GOSTA_MASTER_QUERY = "__ziiply_all_offers__";
const FETCH_TIMEOUT_MS = 11000;
const MAX_SECTIONS = 18;

const STORE_CACHE = new Map<string, SelectedETStore | null>();
const PUBLICATION_CACHE = new Map<string, PublicationMeta | null>();

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
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSMarketName(value: unknown) {
  return normalizeText(value).replace(/\s+/g, "").includes("smarket");
}

function stripSMarketPrefix(value: unknown) {
  return normalizeText(value).replace(/^s\s*-?\s*market\s+/, "").trim();
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function getCoordinates(record: UnknownRecord | null): { latitude?: number | null; longitude?: number | null } {
  const coords = asRecord(record?.coordinates);
  return {
    latitude: getNumber(record?.latitude ?? coords?.latitude),
    longitude: getNumber(record?.longitude ?? coords?.longitude),
  };
}

function scoreStoreNameMatch(requestedName: string, candidateName: string): number {
  const requested = normalizeText(requestedName);
  const candidate = normalizeText(candidateName);
  const requestedTail = stripSMarketPrefix(requestedName);
  const candidateTail = stripSMarketPrefix(candidateName);

  if (!requested || !candidate) return 0;
  if (candidate === requested) return 1000;
  if (requestedTail && candidateTail && requestedTail === candidateTail) return 980;
  if (candidate.includes(requested) || requested.includes(candidate)) return 850;
  if (requestedTail && candidateTail && (candidateTail.includes(requestedTail) || requestedTail.includes(candidateTail))) return 820;

  const wantedWords = requestedTail.split(/\s+/).filter((word) => word.length > 2);
  const candidateWords = candidateTail.split(/\s+/).filter((word) => word.length > 2);
  const hits = wantedWords.filter((word) => candidateWords.includes(word)).length;
  return hits > 0 ? hits * 120 : 0;
}

function makeDebugResult(args: {
  config: ZiiplyOfferSearchSourceConfig;
  title: string;
  detail: string;
  storeName?: string;
  storeId?: string;
}): ZiiplyOfferSearchResult {
  const storeLabel = args.storeName || "ET DEBUG";
  return {
    id: `etdbg-v20-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: args.config.id || "etarjouslehdet",
    sourceUrl: args.config.url || `${ET_BASE}/S-market`,
    chain: "S-market",
    storeLabel,
    storeName: storeLabel,
    shopName: storeLabel,
    title: args.title,
    name: args.title,
    productName: args.title,
    priceText: "0,00 €",
    price: "0,00 €",
    offerPrice: "0,00 €",
    unitPriceText: "",
    benefitText: args.detail,
    discountText: args.detail,
    validityText: "DEBUG",
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: args.storeId ? `${ET_BASE}/S-market/kaupat/${args.storeId}` : `${ET_BASE}/S-market`,
    rawText: `${args.title} ${args.detail}`,
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

function encodeBatchKey(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") return Buffer.from(json, "utf8").toString("base64");
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeBatchKey(value: unknown): string {
  const text = String(value ?? "");
  try {
    if (typeof Buffer !== "undefined") return Buffer.from(text, "base64").toString("utf8");
    return decodeURIComponent(escape(atob(text)));
  } catch {
    return "";
  }
}

async function postETBatch(queries: unknown[]): Promise<UnknownRecord[]> {
  const response = await fetchWithTimeout(ET_BATCH_URL, {
    method: "POST",
    headers: {
      accept: "application/json,text/plain,*/*",
      "content-type": "application/json",
      origin: ET_BASE,
      referer: `${ET_BASE}/S-market/kaupat`,
      "user-agent": "Mozilla/5.0 ZiiplyOfferProvider/20",
    },
    body: JSON.stringify({ data: queries.map(encodeBatchKey) }),
  });

  if (!response.ok) throw new Error(`eTarjous batch failed ${response.status}`);

  const text = await response.text();
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as UnknownRecord);
}

function getBatchValue(results: UnknownRecord[], queryName: string): unknown {
  const hit = results.find((entry) => decodeBatchKey(entry.key).includes(`"${queryName}"`));
  return hit?.value;
}

function walk(value: unknown, visitor: (record: UnknownRecord) => void) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visitor);
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  visitor(record);
  for (const child of Object.values(record)) walk(child, visitor);
}

function collectStoreRecords(value: unknown): SelectedETStore[] {
  const stores: SelectedETStore[] = [];
  walk(value, (record) => {
    const id = firstString(record.id, record.publicId, record.storeId);
    const name = firstString(record.name, record.storeName, record.label, record.title);
    if (!id || !name || !isSMarketName(name)) return;
    if (/^\d+$/.test(id)) return;
    const coords = getCoordinates(record);
    stores.push({ storeId: id, storeName: name, ...coords });
  });

  const seen = new Set<string>();
  return stores.filter((store) => {
    const key = `${store.storeId}|${normalizeText(store.storeName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectPublicationRecords(value: unknown, store: SelectedETStore): PublicationMeta[] {
  const publications: PublicationMeta[] = [];
  walk(value, (record) => {
    const id = firstString(record.id, record.publicId, record.publicationId);
    const name = firstString(record.label, record.name, record.publicationName, record.title);
    if (!id || id.length < 6) return;
    if (name && !scoreStoreNameMatch(store.storeName, name)) return;

    publications.push({
      id,
      name: name || store.storeName,
      validFrom: firstString(record.validFrom, record.valid_from),
      validUntil: firstString(record.validUntil, record.valid_until),
      storeName: store.storeName,
      storeId: store.storeId,
    });
  });

  const seen = new Set<string>();
  return publications.filter((publication) => {
    if (seen.has(publication.id)) return false;
    seen.add(publication.id);
    return true;
  });
}

function scorePublication(publication: PublicationMeta) {
  const now = Date.now();
  const from = publication.validFrom ? Date.parse(publication.validFrom) : 0;
  const until = publication.validUntil ? Date.parse(publication.validUntil) : 0;
  let score = 0;
  if (from && from <= now) score += 10;
  if (until && until >= now) score += 100;
  if (from) score += from / 1_000_000_000_000;
  return score;
}

function pushNameCandidate(output: string[], value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) pushNameCandidate(output, item);
    return;
  }

  const text = firstString(value);
  if (text && isSMarketName(text)) output.push(text);
}

function splitProviderMultiValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return String(value ?? "")
    .replaceAll("\r", "")
    .replaceAll("\n", "||")
    .replaceAll(";", "||")
    .split("||")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getRequestedNames(options?: ETarjouslehdetProviderOptions): string[] {
  const names: string[] = [];
  const anyOptions = options as any;

  pushNameCandidate(names, options?.storeName);
  pushNameCandidate(names, options?.sStoreName);
  for (const name of splitProviderMultiValue(options?.sStoreNames)) pushNameCandidate(names, name);
  for (const name of splitProviderMultiValue(options?.names)) pushNameCandidate(names, name);
  for (const name of splitProviderMultiValue(options?.selectedSMarketNames)) pushNameCandidate(names, name);

  for (const store of options?.stores ?? []) {
    const anyStore = store as any;
    const chain = normalizeText(store.chain);
    const name = firstString(
      store.storeName,
      store.sStoreName,
      store.name,
      store.title,
      store.label,
      anyStore?.shopName,
      anyStore?.storeLabel,
      options?.storeName,
      options?.sStoreName,
    );

    if (chain && !chain.includes("s market") && !chain.includes("s-market") && !chain.includes("smarket")) continue;
    pushNameCandidate(names, name);
  }

  // Viimeinen fallback: jos options-objektin muoto muuttuu, poimi S-market-nimet raakatekstistä.
  if (names.length === 0 && anyOptions) {
    const raw = JSON.stringify(anyOptions);
    const matches = raw.match(/S-market[^"\\|;]{1,80}/gi) || [];
    for (const match of matches) pushNameCandidate(names, match);
  }

  return Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
}

function getExplicitStores(options?: ETarjouslehdetProviderOptions): SelectedETStore[] {
  const stores: SelectedETStore[] = [];

  for (const store of options?.stores ?? []) {
    const anyStore = store as any;
    const name = firstString(
      store.storeName,
      store.sStoreName,
      store.name,
      store.title,
      store.label,
      anyStore?.shopName,
      anyStore?.storeLabel,
      options?.storeName,
      options?.sStoreName,
      "S-market",
    );
    const explicitId = firstString(store.etarjouslehdetStoreId, store.eTarjouslehdetStoreId, store.tjekStoreId);
    if (explicitId) stores.push({ storeId: explicitId, storeName: name });
  }

  const directId = firstString(options?.etarjouslehdetStoreId, options?.eTarjouslehdetStoreId, options?.tjekStoreId);
  if (directId) stores.push({ storeId: directId, storeName: firstString(options?.storeName, options?.sStoreName, "S-market") });

  return stores;
}

async function resolveStoreByName(requestedName: string): Promise<SelectedETStore | null> {
  const cacheKey = normalizeText(requestedName);
  if (STORE_CACHE.has(cacheKey)) return STORE_CACHE.get(cacheKey) || null;

  const tail = stripSMarketPrefix(requestedName);
  const queryWords = Array.from(new Set([requestedName, tail].filter(Boolean)));
  const queries: unknown[] = [];

  for (const query of queryWords) {
    queries.push(["stores", { businessId: S_MARKET_BUSINESS_ID, pagination: { limit: 25, offset: 0 }, query }]);
    queries.push(["stores", { businessId: S_MARKET_BUSINESS_ID, pagination: { limit: 25, offset: 0 }, search: query }]);
    queries.push(["stores", { businessId: S_MARKET_BUSINESS_ID, pagination: { limit: 25, offset: 0 }, q: query }]);
  }

  // Fallback: etusivun lähellä olevat / ensimmäiset S-marketit. Tämä auttaa, jos query-parametrin nimi muuttuu.
  queries.push(["stores", { businessId: S_MARKET_BUSINESS_ID, pagination: { limit: 100, offset: 0 } }]);

  const results = await postETBatch(queries);
  const stores = collectStoreRecords(results);
  const best = stores
    .map((store) => ({ ...store, score: scoreStoreNameMatch(requestedName, store.storeName) }))
    .filter((store) => store.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (typeof console !== "undefined") {
    console.warn("[ETARJOUS V20] resolve store", {
      requestedName,
      found: stores.length,
      best,
      sample: stores.slice(0, 8),
    });
  }

  const resolved = best && best.score >= 100 ? best : null;
  STORE_CACHE.set(cacheKey, resolved);
  return resolved;
}

async function getSelectedStores(options?: ETarjouslehdetProviderOptions): Promise<SelectedETStore[]> {
  const stores = [...getExplicitStores(options)];
  const requestedNames = getRequestedNames(options);

  for (const requestedName of requestedNames) {
    if (stores.some((store) => normalizeText(store.storeName) === normalizeText(requestedName))) continue;
    const resolved = await resolveStoreByName(requestedName);
    if (resolved) stores.push({ ...resolved, storeName: requestedName });
  }

  const seen = new Set<string>();
  return stores.filter((store) => {
    const key = `${store.storeId}|${normalizeText(store.storeName)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function resolvePublicationForStore(store: SelectedETStore): Promise<PublicationMeta | null> {
  const cacheKey = `${store.storeId}|${normalizeText(store.storeName)}`;
  if (PUBLICATION_CACHE.has(cacheKey)) return PUBLICATION_CACHE.get(cacheKey) || null;

  const frontParams: UnknownRecord = {
    businessIds: [S_MARKET_BUSINESS_ID],
    localBusinessIds: [store.storeId],
  };

  if (store.latitude != null && store.longitude != null) {
    frontParams.coordinates = { latitude: store.latitude, longitude: store.longitude };
  }

  const queries = [
    ["fronts", frontParams],
    ["fronts", { businessIds: [S_MARKET_BUSINESS_ID], localBusinessIds: [store.storeId] }],
  ];

  const results = await postETBatch(queries);
  const publications = collectPublicationRecords(results, store)
    .sort((a, b) => scorePublication(b) - scorePublication(a));

  if (typeof console !== "undefined") {
    console.warn("[ETARJOUS V20] resolve publication", { store, count: publications.length, sample: publications.slice(0, 3) });
  }

  const publication = publications[0] || null;
  PUBLICATION_CACHE.set(cacheKey, publication);
  return publication;
}

async function postTjekRpc(path: string, body: unknown): Promise<UnknownRecord | null> {
  const response = await fetchWithTimeout(`${TJEK_RPC_URL}/${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: ET_BASE,
      referer: `${ET_BASE}/`,
      "x-api-key": TJEK_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Tjek ${path} failed ${response.status}`);
  return asRecord(await response.json());
}

async function generatePublication(publicationId: string): Promise<UnknownRecord | null> {
  return postTjekRpc("generate_incito_from_publication", {
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

function collectOfferIds(value: unknown): string[] {
  const ids: string[] = [];
  walk(value, (record) => {
    const id = firstString(record.id);
    if (/^\d{6,}/.test(id)) ids.push(id);
  });
  return Array.from(new Set(ids));
}

function collectSections(publication: UnknownRecord) {
  const toc = Array.isArray(publication.table_of_contents) ? publication.table_of_contents : [];
  const titleById = new Map<string, string>();

  for (const entry of toc) {
    const record = asRecord(entry);
    const id = firstString(record?.view_id, record?.id);
    const title = firstString(record?.title, record?.label);
    if (id) titleById.set(id, title);
  }

  const root = asRecord(publication.root_view);
  const pages = Array.isArray(root?.child_views) ? root.child_views : [];

  return pages
    .map((page, pageIndex) => {
      let sectionId = "";

      walk(page, (record) => {
        if (sectionId) return;
        const id = firstString(record.id);
        if (id && titleById.has(id)) sectionId = id;
      });

      return {
        sectionId,
        title: titleById.get(sectionId) || "Muut",
        pageNumber: pageIndex + 1,
        pageCount: pages.length,
        offerIds: collectOfferIds(page),
      };
    })
    .filter((section) => section.sectionId && section.offerIds.length > 0)
    .slice(0, MAX_SECTIONS);
}

async function generateSection(publicationId: string, section: { sectionId: string; pageNumber: number; pageCount: number; offerIds: string[] }) {
  return postTjekRpc("generate_incito_from_publication_section", {
    id: publicationId,
    section_id: section.sectionId,
    page_number: section.pageNumber,
    page_count: section.pageCount,
    offer_ids: section.offerIds,
    a_offer_ids: [],
    pixel_ratio: 2,
    scale: 0.6,
    modest_branding: false,
  });
}

function findOfferNodes(value: unknown): UnknownRecord[] {
  const nodes: UnknownRecord[] = [];
  walk(value, (record) => {
    if (firstString(record.role) === "offer" && firstString(record.accessibility_label)) nodes.push(record);
  });
  return nodes;
}

function parseOfferLabel(label: string) {
  const match = String(label || "").match(/^(.*?),\s*EUR\s*([0-9]+(?:[,.][0-9]{1,2})?)\s*$/i);
  if (!match) return null;
  const price = Number(match[2].replace(",", "."));
  return {
    title: match[1].trim(),
    priceText: `${price.toFixed(2).replace(".", ",")} €`,
  };
}

function classifyCategory(title: string, sectionTitle: string) {
  const text = normalizeText(`${title} ${sectionTitle}`);
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

function offerMatchesQuery(query: string, result: ZiiplyOfferSearchResult) {
  const q = normalizeText(query);
  if (!q || q === normalizeText(GOSTA_MASTER_QUERY)) return true;
  const haystack = normalizeText([result.title, result.rawText, (result as any).category].join(" "));
  return q.split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function mapOffer(args: {
  node: UnknownRecord;
  query: string;
  config: ZiiplyOfferSearchSourceConfig;
  store: SelectedETStore;
  publication: PublicationMeta;
  sectionTitle: string;
  index: number;
}): ZiiplyOfferSearchResult | null {
  const label = firstString(args.node.accessibility_label);
  const parsed = parseOfferLabel(label);
  if (!parsed) return null;

  const rawId = firstString(args.node.id, `offer-${args.index}`);
  const ean = /^\d{8,14}/.test(rawId) ? rawId.replace(/__.*$/, "") : "";
  const category = classifyCategory(parsed.title, args.sectionTitle);
  const rawText = [parsed.title, parsed.priceText, category, args.sectionTitle, args.store.storeName, ean].filter(Boolean).join(" ");

  const result = {
    id: `etarjous-${args.publication.id}-${rawId}`,
    source: args.config.id || "etarjouslehdet",
    sourceUrl: args.config.url || `${ET_BASE}/S-market`,
    chain: "S-market",
    storeLabel: args.store.storeName,
    storeName: args.store.storeName,
    shopName: args.store.storeName,
    title: parsed.title,
    name: parsed.title,
    productName: parsed.title,
    priceText: parsed.priceText,
    price: parsed.priceText,
    offerPrice: parsed.priceText,
    unitPriceText: "",
    benefitText: "Tarjouslehti / eTarjouslehdet",
    discountText: "Tarjouslehti / eTarjouslehdet",
    validityText: args.publication.validUntil ? `Voimassa ${args.publication.validUntil.slice(0, 10)}` : "",
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: `${ET_BASE}/S-market/kaupat/${args.store.storeId}`,
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
  } as unknown as ZiiplyOfferSearchResult;

  return offerMatchesQuery(args.query, result) ? result : null;
}

function dedupe(results: ZiiplyOfferSearchResult[]): ZiiplyOfferSearchResult[] {
  const seen = new Set<string>();
  const out: ZiiplyOfferSearchResult[] = [];

  for (const result of results) {
    const key = `${(result as any).ean || result.id}|${normalizeText(result.title)}|${result.priceText}|${normalizeText(result.storeLabel)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(result);
  }

  return out;
}

export async function fetchETarjouslehdetOffers(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
  options?: ETarjouslehdetProviderOptions,
): Promise<ZiiplyOfferSearchResult[]> {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  const requestedNames = getRequestedNames(options);
  const stores = await getSelectedStores(options);

  if (stores.length === 0) {
    return [makeDebugResult({
      config,
      title: `ETPROV NO_STORE N${requestedNames.length}`,
      detail: `names=${requestedNames.join(" | ").slice(0, 80)} keys=${Object.keys((options as any) || {}).join(",").slice(0, 80)}`,
    })];
  }

  const allResults: ZiiplyOfferSearchResult[] = [];

  for (const store of stores) {
    try {
      const publication = await resolvePublicationForStore(store);
      if (!publication?.id) {
        allResults.push(makeDebugResult({
          config,
          title: `ETPROV NO_PUB ${store.storeId}`,
          detail: `store=${store.storeName} id=${store.storeId}`,
          storeName: store.storeName,
          storeId: store.storeId,
        }));
        continue;
      }

      const incito = await generatePublication(publication.id);
      if (!incito) {
        allResults.push(makeDebugResult({ config, title: `ETPROV PUBNULL ${publication.id}`, detail: store.storeName, storeName: store.storeName, storeId: store.storeId }));
        continue;
      }

      const sections = collectSections(incito);
      let parsedCount = 0;
      let labelCount = 0;

      for (const section of sections) {
        const sectionData = await generateSection(publication.id, section);
        if (!sectionData) continue;
        const nodes = findOfferNodes(sectionData);
        labelCount += nodes.length;

        nodes.forEach((node, index) => {
          const mapped = mapOffer({
            node,
            query: cleanQuery,
            config,
            store,
            publication,
            sectionTitle: section.title,
            index: parsedCount + index,
          });
          if (mapped) {
            parsedCount += 1;
            allResults.push(mapped);
          }
        });
      }

      allResults.unshift(makeDebugResult({
        config,
        title: `ETPROV OK S${sections.length} P${parsedCount}`,
        detail: `store=${store.storeName} id=${store.storeId} pub=${publication.id} labels=${labelCount}`,
        storeName: store.storeName,
        storeId: store.storeId,
      }));
    } catch (error) {
      allResults.push(makeDebugResult({
        config,
        title: "ETPROV ERR",
        detail: String(error instanceof Error ? error.message : error).slice(0, 140),
        storeName: store.storeName,
        storeId: store.storeId,
      }));
    }
  }

  return dedupe(allResults).sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0));
}

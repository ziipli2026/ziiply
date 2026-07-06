import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const ETARJOUSLEHDET_BASE_URL = "https://etarjouslehdet.fi/";
const TJEK_API_BASE_URL = "https://squid-api.tjek.com/v4/rpc";
const S_MARKET_BUSINESS_ID = "d8ccs8";
const GOSTA_MASTER_QUERY = "__ziiply_all_offers__";

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

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
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

function encodeQueryKey(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(json)));
}

async function postETarjouslehdetQueries(queries: unknown[]): Promise<UnknownRecord[]> {
  const response = await fetch(ETARJOUSLEHDET_BASE_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      data: queries.map(encodeQueryKey),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`eTarjouslehdet query failed: ${response.status}`);
  }

  const text = await response.text();

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as UnknownRecord);
}

function getResultValue(results: UnknownRecord[], queryName: string): unknown {
  const result = results.find((entry) => {
    const key = firstString(entry.key);
    if (!key) return false;

    try {
      const decoded =
        typeof Buffer !== "undefined"
          ? Buffer.from(key, "base64").toString("utf8")
          : decodeURIComponent(escape(atob(key)));

      return decoded.includes(`"${queryName}"`);
    } catch {
      return false;
    }
  });

  return result?.value;
}

function getSelectedETarjouslehdetStores(
  options?: ETarjouslehdetProviderOptions,
): Array<{ storeId: string; storeName: string }> {
  const stores: Array<{ storeId: string; storeName: string }> = [];

  for (const store of options?.stores ?? []) {
    const chain = normalizeText(store.chain);
    if (chain && !chain.includes("s market")) continue;

    const storeId = firstString(
      store.etarjouslehdetStoreId,
      store.eTarjouslehdetStoreId,
      store.tjekStoreId,
    );

    if (!storeId) continue;

    stores.push({
      storeId,
      storeName: firstString(store.storeName, "S-market"),
    });
  }

  const directStoreId = firstString(
    options?.etarjouslehdetStoreId,
    options?.eTarjouslehdetStoreId,
    options?.tjekStoreId,
  );

  if (directStoreId) {
    stores.push({
      storeId: directStoreId,
      storeName: firstString(options?.storeName, "S-market"),
    });
  }

  const seen = new Set<string>();
  return stores.filter((store) => {
    if (seen.has(store.storeId)) return false;
    seen.add(store.storeId);
    return true;
  });
}

async function getActivePublication(storeId: string): Promise<{
  publicationId: string;
  publicationName: string;
  validFrom: string;
  validUntil: string;
} | null> {
  const results = await postETarjouslehdetQueries([
    ["relatedPublications", { businessId: S_MARKET_BUSINESS_ID, locationId: storeId }],
  ]);

  const publications = getResultValue(results, "relatedPublications");

  if (!Array.isArray(publications) || publications.length === 0) return null;

  const publication = asRecord(publications[0]);
  if (!publication) return null;

  return {
    publicationId: firstString(publication.id, publication.publicId),
    publicationName: firstString(publication.label, "S-market"),
    validFrom: firstString(publication.validFrom),
    validUntil: firstString(publication.validUntil),
  };
}

async function generatePublication(publicationId: string): Promise<UnknownRecord | null> {
  const response = await fetch(`${TJEK_API_BASE_URL}/generate_incito_from_publication`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
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

  if (!response.ok) {
    throw new Error(`Tjek publication failed: ${response.status}`);
  }

  return asRecord(await response.json());
}

function collectOfferIds(value: unknown): string[] {
  const ids: string[] = [];

  function walk(node: unknown) {
    const record = asRecord(node);
    if (!record) return;

    const id = firstString(record.id);
    if (id && /^\d/.test(id)) ids.push(id);

    const children = Array.isArray(record.child_views) ? record.child_views : [];
    for (const child of children) walk(child);
  }

  walk(value);

  return Array.from(new Set(ids));
}

function collectSections(publication: UnknownRecord): Array<{
  sectionId: string;
  title: string;
  pageNumber: number;
  pageCount: number;
  offerIds: string[];
}> {
  const toc = Array.isArray(publication.table_of_contents)
    ? publication.table_of_contents
    : [];

  const titleById = new Map<string, string>();
  for (const entry of toc) {
    const record = asRecord(entry);
    const viewId = firstString(record?.view_id);
    const title = firstString(record?.title);
    if (viewId) titleById.set(viewId, title);
  }

  const root = asRecord(publication.root_view);
  const pages = Array.isArray(root?.child_views) ? root.child_views : [];

  const sections: Array<{
    sectionId: string;
    title: string;
    pageNumber: number;
    pageCount: number;
    offerIds: string[];
  }> = [];

  pages.forEach((page, pageIndex) => {
    const offerIds = collectOfferIds(page);
    if (offerIds.length === 0) return;

    let sectionId = "";

    function findSectionId(node: unknown) {
      if (sectionId) return;
      const record = asRecord(node);
      if (!record) return;

      const id = firstString(record.id);
      if (id && titleById.has(id)) {
        sectionId = id;
        return;
      }

      const children = Array.isArray(record.child_views) ? record.child_views : [];
      for (const child of children) findSectionId(child);
    }

    findSectionId(page);

    if (!sectionId) return;

    sections.push({
      sectionId,
      title: titleById.get(sectionId) || "",
      pageNumber: pageIndex + 1,
      pageCount: pages.length,
      offerIds,
    });
  });

  return sections;
}

async function generateSection(
  publicationId: string,
  section: {
    sectionId: string;
    pageNumber: number;
    pageCount: number;
    offerIds: string[];
  },
): Promise<UnknownRecord | null> {
  const response = await fetch(`${TJEK_API_BASE_URL}/generate_incito_from_publication_section`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
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
  return asRecord(await response.json());
}

function findOfferNodes(value: unknown): UnknownRecord[] {
  const found: UnknownRecord[] = [];

  function walk(node: unknown) {
    const record = asRecord(node);
    if (!record) return;

    if (record.role === "offer" && firstString(record.accessibility_label)) {
      found.push(record);
    }

    const children = Array.isArray(record.child_views) ? record.child_views : [];
    for (const child of children) walk(child);
  }

  walk(value);
  return found;
}

function parseOfferLabel(label: string): { title: string; priceText: string } {
  const match = label.match(/^(.*?),\s*EUR\s*([\d,.]+)\s*$/i);
  if (!match) {
    return { title: label.trim(), priceText: "" };
  }

  return {
    title: match[1].trim(),
    priceText: `${Number(match[2].replace(",", ".")).toFixed(2).replace(".", ",")} €`,
  };
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

  for (const word of q.split(/\s+/).filter((w) => w.length > 2)) {
    if (t.includes(word)) score += 20;
    if (c.includes(word)) score += 8;
  }

  return score;
}

function resultMatchesQuery(query: string, result: ZiiplyOfferSearchResult): boolean {
  if (!query || normalizeText(query) === normalizeText(GOSTA_MASTER_QUERY)) return true;

  const q = normalizeText(query);
  const haystack = normalizeText([
    result.title,
    result.rawText,
    (result as any).category,
    (result as any).categoryPath,
  ].join(" "));

  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function mapOfferNodeToResult(args: {
  node: UnknownRecord;
  query: string;
  config: ZiiplyOfferSearchSourceConfig;
  storeName: string;
  publication: {
    publicationId: string;
    publicationName: string;
    validFrom: string;
    validUntil: string;
  };
  category: string;
  index: number;
}): ZiiplyOfferSearchResult | null {
  const label = firstString(args.node.accessibility_label);
  if (!label) return null;

  const parsed = parseOfferLabel(label);
  if (!parsed.title) return null;

  const rawId = firstString(args.node.id, `etarjous-${args.index}`);
  const ean = rawId.replace(/__.*$/, "");

  const validityText = args.publication.validUntil
    ? `Voimassa ${args.publication.validUntil.slice(0, 10)}`
    : "";

  const rawText = [
    parsed.title,
    parsed.priceText,
    args.category,
    args.storeName,
    args.publication.publicationName,
  ].join(" ");

  return {
    id: `etarjous-${args.publication.publicationId}-${rawId}`,
    source: args.config.id,
    sourceUrl: args.config.url,
    chain: "S-market",
    storeLabel: args.storeName,
    storeName: args.storeName,
    shopName: args.storeName,
    title: parsed.title,
    priceText: parsed.priceText,
    unitPriceText: "",
    benefitText: "Tarjouslehti",
    validityText,
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: `https://etarjouslehdet.fi/S-market`,
    rawText,
    matchScore: getMatchScore(args.query, parsed.title, args.category),
    category: args.category,
    categoryPath: args.category,
    breadcrumbs: args.category,
    hierarchy: args.category,
    taxonomy: args.category,
    department: args.category,
    productGroup: args.category,
    mainCategory: args.category,
    subCategory: args.category,
    brandName: "",
    ean,
  } as unknown as ZiiplyOfferSearchResult;
}

function dedupe(results: ZiiplyOfferSearchResult[]): ZiiplyOfferSearchResult[] {
  const map = new Map<string, ZiiplyOfferSearchResult>();

  for (const item of results) {
    const key = `${(item as any).ean || item.id}|${normalizeText(item.title)}|${item.priceText}|${normalizeText(item.storeLabel)}`;
    if (!map.has(key)) map.set(key, item);
  }

  return Array.from(map.values());
}

export async function fetchETarjouslehdetOffers(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
  options?: ETarjouslehdetProviderOptions,
): Promise<ZiiplyOfferSearchResult[]> {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  const selectedStores = getSelectedETarjouslehdetStores(options);
  if (selectedStores.length === 0) return [];

  const allResults: ZiiplyOfferSearchResult[] = [];

  for (const store of selectedStores) {
    try {
      const publicationMeta = await getActivePublication(store.storeId);
      if (!publicationMeta?.publicationId) continue;

      const publication = await generatePublication(publicationMeta.publicationId);
      if (!publication) continue;

      const sections = collectSections(publication);

      for (const section of sections) {
        const sectionData = await generateSection(publicationMeta.publicationId, section);
        if (!sectionData) continue;

        const offerNodes = findOfferNodes(sectionData);

        offerNodes.forEach((node, index) => {
          const result = mapOfferNodeToResult({
            node,
            query: cleanQuery,
            config,
            storeName: store.storeName || publicationMeta.publicationName || "S-market",
            publication: publicationMeta,
            category: section.title,
            index,
          });

          if (result && resultMatchesQuery(cleanQuery, result)) {
            allResults.push(result);
          }
        });
      }
    } catch (error) {
      console.warn("[Ziiply offers] eTarjouslehdet provider failed", {
        store,
        error,
      });
    }
  }

  return dedupe(allResults).sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
}

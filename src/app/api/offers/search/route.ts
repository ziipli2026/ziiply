// src/app/api/offers/search/route.ts
// ============================================================================
// ZIIPLY_OFFERS_SEARCH_ROUTE_V12_EXISTING_ROUTE_SMARKET_ETARJOUS
// Revision: V12
// Date: 2026-07-06
//
// Korjaus:
// - EI luoda uutta API-routea eikä uutta polkua.
// - Tämä korvaa olemassa olevan routen: src/app/api/offers/search/route.ts
// - Prisma/S-kaupat.fi-polku säilyy nykyisessä searchZiiplyOffers-ketjussa.
// - Valitut S-marketit haetaan lisäksi eTarjouslehdet/Tjek-polusta tässä samassa routessa.
// - K-ryhmä säilyy nykyisessä searchZiiplyOffers-ketjussa.
// - Ei kovakoodata Vehkojaa: S-market julkaisu ratkaistaan käyttäjän valitseman S-market-nimen perusteella.
// ============================================================================

import { NextResponse } from "next/server";
import {
  searchZiiplyOffers,
  type ZiiplyOfferSearchSourceContextV8,
} from "../../../components/ziiply/offerSearch/ziiplyOfferSearchSources";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UnknownRecord = Record<string, unknown>;

const ETARJOUSLEHDET_BATCH_URL = "https://etarjouslehdet.fi/";
const TJEK_RPC_URL = "https://squid-api.tjek.com/v4/rpc";
const MASTER_QUERY = "__ziiply_all_offers__";

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function getParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  return value && value.trim() ? value.trim() : undefined;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
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

function splitMultiValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }

  return String(value ?? "")
    .replaceAll("\r", "")
    .replaceAll("\n", "||")
    .replaceAll(";", "||")
    .split("||")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isSMarketName(value: unknown): boolean {
  const text = normalizeText(value);
  return text.includes("s market") || text.includes("s-market");
}

function encodeQueryKey(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function decodeQueryKey(value: unknown): string {
  try {
    return Buffer.from(String(value || ""), "base64").toString("utf8");
  } catch {
    return "";
  }
}

async function postETarjouslehdetQueries(queries: unknown[]): Promise<UnknownRecord[]> {
  const response = await fetch(ETARJOUSLEHDET_BATCH_URL, {
    method: "POST",
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
      referer: "https://etarjouslehdet.fi/S-market",
      origin: "https://etarjouslehdet.fi",
    },
    body: JSON.stringify({ data: queries.map(encodeQueryKey) }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`eTarjouslehdet batch failed: ${response.status}`);
  }

  const text = await response.text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as UnknownRecord);
}

function getBatchValue(results: UnknownRecord[], queryName: string): unknown {
  const result = results.find((entry) => decodeQueryKey(entry.key).includes(`\"${queryName}\"`));
  return result?.value;
}

function publicationMatchesStoreName(publication: UnknownRecord, storeName: string): boolean {
  const label = normalizeText(firstString(publication.label, publication.name, publication.publicationName));
  const wanted = normalizeText(storeName);
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

async function resolveSMarketPublications(storeNames: string[]) {
  const results = await postETarjouslehdetQueries([
    ["fronts", { businessSlugs: ["S-market"] }],
  ]);

  const fronts = getBatchValue(results, "fronts");
  const publications = Array.isArray(fronts)
    ? fronts.flatMap((front) => {
        const record = asRecord(front);
        return Array.isArray(record?.publications) ? record.publications : [];
      })
    : [];

  return storeNames
    .map((storeName) => {
      const publication = publications
        .map(asRecord)
        .filter(Boolean)
        .find((entry) => publicationMatchesStoreName(entry as UnknownRecord, storeName)) as UnknownRecord | undefined;

      if (!publication) return null;

      return {
        storeName,
        publicationId: firstString(publication.id, publication.publicId),
        publicationName: firstString(publication.label, publication.name, storeName),
        validFrom: firstString(publication.validFrom),
        validUntil: firstString(publication.validUntil),
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

async function generatePublication(publicationId: string): Promise<UnknownRecord | null> {
  const response = await fetch(`${TJEK_RPC_URL}/generate_incito_from_publication`, {
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
  return asRecord(await response.json());
}

function collectOfferIds(value: unknown): string[] {
  const ids: string[] = [];

  function walk(node: unknown) {
    const record = asRecord(node);
    if (!record) return;

    const id = firstString(record.id);
    if (/^\d{6,}/.test(id)) ids.push(id);

    const children = Array.isArray(record.child_views) ? record.child_views : [];
    for (const child of children) walk(child);
  }

  walk(value);
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

      return {
        sectionId,
        title: titleById.get(sectionId) || "Muut",
        pageNumber: pageIndex + 1,
        pageCount: pages.length,
        offerIds: collectOfferIds(page),
      };
    })
    .filter((section) => section.sectionId && section.offerIds.length > 0);
}

async function generateSection(
  publicationId: string,
  section: { sectionId: string; pageNumber: number; pageCount: number; offerIds: string[] },
) {
  const response = await fetch(`${TJEK_RPC_URL}/generate_incito_from_publication_section`, {
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
  return asRecord(await response.json());
}

function findOfferNodes(value: unknown): UnknownRecord[] {
  const found: UnknownRecord[] = [];

  function walk(node: unknown) {
    const record = asRecord(node);
    if (!record) return;

    if (firstString(record.role) === "offer" && firstString(record.accessibility_label)) {
      found.push(record);
    }

    const children = Array.isArray(record.child_views) ? record.child_views : [];
    for (const child of children) walk(child);
  }

  walk(value);
  return found;
}

function parseOfferLabel(label: string) {
  const match = String(label || "").match(/^(.*?),\s*EUR\s*([\d,.]+)\s*$/i);
  if (!match) return { title: String(label || "").trim(), priceText: "" };

  return {
    title: match[1].trim(),
    priceText: `${Number(match[2].replace(",", ".")).toFixed(2).replace(".", ",")} €`,
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

function offerMatchesQuery(query: string, offer: UnknownRecord) {
  const q = normalizeText(query);
  if (!q || q === normalizeText(MASTER_QUERY)) return true;

  const haystack = normalizeText([offer.title, offer.category, offer.rawText].join(" "));
  return q.split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function mapOfferNode(args: {
  node: UnknownRecord;
  storeName: string;
  publicationId: string;
  publicationName: string;
  validUntil: string;
  sectionTitle: string;
  query: string;
  index: number;
}) {
  const label = firstString(args.node.accessibility_label);
  const parsed = parseOfferLabel(label);
  if (!parsed.title) return null;

  const rawId = firstString(args.node.id, `etarjous-${args.index}`);
  const ean = rawId.replace(/__.*$/, "");
  const category = classifyCategory(parsed.title, args.sectionTitle);
  const rawText = [parsed.title, parsed.priceText, args.sectionTitle, category, args.storeName].join(" ");

  const result: UnknownRecord = {
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
  };

  if (!offerMatchesQuery(args.query, result)) return null;
  return result;
}

function dedupe(items: UnknownRecord[]) {
  const seen = new Set<string>();
  const out: UnknownRecord[] = [];

  for (const item of items) {
    const key = [item.ean, normalizeText(item.title), item.priceText, normalizeText(item.storeName)].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

async function fetchSelectedSMarketETarjousOffers(query: string, rawSStoreNames: unknown) {
  const storeNames = Array.from(new Set(splitMultiValue(rawSStoreNames).filter(isSMarketName)));
  if (storeNames.length === 0) return [];

  const publications = await resolveSMarketPublications(storeNames);
  const allResults: UnknownRecord[] = [];

  for (const publicationMeta of publications) {
    if (!publicationMeta.publicationId) continue;

    const publication = await generatePublication(publicationMeta.publicationId);
    if (!publication) continue;

    const sections = collectSections(publication);

    for (const section of sections) {
      const sectionData = await generateSection(publicationMeta.publicationId, section);
      if (!sectionData) continue;

      const nodes = findOfferNodes(sectionData);
      for (let index = 0; index < nodes.length; index += 1) {
        const mapped = mapOfferNode({
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

  return dedupe(allResults);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const q = getParam(searchParams, "q") || "";

    const rawSStoreId = getParam(searchParams, "sStoreId");
    const rawSStoreName = getParam(searchParams, "sStoreName");
    const rawKStoreId = getParam(searchParams, "kStoreId");
    const rawKStoreName = getParam(searchParams, "kStoreName");

    const context: ZiiplyOfferSearchSourceContextV8 = {
      areaLabel: getParam(searchParams, "area"),
      storeMode: getParam(searchParams, "storeMode"),
      storeCompareScope: getParam(searchParams, "scope"),
      withinChain: getParam(searchParams, "withinChain"),

      // S-ryhmä: page/core välittää useat S-valinnat tässä projektissa yleensä
      // sStoreId/sStoreName-kentissä ||-eroteltuna.
      sStoreId: rawSStoreId,
      sStoreName: rawSStoreName,
      sStoreIds: splitMultiValue(rawSStoreId),
      sStoreNames: splitMultiValue(rawSStoreName),

      // K-ryhmä: sama käsittely.
      kStoreId: rawKStoreId,
      kStoreName: rawKStoreName,
      kStoreIds: splitMultiValue(rawKStoreId),
      kStoreNames: splitMultiValue(rawKStoreName),
    } as ZiiplyOfferSearchSourceContextV8;

    const baseResults = await searchZiiplyOffers(q, context);

    let sMarketResults: UnknownRecord[] = [];
    try {
      sMarketResults = await fetchSelectedSMarketETarjousOffers(q, rawSStoreName);
    } catch (error) {
      console.warn("[Ziiply offers V12] eTarjouslehdet S-market fetch failed", error);
      sMarketResults = [];
    }

    const results = dedupe([...(baseResults as unknown as UnknownRecord[]), ...sMarketResults]);

    return NextResponse.json(
      {
        ok: true,
        query: q,
        context,
        results,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("[Ziiply offers] route failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Tarjoushaku epäonnistui",
        results: [],
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  }
}

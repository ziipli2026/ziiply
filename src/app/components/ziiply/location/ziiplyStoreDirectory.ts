// ============================================================================
// S_KAUPAT_STORE_DIRECTORY_V1_URL_ID_RESOLVER
// Date: 2026-06-06
//
// Purpose:
// - Resolve real S-kaupat storeId values from S-kaupat's own store URLs.
// - S-kaupat store URLs use this shape:
//   https://www.s-kaupat.fi/myymala/<store-slug>/<storeId>
// - This module crawls S-kaupat chain store-list pages, extracts those links,
//   and builds an in-memory directory keyed by normalized store name.
//
// Install path suggestion:
// src/app/components/ziiply/offerSearch/providers/sKaupatStoreDirectory.ts
//
// Usage from skaupatProvider.ts:
//   import { resolveSKaupatStoreIdFromDirectoryV1 } from "./sKaupatStoreDirectory";
//
//   const resolved = await resolveSKaupatStoreIdFromDirectoryV1(options?.storeName);
// ============================================================================

export type SKaupatStoreDirectoryEntryV1 = {
  chain: string;
  name: string;
  slug: string;
  sKaupatStoreId: string;
  url: string;
};

const S_KAUPAT_BASE_URL_V1 = "https://www.s-kaupat.fi";

const S_KAUPAT_STORE_CHAIN_PAGES_V1: Array<{ chain: string; path: string }> = [
  { chain: "Prisma", path: "/myymalat/prisma" },
  { chain: "S-market", path: "/myymalat/s-market" },
  { chain: "Sale", path: "/myymalat/sale" },
  { chain: "Alepa", path: "/myymalat/alepa" },
  { chain: "Food Market Herkku", path: "/myymalat/food-market-herkku" },
  { chain: "Sokos Herkku", path: "/myymalat/sokos-herkku" },
  { chain: "Mestarin Herkku", path: "/myymalat/mestarin-herkku" },
];

const sKaupatStoreDirectoryPromiseCacheV1 = new Map<string, Promise<SKaupatStoreDirectoryEntryV1[]>>();
let sKaupatFullDirectoryPromiseV1: Promise<SKaupatStoreDirectoryEntryV1[]> | null = null;

function normalizeSKaupatStoreTextV1(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntitiesV1(value: string): string {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function titleFromSlugV1(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lower = decodeURIComponent(part).toLowerCase();
      if (lower === "s") return "S";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ")
    .replace(/\bPrisma\b/i, "Prisma")
    .replace(/\bAlepa\b/i, "Alepa")
    .replace(/\bSale\b/i, "Sale")
    .replace(/\bMarket\b/i, "Market");
}

function cleanStoreNameCandidateV1(value: string): string {
  return decodeHtmlEntitiesV1(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function entryFromStoreHrefV1(chain: string, href: string, label?: string): SKaupatStoreDirectoryEntryV1 | null {
  const cleanHref = decodeHtmlEntitiesV1(String(href || ""));
  const match = cleanHref.match(/\/myymala\/([^/?#]+)\/(\d{5,})(?:[?#][^"'\s<>]*)?/i);
  if (!match) return null;

  const slug = decodeURIComponent(match[1] || "").trim();
  const sKaupatStoreId = String(match[2] || "").trim();

  if (!slug || !/^\d{5,}$/.test(sKaupatStoreId)) return null;

  const labelName = cleanStoreNameCandidateV1(label || "");
  const name = labelName || titleFromSlugV1(slug);
  const url = `${S_KAUPAT_BASE_URL_V1}/myymala/${slug}/${sKaupatStoreId}`;

  return {
    chain,
    name,
    slug,
    sKaupatStoreId,
    url,
  };
}

function extractStoreEntriesFromHtmlV1(chain: string, html: string): SKaupatStoreDirectoryEntryV1[] {
  const entries: SKaupatStoreDirectoryEntryV1[] = [];
  const seen = new Set<string>();
  const source = String(html || "");

  // Anchor with text:
  // <a href="/myymala/prisma-hollola/708269170">Prisma Hollola</a>
  const anchorPattern = /<a\b[^>]*href=["']([^"']*\/myymala\/[^"']+\/\d{5,}[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of source.matchAll(anchorPattern)) {
    const entry = entryFromStoreHrefV1(chain, match[1] || "", match[2] || "");
    if (!entry || seen.has(entry.sKaupatStoreId)) continue;
    seen.add(entry.sKaupatStoreId);
    entries.push(entry);
  }

  // Next.js / JSON escaped href fallback:
  // "\/myymala\/prisma-hollola\/708269170"
  const escapedPattern = /\\?\/myymala\\?\/([^"'<>\s\\/?#]+)\\?\/(\d{5,})/gi;
  for (const match of source.matchAll(escapedPattern)) {
    const slug = String(match[1] || "").replace(/\\/g, "");
    const storeId = String(match[2] || "");
    const entry = entryFromStoreHrefV1(chain, `/myymala/${slug}/${storeId}`);
    if (!entry || seen.has(entry.sKaupatStoreId)) continue;
    seen.add(entry.sKaupatStoreId);
    entries.push(entry);
  }

  return entries;
}

function extractNextPageUrlsV1(currentUrl: string, html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const source = String(html || "");

  const addUrl = (rawHref: string) => {
    const cleanHref = decodeHtmlEntitiesV1(String(rawHref || "")).replace(/\\/g, "");
    if (!cleanHref || !cleanHref.includes("cursor=")) return;

    try {
      const url = new URL(cleanHref, currentUrl).toString();
      if (seen.has(url)) return;
      seen.add(url);
      urls.push(url);
    } catch {
      // Ignore malformed hrefs.
    }
  };

  const hrefPattern = /href=["']([^"']*cursor=[^"']*)["']/gi;
  for (const match of source.matchAll(hrefPattern)) {
    addUrl(match[1] || "");
  }

  const escapedHrefPattern = /\\?\/myymalat\\?\/[^"'\s<>]+cursor=[^"'\s<>\\]+/gi;
  for (const match of source.matchAll(escapedHrefPattern)) {
    addUrl(match[0] || "");
  }

  return urls;
}

async function fetchSKaupatHtmlV1(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "fi",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`S-kaupat store directory fetch failed: ${response.status} ${url}`);
  }

  return response.text();
}

async function fetchSKaupatChainDirectoryV1(
  chain: string,
  path: string,
): Promise<SKaupatStoreDirectoryEntryV1[]> {
  const firstUrl = new URL(path, S_KAUPAT_BASE_URL_V1).toString();
  const queue = [firstUrl];
  const visited = new Set<string>();
  const byId = new Map<string, SKaupatStoreDirectoryEntryV1>();

  while (queue.length > 0 && visited.size < 30) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;

    visited.add(url);

    try {
      const html = await fetchSKaupatHtmlV1(url);
      for (const entry of extractStoreEntriesFromHtmlV1(chain, html)) {
        byId.set(entry.sKaupatStoreId, entry);
      }

      for (const nextUrl of extractNextPageUrlsV1(url, html)) {
        if (!visited.has(nextUrl)) queue.push(nextUrl);
      }
    } catch (error) {
      console.warn("[S-kaupat directory] chain page failed", { chain, url, error });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "fi"));
}

export async function getSKaupatChainDirectoryV1(
  chain: string,
): Promise<SKaupatStoreDirectoryEntryV1[]> {
  const chainPage = S_KAUPAT_STORE_CHAIN_PAGES_V1.find(
    (item) => normalizeSKaupatStoreTextV1(item.chain) === normalizeSKaupatStoreTextV1(chain),
  );

  if (!chainPage) return [];

  const cacheKey = normalizeSKaupatStoreTextV1(chainPage.chain);
  const cached = sKaupatStoreDirectoryPromiseCacheV1.get(cacheKey);
  if (cached) return cached;

  const promise = fetchSKaupatChainDirectoryV1(chainPage.chain, chainPage.path);
  sKaupatStoreDirectoryPromiseCacheV1.set(cacheKey, promise);
  return promise;
}

export async function getSKaupatFullDirectoryV1(): Promise<SKaupatStoreDirectoryEntryV1[]> {
  if (sKaupatFullDirectoryPromiseV1) return sKaupatFullDirectoryPromiseV1;

  sKaupatFullDirectoryPromiseV1 = (async () => {
    const all = await Promise.all(
      S_KAUPAT_STORE_CHAIN_PAGES_V1.map((item) =>
        getSKaupatChainDirectoryV1(item.chain),
      ),
    );

    const byId = new Map<string, SKaupatStoreDirectoryEntryV1>();
    for (const entry of all.flat()) {
      byId.set(entry.sKaupatStoreId, entry);
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "fi"));
  })();

  return sKaupatFullDirectoryPromiseV1;
}

function scoreSKaupatStoreNameMatchV1(entry: SKaupatStoreDirectoryEntryV1, storeName: string): number {
  const target = normalizeSKaupatStoreTextV1(storeName);
  if (!target) return 0;

  const name = normalizeSKaupatStoreTextV1(entry.name);
  const slug = normalizeSKaupatStoreTextV1(entry.slug.replace(/-/g, " "));

  if (name === target || slug === target) return 1000;
  if (name.includes(target) || slug.includes(target)) return 700;
  if (target.includes(name) || target.includes(slug)) return 650;

  const targetWords = target.split(/\s+/).filter((word) => word.length > 1);
  const haystack = `${name} ${slug}`;
  let score = 0;

  for (const word of targetWords) {
    if (haystack.includes(word)) score += word.length >= 4 ? 50 : 15;
  }

  return score;
}

export async function resolveSKaupatStoreIdFromDirectoryV1(
  storeName: unknown,
): Promise<string | null> {
  const cleanStoreName = String(storeName ?? "").trim();
  if (!cleanStoreName) return null;

  const directory = await getSKaupatFullDirectoryV1();
  let best: { entry: SKaupatStoreDirectoryEntryV1; score: number } | null = null;

  for (const entry of directory) {
    const score = scoreSKaupatStoreNameMatchV1(entry, cleanStoreName);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { entry, score };
  }

  if (!best || best.score < 80) {
    console.warn("[S-kaupat directory] no reliable storeId match", {
      storeName: cleanStoreName,
      bestScore: best?.score ?? 0,
      bestName: best?.entry.name,
      bestId: best?.entry.sKaupatStoreId,
    });
    return null;
  }

  return best.entry.sKaupatStoreId;
}

export function findSKaupatStoreIdFromUrlV1(url: unknown): string | null {
  const text = String(url ?? "");
  const match = text.match(/\/myymala\/[^/?#]+\/(\d{5,})(?:[?#].*)?$/i);
  return match?.[1] || null;
}

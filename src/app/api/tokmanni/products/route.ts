import { after } from "next/server";
import { NextResponse } from "next/server";
import { observeEanProductsBestEffort } from "@/lib/eanBank";
import { filterSparMilkQuery } from "@/lib/sparMilkSearch";
import { applyApprovedSparCategories, filterApprovedSparGroceryItems, filterApprovedSparMilkCategory, SPAR_APPROVED_INDEX } from "@/lib/sparApprovedCategories";

const TOKMANNI_SEARCH_URL = "https://www.tokmanni.fi/search";
const clean = (value: unknown) => String(value ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();

function decodeEntities(src: string) {
  const named: Record<string, string> = {
    nbsp: " ", amp: "&", euro: "€", quot: '"', apos: "'", lt: "<", gt: ">",
    auml: "ä", Auml: "Ä", ouml: "ö", Ouml: "Ö", aring: "å", Aring: "Å",
  };
  return src
    .replace(/&([A-Za-z]+);/g, (all, n) => named[n] ?? all)
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function textOf(src: string) {
  return clean(decodeEntities(src.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))).replace(/\s+/g, " ").trim();
}

function absoluteUrl(href: string) {
  try { return new URL(href, TOKMANNI_SEARCH_URL).href; } catch { return ""; }
}

function eanFromProductUrl(productUrl: string) {
  try {
    const pathname = new URL(productUrl).pathname.replace(/\/+$/, "");
    const match = pathname.match(/-(\d{8,14})$/);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

function first(block: string, patterns: RegExp[]) {
  for (const re of patterns) {
    const match = block.match(re);
    if (match?.[1]) return textOf(match[1]);
  }
  return "";
}

function numberPrice(value: unknown) {
  const match = String(value ?? "").replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function productBlocks(html: string) {
  return html
    .split(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>/i)
    .slice(1)
    .map((part) => part.split(/<\/li>/i)[0] || "")
    .filter((part) => /product-item-link|product-item-name/i.test(part));
}

function mapProduct(block: string, index: number) {
  const name = first(block, [
    /class=["'][^"']*product-item-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    /class=["'][^"']*product-item-name[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
  ]);
  if (!name) return null;

  const allText = textOf(block);
  const normalMarker = allText.match(/Normaalihinta\s*(\d+(?:[,.]\d{1,2})?)/i);
  const offerMarker = allText.match(/Tarjoushinta\s*(\d+(?:[,.]\d{1,2})?)/i);
  const visiblePrices = Array.from(allText.matchAll(/(?:^|\s)(\d+[,.]\d{1,2})(?:\s*€|\s|$)/g)).map((m) => numberPrice(m[1])).filter((value) => value > 0);
  // Justiina is a normal-price search: prefer Tokmanni's explicit normal price
  // when the card is currently on offer, otherwise use the ordinary visible price.
  const price = numberPrice(normalMarker?.[1]) || (!offerMarker ? visiblePrices[0] || 0 : 0);
  if (!(price > 0)) return null;

  const hrefMatch = block.match(/class=["'][^"']*product-item-link[^"']*["'][^>]*href=["']([^"']+)/i)
    || block.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*product-item-link/i);
  const imageMatch = block.match(/class=["'][^"']*product-image-photo[^"']*["'][^>]*(?:src|data-src)=["']([^"']+)/i)
    || block.match(/(?:src|data-src)=["']([^"']+)["'][^>]*class=["'][^"']*product-image-photo/i);

  const productUrl = absoluteUrl(decodeEntities(hrefMatch?.[1] || ""));
  const ean = eanFromProductUrl(productUrl);

  return {
    id: 761000000 + index,
    name,
    chain: "TOKMANNI",
    storeName: "Tokmanni / SPAR verkkovalikoima",
    price,
    pictureUrl: absoluteUrl(decodeEntities(imageMatch?.[1] || "")),
    productUrl,
    ean,
    category: "Tokmanni",
    storeItems: [{ price }],
  };
}

const KLEVU_SEARCH_URL = "https://eucs11.ksearchnet.com/cloud-search/n-search/search";
const KLEVU_TICKET = "klevu-15488592134928913";

function mapKlevuProduct(item: any, index: number) {
  const ean = clean(item?.sku);
  const name = clean(item?.name);
  // Justiina is a normal-price search. Prefer oldPrice when Klevu exposes a
  // discounted salePrice; otherwise the current/base price is the normal price.
  const salePrice = numberPrice(item?.salePrice);
  const oldPrice = numberPrice(item?.oldPrice);
  const basePrice = numberPrice(item?.basePrice);
  const currentPrice = numberPrice(item?.price);
  const price = oldPrice > salePrice && salePrice > 0
    ? oldPrice
    : basePrice || currentPrice || salePrice;
  if (!name || !(price > 0)) return null;

  return {
    id: Number(item?.id) || 762000000 + index,
    name,
    chain: "TOKMANNI",
    storeName: "Tokmanni / SPAR verkkovalikoima",
    price,
    pictureUrl: clean(item?.cloudinary_image),
    productUrl: clean(item?.url),
    ean,
    brand: clean(item?.item_brand_name),
    category: clean(item?.category) || "Tokmanni",
    inStock: String(item?.inStock || "").toLowerCase() === "yes",
    storeItems: [{ price }],
  };
}

async function fetchKlevuProducts(search: string) {
  const url = new URL(KLEVU_SEARCH_URL);
  url.searchParams.set("ticket", KLEVU_TICKET);
  url.searchParams.set("analyticsApiKey", KLEVU_TICKET);
  url.searchParams.set("term", search);
  url.searchParams.set("paginationStartsFrom", "0");
  url.searchParams.set("noOfResults", "100");
  url.searchParams.set("klevuSort", "rel");
  url.searchParams.set("responseType", "json");
  url.searchParams.set("category", "KLEVU_PRODUCT");
  url.searchParams.set("visibility", "search");
  url.searchParams.set("showOutOfStockProducts", "true");
  url.searchParams.set("fetchMinMaxPrice", "true");

  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "Ziiply/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Klevu HTTP ${response.status}`);
  const data = await response.json();
  return (Array.isArray(data?.result) ? data.result : [])
    .map(mapKlevuProduct)
    .filter((item: any): item is NonNullable<ReturnType<typeof mapKlevuProduct>> => Boolean(item));
}

async function fetchHtmlFallbackProducts(search: string) {
  const url = new URL(TOKMANNI_SEARCH_URL);
  url.searchParams.set("q", search);
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "fi-FI,fi;q=0.9",
      "user-agent": "Ziiply/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Tokmanni HTML HTTP ${response.status}`);
  const html = await response.text();
  return productBlocks(html)
    .map(mapProduct)
    .filter((item): item is NonNullable<ReturnType<typeof mapProduct>> => Boolean(item));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = String(searchParams.get("search") || "").trim();
  // Preserve the user intent when the client expands the provider query into aliases.
  const intent = String(searchParams.get("intent") || search).trim();
  if (!search) return NextResponse.json({ source: "tokmanni-klevu", items: [] });

  let items: any[] = [];
  let source = "tokmanni-klevu";
  let klevuError = "";

  try {
    items = await fetchKlevuProducts(search);
  } catch (error) {
    klevuError = String(error);
  }

  // Keep the existing HTML parser as a resilience fallback. Klevu is primary,
  // but an outage or response change must not make Tokmanni/SPAR search vanish.
  if (items.length === 0) {
    source = "tokmanni-html-fallback";
    try {
      items = await fetchHtmlFallbackProducts(search);
    } catch (error) {
      return NextResponse.json(
        { source, status: 500, items: [], klevuError, error: String(error) },
        { status: 500 },
      );
    }
  }

  after(() => observeEanProductsBestEffort(
    items
      .filter((item) => Boolean(item.ean))
      .map((item) => ({
        ean: item.ean,
        name: item.name,
        imageUrl: item.pictureUrl,
        brand: item.brand,
        category: item.category,
        source,
      })),
  ));

  const categorizedItems = applyApprovedSparCategories(filterApprovedSparGroceryItems(filterApprovedSparMilkCategory(filterSparMilkQuery(items, intent), intent, SPAR_APPROVED_INDEX), SPAR_APPROVED_INDEX), SPAR_APPROVED_INDEX);
  return NextResponse.json({ source, status: 200, items: categorizedItems, klevuError: klevuError || undefined });
}

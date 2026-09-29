import { NextResponse } from "next/server";
import { observeEanProductsBestEffort } from "@/lib/eanBank";

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
    price,
    pictureUrl: absoluteUrl(decodeEntities(imageMatch?.[1] || "")),
    productUrl,
    ean,
    category: "Tokmanni",
    storeItems: [{ price }],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = String(searchParams.get("search") || "").trim();
  if (!search) return NextResponse.json({ source: "tokmanni-search", items: [] });

  const url = new URL(TOKMANNI_SEARCH_URL);
  url.searchParams.set("q", search);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "fi-FI,fi;q=0.9",
        "user-agent": "Ziiply/1.0",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ source: "tokmanni-search", status: response.status, items: [] }, { status: 502 });
    }

    const html = await response.text();
    const items = productBlocks(html)
      .map(mapProduct)
      .filter((item): item is NonNullable<ReturnType<typeof mapProduct>> => Boolean(item));

    await observeEanProductsBestEffort(
      items
        .filter((item) => Boolean(item.ean))
        .map((item) => ({
          ean: item.ean,
          name: item.name,
          imageUrl: item.pictureUrl,
          category: item.category,
          source: "tokmanni-search",
        })),
    );

    return NextResponse.json({ source: "tokmanni-search", status: response.status, items });
  } catch (error) {
    return NextResponse.json({ source: "tokmanni-search", status: 500, items: [], error: String(error) }, { status: 500 });
  }
}

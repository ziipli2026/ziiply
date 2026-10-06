import { after } from "next/server";
import { NextResponse } from "next/server";
import { observeEanProductsBestEffort } from "@/lib/eanBank";

type RuoanhintaProduct = {
  id: number;
  name: string;
  ean?: string;
  gtin?: string;
  eanCode?: string;
  barcode?: string;
  externalId?: string;
  brandName?: string;
  pictureUrl?: string;
  category?: string;
  storeItems?: {
    price: number;
    comparisonPrice?: number | null;
    comparisonPriceUnit?: string | null;
  }[];
};

function getPrice(product: RuoanhintaProduct) {
  return product.storeItems?.[0]?.price || 0;
}

function isValidGtin(value: unknown) {
  const digits = String(value ?? "").trim();
  if (!/^(?:\\d{8}|\\d{12}|\\d{13}|\\d{14})$/.test(digits)) return false;
  const body = digits.slice(0, -1);
  const expected = Number(digits.at(-1));
  const sum = [...body].reverse().reduce((total, digit, index) =>
    total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === expected;
}

function getEan(product: RuoanhintaProduct) {
  const candidates = [product.ean, product.gtin, product.eanCode, product.barcode];
  return candidates.map((value) => String(value ?? "").trim()).find(isValidGtin) || undefined;
}

function fixEncoding(value: string) {
  return value
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¥/g, "å")
    .replace(/â„¢/g, "")
    .replace(/Â/g, "");
}

type RuoanhintaStore = {
  id: number | string;
  name?: string;
  city?: string;
  address?: string;
  streetAddress?: string;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function resolveRuoanhintaLidlStoreId(storeName: string, city: string, address: string) {
  const queries = [address, storeName, city, "Lidl"].map((value) => String(value || "").trim()).filter(Boolean);
  const seen = new Map<string, RuoanhintaStore>();

  for (const query of queries) {
    const response = await fetch(
      `https://api.ruoanhinta.fi/api/stores?search=${encodeURIComponent(query)}`,
      { headers: { accept: "application/json" }, cache: "no-store" },
    );
    if (!response.ok) continue;
    const data = await response.json();
    const rows: RuoanhintaStore[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    for (const row of rows) seen.set(String(row.id), row);
  }

  const targetAddress = normalize(address);
  const targetCity = normalize(city);
  const targetName = normalize(storeName);

  const candidates = Array.from(seen.values()).filter((store) => {
    const haystack = normalize([store.name, store.city, store.address, store.streetAddress].filter(Boolean).join(" "));
    return haystack.includes("lidl");
  });

  const scored = candidates
    .map((store) => {
      const haystack = normalize([store.name, store.city, store.address, store.streetAddress].filter(Boolean).join(" "));
      let score = 0;
      if (targetAddress && haystack.includes(targetAddress)) score += 100;
      if (targetCity && haystack.includes(targetCity)) score += 20;
      if (targetName && haystack.includes(targetName)) score += 10;
      return { store, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? String(scored[0].store.id) : "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = String(searchParams.get("search") || "").trim();
  const requestedStoreId = String(searchParams.get("storeId") || "").trim();
  const storeName = String(searchParams.get("storeName") || "").trim();
  const city = String(searchParams.get("city") || "").trim();
  const address = String(searchParams.get("address") || "").trim();
  // Research mode must not depend on, or call, the unrelated Ruoanhinta store resolver.
  // Explicit research mode: public name discovery, not a store price/EAN feed.
  if (search && searchParams.get("mode") === "research") {
    const { searchLidlResearch } = await import("@/lib/lidlResearchSearch");
    return NextResponse.json({
      source: "lidl.fi-public-research",
      storeId: null,
      priceVerified: false,
      items: searchLidlResearch(search, 40),
    });
  }

  const storeId = /^\d+$/.test(requestedStoreId)
    ? requestedStoreId
    : await resolveRuoanhintaLidlStoreId(storeName, city, address);

  if (!search || !/^\d+$/.test(storeId)) {
    return NextResponse.json({
      source: "ruoanhinta-lidl",
      storeId,
      status: 200,
      items: [],
    });
  }

  const endpoint =
    `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(search)}&storeIds=${encodeURIComponent(storeId)}&skip=0&take=80`;

  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({
        source: "ruoanhinta-lidl",
        storeId,
        status: response.status,
        items: [],
      }, { status: 502 });
    }

    const data = await response.json();
    const sourceItems: RuoanhintaProduct[] = Array.isArray(data?.items) ? data.items : [];
    const items = sourceItems
      .filter((product) => getPrice(product) > 0)
      .map((product) => ({
        id: product.id,
        name: fixEncoding(product.name),
        ean: getEan(product),
        brandName: product.brandName ? fixEncoding(product.brandName) : undefined,
        pictureUrl: product.pictureUrl,
        category: product.category,
        price: getPrice(product),
        comparisonPrice: product.storeItems?.[0]?.comparisonPrice ?? undefined,
        comparisonPriceUnit: product.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
        storeItems: [{
          price: getPrice(product),
          comparisonPrice: product.storeItems?.[0]?.comparisonPrice ?? undefined,
          comparisonPriceUnit: product.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
        }],
      }));

    after(() => observeEanProductsBestEffort(items.map((item) => ({ ean: item.ean, name: item.name, brand: item.brandName, imageUrl: item.pictureUrl, category: item.category, source: "ruoanhinta-lidl" }))));

    return NextResponse.json({
      source: "ruoanhinta-lidl",
      storeId,
      status: response.status,
      items,
    });
  } catch (error) {
    return NextResponse.json({
      source: "ruoanhinta-lidl",
      storeId,
      status: 500,
      items: [],
      error: String(error),
    }, { status: 500 });
  }
}

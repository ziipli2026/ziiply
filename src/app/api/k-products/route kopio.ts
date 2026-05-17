import { NextResponse } from "next/server";

type KProduct = {
  id: string;
  name: string;
  ean?: string;
  brandName?: string;
  pictureUrl?: string;
  price: number;
  unitPrice?: string;
  storeName?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function parsePriceToCents(value: unknown): number {
  if (typeof value === "number") {
    if (value > 0 && value < 1000) return Math.round(value * 100);
    return Math.round(value);
  }

  const text = String(value || "")
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(",", ".");

  const number = Number(text);

  if (!Number.isFinite(number) || number <= 0) return 0;
  if (number < 1000) return Math.round(number * 100);

  return Math.round(number);
}

function findProductObjects(input: unknown): KProduct[] {
  const results: KProduct[] = [];
  const seen = new Set<string>();

  function walk(value: unknown) {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }

    const object = value as Record<string, unknown>;

    const possibleName =
      object.name ||
      object.productName ||
      object.title ||
      object.displayName ||
      object.label;

    const possiblePrice =
      object.price ||
      object.currentPrice ||
      object.normalPrice ||
      object.displayPrice ||
      object.salesPrice ||
      object.priceValue ||
      object.unitPrice;

    const name = normalizeText(possibleName);
    const price = parsePriceToCents(possiblePrice);

    if (name && price > 0) {
      const id =
        normalizeText(object.id) ||
        normalizeText(object.productId) ||
        normalizeText(object.ean) ||
        normalizeText(object.gtin) ||
        name;

      const key = `${id}-${name}-${price}`;

      if (!seen.has(key)) {
        seen.add(key);

        results.push({
          id,
          name,
          ean:
            normalizeText(object.ean) ||
            normalizeText(object.gtin) ||
            normalizeText(object.gtin13) ||
            normalizeText(object.eanCode) ||
            undefined,
          brandName:
            normalizeText(object.brand) ||
            normalizeText(object.brandName) ||
            undefined,
          pictureUrl:
            normalizeText(object.imageUrl) ||
            normalizeText(object.pictureUrl) ||
            normalizeText(object.image) ||
            normalizeText(object.thumbnail) ||
            undefined,
          price,
          unitPrice:
            normalizeText(object.unitPrice) ||
            normalizeText(object.comparisonPrice) ||
            normalizeText(object.pricePerUnit) ||
            undefined,
        });
      }
    }

    for (const child of Object.values(object)) {
      walk(child);
    }
  }

  walk(input);

  return results.slice(0, 30);
}

function resolveKStoreId(store: string) {
  if (store === "k-citymarket-hyvinkaa") return "N183";
  if (store === "N183") return "N183";

  return "N183";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const store = searchParams.get("store") || "k-citymarket-hyvinkaa";
  const storeId = resolveKStoreId(store);

  if (!search.trim()) {
    return NextResponse.json({
      store,
      storeId,
      items: [],
    });
  }

  const url = `https://www.k-ruoka.fi/kr-api/v2/product-search/${encodeURIComponent(
    search
  )}?offset=0&language=fi&storeId=${encodeURIComponent(
    storeId
  )}&limit=100&discountFilter=false&isTosTrOffer=false`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "accept-language": "fi-FI,fi;q=0.9",
        origin: "https://www.k-ruoka.fi",
        referer: `https://www.k-ruoka.fi/kauppa/tuotehaku?haku=${encodeURIComponent(
          search
        )}`,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
        "x-k-build-number": "30858",
        "x-k-experiments":
          "ab4d.10001.1!d2ae.10003.1!a.00149.1!a.00159.1!a.00160.0!a.00164.0!a.00167.0!a.00168.0",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          store,
          storeId,
          source: "k-ruoka",
          endpoint: url,
          status: response.status,
          contentType,
          items: [],
          preview: text.slice(0, 500),
        },
        { status: 200 }
      );
    }

    let json: unknown;

    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({
        store,
        storeId,
        source: "k-ruoka",
        endpoint: url,
        status: response.status,
        contentType,
        items: [],
        preview: text.slice(0, 500),
      });
    }

    const items = findProductObjects(json);

    return NextResponse.json({
      store,
      storeId,
      source: "k-ruoka",
      endpoint: url,
      status: response.status,
      items,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        store,
        storeId,
        source: "k-ruoka",
        endpoint: url,
        items: [],
        error: "K-ryhmän tuotteiden haku epäonnistui.",
      },
      { status: 500 }
    );
  }
}
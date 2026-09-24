import { NextResponse } from "next/server";

type RuoanhintaProduct = {
  id: number;
  name: string;
  ean?: string;
  gtin?: string;
  eanCode?: string;
  barcode?: string;
  externalId?: string;
  familyKey?: string;
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

function getEan(product: RuoanhintaProduct) {
  const candidates = [
    product.ean,
    product.gtin,
    product.eanCode,
    product.barcode,
    product.externalId,
  ];

  return candidates.find((value) => value && /^\d{8,14}$/.test(String(value))) || undefined;
}

function fixEncoding(value: string) {
  return value
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¥/g, "å")
    .replace(/â„¢/g, "")
    .replace(/Â/g, "");
}

function resolveSStoreId(store: string) {
  if (/^\d+$/.test(store)) return Number(store);

  if (store === "prisma-hyvinkaa") return 292;

  return 292;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const store = searchParams.get("store") || "292";
  const storeId = resolveSStoreId(store);

  if (!search.trim()) {
    return NextResponse.json({
      store,
      storeId,
      source: "ruoanhinta-s",
      status: 200,
      items: [],
    });
  }

  const endpoint = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(
    search
  )}&storeIds=${storeId}&skip=0&take=80`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();
    const sourceItems: RuoanhintaProduct[] = data.items || [];

    const items = sourceItems
      .filter((product) => getPrice(product) > 0)
      .map((product) => ({
        id: product.id,
        name: fixEncoding(product.name),
        ean: getEan(product),
        familyKey: product.familyKey,
        brandName: product.brandName ? fixEncoding(product.brandName) : undefined,
        pictureUrl: product.pictureUrl,
        category: product.category,
        price: getPrice(product),
        comparisonPrice: product.storeItems?.[0]?.comparisonPrice ?? undefined,
        comparisonPriceUnit: product.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
        storeItems: [
          {
            price: getPrice(product),
            comparisonPrice: product.storeItems?.[0]?.comparisonPrice ?? undefined,
            comparisonPriceUnit: product.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
          },
        ],
      }));

    return NextResponse.json({
      store,
      storeId,
      source: "ruoanhinta-s",
      endpoint,
      status: response.status,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        store,
        storeId,
        source: "ruoanhinta-s",
        endpoint,
        status: 500,
        items: [],
        error: String(error),
      },
      { status: 500 }
    );
  }
}

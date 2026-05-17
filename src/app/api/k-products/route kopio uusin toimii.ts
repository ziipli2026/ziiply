import { NextResponse } from "next/server";

type RuoanhintaProduct = {
  id: number;
  name: string;
  ean?: string;
  familyKey?: string;
  brandName?: string;
  pictureUrl?: string;
  storeItems?: { price: number }[];
};

function getPrice(product: RuoanhintaProduct) {
  return product.storeItems?.[0]?.price || 0;
}

function resolveKStoreId(store: string) {
  if (store === "k-citymarket-hyvinkaa") return 3221;
  return 3221;
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
      source: "ruoanhinta-k",
      status: 200,
      items: [],
    });
  }

  const endpoint = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(
    search
  )}&storeIds=${storeId}&skip=0&take=20`;

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
        id: String(product.id),
        name: product.name,
        ean: product.ean,
        brandName: product.brandName,
        pictureUrl: product.pictureUrl,
        price: getPrice(product),
        unitPrice: undefined,
      }));

    return NextResponse.json({
      store,
      storeId,
      source: "ruoanhinta-k",
      endpoint,
      status: response.status,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        store,
        storeId,
        source: "ruoanhinta-k",
        endpoint,
        status: 500,
        items: [],
        error: String(error),
      },
      { status: 500 }
    );
  }
}
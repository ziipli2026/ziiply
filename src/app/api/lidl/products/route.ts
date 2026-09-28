import { NextResponse } from "next/server";

type RawStore = Record<string, any>;
type RawProduct = Record<string, any>;

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fixEncoding(value: unknown) {
  return String(value ?? "")
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¥/g, "å")
    .replace(/â„¢/g, "")
    .replace(/Â/g, "");
}

function getPrice(product: RawProduct) {
  return Number(product?.storeItems?.[0]?.price || 0);
}

function getEan(product: RawProduct) {
  return [product?.ean, product?.gtin, product?.eanCode, product?.barcode]
    .map((value) => String(value || "").replace(/\D/g, ""))
    .find((value) => /^\d{8,14}$/.test(value));
}

async function resolveRuoanhintaLidlStore(storeName: string, city: string) {
  const queries = Array.from(new Set([
    storeName,
    city ? `Lidl ${city}` : "",
    "Lidl",
  ].map((value) => String(value || "").trim()).filter(Boolean)));

  const wantedName = normalize(storeName);
  const wantedCity = normalize(city);

  for (const query of queries) {
    const response = await fetch(
      `https://api.ruoanhinta.fi/api/stores?search=${encodeURIComponent(query)}`,
      { headers: { accept: "application/json" }, cache: "no-store" },
    );
    if (!response.ok) continue;
    const data = await response.json();
    const stores: RawStore[] = (Array.isArray(data) ? data : data?.items || [])
      .filter((store: RawStore) => !store?.delistedAt)
      .filter((store: RawStore) => normalize(store?.name).includes("lidl"));

    if (!stores.length) continue;

    const exactName = wantedName
      ? stores.find((store) => {
          const name = normalize(store?.name);
          return name === wantedName || name.includes(wantedName) || wantedName.includes(name);
        })
      : undefined;
    if (exactName) return exactName;

    const sameCity = wantedCity
      ? stores.find((store) => normalize(store?.city) === wantedCity)
      : undefined;
    if (sameCity) return sameCity;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = String(searchParams.get("search") || "").trim();
  const storeName = String(searchParams.get("storeName") || "").trim();
  const city = String(searchParams.get("city") || "").trim();

  if (!search) {
    return NextResponse.json({ source: "ruoanhinta-lidl", items: [] });
  }

  try {
    const store = await resolveRuoanhintaLidlStore(storeName, city);
    const storeId = Number(store?.id);
    if (!store || !Number.isFinite(storeId)) {
      return NextResponse.json({
        source: "ruoanhinta-lidl",
        storeName,
        city,
        status: 404,
        items: [],
        error: "Lidl store mapping not found",
      }, { status: 404 });
    }

    const endpoint =
      `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(search)}&storeIds=${storeId}&skip=0&take=80`;
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json();
    const sourceItems: RawProduct[] = data?.items || [];

    const items = sourceItems
      .filter((product) => getPrice(product) > 0)
      .map((product) => ({
        id: product.id,
        name: fixEncoding(product.name),
        ean: getEan(product),
        brandName: product.brandName ? fixEncoding(product.brandName) : undefined,
        pictureUrl: product.pictureUrl || undefined,
        category: product.category || undefined,
        price: getPrice(product),
        comparisonPrice: product?.storeItems?.[0]?.comparisonPrice ?? undefined,
        comparisonPriceUnit: product?.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
        storeItems: [{
          price: getPrice(product),
          comparisonPrice: product?.storeItems?.[0]?.comparisonPrice ?? undefined,
          comparisonPriceUnit: product?.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
        }],
        ziiplySourceChain: "LIDL",
      }));

    return NextResponse.json({
      source: "ruoanhinta-lidl",
      storeId,
      storeName: store?.name || storeName,
      city: store?.city || city,
      status: response.status,
      items,
    });
  } catch (error) {
    return NextResponse.json({
      source: "ruoanhinta-lidl",
      storeName,
      city,
      status: 500,
      items: [],
      error: String(error),
    }, { status: 500 });
  }
}

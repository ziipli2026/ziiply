import { NextResponse } from "next/server";
import { observeEanProductsBestEffort } from "@/lib/eanBank";
import { getSKaupatProtocolConfig } from "@/lib/skaupatProtocol";

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

  if (search.length > 120 || store.length > 32) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

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

  // Tuusulan Prisma is new. Its official S-kaupat product-search ID is
  // 726753948; the legacy Ruoanhinta store route can return no products for it.
  if (String(storeId) === "726753948") {
    try {
      const protocol = await getSKaupatProtocolConfig();
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Helsinki",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const variables = {
        availabilityDate: date,
        facets: [{ key: "brandName", order: "asc" }, { key: "category" }, { key: "labels" }],
        generatedSessionId: crypto.randomUUID(),
        fetchSponsoredContent: true,
        limit: 80,
        queryString: search,
        sortForAvailabilityLabelDate: date,
        storeId: "726753948",
        useRandomId: false,
        marketingId: crypto.randomUUID(),
        from: 0,
        offset: 0,
        skip: 0,
        page: 1,
      };
      const url = new URL("https://api.s-kaupat.fi/");
      url.searchParams.set("operationName", "RemoteFilteredProducts");
      url.searchParams.set("variables", JSON.stringify(variables));
      url.searchParams.set(
        "extensions",
        JSON.stringify({ clientLibrary: { name: "@apollo/client", version: protocol.apolloVersion }, persistedQuery: { version: 1, sha256Hash: protocol.persistedQueryHash } }),
      );
      const direct = await fetch(url, {
        headers: {
          accept: "application/graphql-response+json,application/json;q=0.9",
          "content-type": "application/json",
          "accept-language": "fi-FI,fi;q=0.9,en;q=0.8",
          origin: "https://www.s-kaupat.fi",
          referer: "https://www.s-kaupat.fi/",
          "x-client-name": "skaupat-web",
          "x-client-version": protocol.clientVersion,
        },
        cache: "no-store",
      });
      const payload: any = await direct.json().catch(() => null);
      const sourceItems = payload?.data?.store?.products?.productListItems || [];
      const items = sourceItems
        .map((entry: any) => entry?.product || entry)
        .filter(Boolean)
        .filter((product: any) => Number(product?.storeItems?.[0]?.price ?? product?.price ?? 0) > 0)
        .map((product: any) => ({
          id: product.id,
          name: fixEncoding(String(product.name || "")),
          ean: getEan(product),
          familyKey: product.familyKey,
          brandName: product.brandName ? fixEncoding(String(product.brandName)) : undefined,
          pictureUrl: product.pictureUrl,
          category: product.category,
          price: Number(product.storeItems?.[0]?.price ?? product.price ?? 0),
          comparisonPrice: product.storeItems?.[0]?.comparisonPrice ?? undefined,
          comparisonPriceUnit: product.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
          storeItems: [{ price: Number(product.storeItems?.[0]?.price ?? product.price ?? 0) }],
        }));
      void observeEanProductsBestEffort(
        items.map((item: any) => ({ ...item, source: "skaupat-tuusula-prisma" })),
      ).catch(() => undefined);
      return NextResponse.json({
        store,
        storeId,
        source: "s-kaupat-tuusula",
        status: direct.status,
        items,
      });
    } catch (error) {
      console.error("Tuusula Prisma direct S-kaupat search failed", error);
    }
  }

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

    // EAN-pankin opetus ei saa blokata käyttäjän hakuvastausta.
    // Tämä on aidosti best-effort: haku palautetaan heti, observointi saa valmistua taustalla.
    void observeEanProductsBestEffort(items.map((item) => ({
      ean: item.ean,
      name: item.name,
      brand: item.brandName,
      imageUrl: item.pictureUrl,
      category: item.category,
      source: "ruoanhinta-s",
    }))).catch(() => undefined);

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

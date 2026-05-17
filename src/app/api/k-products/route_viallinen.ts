import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getItemsFromResponse(data: unknown) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.offers)) return obj.offers;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.results)) return obj.results;
  }

  return [];
}

function normalizeEan(value: string | null) {
  return (value || "").replace(/\s+/g, "").trim();
}

function isEan(value: string) {
  return /^\d{8,14}$/.test(value);
}

function getProductEan(item: unknown) {
  if (!item || typeof item !== "object") return "";

  const obj = item as Record<string, unknown>;

  const direct =
    obj.ean ||
    obj.eanCode ||
    obj.barcode ||
    obj.gtin ||
    obj.externalEan ||
    obj.productEan;

  if (typeof direct === "string" || typeof direct === "number") {
    return String(direct).trim();
  }

  const nestedCandidates = [obj.item, obj.product];

  for (const nested of nestedCandidates) {
    if (nested && typeof nested === "object") {
      const nestedObj = nested as Record<string, unknown>;
      const nestedEan =
        nestedObj.ean ||
        nestedObj.eanCode ||
        nestedObj.barcode ||
        nestedObj.gtin ||
        nestedObj.externalEan ||
        nestedObj.productEan;

      if (typeof nestedEan === "string" || typeof nestedEan === "number") {
        return String(nestedEan).trim();
      }
    }
  }

  return "";
}

async function fetchJson(endpoint: string) {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://ruoanhinta.fi",
      Referer: "https://ruoanhinta.fi/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
    },
    cache: "no-store",
  });

  const text = await response.text();

  let rawData: unknown;

  try {
    rawData = JSON.parse(text);
  } catch {
    rawData = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    rawData,
    items: getItemsFromResponse(rawData),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const storeId = searchParams.get("storeId") || searchParams.get("store");
  const searchRaw =
    searchParams.get("search") ||
    searchParams.get("q") ||
    searchParams.get("query") ||
    searchParams.get("ean");

  const search = normalizeEan(searchRaw);
  const eanSearch = isEan(search);

  if (!storeId) {
    return NextResponse.json(
      {
        ok: false,
        error: "storeId puuttuu. Käytä esim. ?storeId=826",
      },
      { status: 400 }
    );
  }

  /*
    Tämä route tukee nyt kahta käyttötapaa:

    1) Tarjoukset kuten ennen:
       /api/offers?storeId=826

    2) Normaalihintaiset tuotteet, myös EAN-koodilla:
       /api/offers?storeId=826&search=6410405061234

    Jos tämä tiedosto on kansiossa app/api/k-products/route.ts,
    sama toimii osoitteella:
       /api/k-products?store=826&search=6410405061234
  */

  if (search) {
    const triedEndpoints: string[] = [];

    const candidateEndpoints = eanSearch
      ? [
          `https://api.ruoanhinta.fi/api/items?ean=${encodeURIComponent(
            search
          )}&storeIds=${encodeURIComponent(storeId)}&skip=0&take=100`,
          `https://api.ruoanhinta.fi/api/items?barcode=${encodeURIComponent(
            search
          )}&storeIds=${encodeURIComponent(storeId)}&skip=0&take=100`,
          `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(
            search
          )}&storeIds=${encodeURIComponent(storeId)}&skip=0&take=100`,
          `https://api.ruoanhinta.fi/api/items?storeIds=${encodeURIComponent(
            storeId
          )}&skip=0&take=5000`,
        ]
      : [
          `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(
            search
          )}&storeIds=${encodeURIComponent(storeId)}&skip=0&take=100`,
        ];

    try {
      const collectedItems: unknown[] = [];
      let lastStatus = 200;
      let lastOk = true;
      let lastRaw: unknown = null;
      let lastPreview = "";

      for (const endpoint of candidateEndpoints) {
        triedEndpoints.push(endpoint);

        const result = await fetchJson(endpoint);

        lastStatus = result.status;
        lastOk = result.ok;
        lastRaw = result.rawData;
        lastPreview = result.text.slice(0, 800);

        const items = result.items;

        if (eanSearch) {
          const exactMatches = items.filter((item) => getProductEan(item) === search);

          if (exactMatches.length > 0) {
            return NextResponse.json(
              {
                ok: true,
                status: result.status,
                source: "ruoanhinta-items-ean",
                mode: "ean",
                storeId,
                search,
                count: exactMatches.length,
                items: exactMatches,
                triedEndpoints,
              },
              { status: 200 }
            );
          }

          collectedItems.push(...items);
        } else {
          return NextResponse.json(
            {
              ok: result.ok,
              status: result.status,
              source: "ruoanhinta-items-search",
              mode: "search",
              storeId,
              search,
              endpoint,
              count: items.length,
              items,
              raw: result.rawData,
              preview: result.text.slice(0, 800),
            },
            { status: 200 }
          );
        }
      }

      if (eanSearch) {
        const uniqueItems = Array.from(
          new Map(
            collectedItems.map((item, index) => {
              const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
              const id = obj.id || obj.externalId || obj.ean || obj.name || index;
              return [String(id), item];
            })
          ).values()
        );

        const exactMatches = uniqueItems.filter((item) => getProductEan(item) === search);

        return NextResponse.json(
          {
            ok: exactMatches.length > 0,
            status: lastStatus,
            source: "ruoanhinta-items-ean",
            mode: "ean",
            storeId,
            search,
            count: exactMatches.length,
            items: exactMatches,
            triedEndpoints,
            debug: {
              fetchedCandidateCount: uniqueItems.length,
              note:
                exactMatches.length === 0
                  ? "EAN-koodilla ei löytynyt exact match -tuotetta tästä kaupasta / tällä datalähteellä."
                  : undefined,
            },
            raw: lastRaw,
            preview: lastPreview,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          ok: lastOk,
          status: lastStatus,
          source: "ruoanhinta-items-search",
          mode: "search",
          storeId,
          search,
          items: [],
          triedEndpoints,
        },
        { status: 200 }
      );
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          status: 500,
          source: "ruoanhinta-items",
          mode: eanSearch ? "ean" : "search",
          storeId,
          search,
          items: [],
          triedEndpoints,
          error: "Tuotteiden haku epäonnistui",
          details: String(error),
        },
        { status: 500 }
      );
    }
  }

  const endpoint = `https://api.ruoanhinta.fi/api/offers?storeId=${encodeURIComponent(
    storeId
  )}`;

  try {
    const result = await fetchJson(endpoint);
    const items = result.items;

    return NextResponse.json(
      {
        ok: result.ok,
        status: result.status,
        source: "ruoanhinta-offers",
        mode: "offers",
        storeId,
        endpoint,
        count: items.length,
        items,
        raw: result.rawData,
        preview: result.text.slice(0, 800),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        source: "ruoanhinta-offers",
        mode: "offers",
        storeId,
        endpoint,
        items: [],
        error: "Tarjousten haku epäonnistui",
        details: String(error),
      },
      { status: 500 }
    );
  }
}

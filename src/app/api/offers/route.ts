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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const storeId = searchParams.get("storeId") || searchParams.get("store");

  if (!storeId) {
    return NextResponse.json(
      {
        ok: false,
        error: "storeId puuttuu. Käytä esim. /api/offers?storeId=826",
      },
      { status: 400 }
    );
  }

  const endpoint = `https://api.ruoanhinta.fi/api/offers?storeId=${encodeURIComponent(
    storeId
  )}`;

  try {
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

    const items = getItemsFromResponse(rawData);

    return NextResponse.json(
      {
        ok: response.ok,
        status: response.status,
        source: "ruoanhinta-offers",
        storeId,
        endpoint,
        count: items.length,
        items,
        raw: rawData,
        preview: text.slice(0, 800),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        source: "ruoanhinta-offers",
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
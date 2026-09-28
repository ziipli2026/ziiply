import { NextRequest, NextResponse } from "next/server";

const STORES_URL = "https://stores.lidlplus.com/api/v4/FI";
const OFFERS_BASE = "https://offers.lidlplus.com/app/api/v4/FI";

const headers = {
  accept: "application/json",
  "accept-language": "fi-FI,fi;q=0.9",
  "user-agent": "LidlPlus/17.0.5 Android okhttp/4.12.0",
  "x-client-version": "17.0.5",
  "x-client-platform": "android",
};

export async function GET(request: NextRequest) {
  const city = String(request.nextUrl.searchParams.get("city") || "Hyvinkää").trim();
  try {
    const sr = await fetch(STORES_URL, { headers, cache: "no-store" });
    if (!sr.ok) return NextResponse.json({ stage: "stores", status: sr.status }, { status: 502 });
    const stores = await sr.json();
    const needle = city.toLocaleLowerCase("fi-FI");
    const matches = Array.isArray(stores) ? stores.filter((s: any) =>
      String(s?.locality || "").toLocaleLowerCase("fi-FI").includes(needle) ||
      String(s?.name || "").toLocaleLowerCase("fi-FI").includes(needle)
    ) : [];
    const store = matches[0];
    const storeKey = String(store?.storeKey || "").trim();
    if (!storeKey) return NextResponse.json({ stage: "store-match", city, matches: matches.length }, { status: 404 });

    const or = await fetch(`${OFFERS_BASE}/${encodeURIComponent(storeKey)}/offers`, { headers, cache: "no-store" });
    const text = await or.text();
    let raw: any;
    try { raw = JSON.parse(text); } catch { raw = { raw: text.slice(0, 1000) }; }

    const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.offers) ? raw.offers : Array.isArray(raw?.items) ? raw.items : [];
    return NextResponse.json({
      city,
      store: { storeKey, name: store?.name, locality: store?.locality, address: store?.address },
      offersStatus: or.status,
      responseType: Array.isArray(raw) ? "array" : typeof raw,
      topKeys: raw && !Array.isArray(raw) && typeof raw === "object" ? Object.keys(raw) : [],
      offerCount: rows.length,
      samples: rows.slice(0, 5),
      rawPreview: rows.length ? undefined : raw,
    });
  } catch (error) {
    return NextResponse.json({ stage: "exception", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

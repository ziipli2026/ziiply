import { NextRequest, NextResponse } from "next/server";

type RawStore = Record<string, any>;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function normalizeStore(store: RawStore) {
  return {
    id: store.id,
    name: store.name,
    chain: store.chain,
    type: store.type,
    city: store.city,
    postalCode: store.postalCode,
    externalId: store.externalId,
    latitude: store.lat ?? store.latitude,
    longitude: store.long ?? store.lon ?? store.lng ?? store.longitude,
  };
}

async function fetchRuoanhinta(search: string) {
  const response = await fetch(
    `https://api.ruoanhinta.fi/api/stores?search=${encodeURIComponent(search)}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Ruoanhinta store search failed: ${response.status}`);
  const data = await response.json();
  return (Array.isArray(data) ? data : data.items || []) as RawStore[];
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || "";
  const gps = request.nextUrl.searchParams.get("gps") === "1";

  try {
    if (gps) {
      const latitude = Number(request.nextUrl.searchParams.get("lat") ?? request.nextUrl.searchParams.get("latitude"));
      const longitude = Number(request.nextUrl.searchParams.get("lon") ?? request.nextUrl.searchParams.get("lng") ?? request.nextUrl.searchParams.get("longitude"));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json({ error: "GPS coordinates required" }, { status: 400 });
      }

      const terms = ["S-market", "Sale", "Alepa", "K-Market", "K-Supermarket", "Prisma", "K-Citymarket"];
      const batches = await Promise.all(terms.map(fetchRuoanhinta));
      const seen = new Set<string>();
      const items = batches
        .flat()
        .filter((store) => {
          const name = String(store.name || "");
          if (!/^(?:S-market|Sale\b|Alepa\b|K-Market\b|K-Supermarket\b|Prisma\b|K-Citymarket\b)/i.test(name)) return false;
          if (/ABC|liikenneasema|huoltoasema|verkkokauppa|puutarha|lemmikki/i.test(name)) return false;
          const country = String(store.country || store.countryCode || "").toUpperCase();
          if (country && country !== "FI" && country !== "FIN" && country !== "FINLAND") return false;
          const lat = Number(store.lat ?? store.latitude);
          const lon = Number(store.long ?? store.lon ?? store.lng ?? store.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
          if (distanceKm(latitude, longitude, lat, lon) > 100) return false;
          const key = String(store.id ?? `${name}:${lat}:${lon}`);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(normalizeStore);

      return NextResponse.json({ items });
    }

    if (!search) return NextResponse.json({ items: [] });
    const data = await fetchRuoanhinta(search);
    return NextResponse.json({ items: data.map(normalizeStore) });
  } catch {
    return NextResponse.json({ error: "Store search failed" }, { status: 500 });
  }
}

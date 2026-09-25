import { NextRequest, NextResponse } from "next/server";
import { getSKaupatFullDirectoryV1 } from "../../components/ziiply/location/ziiplyStoreDirectory";

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
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const gps = request.nextUrl.searchParams.get("gps") === "1";

  try {
    if (gps) {
      const latitude = Number(request.nextUrl.searchParams.get("lat") ?? request.nextUrl.searchParams.get("latitude"));
      const longitude = Number(request.nextUrl.searchParams.get("lon") ?? request.nextUrl.searchParams.get("lng") ?? request.nextUrl.searchParams.get("longitude"));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json({ error: "GPS coordinates required" }, { status: 400 });
      }

      const terms = ["S-market", "Sale", "Alepa", "K-Market", "K-Supermarket", "Prisma", "K-Citymarket"];
      const [batches, sKaupatDirectory] = await Promise.all([
        Promise.all(terms.map(fetchRuoanhinta)),
        getSKaupatFullDirectoryV1().catch(() => []),
      ]);
      // Ruoanhinta may retain permanently closed S stores. For S-family stores,
      // require the store to still exist in S-kaupat's current official directory.
      const normalizeName = (value: unknown) =>
        String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
      const activeSByName = new Map(
        sKaupatDirectory.map((entry) => [normalizeName(entry.name), entry] as const),
      );
      const seen = new Set<string>();
      const items = batches
        .flat()
        .filter((store) => {
          const name = String(store.name || "");
          if (!/^(?:S-market|Sale\b|Alepa\b|K-Market\b|K-Supermarket\b|Prisma\b|K-Citymarket\b)/i.test(name)) return false;
          if (/ABC|liikenneasema|huoltoasema|verkkokauppa|puutarha|lemmikki/i.test(name)) return false;
          if (/^(?:S-market|Sale\b|Alepa\b|Prisma\b)/i.test(name) && activeSByName.size > 0 && !activeSByName.has(normalizeName(name))) return false;
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
        .map((store) => {
          const normalized = normalizeStore(store);
          const officialS = activeSByName.get(normalizeName(store.name));
          if (!officialS) return normalized;
          return {
            ...normalized,
            // S-kaupat is authoritative for active S-family identity and product-facing storeId.
            // Product prices currently come from Ruoanhinta, whose /api/items
            // requires its own numeric store id. Keep that as the active id while
            // exposing the official S-kaupat id separately for identity/offer flows.
            id: store.id,
            externalId: officialS.sKaupatStoreId,
            sKaupatStoreId: officialS.sKaupatStoreId,
            name: officialS.name,
            directoryId: store.id,
          };
        });

      return NextResponse.json(debug ? { items, debug: { batchCounts: terms.map((term, i) => ({ term, count: batches[i]?.length || 0 })), sDirectoryCount: sKaupatDirectory.length, samples: batches.map((batch, i) => ({ term: terms[i], sample: batch[0] ? { name: batch[0].name, id: batch[0].id, lat: batch[0].lat, latitude: batch[0].latitude, long: batch[0].long, lon: batch[0].lon, longitude: batch[0].longitude, keys: Object.keys(batch[0]).slice(0,20) } : null })) } } : { items });
    }

    if (!search) return NextResponse.json({ items: [] });
    const data = await fetchRuoanhinta(search);
    return NextResponse.json({ items: data.map(normalizeStore) });
  } catch {
    return NextResponse.json({ error: "Store search failed" }, { status: 500 });
  }
}

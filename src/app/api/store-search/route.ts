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
      const batches = await Promise.all(terms.map(fetchRuoanhinta));
      const seen = new Set<string>();
      const items = batches
        .flat()
        .filter((store) => {
          const name = String(store.name || "");
        if (store.delistedAt) return false;
          if (!/^(?:S-market|Sale\b|Alepa\b|K-Market\b|K-Supermarket\b|Prisma\b|K-Citymarket\b)/i.test(name)) return false;
          if (/ABC|liikenneasema|huoltoasema|verkkokauppa|puutarha|lemmikki/i.test(name)) return false;
          const country = String(store.country || store.countryCode || "").trim().toUpperCase();
          if (country && !["FI","FIN","FINLAND","SUOMI"].includes(country)) return false;
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

      return NextResponse.json(
        debug
          ? {
              items,
              debug: {
                batchCounts: terms.map((term, i) => ({ term, count: batches[i]?.length || 0 })),
                samples: batches.map((batch, i) => ({
                  term: terms[i],
                  sample: batch[0]
                    ? {
                        name: batch[0].name,
                        id: batch[0].id,
                        lat: batch[0].lat,
                        long: batch[0].long,
                        country: batch[0].country,
                        delistedAt: batch[0].delistedAt ?? null,
                      }
                    : null,
                })),
              },
            }
          : { items },
      );
    }

    if (!search) return NextResponse.json({ items: [] });
    // Manual location search: Ruoanhinta fuzzy search can return remote false
    // positives. Keep GPS behavior above untouched and constrain only manual results.
    // Ruoanhinta rejects the two-letter query "Ii", but accepts it with trailing
    // whitespace; validation still uses the original user query.
    const normalizeText = (value: unknown) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const query = normalizeText(search);
    const apiSearch = query === "ii" ? search.trim() + " " : search;
    const data = await fetchRuoanhinta(apiSearch);
    const live = data.filter((store) => !store.delistedAt);
    const exactCity = live.filter((store) => normalizeText(store.city) === query);

    const nameMatches = live.filter((store) => {
      const name = normalizeText(store.name);
      return name === query || name.includes(" " + query) || name.includes(query + " ");
    });

    const anchorPostalCodes = new Set(
      nameMatches.map((store) => String(store.postalCode || "").trim()).filter(Boolean),
    );
    const anchorCities = new Set(
      nameMatches.map((store) => normalizeText(store.city)).filter(Boolean),
    );
    const postalAreaMatches = live.filter((store) => {
      const postalCode = String(store.postalCode || "").trim();
      const city = normalizeText(store.city);
      return (
        postalCode &&
        anchorPostalCodes.has(postalCode) &&
        city &&
        anchorCities.has(city)
      );
    });

    const filtered = exactCity.length
      ? exactCity
      : Array.from(
          new Map(
            [...nameMatches, ...postalAreaMatches].map((store) => [
              String(store.id),
              store,
            ]),
          ).values(),
        );

    return NextResponse.json({ items: filtered.map(normalizeStore) });
  } catch {
    return NextResponse.json({ error: "Store search failed" }, { status: 500 });
  }
}

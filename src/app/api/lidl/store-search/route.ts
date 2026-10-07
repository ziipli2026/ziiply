import { NextRequest, NextResponse } from "next/server";

const LIDL_STORES_URL = "https://stores.lidlplus.com/api/v4/FI";

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = String(searchParams.get("search") || "").trim();
  const latitude = Number(searchParams.get("lat") ?? searchParams.get("latitude"));
  const longitude = Number(searchParams.get("lon") ?? searchParams.get("longitude"));
  const gps = searchParams.get("gps") === "1" && Number.isFinite(latitude) && Number.isFinite(longitude);

  try {
    const response = await fetch(LIDL_STORES_URL, {
      headers: { accept: "application/json", "accept-language": "fi-FI,fi;q=0.9" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return NextResponse.json({ items: [] }, { status: 502 });
    const raw = await response.json();
    if (!Array.isArray(raw)) return NextResponse.json({ items: [] }, { status: 502 });

    const stores = raw.flatMap((store: any) => {
      const id = String(store?.storeKey || "").trim();
      const name = String(store?.name || "").trim();
      const city = String(store?.locality || "").trim();
      const lat = Number(store?.location?.latitude);
      const lon = Number(store?.location?.longitude);
      if (!id || !name || !city || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
      return [{
        id,
        storeKey: id,
        externalId: id,
        name,
        chain: "Lidl",
        type: "Lidl",
        city,
        postalCode: String(store?.postalCode || "").trim(),
        address: String(store?.address || "").trim(),
        latitude: lat,
        longitude: lon,
      }];
    });

    if (!gps) {
      const target = normalize(search);
      const items = stores.filter((store: any) =>
        !target ||
        normalize(store.city) === target ||
        normalize(store.name).includes(target) ||
        normalize(store.postalCode) === target
      );
      return NextResponse.json({ items });
    }

    const origin = { latitude, longitude };
    const ranked = stores
      .map((store: any) => ({ ...store, distanceKm: distanceKm(origin, store) }))
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    const targetMunicipality = normalize(search);
    const withinRadius = ranked.filter((store: any) => store.distanceKm <= 10);
    const municipalityStores = targetMunicipality
      ? ranked.filter((store: any) => normalize(store.city) === targetMunicipality)
      : [];
    const selected = withinRadius.length ? [...withinRadius, ...municipalityStores] : [ranked[0], ...municipalityStores];
    const seen = new Set<string>();
    const items = selected.filter((store: any) => {
      if (!store || seen.has(store.id)) return false;
      seen.add(store.id);
      return true;
    }).sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}

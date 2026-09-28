import { NextRequest, NextResponse } from "next/server";

const STORES = [
  { id: "eurospar-iisalmi", name: "EUROSPAR Iisalmi", city: "Iisalmi", postalCode: "74120", address: "Meijerikatu 3, 74120 Iisalmi" },
  { id: "eurospar-joensuu", name: "EUROSPAR Joensuu Raatekangas", city: "Joensuu", postalCode: "80100", address: "Raatekankaantie 4, 80100 Joensuu" },
  { id: "eurospar-jarvenpaa", name: "EUROSPAR Järvenpää", city: "Järvenpää", postalCode: "04430", address: "Helsingintie 43, 04430 Järvenpää" },
  { id: "eurospar-masku", name: "EUROSPAR Masku", city: "Masku", postalCode: "21250", address: "Maskuntie 232, 21250 Masku" },
  { id: "eurospar-tornio", name: "EUROSPAR Tornio", city: "Tornio", postalCode: "95420", address: "Teollisuuskatu 14, 95420 Tornio" },
  { id: "eurospar-ylojarvi", name: "EUROSPAR Ylöjärvi", city: "Ylöjärvi", postalCode: "33470", address: "Elotie 9, 33470 Ylöjärvi" },
] as const;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

async function geocode(address: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fi&q=${encodeURIComponent(address)}`,
    { headers: { "User-Agent": "Ziiply/1.0 store-locator" }, next: { revalidate: 86400 } },
  );
  if (!response.ok) return null;
  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  const hasGps = Number.isFinite(lat) && Number.isFinite(lon);

  const items = await Promise.all(STORES.map(async (store) => {
    const coords = await geocode(store.address);
    const distance = hasGps && coords ? distanceKm(lat, lon, coords.latitude, coords.longitude) : null;
    return {
      ...store,
      chain: "SPAR",
      type: "EUROSPAR",
      ...(coords || {}),
      distanceKm: distance,
      distance: distance == null ? undefined : `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km`,
    };
  }));

  items.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return a.city.localeCompare(b.city, "fi");
  });

  return NextResponse.json({ items });
}

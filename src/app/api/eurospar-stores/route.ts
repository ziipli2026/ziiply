import storeFeed from "./tokmanni-store-feed.json";
import { NextRequest, NextResponse } from "next/server";

type StoreFeedItem = {
  id: string;
  name: string;
  city?: string;
  postalCode?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  chain?: "EUROSPAR" | "TOKMANNI";
};

type StoreFeed = { schemaVersion?: number; stores?: StoreFeedItem[] };

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  const hasGps = Number.isFinite(lat) && Number.isFinite(lon);
  const search = String(request.nextUrl.searchParams.get("search") || "").trim().toLocaleLowerCase("fi-FI");

  const feed = storeFeed as StoreFeed;
  if (feed.schemaVersion !== 1 || !Array.isArray(feed.stores)) {
    return NextResponse.json({ items: [], error: "Invalid Tokmanni store feed" }, { status: 503 });
  }

  const items = feed.stores.map((store) => {
    const latitude = Number(store.latitude);
    const longitude = Number(store.longitude);
    const located = Number.isFinite(latitude) && Number.isFinite(longitude);
    const distance = hasGps && located ? distanceKm(lat, lon, latitude, longitude) : null;
    return {
      id: store.id,
      name: store.name,
      city: store.city || "",
      postalCode: store.postalCode || "",
      address: store.address || "",
      latitude: located ? latitude : undefined,
      longitude: located ? longitude : undefined,
      chain: store.chain || "TOKMANNI",
      type: store.chain || "TOKMANNI",
      distanceKm: distance,
      distance: distance == null ? undefined : `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km`,
    };
  });

  items.sort((a, b) => {
    if (!hasGps && search) {
      const aText = `${a.name} ${a.city}`.toLocaleLowerCase("fi-FI");
      const bText = `${b.name} ${b.city}`.toLocaleLowerCase("fi-FI");
      const aExact = a.city.toLocaleLowerCase("fi-FI") === search;
      const bExact = b.city.toLocaleLowerCase("fi-FI") === search;
      if (aExact !== bExact) return aExact ? -1 : 1;
      const aMatch = aText.includes(search);
      const bMatch = bText.includes(search);
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
    }
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return a.name.localeCompare(b.name, "fi");
  });

  return NextResponse.json({ items });
}

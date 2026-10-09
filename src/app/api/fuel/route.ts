import { NextRequest, NextResponse } from "next/server";

type FuelResult = {
  station: string;
  price: number;
  fuelType: string;
  observedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function numberOrNull(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeCandidate(raw: any, requestedFuel: string, userLat: number, userLon: number): FuelResult | null {
  if (!raw || typeof raw !== "object") return null;

  const station = String(raw.station ?? raw.stationName ?? raw.name ?? raw.title ?? "").trim();
  const price = numberOrNull(raw.price ?? raw.value ?? raw.pricePerLiter ?? raw.price_per_liter);
  const fuelType = String(raw.fuelType ?? raw.fuel ?? raw.grade ?? raw.product ?? requestedFuel).trim();
  const latitude = numberOrNull(raw.latitude ?? raw.lat);
  const longitude = numberOrNull(raw.longitude ?? raw.lon ?? raw.lng);
  const observedAt = raw.observedAt ?? raw.updatedAt ?? raw.timestamp ?? raw.date ?? null;

  if (!station || /\bteboil\b/i.test(station) || /\bteboil\b/i.test([raw.chain?.name ?? raw.chain, raw.brand?.name ?? raw.brand, raw.operator?.name ?? raw.operator].map((value) => String(value ?? "")).join(" ")) || price == null || price <= 0 || price > 5) return null;

  const distanceKm =
    latitude != null && longitude != null
      ? haversineKm(userLat, userLon, latitude, longitude)
      : numberOrNull(raw.distanceKm ?? raw.distance);

  return { station, price, fuelType, observedAt: observedAt ? String(observedAt) : null, latitude, longitude, distanceKm };
}

export async function GET(request: NextRequest) {
  if (process.env.ZIIPLY_FUEL_ENABLED !== "1") {
    return NextResponse.json({ ok: false, disabled: true }, { status: 503 });
  }

  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  const fuelType = String(request.nextUrl.searchParams.get("fuel") || "diesel").trim().slice(0, 24);

  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    return NextResponse.json({ ok: false, error: "Valid GPS coordinates required" }, { status: 400 });
  }

  const endpoint = process.env.ZIIPLY_FUEL_PROVIDER_URL?.trim();
  if (!endpoint) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  try {
    const url = new URL(endpoint);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("fuel", fuelType);

    const headers: Record<string, string> = { accept: "application/json" };
    const token = process.env.ZIIPLY_FUEL_PROVIDER_TOKEN?.trim();
    if (token) headers.authorization = `Bearer ${token}`;

    const response = await fetch(url, { cache: "no-store", headers, signal: AbortSignal.timeout(5500) });
    if (!response.ok) throw new Error(`Fuel provider HTTP ${response.status}`);

    const data = await response.json();
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.stations)
          ? data.stations
          : data?.station
            ? [data.station]
            : [data];

    const candidates = rows
      .map((row: any) => normalizeCandidate(row, fuelType, latitude, longitude))
      .filter(Boolean) as FuelResult[];

    candidates.sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
    const best = candidates[0];

    if (!best) return NextResponse.json({ ok: false, found: false }, { status: 404 });

    return NextResponse.json({ ok: true, item: best });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Fuel provider failed" },
      { status: 502 },
    );
  }
}

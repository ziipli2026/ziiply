import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Sample = { latitude: number; longitude: number; accuracy?: number; heading?: number | null; timestamp?: number };
const fields = "{projectedPoints{properties{routeIndex,snapResult}},route{properties{id,speedLimits{value,unit,type},address{roadName,municipality,countryName},confidence,frc,formOfWay}}}";

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") return NextResponse.json({ error: "Preview only" }, { status: 403 });
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return NextResponse.json({ error: "TomTom API key missing" }, { status: 503 });
  let body: { points?: Sample[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const points = body.points;
  if (!Array.isArray(points) || points.length < 2 || points.length > 8 ||
      points.some(p => !p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
        Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180 ||
        (p.accuracy !== undefined && (!Number.isFinite(p.accuracy) || p.accuracy > 100)))) {
    return NextResponse.json({ error: "Need 2-8 valid GPS points (accuracy <=100 m)" }, { status: 400 });
  }
  const params = new URLSearchParams({
    key,
    points: points.map(p => `${p.longitude},${p.latitude}`).join(";"),
    fields,
    vehicleType: "PassengerCar",
    measurementSystem: "metric",
  });
  if (points.every(p => typeof p.heading === "number" && Number.isFinite(p.heading))) {
    params.set("headings", points.map(p => String(Math.round((p.heading! + 360) % 360))).join(";"));
  }
  try {
    const upstream = await fetch(`https://api.tomtom.com/snapToRoads/1?${params}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!upstream.ok) return NextResponse.json({ error: "TomTom rejected request", status: upstream.status }, { status: 502 });
    const result = await upstream.json() as {
      projectedPoints?: Array<{ properties?: { routeIndex?: number; snapResult?: string } }>;
      route?: Array<{ properties?: {
        id?: string; speedLimits?: { value?: number; unit?: string; type?: string };
        address?: { roadName?: string; municipality?: string };
        confidence?: number; frc?: number; formOfWay?: string;
      } }>;
    };
    const matched = result.projectedPoints?.filter(p => p.properties?.snapResult === "Matched") ?? [];
    const last = matched.at(-1)?.properties?.routeIndex;
    const road = typeof last === "number" ? result.route?.[last]?.properties : undefined;
    const limit = road?.speedLimits;
    const safe = road && road.formOfWay !== "ETAParkingBuilding" && road.formOfWay !== "ETAParkingArea" &&
      typeof limit?.value === "number" && limit.type === "Maximum" && (road.confidence ?? 0) >= 0.5;
    return NextResponse.json({
      ok: true, matched: matched.length, totalPoints: points.length,
      limitKmh: safe ? (limit!.unit === "mph" ? Math.round((limit?.value ?? 0) * 1.609344) : (limit?.value ?? null)) : null,
      roadName: road?.address?.roadName ?? null, municipality: road?.address?.municipality ?? null,
      confidence: road?.confidence ?? null, formOfWay: road?.formOfWay ?? null,
      reason: !road ? "no_match" : !limit ? "no_speed_limit" : !safe ? "uncertain" : "matched",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "TomTom request failed or timed out" }, { status: 502 });
  }
}

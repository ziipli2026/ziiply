import { NextRequest, NextResponse } from "next/server";
import { matchRoadSpeedLimit, type OsmRoad } from "@/lib/mobile-speed-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoints = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const accuracy = Number(params.get("accuracy"));
  const headingValue = params.get("heading");
  const heading = headingValue === null || headingValue === "" ? null : Number(headingValue);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
      accuracy < 0 || accuracy > 60 || (heading !== null && (!Number.isFinite(heading) || heading < 0 || heading >= 360))) {
    return NextResponse.json({ limit: null, reason: "invalid_gps" }, { status: 400 });
  }
  const radius = Math.min(120, Math.max(65, Math.ceil(accuracy * 2 + 30)));
  const query = `[out:json][timeout:6];way(around:${radius},${latitude},${longitude})["highway"]["maxspeed"];out geom;`;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(7000),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const payload: { elements?: OsmRoad[] } = await response.json();
      const match = matchRoadSpeedLimit(payload.elements ?? [], { latitude, longitude, accuracy, heading });
      return NextResponse.json({ limit: match?.limit ?? null, reason: match ? "matched" : "no_reliable_match" }, {
        headers: { "Cache-Control": "private, max-age=0, no-store" },
      });
    } catch {
      // Retry on a separate provider; never infer a speed limit from an API error.
    }
  }
  return NextResponse.json({ limit: null, reason: "upstream_unavailable" }, { status: 503 });
}

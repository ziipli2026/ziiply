import { NextRequest, NextResponse } from "next/server";
import { matchRoadSpeedLimit, type OsmRoad } from "@/lib/mobile-speed-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoints = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const lat = p.get("lat"), lon = p.get("lon"), acc = p.get("accuracy"), h = p.get("heading");
  const latitude = Number(lat), longitude = Number(lon), accuracy = Number(acc);
  const heading = h === null || h === "" ? null : Number(h);
  if (!lat || !lon || !acc || ![latitude, longitude, accuracy].every(Number.isFinite) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
      accuracy < 0 || accuracy > 100 ||
      (heading !== null && (!Number.isFinite(heading) || heading < 0 || heading >= 360))) {
    return NextResponse.json({ limit: null, reason: "invalid_gps" }, { status: 400 });
  }

  const radius = Math.min(180, Math.max(90, Math.ceil(accuracy * 2 + 35)));
  const query = `[out:json][timeout:6];way(around:${radius},${latitude},${longitude})["highway"]["maxspeed"];out geom;`;
  // Client aborts after 16 seconds: each provider must finish well before that.
  // Run independent providers concurrently rather than spending 11.5 seconds
  // on each one sequentially.
  const attempts = endpoints.map(async endpoint => {
    const response = await fetch(endpoint, {
      method: "POST",
      body: new URLSearchParams({ data: query }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(8500),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload: { elements?: OsmRoad[] } = await response.json();
    if (!Array.isArray(payload.elements)) throw new Error("invalid_provider_response");
    return { match: matchRoadSpeedLimit(payload.elements, { latitude, longitude, accuracy, heading }), count: payload.elements.length, provider: new URL(endpoint).hostname };
  });

  // Promise.any tolerates one or more unreachable/rate-limited Overpass hosts.
  // A valid empty result is returned as unknown; never invent a road limit.
  try {
    const result = await Promise.any(attempts);
    console.info("[mobile-speed-limit] lookup", {
      provider: result.provider, candidates: result.count,
      reason: result.match ? "matched" : "no_reliable_match",
      distance: result.match ? Math.round(result.match.distance) : null,
    });
    return NextResponse.json({
      limit: result.match?.limit ?? null,
      reason: result.match ? "matched" : "no_reliable_match",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("[mobile-speed-limit] all providers unavailable");
    return NextResponse.json({ limit: null, reason: "upstream_unavailable" }, { status: 503 });
  }
}

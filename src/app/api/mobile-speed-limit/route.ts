import { NextRequest, NextResponse } from "next/server";
import { matchRoadSpeedLimit, type OsmRoad } from "@/lib/mobile-speed-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const endpoints = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];
type Attempt = { provider: string; ms: number; status: number | null; outcome: string; candidates?: number; limit?: number | null };
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const lat = p.get("lat"), lon = p.get("lon"), acc = p.get("accuracy"), h = p.get("heading");
  const latitude = Number(lat), longitude = Number(lon), accuracy = Number(acc);
  const heading = h === null || h === "" ? null : Number(h);
  const debug = p.get("debug") === "1";
  const respond = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
  if (!lat || !lon || !acc || ![latitude, longitude, accuracy].every(Number.isFinite) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
      accuracy < 0 || accuracy > 100 ||
      (heading !== null && (!Number.isFinite(heading) || heading < 0 || heading >= 360))) {
    return respond({ limit: null, reason: "invalid_gps" }, 400);
  }
  const radius = Math.min(180, Math.max(90, Math.ceil(accuracy * 2 + 35)));
  const query = `[out:json][timeout:6];way(around:${radius},${latitude},${longitude})["highway"]["maxspeed"];out geom;`;
  const attempts: Attempt[] = await Promise.all(endpoints.map(async endpoint => {
    const provider = new URL(endpoint).hostname;
    const started = Date.now();
    let status: number | null = null;
    try {
      const response = await fetch(endpoint + "?data=" + encodeURIComponent(query), {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(6500),
        cache: "no-store",
      });
      status = response.status;
      if (!response.ok) return { provider, ms: Date.now() - started, status, outcome: "http_error" };
      const payload: { elements?: OsmRoad[] } = await response.json();
      if (!Array.isArray(payload.elements)) return { provider, ms: Date.now() - started, status, outcome: "invalid_json" };
      const match = matchRoadSpeedLimit(payload.elements, { latitude, longitude, accuracy, heading });
      return { provider, ms: Date.now() - started, status, outcome: match ? "matched" : "no_reliable_match", candidates: payload.elements.length, limit: match?.limit ?? null };
    } catch (error) {
      return { provider, ms: Date.now() - started, status, outcome: error instanceof Error ? error.name + ": " + error.message.slice(0, 100) : "unknown_error" };
    }
  }));
  const matched = attempts.find(a => a.outcome === "matched" && a.limit != null);
  const usable = attempts.some(a => a.status === 200);
  const reason = matched ? "matched" : usable ? "no_reliable_match" : "upstream_unavailable";
  const details = attempts.map(({provider, ms, status, outcome, candidates}) => ({provider, ms, status, outcome, candidates}));
  console.info("[mobile-speed-limit] diagnostics", JSON.stringify({reason, attempts: details, accuracy: Math.round(accuracy)}));
  return respond({
    limit: matched?.limit ?? null, reason,
    ...(debug ? { diagnostics: { accuracy: Math.round(accuracy), radius, providers: details } } : {}),
  }, usable ? 200 : 503);
}

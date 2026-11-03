import { NextRequest, NextResponse } from "next/server";
import { matchRoadSpeedLimit, type OsmRoad } from "@/lib/mobile-speed-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const endpoints = [
  "https://overpass.private.coffee/api/interpreter",
  "https://ovp.dresel.systems/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const tileCache = new Map<string, { roads: OsmRoad[]; expires: number }>();
const providerCooldown = new Map<string, number>();
const inflight = new Map<string, Promise<{ roads: OsmRoad[]; attempts: Attempt[] }>>();
const TTL_MS = 10 * 60_000;
const MAX_TILES = 80;
function tileFor(lat: number, lon: number) {
  const y = Math.floor(lat * 200) / 200;
  const x = Math.floor(lon * 100) / 100;
  return { key: y.toFixed(3) + ":" + x.toFixed(2), lat: y + 0.0025, lon: x + 0.005 };
}
async function loadTile(key: string, lat: number, lon: number): Promise<{ roads: OsmRoad[]; attempts: Attempt[] }> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const task = (async () => {
    const query = `[out:json][timeout:8];way(around:1300,${lat},${lon})["highway"]["maxspeed"];out geom;`;
    const attempts: Attempt[] = [];
    for (const endpoint of endpoints) {
      const provider = new URL(endpoint).hostname;
      if ((providerCooldown.get(provider) ?? 0) > Date.now()) {
        attempts.push({ provider, ms: 0, status: null, outcome: "cooldown" });
        continue;
      }
      const started = Date.now();
      let status: number | null = null;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
          body: "data=" + encodeURIComponent(query),
          signal: AbortSignal.timeout(9000),
          cache: "no-store",
        });
        status = response.status;
        if (!response.ok) {
          attempts.push({ provider, ms: Date.now() - started, status, outcome: "http_error" });
          providerCooldown.set(provider, Date.now() + (status === 429 ? 15 * 60_000 : 2 * 60_000));
          continue;
        }
        const payload: { elements?: OsmRoad[] } = await response.json();
        if (!Array.isArray(payload.elements)) {
          attempts.push({ provider, ms: Date.now() - started, status, outcome: "invalid_json" });
          continue;
        }
        attempts.push({ provider, ms: Date.now() - started, status, outcome: "ok", candidates: payload.elements.length });
        if (payload.elements.length) {
          if (tileCache.size >= MAX_TILES) tileCache.delete(tileCache.keys().next().value!);
          tileCache.set(key, { roads: payload.elements, expires: Date.now() + TTL_MS });
          return { roads: payload.elements, attempts };
        }
      } catch (error) {
        attempts.push({ provider, ms: Date.now() - started, status, outcome: error instanceof Error ? error.name + ": " + error.message.slice(0, 100) : "unknown_error" });
        providerCooldown.set(provider, Date.now() + 2 * 60_000);
      }
    }
    return { roads: [], attempts };
  })();
  inflight.set(key, task);
  try { return await task; } finally { inflight.delete(key); }
}
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
  const tile = tileFor(latitude, longitude);
  const cached = tileCache.get(tile.key);
  const hit = cached && cached.expires > Date.now();
  const result = hit ? { roads: cached.roads, attempts: [] as Attempt[] } : await loadTile(tile.key, tile.lat, tile.lon);
  const match = matchRoadSpeedLimit(result.roads, { latitude, longitude, accuracy, heading });
  const reason = match ? "matched" : result.roads.length ? "no_reliable_match" : "no_road_data";
  const details = result.attempts.map(({provider, ms, status, outcome, candidates}) => ({provider, ms, status, outcome, candidates}));
  console.info("[mobile-speed-limit] diagnostics", JSON.stringify({reason, cacheHit: !!hit, attempts: details, accuracy: Math.round(accuracy)}));
  return respond({
    limit: match?.limit ?? null, reason,
    ...(debug ? { diagnostics: { accuracy: Math.round(accuracy), radius: 1300, cacheHit: !!hit, candidates: result.roads.length, providers: details } } : {}),
  }, result.roads.length ? 200 : 503);
}

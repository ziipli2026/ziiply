export type RoadSegment = { lat: number; lon: number };
export type OsmRoad = { tags?: Record<string, string>; geometry?: RoadSegment[] };
export type SpeedLimitFix = { latitude: number; longitude: number; accuracy: number; heading?: number | null };
export type SpeedLimitMatch = { limit: number; distance: number; roadIndex: number };

export function parseRoadSpeedLimit(value?: string): number | null {
  if (!value) return null;
  const match = /^(\d{1,3})(?:\s*(?:km\/h|kmh))?$/.exec(value.trim());
  if (!match) return null;
  const limit = Number(match[1]);
  return limit >= 10 && limit <= 130 ? limit : null;
}

export function matchRoadSpeedLimit(roads: OsmRoad[], fix: SpeedLimitFix): SpeedLimitMatch | null {
  if (![fix.latitude, fix.longitude, fix.accuracy].every(Number.isFinite) || fix.accuracy > 100) return null;
  const scale = Math.cos(fix.latitude * Math.PI / 180) * 111_195;
  const matches: Array<SpeedLimitMatch & { headingDifference: number }> = [];
  roads.forEach((road, roadIndex) => {
    const limit = parseRoadSpeedLimit(road.tags?.maxspeed);
    if (limit === null) return;
    const geometry = road.geometry ?? [];
    for (let i = 1; i < geometry.length; i++) {
      const a = geometry[i - 1], b = geometry[i];
      const ax = (a.lon - fix.longitude) * scale, ay = (a.lat - fix.latitude) * 111_195;
      const dx = (b.lon - a.lon) * scale, dy = (b.lat - a.lat) * 111_195;
      const denom = dx * dx + dy * dy;
      if (denom < 0.01) continue;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denom));
      const distance = Math.hypot(ax + t * dx, ay + t * dy);
      const angle = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
      const heading = fix.heading;
      const delta = heading == null || !Number.isFinite(heading) ? 0 : Math.abs(angle - heading);
      const headingDifference = Math.min(delta, 360 - delta, Math.abs(delta - 180));
      if (headingDifference <= 45) matches.push({ limit, distance, roadIndex, headingDifference });
    }
  });
  matches.sort((a, b) => a.distance - b.distance || a.headingDifference - b.headingDifference);
  const best = matches[0];
  if (!best || best.distance > Math.min(60, Math.max(15, fix.accuracy + 10))) return null;
  const conflicting = matches.find(m => m.roadIndex !== best.roadIndex && m.limit !== best.limit && m.distance <= best.distance + Math.max(8, fix.accuracy));
  if (conflicting) return null;
  return { limit: best.limit, distance: best.distance, roadIndex: best.roadIndex };
}

export function speedColor(speed: number | null, limit: number | null): 'neutral' | 'green' | 'red' {
  if (speed === null || limit === null || !Number.isFinite(speed)) return 'neutral';
  return speed > limit + 2 ? 'red' : 'green';
}

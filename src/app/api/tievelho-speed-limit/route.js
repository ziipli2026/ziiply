import {NextResponse} from 'next/server';
import {DigiroadSpeedService} from '../../../../lib/digiroad-speed-service.mjs';
import {fetchTievelhoNearFix} from '../../../../lib/tievelho-speed-limits.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  const headers = {'Cache-Control': 'private, no-store'};
  const payload = await request.json().catch(() => null);
  const fixes = payload?.fixes;
  if (!Array.isArray(fixes) || fixes.length !== 3 || !fixes.every((fix, index) =>
    Number.isFinite(fix?.latitude) && fix.latitude >= 58 && fix.latitude <= 71 &&
    Number.isFinite(fix.longitude) && fix.longitude >= 15 && fix.longitude <= 34 &&
    Number.isFinite(fix.accuracy) && fix.accuracy >= 0 && fix.accuracy <= 40 &&
    Number.isFinite(fix.timestamp) &&
    (index === 0 || (fix.timestamp > fixes[index - 1].timestamp &&
      fix.timestamp - fixes[index - 1].timestamp <= 10000)) &&
    (fix.heading == null || (Number.isFinite(fix.heading) && fix.heading >= 0 && fix.heading < 360))
  )) {
    return NextResponse.json({limit: null, reason: 'invalid_gps'}, {status: 400, headers});
  }

  let timestamp = fixes[0].timestamp;
  const service = new DigiroadSpeedService({
    fetchRoads: fetchTievelhoNearFix,
    clock: () => timestamp,
  });
  let result;
  for (const fix of fixes) {
    timestamp = fix.timestamp;
    result = await service.update(fix);
  }

  return NextResponse.json({
    limit: result.speedLimit,
    reason: result.status,
    source: 'tievelho',
  }, {headers});
}

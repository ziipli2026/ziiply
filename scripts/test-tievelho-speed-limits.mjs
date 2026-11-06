import assert from 'node:assert/strict';
import {matchDigiroadFix} from '../lib/digiroad-speed-matching.mjs';
import {DigiroadSpeedTracker} from '../lib/digiroad-speed-tracker.mjs';

const endpoint = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/ogc/features/v1/collections/tiestotiedot:nopeusrajoitukset/items';
const sites = [
  ['Hyvinkää / vt 3–25', [24.75, 60.57, 24.83, 60.65]],
  ['Klaukkala / vt 3', [24.77, 60.35, 24.85, 60.42]],
];

const results = await Promise.allSettled(sites.map(async ([site, bbox]) => {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({f: 'application/geo+json', bbox: bbox.join(','), limit: '100'});
  const features = [];
  const visited = new Set();
  let next = url;
  let numberMatched;
  while (next) {
    assert.ok(next.origin === url.origin && next.pathname === url.pathname, 'Unexpected pagination URL');
    assert.ok(!visited.has(next.href) && visited.size < 10, 'Tievelho pagination did not finish');
    visited.add(next.href);
    const response = await fetch(next, {signal: AbortSignal.timeout(12000)});
    if (!response.ok) {
      const title = (await response.text()).match(/<title>\s*([^<]+)/i)?.[1].trim();
      throw new Error(`Tievelho HTTP ${response.status}${title ? ` — ${title}` : ''}`);
    }
    const data = await response.json();
    assert.ok(Array.isArray(data.features), 'GeoJSON features missing');
    numberMatched ??= data.numberMatched;
    features.push(...data.features);
    const href = data.links?.find(link => link.rel === 'next')?.href;
    next = null;
    if (href) {
      assert.ok(data.features.length, 'Tievelho returned an empty page before the end');
      next = new URL(url);
      next.searchParams.set('startIndex', String(features.length));
    }
  }
  if (Number.isInteger(numberMatched)) assert.equal(features.length, numberMatched, 'Incomplete Tievelho results');
  const usable = features.filter(({geometry, properties}) => {
    const lines = geometry?.type === 'LineString' ? [geometry.coordinates]
      : geometry?.type === 'MultiLineString' ? geometry.coordinates : [];
    const speed = Number(properties?.nopeusrajoitus);
    return Number.isInteger(speed) && speed >= 10 && speed <= 130
      && lines.some(line => line.length >= 2 && line.every(([lon, lat]) =>
        Number.isFinite(lon) && lon >= 15 && lon <= 34
        && Number.isFinite(lat) && lat >= 58 && lat <= 71));
  });
  console.log(JSON.stringify({
    site, returned: features.length, usable: usable.length,
    numberMatched, pages: visited.size,
    speedLimits: [...new Set(usable.map(feature => Number(feature.properties.nopeusrajoitus)))].sort((a,b) => a-b),
  }));
  const candidates = usable.map((feature, index) => ({
    ...feature,
    properties: {link_id: String(index), arvo: Number(feature.properties.nopeusrajoitus)},
  }));
  let confirmed = 0;
  let parallelChecked = false;
  for (const candidate of candidates.filter(feature => feature.properties.arvo === 120)) {
    const {geometry, properties} = candidate;
    const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
    for (const line of lines) {
      for (let index = 1; index < line.length; index++) {
        const [lon, lat] = line[index - 1];
        const [endLon, endLat] = line[index];
        const dx = (endLon - lon) * Math.cos(lat * Math.PI / 180);
        const dy = endLat - lat;
        if (Math.hypot(dx, dy) * 111320 < 20) continue;
        const heading = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
        if (!parallelChecked) {
          const scale = Math.cos(lat * Math.PI / 180);
          const length = Math.hypot(dx, dy);
          const offsetLon = -dy / length * 8 / (111320 * scale);
          const offsetLat = dx / length * 8 / 111320;
          const road = (id, speed, offset) => ({
            properties: {link_id: id, arvo: speed},
            geometry: {type: 'LineString', coordinates: [
              [lon + offset * offsetLon, lat + offset * offsetLat],
              [endLon + offset * offsetLon, endLat + offset * offsetLat],
            ]},
          });
          const roads = [road('main', 120, 0), road('parallel', 60, 1)];
          const fixAt = offset => ({
            latitude: (lat + endLat) / 2 + offset * offsetLat,
            longitude: (lon + endLon) / 2 + offset * offsetLon,
            heading,
            accuracy: 3,
          });
          assert.equal(matchDigiroadFix(fixAt(0), roads).speedLimit, 120);
          assert.equal(matchDigiroadFix(fixAt(1), roads).speedLimit, 60);
          assert.equal(matchDigiroadFix(fixAt(0.5), roads).reason, 'ambiguous_roads');
          parallelChecked = true;
        }
        const tracker = new DigiroadSpeedTracker();
        const results = [0.25, 0.5, 0.75].map((fraction, fixIndex) => {
          const match = matchDigiroadFix({
            latitude: lat + fraction * dy,
            longitude: lon + fraction * (endLon - lon),
            accuracy: 3,
            heading,
          }, candidates);
          return tracker.update(match, {timestamp: fixIndex * 1000});
        });
        assert.equal(results[0].status, 'unknown');
        assert.equal(results[1].status, 'unknown');
        if (results[2].linkId === properties.link_id && results[2].speedLimit === 120) confirmed++;
      }
    }
  }
  console.log(JSON.stringify({site, confirmed120Trajectories: confirmed, parallelChecked}));
  assert.ok(confirmed > 0, `${site}: no 120 km/h trajectory confirmed on its source segment`);
  assert.ok(usable.length, `${site}: no speed limit records with WGS84 line geometry`);
}));

for (const [index, result] of results.entries()) {
  if (result.status === 'rejected') {
    console.error(`${sites[index][0]}: ${result.reason.message}`);
    process.exitCode = 1;
  }
}

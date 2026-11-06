import assert from 'node:assert/strict';

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
  assert.ok(usable.length, `${site}: no speed limit records with WGS84 line geometry`);
}));

for (const [index, result] of results.entries()) {
  if (result.status === 'rejected') {
    console.error(`${sites[index][0]}: ${result.reason.message}`);
    process.exitCode = 1;
  }
}

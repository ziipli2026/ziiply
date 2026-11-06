import assert from 'node:assert/strict';

const endpoint = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/ogc/features/v1/collections/tiestotiedot:nopeusrajoitukset/items';
const sites = [
  ['Hyvinkää / vt 3–25', [24.75, 60.57, 24.83, 60.65]],
  ['Klaukkala / vt 3', [24.77, 60.35, 24.85, 60.42]],
];

await Promise.all(sites.map(async ([site, bbox]) => {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({f: 'application/geo+json', bbox: bbox.join(','), limit: '100'});
  const response = await fetch(url, {signal: AbortSignal.timeout(12000)});
  assert.ok(response.ok, `${site}: Tievelho HTTP ${response.status}`);
  const data = await response.json();
  assert.ok(Array.isArray(data.features), `${site}: GeoJSON features missing`);
  const usable = data.features.filter(({geometry, properties}) => {
    const lines = geometry?.type === 'LineString' ? [geometry.coordinates]
      : geometry?.type === 'MultiLineString' ? geometry.coordinates : [];
    const speed = Number(properties?.nopeusrajoitus);
    return Number.isInteger(speed) && speed >= 10 && speed <= 130
      && lines.some(line => line.length >= 2 && line.every(([lon, lat]) =>
        Number.isFinite(lon) && lon >= 15 && lon <= 34
        && Number.isFinite(lat) && lat >= 58 && lat <= 71));
  });
  console.log(JSON.stringify({
    site, returned: data.features.length, usable: usable.length,
    numberMatched: data.numberMatched, hasNextPage: data.links?.some(link => link.rel === 'next'),
    speedLimits: [...new Set(usable.map(feature => Number(feature.properties.nopeusrajoitus)))].sort((a,b) => a-b),
  }));
  assert.ok(usable.length, `${site}: no speed limit records with WGS84 line geometry`);
}));

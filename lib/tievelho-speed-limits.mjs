const endpoint = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/ogc/features/v1/collections/tiestotiedot:nopeusrajoitukset/items';

function requireResult(condition, message) {
  if (!condition) throw new Error(message);
}

export async function fetchTievelhoSpeedLimits(bbox, {fetchFn = fetch} = {}) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({f: 'application/geo+json', bbox: bbox.join(','), limit: '100'});
  const features = [];
  const visited = new Set();
  let next = url;
  let numberMatched;
  while (next) {
    requireResult(next.origin === url.origin && next.pathname === url.pathname, 'Unexpected pagination URL');
    requireResult(!visited.has(next.href) && visited.size < 10, 'Tievelho pagination did not finish');
    visited.add(next.href);
    const response = await fetchFn(next, {signal: AbortSignal.timeout(12000)});
    if (!response.ok) {
      const title = (await response.text()).match(/<title>\s*([^<]+)/i)?.[1].trim();
      throw new Error(`Tievelho HTTP ${response.status}${title ? ` — ${title}` : ''}`);
    }
    const data = await response.json();
    requireResult(Array.isArray(data.features), 'GeoJSON features missing');
    numberMatched ??= data.numberMatched;
    features.push(...data.features);
    const href = data.links?.find(link => link.rel === 'next')?.href;
    next = null;
    if (href) {
      requireResult(data.features.length, 'Tievelho returned an empty page before the end');
      next = new URL(url);
      next.searchParams.set('startIndex', String(features.length));
    }
  }
  if (Number.isInteger(numberMatched)) requireResult(features.length === numberMatched, 'Incomplete Tievelho results');
  return {features, numberMatched, pages: visited.size};
}

export async function fetchTievelhoNearFix({latitude, longitude}, options) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid GPS coordinates');
  }
  const dy = 0.001;
  const dx = dy / Math.cos(latitude * Math.PI / 180);
  const {features} = await fetchTievelhoSpeedLimits(
    [longitude - dx, latitude - dy, longitude + dx, latitude + dy],
    options,
  );
  return features.flatMap(feature => {
    const {properties, geometry} = feature;
    const id = properties?.oid ?? feature.id;
    const speed = Number(properties?.nopeusrajoitus);
    const seasonal = properties?.talven_ja_pimean_nopeusrajoitus;
    if (!properties || !id || properties.paattyen || (properties.alkaen && Date.parse(properties.alkaen) > Date.now())
      || !Number.isInteger(speed) || speed < 10 || speed > 130
      || (seasonal != null && seasonal !== '' && Number(seasonal) !== speed)
      || !['LineString', 'MultiLineString'].includes(geometry?.type)) return [];
    return [{...feature, properties: {link_id: String(id), arvo: speed}}];
  });
}

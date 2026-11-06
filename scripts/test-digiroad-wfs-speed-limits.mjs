#!/usr/bin/env node
/**
 * Read-only Digiroad speed-limit API probe. Does not affect production.
 * Run: node scripts/test-digiroad-wfs-speed-limits.mjs
 * Historical Digiroad data stopped updating in September 2026.
 */
const base = 'https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/ogc/features/v1/collections/dr_nopeusrajoitus/items';
const sites = [
  { name: 'Hyvinkaa keskusta', lat: 60.631, lon: 24.859 },
  { name: 'Jokela keskusta', lat: 60.553, lon: 24.966 },
  { name: 'Klaukkala keskusta', lat: 60.381, lon: 24.753 },
  { name: 'Riihimaki keskusta', lat: 60.738, lon: 24.772 },
  { name: 'Helsinki keskusta', lat: 60.170, lon: 24.941 },
  // Route 25 Hanko–Porvoo corridor sampling; approximate coordinates near the corridor,
  // NOT verified road-centerline points. Matching specifically to road 25 needs road identity checks.
  { name: 'Vt25 Hanko vicinity', lat: 59.824, lon: 22.968 },
  { name: 'Vt25 Tammisaari vicinity', lat: 59.974, lon: 23.434 },
  { name: 'Vt25 Karjaa vicinity', lat: 60.071, lon: 23.660 },
  { name: 'Vt25 Lohja vicinity', lat: 60.248, lon: 24.060 },
  { name: 'Vt25 Nummela vicinity', lat: 60.333, lon: 24.320 },
  { name: 'Vt25 Hyvinkaa vicinity', lat: 60.631, lon: 24.859 },
  { name: 'Vt25 Mantsala vicinity', lat: 60.635, lon: 25.320 },
  { name: 'Vt25 Porvoo vicinity', lat: 60.392, lon: 25.665 },
]; 
const radius = 0.001; // approx 100m latitude, wider in longitude
const timeoutMs = 12000;
let failures = 0;
for (const site of sites) {
  const bbox = [site.lon-radius*2,site.lat-radius,site.lon+radius*2,site.lat+radius].join(',');
  const url = new URL(base);
  url.searchParams.set('f','json');
  url.searchParams.set('bbox',bbox);
  url.searchParams.set('limit','30');
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),timeoutMs);
    let response;
    try { response = await fetch(url,{signal:controller.signal,headers:{accept:'application/geo+json'}}); }
    finally { clearTimeout(timer); }
    const body = await response.text();
    const bytes = Buffer.byteLength(body);
    let data;
    try { data = JSON.parse(body); } catch { data = null; }
    const features = data?.features ?? [];
    const sample = features.slice(0,5).map(f=>({
      id:f.id, properties:f.properties, geometryType:f.geometry?.type
    }));
    const result = {site:site.name,status:response.status,elapsedMs:Date.now()-started,bytes,features:features.length,numberMatched:data?.numberMatched ?? null,sample};
    console.log(JSON.stringify(result));
    if (!response.ok || !data || !Array.isArray(data.features)) failures++;
  } catch (error) {
    failures++;
    console.log(JSON.stringify({site:site.name,error:String(error),elapsedMs:Date.now()-started}));
  }
}
if (failures) { console.error(`Failed queries: ${failures}/${sites.length}`); process.exitCode=1; }

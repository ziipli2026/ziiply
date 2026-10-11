export const TEST_BRANCH = 'br-weathered-meadow-b1bwpzst';
export const BASE = 'https://api.tankkaus.com/mobile';
const fuels = new Map([[1,'95'],[2,'98'],[6,'diesel']]);
const number = v => v == null || String(v).trim()==='' ? NaN : Number(String(v).replace(',','.'));
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// All pages of the provider's documented, nationwide last-week observation feed.
// This is not an all-station registry: stations with no available observations
// are retained in Neon, but cannot be discovered from this endpoint alone.
export async function collectNational({token, fetchImpl=fetch, now=Date.now(), onPage=()=>{}}) {
  if (!token?.trim()) throw new Error('TANKKAUS_API_TOKEN is missing');
  const stations = new Map(), observations = [], fingerprints = new Set();
  const rejected = {unsupportedFuel:0,nonFinnish:0,teboil:0,invalidStation:0,invalidPrice:0,invalidTimestamp:0};
  let providerRows=0, pages=0, countryUnspecified=0;
  for (let page=1;;page++) {
    const response=await fetchImpl(`${BASE}/fills/index?page=${page}&limit=100&sort=created&direction=desc`, {
      headers:{Accept:'application/json',Authorization:`Token ${token.trim()}`},
      signal:AbortSignal.timeout(30000), cache:'no-store'
    });
    // The documented paginator returns 404 for pages beyond its range.
    if (response.status===404 && page>1) break;
    if (!response.ok) throw new Error(`Tankkaus observation page ${page}: HTTP ${response.status}`);
    const payload=await response.json();
    if (!Array.isArray(payload?.fills)) throw new Error(`Tankkaus page ${page}: missing fills array`);
    const rows=payload.fills;
    if (!rows.length) break;
    const fingerprint=JSON.stringify(rows);
    if (fingerprints.has(fingerprint)) throw new Error('Provider repeated a page; refusing incomplete import');
    fingerprints.add(fingerprint); pages++; providerRows+=rows.length;
    for (const row of rows) {
      const v=row?.station, id=number(row?.station_id ?? v?.id);
      const latitude=number(v?.latitude ?? v?.lat), longitude=number(v?.longitude ?? v?.lon);
      if (!v || !Number.isSafeInteger(id)||id<=0||number(v.id)!==id||!v.name||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180) {rejected.invalidStation++;continue;}
      const country=String(v.country?.name_short??'').toUpperCase();
      if (country && country!=='FI') {rejected.nonFinnish++;continue;}
      // Country is not guaranteed in /fills/index's documented station object.
      // Record this explicitly rather than falsely claiming verified nationality.
      if (!country) countryUnspecified++;
      const chain=v.chain?.name??(typeof v.chain==='string'?v.chain:null);
      if (/teboil/i.test(String(chain??'')+' '+v.name)) {rejected.teboil++;continue;}
      const station={id,name:String(v.name),chain,address:v.address?String(v.address):null,latitude,longitude};
      const previous=stations.get(id);
      if (previous && (previous.latitude!==latitude||previous.longitude!==longitude)) throw new Error(`Conflicting station identity ${id}`);
      stations.set(id,station);
      const fuel=fuels.get(number(row.fuel_type_id??row.fuel_type?.id));
      if (!fuel) {rejected.unsupportedFuel++;continue;}
      const price=number(row.price_liter);
      if (!Number.isFinite(price)||price<=0||price>5||Math.abs(price*1000-Math.round(price*1000))>0.000001) {rejected.invalidPrice++;continue;}
      const observedAt=row.created, t=Date.parse(observedAt);
      if (typeof observedAt!=='string'||!timestamp.test(observedAt)||!Number.isFinite(t)||t>now) {rejected.invalidTimestamp++;continue;}
      observations.push({stationId:id,fuel,price,observedAt});
    }
    await onPage({page,providerRows});
  }
  const newestObservedAt=observations.reduce((latest,o)=>!latest||Date.parse(o.observedAt)>Date.parse(latest)?o.observedAt:latest,null);
  return {stations:[...stations.values()],observations,report:{pages,providerRows,acceptedObservations:observations.length,stations:stations.size,rejected,countryUnspecified,newestObservedAt,scope:'all pages of last-week /fills/index feed',stationRegistryComplete:false}};
}

export async function persistNational(sql,batch) {
  const branch=await sql`SELECT current_setting('neon.branch_id',true) AS branch_id`;
  if(branch[0]?.branch_id!==TEST_BRANCH) throw new Error('Refusing writes outside the approved Neon Tankkaus test branch');
  if(!batch.observations.length) return {insertedObservations:0,upsertedStations:0};
  const stationJSON=JSON.stringify(batch.stations), observationJSON=JSON.stringify(batch.observations);
  // One atomic transaction: never leave an imported observation without its station.
  // DO NOTHING preserves history, including original observed_at and ingested_at.
  const results=await sql.transaction([
    sql`INSERT INTO ziiply_fuel_stations (source,source_station_id,name,chain,address,latitude,longitude,last_seen_at,updated_at)
      SELECT 'tankkaus.com',id,name,chain,address,latitude,longitude,NOW(),NOW()
      FROM jsonb_to_recordset(${stationJSON}::jsonb) AS s(id bigint,name text,chain text,address text,latitude double precision,longitude double precision)
      ON CONFLICT(source,source_station_id) DO UPDATE SET name=EXCLUDED.name,chain=EXCLUDED.chain,address=EXCLUDED.address,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,last_seen_at=NOW(),updated_at=NOW()
      RETURNING source_station_id`,
    sql`INSERT INTO ziiply_fuel_price_observations(source,source_station_id,fuel_type,price_eur_per_litre,observed_at)
      SELECT DISTINCT 'tankkaus.com',"stationId",fuel,price,"observedAt"::timestamptz
      FROM jsonb_to_recordset(${observationJSON}::jsonb) AS p("stationId" bigint,fuel text,price numeric,"observedAt" text)
      ON CONFLICT(source,source_station_id,fuel_type,observed_at,price_eur_per_litre) DO NOTHING RETURNING id`
  ]);
  return {upsertedStations:results[0].length,insertedObservations:results[1].length};
}

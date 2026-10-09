#!/usr/bin/env node
// Safe station-classification audit. Reads from Neon; never modifies classifications.
// Requires DATABASE_URL. Official matches must be separately verified before writes.
import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
 SELECT source_station_id,name,chain,address,latitude,longitude,
        is_traffic_station,traffic_station_verified
 FROM public.ziiply_fuel_stations
 WHERE COALESCE(chain,'') NOT ILIKE '%teboil%'
 ORDER BY chain,name,source_station_id
`;
const normalized = s => String(s??"").normalize("NFKD").toLowerCase()
  .replace(/[^a-z0-9äöå]+/g," ").trim().replace(/\\s+/g," ");
const key = r => normalized(r.address);
const groups = new Map();
for(const r of rows) {
 const k = key(r);
 if (!k) continue;
 const arr=groups.get(k)??[];
 arr.push(r);groups.set(k,arr);
}
const conflicts=[...groups.entries()].filter(([,rs]) =>
 rs.length>1 && rs.some(x=>x.traffic_station_verified) &&
 new Set(rs.filter(x=>x.traffic_station_verified).map(x=>x.is_traffic_station)).size>1
).map(([address,stations])=>({address,stations:stations.map(s=>({id:s.source_station_id,chain:s.chain,traffic:s.is_traffic_station}))}));
const summary={total:rows.length,verified:rows.filter(r=>r.traffic_station_verified).length,
traffic:rows.filter(r=>r.traffic_station_verified&&r.is_traffic_station).length,
unverified:rows.filter(r=>!r.traffic_station_verified).length,conflicts};
console.log(JSON.stringify(summary,null,2));
if(conflicts.length) process.exitCode=2;

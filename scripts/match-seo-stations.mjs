#!/usr/bin/env node
// Read-only SEO official directory reconciliation; no inferred classifications or DB writes.
// Requires DATABASE_URL. Run: node scripts/match-seo-stations.mjs
import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const sql=neon(process.env.DATABASE_URL);
const html=await fetch("https://seo.fi/asemat",{signal:AbortSignal.timeout(20000)}).then(r=>{
 if(!r.ok) throw new Error("SEO directory HTTP "+r.status); return r.text();
});
const clean=s=>String(s??"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const officialText=clean(html);
const stations=await sql`SELECT source_station_id,name,address FROM public.ziiply_fuel_stations WHERE lower(chain)='seo' ORDER BY name`;
const report=stations.map(s=>{
 const address=clean(s.address);
 const addressPresent=address.length>6&&officialText.includes(address);
 return {id:s.source_station_id,name:s.name,address:s.address,
  addressInOfficialDirectory:addressPresent,
  status:addressPresent?"address-candidate-needs-service-verification":"manual-review"};
});
console.log(JSON.stringify({officialDirectory:"https://seo.fi/asemat",checked:report.length,report},null,2));

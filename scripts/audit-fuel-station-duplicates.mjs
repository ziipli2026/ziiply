#!/usr/bin/env node
// Read-only station identity reconciliation. No merges, deletes or classification writes.
import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const sql=neon(process.env.DATABASE_URL);
const rows=await sql`SELECT source,source_station_id,name,chain,address,latitude,longitude
 FROM public.ziiply_fuel_stations WHERE coalesce(chain,'') NOT ILIKE '%teboil%'
 AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY chain,name`;
const radians=x=>x*Math.PI/180;
const distance=(a,b)=>{
 const lat=radians(b.latitude-a.latitude),lon=radians(b.longitude-a.longitude);
 const h=Math.sin(lat/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(lon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
};
const norm=x=>String(x??"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const candidates=[];
for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
 const a=rows[i],b=rows[j];if(norm(a.chain)!==norm(b.chain))continue;
 const meters=distance(a,b);
 if(meters>75)continue;
 const sameAddress=norm(a.address)!==""&&norm(a.address)===norm(b.address);
 const sameName=norm(a.name)!==""&&norm(a.name)===norm(b.name);
 if(!sameAddress&&!sameName)continue;
 candidates.push({a:{source:a.source,id:a.source_station_id,name:a.name,address:a.address},
 b:{source:b.source,id:b.source_station_id,name:b.name,address:b.address},
 distanceMeters:Math.round(meters),sameAddress,sameName,status:"manual-review-only"});
}
console.log(JSON.stringify({checked:rows.length,candidatePairs:candidates.length,candidates},null,2));

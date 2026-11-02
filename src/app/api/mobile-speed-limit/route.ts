import { NextRequest, NextResponse } from "next/server";
import { matchRoadSpeedLimit, type OsmRoad } from "@/lib/mobile-speed-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const endpoints = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter", "https://overpass.nchc.org.tw/api/interpreter"];
export async function GET(request: NextRequest) {
 const p=request.nextUrl.searchParams;
 const lat=p.get("lat"), lon=p.get("lon"), acc=p.get("accuracy"), h=p.get("heading");
 const latitude=Number(lat), longitude=Number(lon), accuracy=Number(acc);
 const heading=h===null||h===""?null:Number(h);
 if(!lat||!lon||!acc||![latitude,longitude,accuracy].every(Number.isFinite)||latitude < -90||latitude>90||longitude < -180||longitude>180||accuracy<0||accuracy>100||(heading!==null&&(!Number.isFinite(heading)||heading<0||heading>=360))) {
  console.warn("[mobile-speed-limit] invalid GPS request",{accuracy});
  return NextResponse.json({limit:null,reason:"invalid_gps"},{status:400});
 }
 const radius=Math.min(180,Math.max(90,Math.ceil(accuracy*2+35)));
 const query=`[out:json][timeout:9];way(around:${radius},${latitude},${longitude})["highway"]["maxspeed"];out geom;`;
 let failure="no_provider";
 for(const endpoint of endpoints) {
  try {
   const response=await fetch(endpoint,{method:"POST",body:new URLSearchParams({data:query}),headers:{"Content-Type":"application/x-www-form-urlencoded"},signal:AbortSignal.timeout(11500),cache:"no-store"});
   if(!response.ok){failure="http_"+response.status;console.warn("[mobile-speed-limit] provider response",{provider:new URL(endpoint).hostname,status:response.status});continue;}
   const payload:{elements?:OsmRoad[]}=await response.json();
   if(!Array.isArray(payload.elements)){failure="invalid_provider_response";continue;}
   const match=matchRoadSpeedLimit(payload.elements,{latitude,longitude,accuracy,heading});
   console.info("[mobile-speed-limit] lookup",{reason:match?"matched":"no_reliable_match",candidates:payload.elements.length,accuracy:Math.round(accuracy),distance:match?Math.round(match.distance):null,provider:new URL(endpoint).hostname});
   return NextResponse.json({limit:match?.limit??null,reason:match?"matched":"no_reliable_match"},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){failure=error instanceof Error?error.name:"provider_error";console.warn("[mobile-speed-limit] provider failure",{provider:new URL(endpoint).hostname,reason:failure});}
 }
 console.error("[mobile-speed-limit] all providers unavailable",{reason:failure});
 return NextResponse.json({limit:null,reason:"upstream_unavailable"},{status:503});
}

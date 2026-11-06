import { NextRequest, NextResponse } from "next/server";
import { matchRoadSpeedLimit, type OsmRoad } from "@/lib/mobile-speed-limit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.ultra.cc/api/interpreter",
];
const providerCooldown=new Map<string,number>();
const roadResultCache=new Map<string,{until:number;body:Record<string,unknown>;status:number}>();
const MAX_ROAD_CACHE=400;
type Attempt = { provider: string; ms: number; status: number | null; outcome: string; candidates?: number; limit?: number | null };

// Independent OSM map fallback: retrieve nearby nodes and ways from the official OSM API.
// This endpoint is deliberately used only after Overpass fails; cache and throttling
// above limit requests. Never infer a limit when OSM has no explicit maxspeed tag.
async function fetchOsmMapRoads(latitude:number,longitude:number,radius:number):Promise<OsmRoad[]> {
  const latSpan=Math.min(0.003, radius/111195);
  const lonSpan=Math.min(0.005, radius/(111195*Math.max(0.2,Math.cos(latitude*Math.PI/180))));
  const bbox=[longitude-lonSpan,latitude-latSpan,longitude+lonSpan,latitude+latSpan].map(n=>n.toFixed(6)).join(",");
  const response=await fetch("https://api.openstreetmap.org/api/0.6/map?bbox="+bbox,{
    headers:{"Accept":"application/xml","User-Agent":"ZiiplySpeedLimit/1.0 (road speed limit lookup)"},
    signal:AbortSignal.timeout(5500),cache:"no-store",
  });
  if(!response.ok)throw new Error("OSM map HTTP "+response.status);
  const xml=await response.text();
  if(xml.length>2_500_000)throw new Error("OSM map too large");
  const nodes=new Map<string,{lat:number;lon:number}>();
  for(const m of xml.matchAll(/<node\b([^>]*?)\/?>(?:<\/node>)?/g)){
    const a=m[1];const id=/\bid="([^"]+)"/.exec(a)?.[1],lat=/\blat="([^"]+)"/.exec(a)?.[1],lon=/\blon="([^"]+)"/.exec(a)?.[1];
    if(id&&lat&&lon)nodes.set(id,{lat:Number(lat),lon:Number(lon)});
  }
  const roads:OsmRoad[]=[];
  for(const m of xml.matchAll(/<way\b[^>]*>([\s\S]*?)<\/way>/g)){
    const body=m[1],tags:Record<string,string>={};
    for(const tag of body.matchAll(/<tag\b[^>]*\bk="([^"]+)"[^>]*\bv="([^"]*)"[^>]*\/>/g))tags[tag[1]]=tag[2];
    if(!tags.highway||!tags.maxspeed)continue;
    const geometry=Array.from(body.matchAll(/<nd\b[^>]*\bref="([^"]+)"[^>]*\/>/g),nd=>nodes.get(nd[1])).filter((n):n is {lat:number;lon:number}=>!!n);
    if(geometry.length>1)roads.push({tags,geometry});
  }
  return roads;
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const lat = p.get("lat"), lon = p.get("lon"), acc = p.get("accuracy"), h = p.get("heading");
  const latitude = Number(lat), longitude = Number(lon), accuracy = Number(acc);
  const heading = h === null || h === "" ? null : Number(h);
  const debug = p.get("debug") === "1";
  const respond = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
  if (!lat || !lon || !acc || ![latitude, longitude, accuracy].every(Number.isFinite) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
      accuracy < 0 || accuracy > 100 ||
      (heading !== null && (!Number.isFinite(heading) || heading < 0 || heading >= 360))) {
    return respond({ limit: null, reason: "invalid_gps" }, 400);
  }
  // TomTom is enabled only with a commercial-production key and explicit feature flag.
  // Evaluation keys must never be used for commercial production traffic.
  if(process.env.TOMTOM_COMMERCIAL_ENABLED==="true" && process.env.TOMTOM_API_KEY){
    try {
      const points=[latitude,longitude].every(Number.isFinite) ? `${longitude},${latitude};${longitude},${latitude}` : "";
      const params=new URLSearchParams({
        key:process.env.TOMTOM_API_KEY,points,
        fields:"{projectedPoints{properties{routeIndex,snapResult}},route{properties{speedLimits{value,unit,type},confidence,formOfWay}}}",
        vehicleType:"PassengerCar",measurementSystem:"metric",
      });
      if(heading!==null)params.set("headings",`${heading};${heading}`);
      const upstream=await fetch(`https://api.tomtom.com/snapToRoads/1?${params}`,{signal:AbortSignal.timeout(4500),cache:"no-store"});
      if(upstream.ok){
        const data=await upstream.json() as {projectedPoints?:Array<{properties?:{routeIndex?:number;snapResult?:string}}>;route?:Array<{properties?:{speedLimits?:{value?:number;unit?:string;type?:string};confidence?:number;formOfWay?:string}}>};
        const index=data.projectedPoints?.filter(p=>p.properties?.snapResult==="Matched").at(-1)?.properties?.routeIndex;
        const road=typeof index==="number"?data.route?.[index]?.properties:undefined;
        const speed=road?.speedLimits;
        if(road&&speed&&speed.type==="Maximum"&&typeof speed.value==="number"&&
          (road.confidence??0)>=0.5&&road.formOfWay!=="ETAParkingBuilding"&&road.formOfWay!=="ETAParkingArea"){
          const limit=speed.unit==="mph"?Math.round(speed.value*1.609344):speed.value;
          if(limit>0&&limit<=140)return respond({limit,reason:"matched",source:"tomtom",...(debug?{diagnostics:{confidence:road.confidence,formOfWay:road.formOfWay}}:{})});
        }
      }
    }catch{ /* Use existing OSM fallback without exposing credentials. */ }
  }
  const cacheKey=[latitude.toFixed(3),longitude.toFixed(3),heading===null?"-":Math.round(heading/30),Math.round(accuracy/10)].join("|");
  const cached=roadResultCache.get(cacheKey);
  if(cached&&cached.until>Date.now())return respond({...cached.body,...(debug?{}:{diagnostics:undefined})},cached.status);
  const radius = Math.min(180, Math.max(90, Math.ceil(accuracy * 2 + 35)));
  const query = `[out:json][timeout:8];way(around:${radius},${latitude},${longitude})["highway"]["maxspeed"];out geom;`;
  const attempts: Attempt[] = await Promise.all(endpoints.map(async endpoint => {
    const provider = new URL(endpoint).hostname;
    const started = Date.now();
    if((providerCooldown.get(provider)||0)>started)return {provider,ms:0,status:null,outcome:"cooldown"};
    let status: number | null = null;
    try {
      // POST avoids long encoded query URLs rejected as HTTP 406 by some Overpass proxies.
      // Keep GET fallback for providers that do not support form POST.
      const postResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(6500),
        cache: "no-store",
      });
      const response = [405, 415, 501].includes(postResponse.status)
        ? await fetch(endpoint + "?data=" + encodeURIComponent(query), {
            method: "GET",
            headers: { "Accept": "application/json" },
            signal: AbortSignal.timeout(6500),
            cache: "no-store",
          })
        : postResponse;
      status = response.status;
      if (!response.ok) {
        if([406,429,503,504].includes(response.status))providerCooldown.set(provider,Date.now()+(response.status===429?5*60*1000:response.status===406?60*1000:30*1000));
        return { provider, ms: Date.now() - started, status, outcome: "http_error" };
      }
      providerCooldown.delete(provider);
      const payload: { elements?: OsmRoad[] } = await response.json();
      if (!Array.isArray(payload.elements)) return { provider, ms: Date.now() - started, status, outcome: "invalid_json" };
      const match = matchRoadSpeedLimit(payload.elements, { latitude, longitude, accuracy, heading });
      return { provider, ms: Date.now() - started, status, outcome: match ? "matched" : "no_reliable_match", candidates: payload.elements.length, limit: match?.limit ?? null };
    } catch (error) {
      providerCooldown.set(provider,Date.now()+60*1000);
      return { provider, ms: Date.now() - started, status, outcome: error instanceof Error ? error.name + ": " + error.message.slice(0, 100) : "unknown_error" };
    }
  }));
  // Overpass providers are often rate-limited or blocked from serverless networks.
  // Use the independent official OSM map API as a last resort, not another Overpass mirror.
  if(!attempts.some(a=>a.outcome==="matched")){
    const started=Date.now();
    try{
      const roads=await fetchOsmMapRoads(latitude,longitude,radius);
      const match=matchRoadSpeedLimit(roads,{latitude,longitude,accuracy,heading});
      attempts.push({provider:"api.openstreetmap.org",ms:Date.now()-started,status:200,outcome:match?"matched":"no_reliable_match",candidates:roads.length,limit:match?.limit??null});
    }catch(error){
      attempts.push({provider:"api.openstreetmap.org",ms:Date.now()-started,status:null,outcome:error instanceof Error?error.message.slice(0,100):"unknown_error"});
    }
  }
  const matched = attempts.find(a => a.outcome === "matched" && a.limit != null);
  const usable = attempts.some(a => a.status === 200 && (a.candidates ?? 0) > 0);
  const reason = matched ? "matched" : usable ? "no_reliable_match" : attempts.some(a=>a.status===200) ? "no_road_data" : "providers_unavailable";
  const details = attempts.map(({provider, ms, status, outcome, candidates}) => ({provider, ms, status, outcome, candidates}));
  console.info("[mobile-speed-limit] diagnostics", JSON.stringify({reason, attempts: details, accuracy: Math.round(accuracy)}));
  const body:Record<string,unknown>={limit:matched?.limit??null,reason,diagnostics:{accuracy:Math.round(accuracy),radius,providers:details}};
  const status=matched||usable?200:503;
  roadResultCache.set(cacheKey,{until:Date.now()+(matched?120000:usable?30000:20000),body,status});
  while(roadResultCache.size>MAX_ROAD_CACHE)roadResultCache.delete(roadResultCache.keys().next().value!);
  return respond(debug?body:{limit:body.limit,reason:body.reason},status);
}

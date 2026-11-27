import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const lat=Number(req.nextUrl.searchParams.get("lat")),lon=Number(req.nextUrl.searchParams.get("lon"));
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return NextResponse.json({error:"Invalid coordinates"},{status:400});
 try{
 const url=new URL("https://nominatim.openstreetmap.org/reverse");url.searchParams.set("lat",String(lat));url.searchParams.set("lon",String(lon));url.searchParams.set("format","jsonv2");url.searchParams.set("zoom","10");url.searchParams.set("addressdetails","1");
 const response=await fetch(url,{headers:{"User-Agent":"ZiiplyBetaRegistration/1.0 (contact@ziiply.fi)","Accept-Language":"fi"},signal:AbortSignal.timeout(6000),cache:"no-store"});
 if(!response.ok)throw Error("Geocoding unavailable");
 const data=await response.json();const a=data.address||{};return NextResponse.json({municipality:a.municipality||a.city||a.town||a.village||a.county||""},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({municipality:""},{headers:{"Cache-Control":"no-store"}});}
}

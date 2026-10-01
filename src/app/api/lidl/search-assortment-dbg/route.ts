import { NextRequest, NextResponse } from "next/server";
const VERSION = "LIDL-SEARCH-v7-20261001";
export async function GET(req: NextRequest) {
 const q=(req.nextUrl.searchParams.get("q")||"maito").slice(0,50);
 const variants=[{id:"FI",assortment:"FI"},{id:"fi",assortment:"fi"},{id:"FI-locale",assortment:"FI",locale:"fi_FI"},{id:"FI-language",assortment:"FI",locale:"fi-FI"}];
 const results=await Promise.all(variants.map(async variant=>{
  const url=new URL("https://www.lidl.fi/q/api/search");url.searchParams.set("q",q);url.searchParams.set("assortment",variant.assortment);if(variant.locale)url.searchParams.set("locale",variant.locale);
  try{const r=await fetch(url,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(10000)});const body=await r.text();let parsed:unknown=null;try{parsed=JSON.parse(body)}catch{}
   return {variant:variant.id,status:r.status,contentType:r.headers.get("content-type"),length:body.length,keys:parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?Object.keys(parsed).slice(0,20):[],sample:body.slice(0,1100)};
  }catch(e){return {variant:variant.id,error:String(e)}}
 }));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,q,results,note:"Public search with explicit assortment, no authentication bypass or data writes."});
}

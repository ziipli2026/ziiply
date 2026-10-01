import { NextRequest, NextResponse } from "next/server";
const VERSION="LIDL-SEARCH-v5-20261001";
export async function GET(request:NextRequest){
 const term=(request.nextUrl.searchParams.get("q")||"maito").slice(0,60);
 const variants=[
  {name:"simple",params:{q:term}},
  {name:"storefront",params:{q:term,assortment:"FI",locale:"fi_FI",currency:"EUR",version:"2.1.0"}},
  {name:"query",params:{query:term,assortment:"FI",locale:"fi_FI",currency:"EUR"}},
 ];
 const results=await Promise.all(variants.map(async variant=>{
  const url=new URL("https://www.lidl.fi/q/api/search");
  Object.entries(variant.params).forEach(([k,v])=>url.searchParams.set(k,v));
  try{
   const r=await fetch(url,{headers:{accept:"application/json","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(10000)});
   const body=await r.text();let parsed:unknown=null;
   try{parsed=JSON.parse(body)}catch{}
   const obj=parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as Record<string,unknown>:null;
   return {variant:variant.name,url:url.toString(),status:r.status,contentType:r.headers.get("content-type"),bodyLength:body.length,keys:obj?Object.keys(obj).slice(0,25):[],sample:obj?JSON.stringify(obj).slice(0,3500):body.slice(0,500)};
  }catch(e){return {variant:variant.name,error:String(e)}}
 }));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,term,results,note:"Public Lidl.fi search probes only. No authentication bypass, no third-party data, no writes."});
}

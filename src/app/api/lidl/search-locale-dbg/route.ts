import { NextRequest,NextResponse } from "next/server";
const VERSION="LIDL-SEARCH-v8-20261001";
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get("q")||"maito").slice(0,50);
 const variants=[
  {id:"locale-fi_FI",locale:"fi_FI",extra:{}},
  {id:"locale-fi_FI-currency",locale:"fi_FI",extra:{currency:"EUR"}},
  {id:"locale-fi_FI-version",locale:"fi_FI",extra:{version:"2.1.0"}},
  {id:"locale-fi_FI-currency-version",locale:"fi_FI",extra:{currency:"EUR",version:"2.1.0"}},
 ];
 const results=await Promise.all(variants.map(async v=>{
  const url=new URL("https://www.lidl.fi/q/api/search");url.searchParams.set("q",q);url.searchParams.set("assortment","FI");url.searchParams.set("locale",v.locale);Object.entries(v.extra).forEach(([k,val])=>url.searchParams.set(k,val));
  try{const r=await fetch(url,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(10000)});const body=await r.text();let data:unknown=null;try{data=JSON.parse(body)}catch{}
   return {variant:v.id,status:r.status,contentType:r.headers.get("content-type"),length:body.length,keys:data&&typeof data==="object"&&!Array.isArray(data)?Object.keys(data).slice(0,20):[],sample:body.slice(0,900)};
  }catch(e){return {variant:v.id,error:String(e)}}
 }));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,q,results});
}

import { NextRequest,NextResponse } from "next/server";
const VERSION="LIDL-SEARCH-v6-20261001";
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get("q")||"maito").slice(0,50);
 const cases=[
  {id:"accept-any",headers:{"accept":"*/*"}},
  {id:"browser",headers:{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","accept-language":"fi-FI,fi;q=0.9"}},
  {id:"json-no-language",headers:{"accept":"application/json"}},
  {id:"no-explicit-accept",headers:{}},
 ];
 const results=await Promise.all(cases.map(async c=>{
  const url=new URL("https://www.lidl.fi/q/api/search");url.searchParams.set("q",q);
  try{const r=await fetch(url,{headers:c.headers,cache:"no-store",signal:AbortSignal.timeout(10000)});
   const body=await r.text();let parsed:unknown;try{parsed=JSON.parse(body)}catch{parsed=null}
   return {case:c.id,status:r.status,contentType:r.headers.get("content-type"),length:body.length,keys:parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?Object.keys(parsed).slice(0,20):[],sample:body.slice(0,700)};
  }catch(e){return {case:c.id,error:String(e)}}
 }));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,q,results,note:"Compare standard Accept headers against public storefront search. No auth bypass or data writes."});
}

import { NextRequest,NextResponse } from "next/server";
const VERSION="LIDL-SEARCH-v11-20261001";
const tests=[{q:"maito",sort:"relevancy"},{q:"MILBONA",sort:"relevancy"},{q:"Reilun kaupan banaani",sort:"relevancy"},{q:"jauheliha",sort:"relevancy"},{q:"maito",sort:"price"}];
export async function GET(_req:NextRequest){
 const results=await Promise.all(tests.map(async t=>{
  const url=new URL("https://www.lidl.fi/q/api/search");
  for(const [k,v] of Object.entries({assortment:"FI",locale:"fi_FI",version:"v2.0.0",q:t.q,sort:t.sort,fetchsize:"100"}))url.searchParams.set(k,v);
  try{const r=await fetch(url,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});const d=await r.json();const items=Array.isArray(d.items)?d.items:[];return {q:t.q,sort:t.sort,status:r.status,numFound:d.numFound,resultType:d.resultType,masterQuery:d.masterQuery,fetchsize:d.fetchsize,facetSummary:Array.isArray(d.facets)?d.facets.map((f:any)=>({name:f.name,code:f.code})).slice(0,10):[],items:items.slice(0,15).map((i:any)=>({name:i.gridbox?.data?.fullTitle,id:i.code,ian:i.gridbox?.data?.ians,ean:i.gridbox?.data?.gs1Attributes,price:i.gridbox?.data?.price?.price,unit:i.gridbox?.data?.price?.basePrice?.text,campaign:i.gridbox?.meta?.campaignPaths?.flat()?.map((c:any)=>c.name)})),error:d.error||null};}catch(e){return {q:t.q,error:String(e)}}
 }));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,results,note:"Compare exact names, brands, sort and fetchsize on public search; no writes."});
}

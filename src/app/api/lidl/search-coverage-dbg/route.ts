import { NextRequest, NextResponse } from "next/server";
const VERSION="LIDL-SEARCH-v10-20261001";
const DEFAULT=["maito","kevytmaito","kananmuna","banaani","jauheliha","voi","kahvi","purukumi"];
export async function GET(req:NextRequest){
 const custom=req.nextUrl.searchParams.get("q");
 const queries=custom?[custom.slice(0,50)]:DEFAULT;
 const results=await Promise.all(queries.map(async q=>{
  const url=new URL("https://www.lidl.fi/q/api/search");
  for(const [k,v] of Object.entries({assortment:"FI",locale:"fi_FI",version:"v2.0.0",q}))url.searchParams.set(k,v);
  try{
   const r=await fetch(url,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});
   const data=await r.json();const items=Array.isArray(data.items)?data.items:[];
   return {q,status:r.status,numFound:data.numFound,itemCount:items.length,items:items.slice(0,12).map((item:any)=>{const d=item.gridbox?.data||{};return {id:item.code,name:d.fullTitle,subtitle:d.keyfacts?.supplementalDescription,price:d.price?.price,unit:d.price?.basePrice?.text,eanFields:d.gs1Attributes,ians:d.ians,availability:d.stockAvailability?.badgeInfo?.badges?.map((b:any)=>b.text),campaigns:item.gridbox?.meta?.campaignPaths?.flat()?.map((c:any)=>c.name)};}),error:data.error||null};
  }catch(e){return {q,error:String(e)}}
 }));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,results,note:"Coverage check of Lidl public product search. No EAN bank or application writes."});
}

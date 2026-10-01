import { NextRequest,NextResponse } from "next/server";
const VERSION="LIDL-SEARCH-v9-20261001";
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get("q")||"maito").slice(0,60);
 const url=new URL("https://www.lidl.fi/q/api/search");
 for(const [k,v] of Object.entries({assortment:"FI",locale:"fi_FI",version:"v2.0.0",q}))url.searchParams.set(k,v);
 try{
  const r=await fetch(url,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});
  const data=await r.json();
  const items=Array.isArray(data.items)?data.items:[];
  return NextResponse.json({debugVersion:VERSION,readOnly:true,status:r.status,q,numFound:data.numFound,itemCount:items.length,items:items.slice(0,12),note:"Read-only public Lidl search; item details for evaluating fields and EAN. No application or bank writes."});
 }catch(e){return NextResponse.json({debugVersion:VERSION,error:String(e)},{status:502})}
}

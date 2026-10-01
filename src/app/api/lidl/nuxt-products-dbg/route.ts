import { NextRequest, NextResponse } from "next/server";
const VERSION = "LIDL-NUXT-v3-20261001";
export async function GET(request: NextRequest) {
 const url="https://www.lidl.fi/h/lihat/h10095752";
 try {
  const response=await fetch(url,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});
  const html=await response.text();
  const match=html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!match) return NextResponse.json({debugVersion:VERSION,ok:false,reason:"NUXT_DATA missing",upstreamStatus:response.status},{status:502});
  const a:unknown[]=JSON.parse(match[1]);
  const deref=(i:unknown)=>typeof i==="number" && Number.isInteger(i) && i>=0 && i<a.length?a[i]:null;
  const productRows=a.flatMap((v,index)=>{
   if(!v||typeof v!=="object"||Array.isArray(v)||!("gridBoxData" in v))return [];
   const d=deref((v as Record<string,unknown>).gridBoxData);
   if(!d||typeof d!=="object"||Array.isArray(d))return [];
   const p=d as Record<string,unknown>;
   const price=deref(p.price);
   const priceObj=price&&typeof price==="object"&&!Array.isArray(price)?price as Record<string,unknown>:{};
   const gs1=deref(p.gs1Attributes);
   const regions=deref(p.regionsPrices);
   return [{index,productIndex:(v as Record<string,unknown>).gridBoxData,
    title:deref(p.fullTitle),shortTitle:deref(p.title),productId:deref(p.productId),itemId:deref(p.itemId),
    price:deref(priceObj.price),basePrice:deref(priceObj.basePrice),oldPrice:deref(priceObj.oldPrice),
    gs1Attributes:gs1,regionsPrices:regions,canonicalPath:deref(p.canonicalPath),
    priceKeys:Object.keys(priceObj),gs1Reference:p.gs1Attributes,regionsReference:p.regionsPrices}];
  });
  return NextResponse.json({debugVersion:VERSION,ok:response.ok,upstreamStatus:response.status,nuxtEntries:a.length,productCount:productRows.length,products:productRows.slice(0,20),note:"Read-only public Lidl.fi Nuxt array dereference. Values are site catalog values, not verified store-specific shelf prices or EANs."});
 }catch(e){return NextResponse.json({debugVersion:VERSION,ok:false,error:String(e)},{status:502});}
}

import { NextResponse } from "next/server";
const VERSION="LIDL-DETAIL-v4-20261001";
export async function GET() {
 const paths=["/p/snellman-kotimainen-palvikinkku/p10037649","/p/kanamestari-kanan-sisafilee/p10038247","/p/atria-nauta-viljapossujauheliha/p10038264"];
 const results=await Promise.all(paths.map(async path=>{
  try{
   const r=await fetch("https://www.lidl.fi"+path,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});
   const html=await r.text();const m=html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
   const a:unknown[]=m?JSON.parse(m[1]):[];
   const interesting=a.flatMap((v,i)=>{
    if(!v||typeof v!=="object"||Array.isArray(v))return [];
    const o=v as Record<string,unknown>;const keys=Object.keys(o).filter(k=>/gtin|ean|barcode|gs1|productId|itemId|price|title|region|article|ian/i.test(k));
    if(!keys.length)return [];
    return [{index:i,fields:Object.fromEntries(keys.slice(0,20).map(k=>[k,typeof o[k]==="number" && Number.isInteger(o[k]) && (o[k] as number)>=0 && (o[k] as number)<a.length?{ref:o[k],value:a[o[k] as number]}:o[k]]))}];
   });
   const jsonLd=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].slice(0,4).map(x=>{try{return JSON.parse(x[1])}catch{return null}});
   return {path,status:r.status,nuxtEntries:a.length,fields:interesting.slice(0,25),jsonLd};
  }catch(e){return {path,error:String(e)}}
 }));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,results,note:"Public product detail inspection. No EAN-bank writes, no third-party sources; prices not verified as local shelf prices."});
}

import {NextResponse} from "next/server";
const VERSION="LIDL-CATEGORIES-v13-20261001";
const paths=["/h/lihat/h10095752","/h/makeiset-ja-snacksit/h10096205","/h/hedelmaet-ja-vihannekset/h10071012","/h/valmisruoat/h10071020"];
export async function GET(){
 const results=await Promise.all(paths.map(async path=>{
  try{const r=await fetch("https://www.lidl.fi"+path,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});const html=await r.text();const m=html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);if(!m)return {path,status:r.status,error:"NUXT_DATA missing"};
  const a:unknown[]=JSON.parse(m[1]);const deref=(i:unknown)=>typeof i==="number"&&Number.isInteger(i)&&i>=0&&i<a.length?a[i]:null;
  const products=a.flatMap(v=>{if(!v||typeof v!=="object"||Array.isArray(v)||!("gridBoxData" in v))return [];const d=deref((v as Record<string,unknown>).gridBoxData);if(!d||typeof d!=="object"||Array.isArray(d))return [];const p=d as Record<string,unknown>;const pr=deref(p.price);const price=pr&&typeof pr==="object"&&!Array.isArray(pr)?pr as Record<string,unknown>:{};return [{id:deref(p.productId),name:deref(p.fullTitle),ian:deref(p.ians),gs1:deref(p.gs1Attributes),price:deref(price.price),basePrice:deref(price.basePrice),path:deref(p.canonicalPath)}]});return {path,status:r.status,count:products.length,products:products.slice(0,40)};
  }catch(e){return {path,error:String(e)}}}));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,results,note:"Category Nuxt coverage and product identifiers; no database writes."});
}

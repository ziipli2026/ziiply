import {NextResponse} from "next/server";
const VERSION="LIDL-CATEGORIES-v14-20261001";
const paths=["/h/lihat/h10095752","/h/makeiset-ja-snacksit/h10096205","/h/hedelmaet-ja-vihannekset/h10071012","/h/valmisruoat/h10071020"];
export async function GET(){
 const results=await Promise.all(paths.map(async path=>{
  try{const r=await fetch("https://www.lidl.fi"+path,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});const html=await r.text();const m=html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);if(!m)return {path,status:r.status,error:"NUXT_DATA missing"};
  const a:unknown[]=JSON.parse(m[1]);const deref=(i:unknown)=>typeof i==="number"&&Number.isInteger(i)&&i>=0&&i<a.length?a[i]:null;
  const products=a.flatMap(v=>{if(!v||typeof v!=="object"||Array.isArray(v)||!("gridBoxData" in v))return [];const d=deref((v as Record<string,unknown>).gridBoxData);if(!d||typeof d!=="object"||Array.isArray(d))return [];const p=d as Record<string,unknown>;const pr=deref(p.price);const price=pr&&typeof pr==="object"&&!Array.isArray(pr)?pr as Record<string,unknown>:{};return [{id:deref(p.productId),name:deref(p.fullTitle),ian:(()=>{const x=deref(p.ians);return Array.isArray(x)?x.map(deref):x})(),gs1:(()=>{const x=deref(p.gs1Attributes);return Array.isArray(x)?x.map(deref):x})(),price:deref(price.price),basePrice:(()=>{const x=deref(price.basePrice);if(!x||typeof x!=="object"||Array.isArray(x))return x;return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,deref(v)]))})(),path:deref(p.canonicalPath)}]});return {path,status:r.status,count:products.length,products:products.slice(0,40)};
  }catch(e){return {path,error:String(e)}}}));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,results,note:"Category Nuxt coverage and product identifiers; no database writes."});
}

import {NextResponse} from "next/server";
import {gunzipSync} from "node:zlib";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
export const runtime="nodejs";
export const maxDuration=300;
export async function GET(){try{
 const sr=await fetch("https://www.lidl.fi/p/export/FI/fi/product_sitemap.xml.gz",{cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!sr.ok)throw Error("sitemap HTTP "+sr.status);
 const b=Buffer.from(await sr.arrayBuffer());const xml=(b[0]===31&&b[1]===139?gunzipSync(b):b).toString("utf8");
 const urls=[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1]);
 const catalog=JSON.parse(await readFile(join(process.cwd(),"data/lidl/official-catalog-merged-2026-10-01.json"),"utf8"));
 const known=new Set<string>(catalog.records.map((x:{lidlProductId:string})=>String(x.lidlProductId)));
 const missing=urls.filter(u=>{const id=u.match(/\/p(\d+)(?:[/?]|$)/)?.[1];return id&&!known.has(id)});
 const results:Array<Record<string,unknown>>=[];
 const resolve=(data:unknown[],x:unknown):unknown=>{const v=typeof x==="number"&&Number.isInteger(x)&&x>=0&&x<data.length?data[x]:x;return Array.isArray(v)?v.map(y=>typeof y==="number"&&y>=0&&y<data.length?data[y]:y):v};
 for(let offset=0;offset<missing.length;offset+=10){
  const group=await Promise.all(missing.slice(offset,offset+10).map(async url=>{
   const id=url.match(/\/p(\d+)(?:[/?]|$)/)?.[1]||null;
   try{
    const response=await fetch(url,{cache:"no-store",headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},signal:AbortSignal.timeout(10000)});
    const html=await response.text();const raw=html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];const data:unknown[]=raw?JSON.parse(raw):[];
    const p=data.find(x=>x&&typeof x==="object"&&!Array.isArray(x)&&"productId"in x&&"eans"in x) as Record<string,unknown>|undefined;
    const price=p?resolve(data,p.price):null;const pr=price&&typeof price==="object"&&!Array.isArray(price)?price as Record<string,unknown>:null;const value=pr?resolve(data,pr.price):null;
    return {lidlProductId:id,url,status:response.status,name:html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.replace(/\s*\| Lidl\s*$/,"")||null,ian:p?resolve(data,p.ians):null,ean:p?resolve(data,p.eans):null,gs1Attributes:p?resolve(data,p.gs1Attributes):null,displayedPriceEur:typeof value==="number"?value:null,hasProduct:!!p,source:"lidl.fi official product sitemap and public product page",observedDate:"2026-10-01"};
   }catch(e){return{lidlProductId:id,url,error:String(e)}}
  }));results.push(...group);
 }
 const failures=results.filter(x=>x.error||x.status!==200||!x.hasProduct).length;
 return new NextResponse(JSON.stringify({schemaVersion:1,debugVersion:"LIDL-SITEMAP-CONSOLIDATED-v43-20261001",readOnly:true,totalMissing:missing.length,processed:results.length,failures,records:results},null,2),{headers:{"content-type":"application/json; charset=utf-8","content-disposition":'attachment; filename="lidl-official-sitemap-harvest-v43.json"',"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({debugVersion:"LIDL-SITEMAP-CONSOLIDATED-v43-20261001",error:String(e)},{status:500})}}

import {NextResponse} from "next/server";
const V="LIDL-CATEGORY-API-v26-20261001";
const root="https://www.lidl.fi";
const paths=[
["dry-id","/q/api/category?assortment=FI&locale=fi_FI&version=v2.0.0&categoryId=10096095"],
["dry-path","/q/api/category?assortment=FI&locale=fi_FI&version=v2.0.0&pageId=10068374%2F10096095"],
["meat-id","/q/api/category?assortment=FI&locale=fi_FI&version=v2.0.0&categoryId=10095752"],
["dry-id-offset","/q/api/category?assortment=FI&locale=fi_FI&version=v2.0.0&categoryId=10096095&offset=7&fetchsize=20"],
["dry-path-offset","/q/api/category?assortment=FI&locale=fi_FI&version=v2.0.0&pageId=10068374%2F10096095&offset=7&fetchsize=20"],
["dry-url","/q/api/category?assortment=FI&locale=fi_FI&version=v2.0.0&category=%2Fh%2Fkuivatuotteet%2Fh10096095"]];
export async function GET(){const results=await Promise.all(paths.map(async ([name,path])=>{try{const r=await fetch(root+path,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(9000)});const t=await r.text();let j:Record<string,unknown>|null=null;try{j=JSON.parse(t)}catch{}const items=Array.isArray(j?.items)?j.items as Array<Record<string,unknown>>:[];return{name,status:r.status,contentType:r.headers.get("content-type"),length:t.length,type:j?.type,numFound:j?.numFound,offset:j?.offset,fetchsize:j?.fetchsize,keys:j?Object.keys(j):[],itemsCount:items.length,first:items.slice(0,4).map(x=>({code:x.code,title:(x.gridbox as {data?:{fullTitle?:string}}|undefined)?.data?.fullTitle})),sample:j?null:t.slice(0,180)}}catch(e){return{name,error:String(e)}}}));return NextResponse.json({debugVersion:V,readOnly:true,results})}

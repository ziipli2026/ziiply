import {NextResponse} from "next/server";
const V="LIDL-CATEGORY-REQUEST-v32-20261001";
const base="https://www.lidl.fi";
const q="assortment=FI&locale=fi_FI&version=v2.1.0&fetchsize=20&offset=0";
const paths=[
["path-id","/q/api/category/10096095?"+q],
["path-id-v2","/q/api/category/10096095?"+q.replace("v2.1.0","v2.0.0")],
["path-id-query","/q/api/category/10096095?"+q+"&category.id=10096095"],
["path-name-id","/q/api/category/kuivatuotteet/10096095?"+q],
["query-category-dot","/q/api/category?"+q+"&category.id=10096095"],
["search-category-dot","/q/api/search?"+q+"&category.id=10096095"],
["path-id-page","/q/api/category/10096095?"+q+"&pageId=10068374%2F10096095"],
["path-id-alt","/q/api/category/h10096095?"+q]
];
export async function GET(){const results=await Promise.all(paths.map(async ([name,path])=>{try{const r=await fetch(base+path,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(9000)});const t=await r.text();let j:Record<string,unknown>|null=null;try{j=JSON.parse(t)}catch{}const items=Array.isArray(j?.items)?j.items as Record<string,unknown>[]:[];return{name,status:r.status,length:t.length,keys:j?Object.keys(j):[],numFound:j?.numFound,count:items.length,first:items.slice(0,3).map(x=>({code:x.code,title:(x.gridbox as {data?:{fullTitle?:string}}|undefined)?.data?.fullTitle})),error:r.ok?null:j?.message??t.slice(0,100)}}catch(e){return{name,error:String(e)}}}));return NextResponse.json({debugVersion:V,readOnly:true,results})}

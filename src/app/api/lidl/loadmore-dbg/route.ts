import {NextResponse} from "next/server";
const VERSION="LIDL-LOADMORE-v19-20261001";
export async function GET(){
const pages=[["kuivatuotteet","/h/kuivatuotteet/h10096095"],["lihat","/h/lihat/h10095752"]];
const results=[];
for(const [category,path] of pages){
try{const r=await fetch("https://www.lidl.fi"+path,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});const html=await r.text();const m=html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);if(!m){results.push({category,status:r.status,error:"no Nuxt"});continue}const data:unknown[]=JSON.parse(m[1]);const d=(v:unknown)=>typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<data.length?data[v]:v;const inspect=(index:number)=>{const o=data[index];if(!o||typeof o!=="object"||Array.isArray(o))return {index,value:o};return {index,fields:Object.fromEntries(Object.entries(o as Record<string,unknown>).map(([k,v])=>[k,{raw:v,resolved:d(v)}]))}};const selected=[92,93,94,95,96,97,98,99,100,101,102,103];const relevant=data.map((v,i)=>({v,i})).filter(({v})=>v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).some(k=>/fetchSize|paginationType|totalHits|totalCount|searchApi|nextPage|pageSize|categoryPath|queryParams/i.test(k))).slice(0,20).map(({i})=>inspect(i));results.push({category,status:r.status,selected:selected.map(inspect),relevant,htmlApiContext:[...html.matchAll(/.{0,100}\/q\/api\/(?:search|gridboxes).{0,160}/g)].slice(0,4).map(x=>x[0]),htmlLoadMoreContext:[...html.matchAll(/.{0,80}(?:loadMore|fetchSize|paginationType).{0,120}/g)].slice(0,5).map(x=>x[0])})}catch(e){results.push({category,error:String(e)})}}
return NextResponse.json({debugVersion:VERSION,readOnly:true,results});
}

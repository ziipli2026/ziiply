import {NextResponse} from "next/server";
const V="LIDL-PAGINATION-v18-20261001";
const pages=[["kuivatuotteet","/h/kuivatuotteet/h10096095"],["lihat","/h/lihat/h10095752"],["kotitalous","/h/kotitalous/h10096287"]];
export async function GET(){
const results=[];
for(const [category,path] of pages){
try{
const response=await fetch("https://www.lidl.fi"+path,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});
const html=await response.text();const match=html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
if(!match){results.push({category,status:response.status,error:"NUXT_DATA missing"});continue}
const data:unknown[]=JSON.parse(match[1]);
const deref=(v:unknown):unknown=>typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<data.length?data[v]:null;
const interesting:Array<{index:number;keys:string[];values:Record<string,unknown>}>=[];
for(let i=0;i<data.length;i++){const x=data[i];if(!x||typeof x!=="object"||Array.isArray(x))continue;const o=x as Record<string,unknown>;const keys=Object.keys(o);if(!keys.some(k=>/pagination|pageSize|total|loadMore|gridBox|productCount|filter|sort|listing|search/i.test(k)))continue;const values:Record<string,unknown>={};for(const [k,v] of Object.entries(o)){if(/pagination|pageSize|total|loadMore|productCount|currentPage|pageNumber|offset|limit|gridBox/i.test(k)) {const d=deref(v);values[k]=typeof d==="object"&&d!==null?JSON.stringify(d).slice(0,350):d;}}interesting.push({index:i,keys,values});}
const urls=[...new Set([...html.matchAll(/(?:https?:[^"' <>\\]+|\/q\/api\/[^"' <>\\]+)/g)].map(m=>m[0]).filter(s=>/search|gridbox|pagination|product|category/i.test(s)))].slice(0,25);
const gridCount=interesting.filter(x=>x.keys.includes("gridBoxData")).length;
results.push({category,status:response.status,htmlLength:html.length,nuxtEntries:data.length,gridCount,interesting:interesting.filter(x=>!x.keys.includes("gridBoxData")).slice(0,35),urls,hasShowMore:/näytä lisää|load.more|show.more/i.test(html)});
}catch(e){results.push({category,error:String(e)})}
}
return NextResponse.json({debugVersion:V,readOnly:true,results,note:"Inspect public category pagination and Nuxt listing metadata only; no DB writes."});
}

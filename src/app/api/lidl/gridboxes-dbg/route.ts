import {NextResponse} from "next/server";
const VERSION="LIDL-GRIDBOX-v12-20261001";
export async function GET(){
 const variants=[
  {id:"category-id",params:{assortment:"FI",locale:"fi_FI",version:"v2.0.0",category:"10095752"}},
  {id:"category-path",params:{assortment:"FI",locale:"fi_FI",version:"v2.0.0",categoryPath:"/h/lihat/h10095752"}},
  {id:"category-code",params:{assortment:"FI",locale:"fi_FI",version:"v2.0.0",categoryId:"10095752"}}
 ];
 const results=await Promise.all(variants.map(async v=>{const u=new URL("https://www.lidl.fi/q/api/gridboxes");Object.entries(v.params).forEach(([k,val])=>u.searchParams.set(k,val));try{const r=await fetch(u,{headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(10000)});const body=await r.text();let data:unknown;try{data=JSON.parse(body)}catch{data=null}return {variant:v.id,status:r.status,contentType:r.headers.get("content-type"),length:body.length,keys:data&&typeof data==="object"&&!Array.isArray(data)?Object.keys(data).slice(0,15):[],sample:body.slice(0,500)}}catch(e){return {variant:v.id,error:String(e)}}}));
 return NextResponse.json({debugVersion:VERSION,readOnly:true,results,note:"Official public category gridboxes probe, no writes."});
}

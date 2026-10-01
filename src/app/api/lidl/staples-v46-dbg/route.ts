/** Read-only official Lidl staple discovery, intentionally separate from Ziiply production. */
import {NextResponse} from "next/server";
export const runtime="nodejs";
export const maxDuration=60;
const categories=[
 {label:"maidot-ja-kermat",id:"10096075",slug:"maidot-ja-kermat"},
 {label:"jogurtit-ja-rahkat",id:"10096076",slug:"jogurtit-ja-rahkat"},
 {label:"juustot",id:"10096077",slug:"juustot"},
 {label:"riisit-pastat-palkokasvit",id:"10096096",slug:"riisit-pastat-ja-palkokasvit"},
 {label:"naudanlihat",id:"10095754",slug:"naudanlihat"},
 {label:"kuivatuotteet",id:"10096095",slug:"kuivatuotteet"},
 {label:"hedelmat-vihannekset",id:"10071012",slug:"hedelmaet-ja-vihannekset"},
 {label:"leivat",id:"10096086",slug:"paistopiste-leivaet-ja-leivonnaiset"}
];
const terms=["maito","kananmuna","voi","pasta","jauheliha","riisi","kerma","juusto"];
export async function GET(){
 const common="assortment=FI&locale=fi_FI&version=v2.1.0&fetchsize=60&offset=0";
 const targets=[
 ...categories.map(c=>({type:"category",label:c.label,url:`https://www.lidl.fi/q/api/category/${c.slug}/${c.id}?${common}`})),
 ...terms.map(q=>({type:"search",label:q,url:`https://www.lidl.fi/q/api/search?${common}&q=${encodeURIComponent(q)}`}))
 ];
 const result=await Promise.all(targets.map(async t=>{try{
  const r=await fetch(t.url,{cache:"no-store",headers:{accept:"*/*","accept-language":"fi-FI,fi;q=0.9"},signal:AbortSignal.timeout(12000)});
  if(!r.ok)return{type:t.type,label:t.label,status:r.status,products:[]};
  const j=await r.json();const items=Array.isArray(j.items)?j.items:[];
  return{type:t.type,label:t.label,status:r.status,numFound:j.numFound??null,products:items.map((x:Record<string,unknown>)=>{
   const grid=x.gridbox as Record<string,unknown>|undefined;const data=grid?.data as Record<string,unknown>|undefined;
   const price=data?.price as Record<string,unknown>|undefined;
   return{id:data?.productId??null,name:data?.fullTitle??null,price:price?.price??null,ians:data?.ians??[],canonicalPath:data?.canonicalPath??null};
  }).filter((x:{id:unknown})=>x.id!==null)};
 }catch(e){return{type:t.type,label:t.label,error:String(e),products:[]}}}));
 return NextResponse.json({debugVersion:"LIDL-STAPLES-v46-20261001",readOnly:true,source:"lidl.fi official public API",note:"Search relevance may be broad; these results do not verify current local inventory or checkout prices.",result},{headers:{"cache-control":"no-store"}});
}

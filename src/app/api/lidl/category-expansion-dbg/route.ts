import {NextResponse} from "next/server";
const VERSION="LIDL-CATEGORIES-v15-20261001";
const categories=[
["maitotuotteet","/h/juustot-maitotuotteet-ja-kananmunat/h10095761"],
["kuivatuotteet","/h/kuivatuotteet/h10096095"],
["leivat","/h/paistopiste-leivaet-ja-leivonnaiset/h10096086"],
["lihat","/h/lihat/h10095752"],
["makeiset","/h/makeiset-ja-snacksit/h10096205"],
["hedelmat","/h/hedelmaet-ja-vihannekset/h10071012"],
["valmisruoat","/h/valmisruoat/h10071020"]
] as const;
export async function GET(){
const results=[];
for(const [category,path] of categories){
try{
const response=await fetch("https://www.lidl.fi"+path,{headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});
const html=await response.text();
const match=html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
if(!match){results.push({category,path,status:response.status,error:"NUXT_DATA missing"});continue}
const data:unknown[]=JSON.parse(match[1]);
const deref=(v:unknown):unknown=>typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<data.length?data[v]:null;
const products=[];
for(const value of data){
if(!value||typeof value!=="object"||Array.isArray(value)||!("gridBoxData" in value))continue;
const raw=deref((value as Record<string,unknown>).gridBoxData);
if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
const p=raw as Record<string,unknown>;
const priceRaw=deref(p.price);
const price=priceRaw&&typeof priceRaw==="object"&&!Array.isArray(priceRaw)?priceRaw as Record<string,unknown>:{};
const ians=deref(p.ians);
const gs1=deref(p.gs1Attributes);
const base=deref(price.basePrice);
const baseObj=base&&typeof base==="object"&&!Array.isArray(base)?base as Record<string,unknown>:{};
products.push({id:deref(p.productId),name:deref(p.fullTitle),ian:Array.isArray(ians)?ians.map(deref):[],gs1:Array.isArray(gs1)?gs1.map(deref):[],price:deref(price.price),unitPriceText:deref(baseObj.text),path:deref(p.canonicalPath)});
}
results.push({category,path,status:response.status,count:products.length,products});
}catch(error){results.push({category,path,error:String(error)})}
}
return NextResponse.json({debugVersion:VERSION,readOnly:true,results,note:"Official public Lidl category product observations only. IAN is not EAN. No database writes."});
}

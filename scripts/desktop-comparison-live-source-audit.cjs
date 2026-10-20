// Live upstream diagnostic: no Vercel authentication or deployment needed.
const {setTimeout:delay}=require("node:timers/promises");
const stores=[{name:"Prisma Hyvinkää",id:292},{name:"K-Citymarket Hyvinkää",id:3221}];
const products=[
 {name:"Kotimaista Silakkafilee MSC 250 g",queries:["silakkafilee","silakka"]},
 {name:"Xtra väkiviinaetikka 750 ml",queries:["väkiviinaetikka","etikka"]},
 {name:"JOZO 1kg Hieno suola jodioitu",queries:["JOZO suola","suola"]},
 {name:"Sokeriherne 150 g",queries:["sokeriherne"]},
 {name:"tilli 30 g",queries:["tilli"]},
 {name:"Meira valkopippuri",queries:["Meira valkopippuri"]},
 {name:"Meira maustepippuri",queries:["Meira maustepippuri"]}
];
const normalize=s=>String(s||"").toLocaleLowerCase("fi").replace(/[^a-zåäö0-9]+/g," ").trim();
const size=s=>{const m=String(s||"").toLowerCase().replace(/,/g,".").match(/(\d+(?:\.\d+)?)\s*(kg|g|l|dl|ml)\b/);return m?Number(m[1])*(m[2]==="kg"||m[2]==="l"?1000:m[2]==="dl"?100:1):null};
(async()=>{
 let failures=0,requests=0,withItems=0;
 for(const store of stores){
  for(const item of products){
   let found=[];
   for(const search of item.queries){
    const url=new URL("https://api.ruoanhinta.fi/api/items");
    url.searchParams.set("search",search);url.searchParams.set("storeIds",String(store.id));url.searchParams.set("skip","0");url.searchParams.set("take","100");
    try{
     const response=await fetch(url,{headers:{accept:"application/json"},signal:AbortSignal.timeout(18000)});
     requests++;
     if(!response.ok){console.log("HTTP_ERROR",JSON.stringify({store:store.name,search,status:response.status}));failures++;continue}
     const data=await response.json();
     const items=Array.isArray(data.items)?data.items:[];
     console.log("UPSTREAM",JSON.stringify({store:store.name,storeId:store.id,search,count:items.length,total:data.totalCount??data.total??null}));
     found.push(...items);
    }catch(e){failures++;console.log("NETWORK_ERROR",JSON.stringify({store:store.name,search,error:String(e)}))}
    await delay(150);
   }
   const unique=[...new Map(found.map(p=>[p.id??p.ean??p.name,p])).values()];
   if(unique.length)withItems++;
   console.log("PRODUCT_DIAGNOSTIC",JSON.stringify({store:store.name,source:item.name,candidateCount:unique.length,candidates:unique.slice(0,12).map(p=>({name:p.name,ean:p.ean||p.gtin||p.externalId||null,price:p.storeItems?.[0]?.price??null,sameSize:size(p.name)===size(item.name),normalizedName:normalize(p.name)}))}));
  }
 }
 console.log("SUMMARY",JSON.stringify({requests,withItems,groups:stores.length*products.length,failures}));
 if(!requests||failures===requests)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

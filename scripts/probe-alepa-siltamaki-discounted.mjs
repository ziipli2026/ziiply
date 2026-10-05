// Read-only Siltamaki discounted-product probe. No production imports or writes.
const storeId="725796790";
const limit=48;
const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const hash="85a4eed2f0a1e3269ac49b94276ca952922568369d85ddd5dcee34481e4c0f91";
const clientVersion="production-add4ac0e6ec7f03f2c5373a6ebfab2b63df73f68";
const apolloVersion="4.3.1";
const all=[];
const pages=[];
for(let from=0;from<2000;from+=limit){
 const variables={availabilityDate:date,facets:[{key:"brandName",order:"asc"},{key:"category"},{key:"labels"}],filters:[{key:"labels",value:["DISCOUNTED"]}],generatedSessionId:"1d6b5de9-df99-4608-af07-7d754955df82",fetchSponsoredContent:true,from,offset:from,skip:from,page:Math.floor(from/limit)+1,limit,queryString:"",sortForAvailabilityLabelDate:date,storeId,useRandomId:false,marketingId:"d0bcc6e5-6130-494e-b6fb-12b5cb9c60cf"};
 const extensions={clientLibrary:{name:"@apollo/client",version:apolloVersion},persistedQuery:{version:1,sha256Hash:hash}};
 const u=new URL("https://api.s-kaupat.fi/");u.searchParams.set("operationName","RemoteFilteredProducts");u.searchParams.set("variables",JSON.stringify(variables));u.searchParams.set("extensions",JSON.stringify(extensions));
 const r=await fetch(u,{headers:{accept:"application/json","accept-language":"fi",origin:"https://www.s-kaupat.fi",referer:"https://www.s-kaupat.fi/","x-client-name":"skaupat-web","x-client-version":clientVersion}});
 const body=await r.json(); if(!r.ok||body.errors){console.log(JSON.stringify({http:r.status,errors:body.errors}));process.exit(1);}
 const root=body?.data?.store?.products??{}; const items=Array.isArray(root.productListItems)?root.productListItems:[];
 const total=Number(root.total??0); pages.push({requestedFrom:from,responseFrom:root.from,limit:root.limit,total,raw:items.length});
 all.push(...items);
 if(items.length===0||from+limit>=total) break;
}
const eans=all.map(x=>String(x?.product?.ean??x?.ean??"").trim()).filter(Boolean);
console.log(JSON.stringify({storeId,date,pages,raw:all.length,uniqueEAN:new Set(eans).size,sampleEAN:eans.slice(0,10)},null,2));

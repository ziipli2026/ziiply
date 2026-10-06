import { fetchTokmanniOffers } from "../src/app/components/ziiply/offerSearch/providers/tokmanniProvider";
const rows=await fetchTokmanniOffers();
console.log(JSON.stringify({count:rows.length,priced:rows.filter((x:any)=>Number.isFinite(Number(x.price))).length,campaignTypes:[...new Set(rows.map((x:any)=>x.campaignType))],samples:rows.slice(0,5).map((x:any)=>({name:x.name,price:x.price,normalPrice:x.normalPrice,campaignType:x.campaignType}))},null,2));
if(rows.length<180) process.exit(3);

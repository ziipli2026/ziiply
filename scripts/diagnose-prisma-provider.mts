import { fetchPrismaCampaignOffersV1 } from "../src/app/components/ziiply/offerSearch/providers/skaupatPrismaCampaignProvider";
const results=await fetchPrismaCampaignOffersV1("__ziiply_all_offers__",{id:"skaupat",chain:"S",storeLabel:"Prisma Hämeenlinna",url:"https://www.s-kaupat.fi"},"Prisma Hämeenlinna");
const target=["2396257900001","6438460181269"];
console.log(JSON.stringify({total:results.length,target:target.map(ean=>({ean,found:results.some(r=>String((r as {ean?:string}).ean)===ean),item:results.find(r=>String((r as {ean?:string}).ean)===ean)})),categories:[...new Set(results.map(r=>(r as {category?:string}).category))]}));
if(!results.length || target.some(ean=>!results.some(r=>String((r as {ean?:string}).ean)===ean)))process.exitCode=1;

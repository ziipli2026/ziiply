import { NextResponse } from "next/server";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { searchSelectedSKaupatOffersV11, searchKSupermarketOffers, searchKMarketOffers } from "@/app/components/ziiply/offerSearch/ziiplyOfferSearchSources";
import eurosparFeed from "@/app/components/ziiply/offerSearch/providers/eurospar-feed.json";

export const dynamic = "force-dynamic";
const MASTER="__ziiply_all_offers__";

async function measure(chain:string,source:string,task:()=>Promise<any[]>){
  try{
    const rows=await task();
    const real=rows.filter((x:any)=>!String(x?.title??"").startsWith("ETPROV "));
    const missingPrice=real.filter((x:any)=>!String(x?.priceText??x?.price??"").trim()).length;
    const missingImage=real.filter((x:any)=>!String(x?.imageUrl??x?.image??"").trim()).length;
    const missingCategory=real.filter((x:any)=>!String(x?.category??x?.mainCategory??"").trim()).length;
    const ok=real.length>0;
    await recordPublicationRun({chain,source,ok,count:real.length,outcome:ok?"parser-health-ok":"parser-health-empty",details:{missingPrice,missingImage,missingCategory}});
    return {chain,source,ok,count:real.length,missingPrice,missingImage,missingCategory};
  }catch(error){
    await recordPublicationRun({chain,source,ok:false,count:0,outcome:"parser-health-error",details:{error:String(error).slice(0,300)}}).catch(()=>undefined);
    return {chain,source,ok:false,count:0,error:String(error)};
  }
}
export async function GET(request:Request){
  if(process.env.CRON_SECRET && request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ok:false},{status:401});
  const results=[];
  results.push(await measure("S","s-prisma-hyvinkaa",()=>searchSelectedSKaupatOffersV11(MASTER,{storeName:"Prisma Hyvinkää",sStoreName:"Prisma Hyvinkää"} as any)));
  results.push(await measure("K-SUPERMARKET","k-supermarket-jokela",()=>searchKSupermarketOffers(MASTER,{storeName:"K-Supermarket Jokela",kStoreName:"K-Supermarket Jokela",storeId:"ji1luTAL",kStoreId:"ji1luTAL"} as any)));
  results.push(await measure("K-MARKET","k-market-hakalantori",()=>searchKMarketOffers(MASTER,{storeName:"K-Market Hakalantori",kStoreName:"K-Market Hakalantori",storeId:"aETRYhoN",kStoreId:"aETRYhoN"} as any)));
  const sparOffers=Array.isArray((eurosparFeed as any).offers)?(eurosparFeed as any).offers:[];
  const sparHealthy=Boolean((eurosparFeed as any).healthy)&&sparOffers.length>0;
  await recordPublicationRun({chain:"TOKMANNI-SPAR",source:"eurospar-validated-feed",ok:sparHealthy,count:sparOffers.length,outcome:sparHealthy?"validated-feed-ok":"validated-feed-empty-or-unhealthy",details:{issue:(eurosparFeed as any).issue,validity:(eurosparFeed as any).validity,missingPrice:sparOffers.filter((x:any)=>!x.offerPrice).length,missingImage:sparOffers.filter((x:any)=>!x.imageUrl).length,missingCategory:sparOffers.filter((x:any)=>!x.category).length}});
  results.push({chain:"TOKMANNI-SPAR",source:"eurospar-validated-feed",ok:sparHealthy,count:sparOffers.length});
  return NextResponse.json({ok:results.every(x=>x.ok),results});
}

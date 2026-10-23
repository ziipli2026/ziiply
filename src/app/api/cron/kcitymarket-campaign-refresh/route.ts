import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { probeKCitymarketStoreOffers } from "@/app/components/ziiply/offerSearch/providers/kCitymarketStoreOffersProvider";
import { NextRequest, NextResponse } from "next/server";
import { refreshKCitymarketCampaignCache, fetchKCitymarketSelectedStoreOffers } from "@/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  try {
    const probe = await probeKCitymarketStoreOffers({storeId:"k-citymarket-hyvinkaa",endpoint:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa"});
    const result = await refreshKCitymarketCampaignCache("K-Citymarket Hyvinkää");
    const active = await fetchKCitymarketSelectedStoreOffers("K-Citymarket Hyvinkää");
    await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:active.length>=5,count:active.length,outcome:active.length>=5?"store-campaigns-available":"store-campaigns-missing",details:{kRuokaProbeStatus:probe.status,kRuokaHttpStatus:probe.httpStatus,tjekRows:result.count}}).catch(()=>undefined);
    if (active.length < 5) {
      return NextResponse.json({ok:false,error:"Store campaigns unavailable: refreshed Tjek but verified K-Ruoka feed is missing or expired",...result,activeCount:active.length},{status:503});
    }
    return NextResponse.json({ok:true,...result,activeCount:active.length});
  } catch (error) {
    await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:false,count:0,outcome:"store-campaign-refresh-failed",details:{error:error instanceof Error?error.message:String(error)}}).catch(()=>undefined);
    return NextResponse.json({ok:false,error:error instanceof Error ? error.message : String(error)},{status:502});
  }
}

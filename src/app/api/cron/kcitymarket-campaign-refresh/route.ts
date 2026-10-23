import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { probeKCitymarketStoreOffers } from "@/app/components/ziiply/offerSearch/providers/kCitymarketStoreOffersProvider";
import { NextRequest, NextResponse } from "next/server";
import { refreshKCitymarketCampaignCache, fetchKCitymarketSelectedStoreOffers, fetchVerifiedKCitymarketHyvinkaaOffers } from "@/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  try {
    const verifiedBefore = await fetchVerifiedKCitymarketHyvinkaaOffers();
    const probe = await probeKCitymarketStoreOffers({storeId:"k-citymarket-hyvinkaa",endpoint:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa"}).catch(error => ({status:"HTTP_ERROR",httpStatus:null,diagnostic:String(error)}));
    // Tjek is an independent fallback: its failure must never prevent checking the verified K-Ruoka snapshot.
    const tjek = await refreshKCitymarketCampaignCache("K-Citymarket Hyvinkää")
      .then(result => ({ok:true as const,result,error:null as string|null}))
      .catch(error => ({ok:false as const,result:null,error:error instanceof Error?error.message:String(error)}));
    const active = await fetchKCitymarketSelectedStoreOffers("K-Citymarket Hyvinkää");
    const verified = await fetchVerifiedKCitymarketHyvinkaaOffers();
    await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:verified.length>=5,count:verified.length,outcome:verified.length>=5?"store-campaigns-available":"store-campaigns-missing",details:{kRuokaProbeStatus:probe.status,kRuokaHttpStatus:probe.httpStatus,tjekRows:tjek.result?.count ?? 0,tjekOk:tjek.ok,tjekError:tjek.error,verifiedKruokaRows:verified.length,displayedRows:active.length}}).catch(()=>undefined);
    if (verified.length < 5) {
      return NextResponse.json({ok:false,error:"Verified K-Ruoka N183 campaigns are missing or expired; Tjek status is independent",tjek,activeCount:active.length,verifiedKruokaCount:verified.length},{status:503});
    }
    return NextResponse.json({ok:true,tjek,activeCount:active.length,verifiedKruokaCount:verified.length,verifiedBeforeCount:verifiedBefore.length});
  } catch (error) {
    await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:false,count:0,outcome:"store-campaign-refresh-failed",details:{error:error instanceof Error?error.message:String(error)}}).catch(()=>undefined);
    return NextResponse.json({ok:false,error:error instanceof Error ? error.message : String(error)},{status:502});
  }
}

import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { probeKCitymarketStoreOffers } from "@/app/components/ziiply/offerSearch/providers/kCitymarketStoreOffersProvider";
import { NextRequest, NextResponse } from "next/server";
import { refreshKCitymarketCampaignCache, fetchKCitymarketSelectedStoreOffers, fetchVerifiedKCitymarketHyvinkaaOffers } from "@/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const manualSecret = process.env.KCITYMARKET_MANUAL_SECRET;
  const authorization = request.headers.get("authorization");
  if (!((secret && authorization === `Bearer ${secret}`) || (manualSecret && authorization === `Bearer ${manualSecret}`))) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  try {
    // The verified K-Ruoka snapshot and the source probe must not wait for Tjek.
    const [verified, probe, tjek] = await Promise.all([
      fetchVerifiedKCitymarketHyvinkaaOffers(),
      probeKCitymarketStoreOffers({storeId:"k-citymarket-hyvinkaa",endpoint:"https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa"})
        .catch(error => ({status:"HTTP_ERROR",httpStatus:null,diagnostic:String(error)})),
      refreshKCitymarketCampaignCache("K-Citymarket Hyvinkää")
        .then(result => ({ok:true as const,result,error:null as string|null}))
        .catch(error => ({ok:false as const,result:null,error:error instanceof Error?error.message:String(error)})),
    ]);
    const active = await fetchKCitymarketSelectedStoreOffers("K-Citymarket Hyvinkää");
    await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:tjek.ok && (tjek.result?.activeCount ?? 0)>=5,count:tjek.result?.activeCount ?? 0,outcome:tjek.ok && (tjek.result?.activeCount ?? 0)>=5?"store-campaigns-available":"store-campaigns-missing",details:{kRuokaProbeStatus:probe.status,kRuokaHttpStatus:probe.httpStatus,tjekRows:tjek.result?.count ?? 0,tjekOk:tjek.ok,tjekError:tjek.error,verifiedKruokaRows:verified.length,displayedRows:active.length,kRuokaSourceBlocked:probe.httpStatus===403}}).catch(()=>undefined);
    if (!tjek.ok || (tjek.result?.activeCount ?? 0) < 5) {
      // Primary store-specific Tjek coverage is required; secondary K-Ruoka coverage is diagnostic only.
      return NextResponse.json({ok:false,degraded:true,error:"Primary Tjek N183 campaigns are missing or incomplete; previous snapshot preserved",tjek,probe:{status:probe.status,httpStatus:probe.httpStatus,diagnostic:probe.diagnostic},activeCount:active.length,verifiedKruokaCount:verified.length,kRuokaSourceBlocked:probe.httpStatus===403},{status:503});
    }
    return NextResponse.json({ok:true,degraded:verified.length<5,tjek,probe:{status:probe.status,httpStatus:probe.httpStatus,diagnostic:probe.diagnostic},activeCount:active.length,verifiedKruokaCount:verified.length,kRuokaSourceBlocked:probe.httpStatus===403});
  } catch (error) {
    await recordPublicationRun({chain:"K",source:"k-citymarket-local-benefits",ok:false,count:0,outcome:"store-campaign-refresh-failed",details:{error:error instanceof Error?error.message:String(error)}}).catch(()=>undefined);
    return NextResponse.json({ok:false,error:error instanceof Error ? error.message : String(error)},{status:502});
  }
}

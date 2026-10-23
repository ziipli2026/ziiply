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
    const result = await refreshKCitymarketCampaignCache("K-Citymarket Hyvinkää");
    const active = await fetchKCitymarketSelectedStoreOffers("K-Citymarket Hyvinkää");
    if (active.length < 5) {
      return NextResponse.json({ok:false,error:"Store campaigns unavailable: refreshed Tjek but verified K-Ruoka feed is missing or expired",...result,activeCount:active.length},{status:503});
    }
    return NextResponse.json({ok:true,activeCount:active.length,...result});
  } catch (error) {
    return NextResponse.json({ok:false,error:error instanceof Error ? error.message : String(error)},{status:502});
  }
}

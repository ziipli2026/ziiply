import { NextResponse } from "next/server";
import { getCitymarketFailureNotice } from "../../../components/ziiply/offerSearch/citymarketAvailability";
export const dynamic = "force-dynamic";
// Called only after a failed Citymarket search; a notice alone is not a search result.
export async function GET() {
  return NextResponse.json(await getCitymarketFailureNotice(), { headers: { "Cache-Control": "no-store" } });
}

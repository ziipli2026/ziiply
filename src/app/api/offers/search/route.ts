// src/app/api/offers/search/route.ts
// ZIIPLY_OFFERS_SEARCH_ROUTE_V10_NO_FORCED_STORE
//
// Fix:
// - Removes old V9 debug forcing: areaLabel="Varkaus", sStoreId="726015093", sStoreName="Prisma Varkaus".
// - Forwards only the Gösta/page query parameters that came from the app.
// - Keeps cache disabled for store-specific offer data.

import { NextResponse } from "next/server";
import {
  searchZiiplyOffers,
  type ZiiplyOfferSearchSourceContextV8,
} from "../../../components/ziiply/offerSearch/ziiplyOfferSearchSources";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  return value && value.trim() ? value.trim() : undefined;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const q = getParam(searchParams, "q") || "";

    const context: ZiiplyOfferSearchSourceContextV8 = {
      areaLabel: getParam(searchParams, "area"),
      storeMode: getParam(searchParams, "storeMode"),
      storeCompareScope: getParam(searchParams, "scope"),

      sStoreId: getParam(searchParams, "sStoreId"),
      sStoreName: getParam(searchParams, "sStoreName"),
      sStoreIds: getParam(searchParams, "sStoreIds"),
      sStoreNames: getParam(searchParams, "sStoreNames"),

      kStoreId: getParam(searchParams, "kStoreId"),
      kStoreName: getParam(searchParams, "kStoreName"),
      kStoreIds: getParam(searchParams, "kStoreIds"),
      kStoreNames: getParam(searchParams, "kStoreNames"),
    } as ZiiplyOfferSearchSourceContextV8;

    console.warn("[GOSTA ROUTE V10 CONTEXT]", {
      q,
      context,
    });

    const results = await searchZiiplyOffers(q, context);

    return NextResponse.json(
      {
        ok: true,
        query: q,
        context,
        results,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("[Ziiply offers] route failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Tarjoushaku epäonnistui",
        results: [],
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  }
}

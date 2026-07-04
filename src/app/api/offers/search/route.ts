// src/app/api/offers/search/route.ts
// ZIIPLY_OFFERS_SEARCH_ROUTE_V12_BUILD_FIX_NO_WITHINCHAIN
//
// Fix:
// - Build-korjaus V11-debugiin: poistettu context-oliosta withinChain-kenttä,
//   koska ZiiplyOfferSearchSourceContextV8-tyyppi ei tunne sitä.
// - Route välittää edelleen Göstan/page query-parametrit searchZiiplyOffers(query, context)-kutsulle.
// - S/K-kauppakonteksti pysyy mukana: area, storeMode, scope, sStoreId/sStoreName,
//   kStoreId/kStoreName.
// - Cache pysyy pois päältä kauppakohtaisessa tarjousdatassa.

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

    // V12: ei withinChain-kenttää tässä context-oliossa, koska tyyppi ei tue sitä.
    // Page/sources voi päätellä K/S-ajon olemassa olevista scope + S/K store -kentistä.
    const context: ZiiplyOfferSearchSourceContextV8 = {
      areaLabel: getParam(searchParams, "area"),
      storeMode: getParam(searchParams, "storeMode"),
      storeCompareScope: getParam(searchParams, "scope"),
      sStoreId: getParam(searchParams, "sStoreId"),
      sStoreName: getParam(searchParams, "sStoreName"),
      kStoreId: getParam(searchParams, "kStoreId"),
      kStoreName: getParam(searchParams, "kStoreName"),
    };

    console.warn("[GOSTA ROUTE REAL CONTEXT V12]", {
      q,
      context,
    });

    const results = await searchZiiplyOffers(q, context);

    console.warn("[GOSTA ROUTE RESULT DEBUG V12]", {
      q,
      count: results.length,
      first: results[0]
        ? {
            title: (results[0] as any).title,
            storeLabel: (results[0] as any).storeLabel,
            debugProvider:
              (results[0] as any)._debugProviderRevision ||
              (results[0] as any)._debugKProviderRevision,
            selectedStoreId:
              (results[0] as any)._debugSelectedStoreId ||
              (results[0] as any)._debugKStoreId,
            productStoreId: (results[0] as any)._debugProductStoreId,
          }
        : null,
    });

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

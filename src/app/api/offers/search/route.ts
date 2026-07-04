// src/app/api/offers/search/route.ts
// ZIIPLY_OFFERS_SEARCH_ROUTE_V11_K_VISIBLE_DEBUG_CONTEXT
//
// Fix:
 // - Forwards Gösta/page query parameters to searchZiiplyOffers(query, context).
// - This lets S-kaupat provider use the selected S-store id instead of the old hardcoded default.
// - Keeps cache disabled for store-specific offer data.
// - V11: forwards withinChain/selectedChain too if page/core sends them.

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

    // V10: ei enää pakoteta Prisma Varkauteen. Käytetään oikeasti page.tsx:n
    // lähettämää S/K-kauppakontekstia, jotta Göstan K-provider voi saada kStoreId:n.
    const context: ZiiplyOfferSearchSourceContextV8 = {
      areaLabel: getParam(searchParams, "area"),
      storeMode: getParam(searchParams, "storeMode"),
      storeCompareScope: getParam(searchParams, "scope"),
      withinChain: getParam(searchParams, "withinChain") || getParam(searchParams, "selectedChain"),
      sStoreId: getParam(searchParams, "sStoreId"),
      sStoreName: getParam(searchParams, "sStoreName"),
      kStoreId: getParam(searchParams, "kStoreId"),
      kStoreName: getParam(searchParams, "kStoreName"),
    };

    console.warn("[GOSTA ROUTE REAL CONTEXT V11]", {
      q,
      context,
    });

    const results = await searchZiiplyOffers(q, context);

    console.warn("[GOSTA ROUTE RESULT DEBUG V11]", {
      q,
      count: results.length,
      first: results[0]
        ? {
            title: (results[0] as any).title,
            storeLabel: (results[0] as any).storeLabel,
            debugProvider: (results[0] as any)._debugProviderRevision || (results[0] as any)._debugKProviderRevision,
            selectedStoreId: (results[0] as any)._debugSelectedStoreId || (results[0] as any)._debugKStoreId,
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

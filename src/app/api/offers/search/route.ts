// src/app/api/ziiply/offers/search/route.ts
// ZIIPLY_OFFER_SEARCH_API_ROUTE_V1

import { NextResponse } from "next/server";
import { searchZiiplyOffers } from "@/app/components/ziiply/offerSearch/ziiplyOfferSearchSources";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "").trim();

  if (!query) {
    return NextResponse.json({
      ok: true,
      query,
      results: [],
    });
  }

  try {
    const results = await searchZiiplyOffers(query);

    return NextResponse.json({
      ok: true,
      query,
      results,
    });
  } catch (error) {
    console.error("[Ziiply offers] search failed", error);

    return NextResponse.json(
      {
        ok: false,
        query,
        results: [],
        error: "Tarjoushaku epäonnistui",
      },
      { status: 500 },
    );
  }
}

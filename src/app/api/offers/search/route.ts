// src/app/api/offers/search/route.ts
// ZIIPLY_OFFERS_SEARCH_ROUTE_V11_CLEAN_V8_NO_VARKAUS
//
// Puhdas route Göstan tarjoushakuun:
// - Ei Varkaus-/Prisma-debug-pakotusta.
// - Ei kategorioiden laskentaa, yhdistelyä tai jälkikäsittelyä routessa.
// - Route välittää vain käyttäjän/page.tsx:n antaman kauppakontekstin searchZiiplyOffers-funktiolle.
// - Cache pois, koska tarjoukset ja kauppakohtainen data eivät saa jäädä vanhaan tilaan.

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

      // S-ryhmä: käytetään vain page.tsx:n välittämiä käyttäjän valintoja.
      sStoreId: getParam(searchParams, "sStoreId"),
      sStoreName: getParam(searchParams, "sStoreName"),
      sStoreIds: getParam(searchParams, "sStoreIds"),
      sStoreNames: getParam(searchParams, "sStoreNames"),

      // K-ryhmä: käytetään vain page.tsx:n välittämiä käyttäjän valintoja.
      kStoreId: getParam(searchParams, "kStoreId"),
      kStoreName: getParam(searchParams, "kStoreName"),
      kStoreIds: getParam(searchParams, "kStoreIds"),
      kStoreNames: getParam(searchParams, "kStoreNames"),
    } as ZiiplyOfferSearchSourceContextV8;

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

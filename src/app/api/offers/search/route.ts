// src/app/api/offers/search/route.ts
// ZIIPLY_OFFERS_SEARCH_ROUTE_V13_VISIBLE_MUUT_DEBUG
//
// DEBUG-versio Göstan tarjoushakuun:
// - EI lisää uutta route-polkuja. Tämä korvaa nykyisen src/app/api/offers/search/route.ts -tiedoston.
// - Lisää aina yhden näkyvän DEBUG-rivin kategoriaan "Muut".
// - Testi: avaa Gösta -> klikkaa kategoria "Muut".
// - Jos debug-rivi ei näy "Muut"-kategoriassa, tämä route ei ole ajossa tai kortti suodattaa sen pois.
// - Varsinainen searchZiiplyOffers-kutsu jätetään ennalleen.

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

function buildVisibleMuutDebugOfferV13(q: string, context: ZiiplyOfferSearchSourceContextV8) {
  const sIds = String((context as any).sStoreIds ?? (context as any).sStoreId ?? "");
  const sNames = String((context as any).sStoreNames ?? (context as any).sStoreName ?? "");
  const kIds = String((context as any).kStoreIds ?? (context as any).kStoreId ?? "");
  const kNames = String((context as any).kStoreNames ?? (context as any).kStoreName ?? "");

  const debugText = [
    "ROUTE V13 DEBUG",
    `q=${q || "(empty)"}`,
    `area=${context.areaLabel || "-"}`,
    `mode=${context.storeMode || "-"}`,
    `scope=${context.storeCompareScope || "-"}`,
    `sIds=${sIds || "-"}`,
    `sNames=${sNames || "-"}`,
    `kIds=${kIds || "-"}`,
    `kNames=${kNames || "-"}`,
  ].join(" | ");

  return {
    id: `debug-route-v13-${Date.now()}`,
    source: "debug",
    sourceUrl: "/api/offers/search",
    chain: "DEBUG",
    storeLabel: "ROUTE DEBUG",
    storeName: "ROUTE DEBUG",
    shopName: "ROUTE DEBUG",
    title: debugText,
    name: debugText,
    productName: debugText,
    priceText: "0,00 €",
    unitPriceText: "",
    benefitText: "Näkyvä route-debug. Avaa kategoria Muut.",
    validityText: "Debug",
    imageUrl: "",
    image: "",
    pictureUrl: "",
    productUrl: "",
    rawText: debugText,
    matchScore: 999999,
    category: "Muut",
    categoryPath: "Muut",
    breadcrumbs: "Muut",
    hierarchy: "Muut",
    taxonomy: "Muut",
    department: "Muut",
    productGroup: "Muut",
    mainCategory: "Muut",
    subCategory: "Muut",
    brandName: "DEBUG",
    ean: `debug-route-v13-${Date.now()}`,
  };
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

    const providerResults = await searchZiiplyOffers(q, context);
    const results = [buildVisibleMuutDebugOfferV13(q, context), ...providerResults];

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

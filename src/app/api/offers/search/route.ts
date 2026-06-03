// src/app/api/ziiply/offers/search/route.ts
// ZIIPLY_OFFER_SEARCH_API_ROUTE_V2_DEBUG
// Lisää debug-parametrin:
// /api/ziiply/offers/search?q=kahvi&debug=1
//
// Debug palauttaa raakatekstin esikatselua provider-lähteistä, jotta nähdään
// tuleeko K-Ruoka/S-kaupat data HTML:ssä vai JS/JSON:n kautta.

import { NextResponse } from "next/server";
import { searchZiiplyOffers } from "@/app/components/ziiply/offerSearch/ziiplyOfferSearchSources";

export const dynamic = "force-dynamic";

const DEBUG_SOURCES = [
  {
    id: "kmarket",
    label: "K-Market",
    url: "https://www.k-ruoka.fi/k-market/tarjouslehti",
  },
  {
    id: "ksupermarket",
    label: "K-Supermarket",
    url: "https://www.k-ruoka.fi/k-supermarket/tarjouslehti",
  },
  {
    id: "skaupat",
    label: "S-kaupat",
    url: "https://www.s-kaupat.fi/tuotteet/kampanjat",
  },
];

function normalizeDebugText(value: string) {
  return value
    .toLowerCase()
    .replace(/[äå]/g, "a")
    .replace(/ö/g, "o")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlForDebug(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n[SCRIPT REMOVED]\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n[STYLE REMOVED]\n")
    .replace(/<\/(li|p|div|section|article|h1|h2|h3|h4|a|span|button)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&euro;/g, "€")
    .replace(/\u00a0/g, " ");
}

function getDebugLines(html: string) {
  return stripHtmlForDebug(html)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 120);
}

async function getDebugPayload(query: string) {
  const normalizedQuery = normalizeDebugText(query);

  const sources = await Promise.all(
    DEBUG_SOURCES.map(async (source) => {
      try {
        const response = await fetch(source.url, {
          cache: "no-store",
          headers: {
            accept: "text/html,application/xhtml+xml,application/json",
            "user-agent": "ZiiplyOfferSearchDebug/1.0",
          },
        });

        const html = await response.text();
        const normalizedHtml = normalizeDebugText(html);
        const lines = getDebugLines(html);
        const matchingLines = lines.filter((line) =>
          normalizeDebugText(line).includes(normalizedQuery),
        ).slice(0, 30);

        return {
          ...source,
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get("content-type"),
          htmlLength: html.length,
          queryFoundInRawHtml: normalizedHtml.includes(normalizedQuery),
          firstLines: lines.slice(0, 80),
          matchingLines,
          rawStart: html.slice(0, 2000),
        };
      } catch (error) {
        return {
          ...source,
          ok: false,
          status: 0,
          error: error instanceof Error ? error.message : String(error),
          htmlLength: 0,
          queryFoundInRawHtml: false,
          firstLines: [],
          matchingLines: [],
          rawStart: "",
        };
      }
    }),
  );

  return {
    ok: true,
    debug: true,
    query,
    normalizedQuery,
    sources,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "").trim();
  const debug = url.searchParams.get("debug") === "1";

  if (!query) {
    return NextResponse.json({
      ok: true,
      query,
      results: [],
    });
  }

  if (debug) {
    const payload = await getDebugPayload(query);
    return NextResponse.json(payload);
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

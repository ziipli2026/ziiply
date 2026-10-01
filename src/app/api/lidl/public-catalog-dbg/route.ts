import { NextRequest, NextResponse } from "next/server";

const CATEGORIES: Record<string, string> = {
  lihat: "/h/lihat/h10095752",
  makeiset: "/h/makeiset-ja-snacksit/h10096205",
  hevi: "/h/hedelmaet-ja-vihannekset/h10071012",
  valmisruoat: "/h/valmisruoat/h10071020",
};

export async function GET(request: NextRequest) {
  const category = String(request.nextUrl.searchParams.get("category") || "lihat");
  const path = CATEGORIES[category];
  if (!path) return NextResponse.json({ ok: false, categories: Object.keys(CATEGORIES) }, { status: 400 });
  const url = "https://www.lidl.fi" + path;
  try {
    const response = await fetch(url, {
      headers: { accept: "text/html", "accept-language": "fi-FI,fi;q=0.9" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const html = await response.text();
    const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    const scripts = scriptTags.map((match) => ({
      attributes: match[1].slice(0, 300),
      length: match[2].length,
      sample: match[2].slice(0, 2500),
      productSignals: /product|price|gtin|ean|barcode|__NEXT_DATA__|__NUXT__/i.test(match[2]),
    }));
    const jsonLd = scriptTags.filter((match) => /application\/ld\+json/i.test(match[1]))
      .map((match) => {
        try { return JSON.parse(match[2]); } catch { return match[2].slice(0, 3000); }
      });
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
    const productHints = [...html.matchAll(/(?:gtin|ean|barcode|price|productId|productName)[^<>]{0,140}/gi)]
      .slice(0, 25).map((match) => match[0]);
    return NextResponse.json({
      ok: response.ok, upstreamStatus: response.status, category, url, title,
      htmlLength: html.length, scriptCount: scripts.length,
      scriptSummary: scripts.filter((s) => s.productSignals).slice(0, 8),
      jsonLd: jsonLd.slice(0, 8), productHints,
      note: "Read-only public Lidl.fi HTML inspection; no third-party data and no EAN-bank writes.",
    }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ ok: false, category, error: String(error) }, { status: 502 });
  }
}

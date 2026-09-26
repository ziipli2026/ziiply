import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TESTS = [
  { ean: "2000612500002", plu: "6125", expected: "Pirkka suomalainen jäävuorisalaatti" },
  { ean: "2000638800001", plu: "6388", expected: "Bruno mandariini Nadorcott" },
];

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function linksFromHtml(html: string) {
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((href) => /\/kalorit\//i.test(href));
  return [...new Set(links)].slice(0, 20);
}

async function probe(url: string, ean: string) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Ziiply-Kalori-EAN-diagnostic/1.0",
      },
    });
    const html = await response.text();
    const text = stripHtml(html);
    const links = linksFromHtml(html);
    return {
      requestedUrl: url,
      status: response.status,
      ok: response.ok,
      finalUrl: response.url,
      contentType: response.headers.get("content-type") || "",
      bytes: html.length,
      containsEan: html.includes(ean) || text.includes(ean),
      productLinks: links,
      textSample: text.slice(0, 800),
    };
  } catch (error) {
    return {
      requestedUrl: url,
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  const results = [];
  for (const test of TESTS) {
    const queries = [
      `https://kalori.info/?s=${encodeURIComponent(test.ean)}`,
      `https://kalori.info/haku?q=${encodeURIComponent(test.ean)}`,
      `https://kalori.info/haku?query=${encodeURIComponent(test.ean)}`,
      `https://kalori.info/search?q=${encodeURIComponent(test.ean)}`,
    ];
    const probes = [];
    for (const url of queries) probes.push(await probe(url, test.ean));
    results.push({ ...test, probes });
  }

  return NextResponse.json({
    diagnostic: "Kalori.info EAN search probe only; no scanner/resolver changes",
    results,
  });
}

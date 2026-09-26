import { NextResponse } from "next/server";

const TEST_EANS = ["2000638800001", "2000612500002"];
const TEST_PLUS = TEST_EANS.map((ean) => ({ ean, plu: ean.slice(4, 8) }));
const decodeXml = (v: string) => v.replace(/&amp;/g, "&").replace(/&quot;/g, '"');

function extractName(html: string) {
  const m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
    ?? html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return decodeXml(String(m?.[1] ?? "")).replace(/\s*[|–-]\s*K-Ruoka.*$/i, "").trim();
}

export async function GET() {
  const ruoanhintaResults = [];
  for (const test of TEST_PLUS) {
    const queries = [test.ean, test.plu];
    for (const query of queries) {
      try {
        const rr = await fetch(`https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(query)}&skip=0&take=30`, { headers: { accept: "application/json" }, cache: "no-store" });
        const text = await rr.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        ruoanhintaResults.push({
          ean: test.ean, plu: test.plu, query, status: rr.status, ok: rr.ok,
          count: items.length,
          items: items.slice(0, 10).map((x: any) => ({ id: x?.id, name: x?.name, ean: x?.ean, gtin: x?.gtin, eanCode: x?.eanCode, barcode: x?.barcode, externalId: x?.externalId }))
        });
      } catch (error) {
        ruoanhintaResults.push({ ean: test.ean, plu: test.plu, query, ok: false, error: String(error) });
      }
    }
  }
  try {
    const robots = await fetch("https://www.k-ruoka.fi/robots.txt", { cache: "no-store" });
    const robotsText = await robots.text();
    const sitemapUrl = robotsText.match(/^Sitemap:\s*(https?:\/\/\S+)/im)?.[1] || "https://www.k-ruoka.fi/sitemap-https.xml";
    const sr = await fetch(sitemapUrl, { headers: { accept: "application/xml,text/xml,*/*", "user-agent": "Mozilla/5.0 Ziiply sitemap test" }, cache: "no-store" });
    const xml = await sr.text();
    const results = [];
    for (const ean of TEST_EANS) {
      const m = xml.match(new RegExp("<loc>([^<]*" + ean + "[^<]*)<\\/loc>", "i"));
      const productUrl = m ? decodeXml(m[1]) : "";
      let productStatus = 0, name = "";
      if (productUrl) {
        const pr = await fetch(productUrl, { headers: { accept: "text/html,*/*", "user-agent": "Mozilla/5.0 Ziiply sitemap test" }, cache: "no-store" });
        productStatus = pr.status;
        if (pr.ok) name = extractName(await pr.text());
      }
      results.push({ ean, foundInSitemap: !!productUrl, productUrl, productStatus, name });
    }
    return NextResponse.json({ ruoanhintaResults, ok: sr.ok, robotsStatus: robots.status, sitemapUrl, sitemapStatus: sr.status, sitemapContentType: sr.headers.get("content-type"), sitemapBytes: xml.length, results });
  } catch (error) {
    return NextResponse.json({ ruoanhintaResults, ok: false, error: String(error) }, { status: 500 });
  }
}

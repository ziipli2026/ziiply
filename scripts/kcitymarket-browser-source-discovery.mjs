import { chromium } from "playwright";

// Observe the actual K-Ruoka browser requests before implementing an importer.
// No cookies, auth headers, response bodies or personal data are logged.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "fi-FI", timezoneId: "Europe/Helsinki" });
const observations = [];
const candidates = [];
const seen = new Set();
const fs = await import("node:fs/promises");
const pendingResponses = new Set();
page.on("response", response => {
  const task = inspectResponse(response).catch(error => { console.warn("KRUOKA_RESPONSE_INSPECTION_ERROR", String(error)); });
  pendingResponses.add(task);
  task.finally(() => pendingResponses.delete(task));
});
async function inspectResponse(response) {
  const url = response.url();
  // Offer APIs may use a different host than the K-Ruoka storefront.
  if (!/^https:\/\//i.test(url)) return;
  const type = response.headers()["content-type"] || "";
  if (!/json|graphql/i.test(type) && !/tarjou|offer|campaign|benefit|categor/i.test(new URL(url).pathname)) return;
  const parsed = new URL(url);
  // Drop all query parameters, which may contain tokens or user identifiers.
  const queryKeys = [...new Set([...parsed.searchParams.keys()])].sort();
  const key = response.status() + " " + parsed.origin + parsed.pathname + "?" + queryKeys.join(",");
  if (seen.has(key) || observations.length >= 100) return;
  seen.add(key);
  let shape = null;
  if (/json/i.test(type)) {
    try {
      const body = await response.json();
      const describe = v => Array.isArray(v) ? { kind: "array", length: v.length, firstKeys: v[0] && typeof v[0] === "object" ? Object.keys(v[0]).slice(0,20) : [] } : v && typeof v === "object" ? { kind: "object", keys: Object.keys(v).slice(0,35) } : { kind: typeof v };
      shape = describe(body);
      const rows = Array.isArray(body) ? body : body && typeof body === "object"
        ? Object.entries(body).filter(([k,v]) => /offer|campaign|benefit|product|item/i.test(k) && Array.isArray(v)).flatMap(([,v]) => v)
        : [];
      const samples = rows.filter(v => v && typeof v === "object" && /price|offer|campaign|discount/i.test(Object.keys(v).join(" ")))
        .slice(0,3).map(v => Object.fromEntries(["name","title","price","validFrom","validUntil","storeId","offerId","ean"]
          .filter(k => typeof v[k] === "string" || typeof v[k] === "number")
          .map(k => [k, String(v[k]).slice(0,100)])));
      if (samples.length && candidates.length < 40) candidates.push({ endpoint: parsed.origin + parsed.pathname, samples });
    } catch {}
  }
  observations.push({ url: parsed.origin + parsed.pathname, queryKeys, status: response.status(), type: type.slice(0,80), shape });
}
try {
  const store = "https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa";
  const first = await page.goto(store, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5000);
  const storeTitle = await page.title();
  const links = await page.locator("a[href]").evaluateAll(anchors => anchors.map(a => ({ text: (a.textContent || "").trim().slice(0,80), href: a.getAttribute("href") })).filter(x => /tarjou|edut|etuja/i.test(x.text + " " + x.href)).slice(0,20));
  const offerLink = links.find(x => /tarjoushaku/.test(x.href || ""));
  const destination = offerLink ? new URL(offerLink.href, store).href : "https://www.k-ruoka.fi/kauppa/tarjoushaku";
  const second = await page.goto(destination, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
  const offerNavigationUrl = page.url();
  await page.waitForTimeout(9000);
  await Promise.allSettled([...pendingResponses]);
  const offerTitle = await page.title();
  const pageEvidence = await page.locator("body").innerText().then(s => ({
    hyvinkaa: /Hyvinkää/i.test(s),
    otherStore: /K-Citymarket Vantaa Jumbo/i.test(s),
    offerWords: (s.match(/tarjous|plussa|etu/gi) || []).length,
    bodyLength: s.length,
    storeIdN183InPage: /N183/.test(s),
  })).catch(() => ({}));
  const context = await page.evaluate(() => ({
    storeMarkerInMarkup: /N183/i.test(document.documentElement.outerHTML),
    storeNameInMarkup: /K-Citymarket Hyvinkää/i.test(document.documentElement.outerHTML),
    selectedStoreKeys: Object.keys(localStorage).filter(k => /store|kauppa|shop/i.test(k)).slice(0,20),
  })).catch(() => ({}));
  const offerCards = await page.locator("main article, main [data-testid*=offer], main [class*=Offer], main [class*=offer]").count().catch(() => 0);
  const report = {
    storeHttp: first?.status() ?? null, storeTitle,
    offerHttp: second?.status() ?? null, offerTitle,
    finalOfferPath: new URL(page.url()).pathname,
    offerNavigationHost: new URL(offerNavigationUrl).hostname,
    links, pageEvidence, context, offerCards, requests: observations, candidates,
    storeContextConfirmed: Boolean((pageEvidence.storeIdN183InPage || context.storeMarkerInMarkup) && pageEvidence.hyvinkaa && !pageEvidence.otherStore),
    verifiedStoreOffers: false,
    note: "Diagnostic only. A page marker alone does not prove N183 offer scope."
  };
  await fs.mkdir("artifacts", { recursive: true });
  await fs.writeFile("artifacts/kruoka-n183-browser-discovery.json", JSON.stringify(report, null, 2));
  console.log("KRUOKA_BROWSER_DISCOVERY " + JSON.stringify(report));
} finally { await browser.close(); }

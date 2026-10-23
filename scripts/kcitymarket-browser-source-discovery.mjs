import { chromium } from "playwright";

// Observe the actual K-Ruoka browser requests before implementing an importer.
// No cookies, auth headers, response bodies or personal data are logged.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "fi-FI", timezoneId: "Europe/Helsinki" });
const observations = [];
const seen = new Set();
page.on("response", async response => {
  const url = response.url();
  if (!/^https:\/\/(?:[^/]+\.)?(?:k-ruoka\.fi|keskofiles\.com)\//i.test(url)) return;
  const type = response.headers()["content-type"] || "";
  if (!/json|graphql/i.test(type) && !/tarjou|offer|campaign|benefit/i.test(new URL(url).pathname)) return;
  const parsed = new URL(url);
  // Drop all query parameters, which may contain tokens or user identifiers.
  const key = response.status() + " " + parsed.origin + parsed.pathname;
  if (seen.has(key) || observations.length >= 100) return;
  seen.add(key);
  let shape = null;
  if (/json/i.test(type)) {
    try {
      const body = await response.json();
      const describe = v => Array.isArray(v) ? { kind: "array", length: v.length, firstKeys: v[0] && typeof v[0] === "object" ? Object.keys(v[0]).slice(0,20) : [] } : v && typeof v === "object" ? { kind: "object", keys: Object.keys(v).slice(0,35) } : { kind: typeof v };
      shape = describe(body);
    } catch {}
  }
  observations.push({ url: parsed.origin + parsed.pathname, status: response.status(), type: type.slice(0,80), shape });
});
try {
  const store = "https://www.k-ruoka.fi/kauppa/k-citymarket-hyvinkaa";
  const first = await page.goto(store, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5000);
  const storeTitle = await page.title();
  const links = await page.locator("a[href]").evaluateAll(anchors => anchors.map(a => ({ text: (a.textContent || "").trim().slice(0,80), href: a.getAttribute("href") })).filter(x => /tarjou|edut|etuja/i.test(x.text + " " + x.href)).slice(0,20));
  const offerLink = links.find(x => /tarjoushaku/.test(x.href || ""));
  const destination = offerLink ? new URL(offerLink.href, store).href : "https://www.k-ruoka.fi/kauppa/tarjoushaku";
  const second = await page.goto(destination, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(9000);
  const offerTitle = await page.title();
  const pageEvidence = await page.locator("body").innerText().then(s => ({
    hyvinkaa: /Hyvinkää/i.test(s),
    otherStore: /K-Citymarket Vantaa Jumbo/i.test(s),
    offerWords: (s.match(/tarjous|plussa|etu/gi) || []).length,
    bodyLength: s.length,
  })).catch(() => ({}));
  console.log("KRUOKA_BROWSER_DISCOVERY " + JSON.stringify({
    storeHttp: first?.status() ?? null, storeTitle,
    offerHttp: second?.status() ?? null, offerTitle,
    finalOfferPath: new URL(page.url()).pathname,
    links, pageEvidence, requests: observations,
    verifiedStoreOffers: false,
    note: "Diagnostic only. A page marker alone does not prove N183 offer scope."
  }));
} finally { await browser.close(); }

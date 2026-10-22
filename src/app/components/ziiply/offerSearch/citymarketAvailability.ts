export const CITYMARKET_STATUS_URL = "https://www.k-ruoka.fi/k-citymarket";
export type CitymarketAvailabilityNotice = { message: string; reason: string | null; sourceUrl: string | null; checkedAt: string };

// Independently verified from the official page on 22 October. Keep a verified
// notice through failed refreshes, but never indefinitely after the publisher is unreachable.
let lastKnown: { reason: string; checkedAt: string } | null = {
  reason: "PDF-digitarjouslehtipalvelussa on palveluntarjoajan teknisiä ongelmia.",
  checkedAt: "2026-10-22T02:13:22Z",
};
const VERIFIED_NOTICE_MAX_AGE = 24 * 60 * 60 * 1000;
function knownNotice() {
  return lastKnown && Date.now() - Date.parse(lastKnown.checkedAt) <= VERIFIED_NOTICE_MAX_AGE ? lastKnown : null;
}

// Only extract a current, explicit leaflet outage notice. Never render publisher HTML.
export function extractCitymarketOutage(html: string): string | null {
  const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(?:p|div|section|h[1-6])\s*>|<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&auml;/g, "ä").replace(/&ouml;/g, "ö").replace(/&amp;/g, "&");
  for (const paragraph of text.split(/\n/)) {
    const clean = paragraph.replace(/\s+/g, " ").trim();
    if (/(?:digitarjousleh|tarjousleh)/i.test(clean) && /(?:ei (?:tällä hetkellä )?ole (?:toiminnassa|saatavilla)|ei toimi|teknis(?:istä|ten) ongelmi|häiriö|huoltokatko|tilapäisesti poissa käytöstä)/i.test(clean)) {
      return clean.length <= 650 ? clean : null;
    }
  }
  return null;
}
export function citymarketFailureNotice(reason: string | null, checkedAt = new Date().toISOString()): CitymarketAvailabilityNotice {
  const known = !reason ? knownNotice() : null;
  if (known) { reason = known.reason; checkedAt = known.checkedAt; }
  return { message: reason ? `Citymarketin tarjouslehden tarjouksia ei voida hakea. Citymarketin ilmoittama syy: ${reason}` : "Citymarketin tarjouslehden tarjouksia ei voida hakea. Syy on tuntematon.", reason, sourceUrl: reason ? CITYMARKET_STATUS_URL : null, checkedAt };
}
let cached: { expires: number; notice: CitymarketAvailabilityNotice } | null = null;
let pending: Promise<CitymarketAvailabilityNotice> | null = null;
export async function getCitymarketFailureNotice(): Promise<CitymarketAvailabilityNotice> {
  if (cached && cached.expires > Date.now()) return cached.notice;
  if (pending) return pending;
  pending = (async () => {
    let reason: string | null = null;
    try {
      const response = await fetch(CITYMARKET_STATUS_URL, { cache: "no-store", signal: AbortSignal.timeout(4000), headers: { accept: "text/html" } });
      if (response.ok) {
        const html = (await response.text()).slice(0, 1500000);
        reason = extractCitymarketOutage(html);
        if (reason) lastKnown = { reason, checkedAt: new Date().toISOString() };
        // A complete official page without the notice supersedes the previous outage.
        // A block/error/partial page must not erase a verified reason.
        else if (/K-Citymarket/i.test(html) && /tarjousleh/i.test(html) && /<\/html>/i.test(html)) lastKnown = null;
      }
    } catch { /* An unavailable status page is not evidence of the cause. */ }
    const notice = citymarketFailureNotice(reason);
    cached = { expires: Date.now() + 5 * 60000, notice };
    return notice;
  })();
  try { return await pending; } finally { pending = null; }
}

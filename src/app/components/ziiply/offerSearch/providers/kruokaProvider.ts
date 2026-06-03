// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_OFFER_PROVIDER_V2_MODULE_FIX

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";
import {
  createStableOfferId,
  looksLikePriceLine,
  looksLikeUnitPriceLine,
  looksLikeValidityLine,
  scoreOfferMatch,
  stripHtmlToLines,
} from "../utils/offerMatcher";

const KRUOKA_HEADERS = new Set([
  "K-Market digitarjouslehti",
  "K-Supermarket digitarjouslehti",
  "Digitarjouslehden osiot",
  "Tarjoukset voimassa valitussa kaupassa",
  "Näytä tuotteet",
  "Plussa-kortilla",
  "Pysyvästi edullinen",
]);

function isLikelyKruokaProductTitle(line: string) {
  if (line.length < 4 || line.length > 145) return false;
  if (KRUOKA_HEADERS.has(line)) return false;
  if (/^(Etuhinta|Hinta|Yksikköhinta|Ilman|Voimassa|Vain|Myös|norm\.|Mobiilietu|Plussa)/i.test(line)) return false;
  if (looksLikePriceLine(line) || looksLikeUnitPriceLine(line) || looksLikeValidityLine(line)) return false;
  if (/^\d+$/.test(line)) return false;
  if (/^\/\w+/.test(line)) return false;

  return /[a-zåäö]/i.test(line);
}

function parseKruokaOffersFromHtml(
  html: string,
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
): ZiiplyOfferSearchResult[] {
  const lines = stripHtmlToLines(html);
  const results: ZiiplyOfferSearchResult[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const title = lines[index];

    if (!isLikelyKruokaProductTitle(title)) continue;

    const windowLines = lines.slice(index + 1, index + 10);
    const rawText = [title, ...windowLines].join(" ");
    const matchScore = scoreOfferMatch(title, query, rawText);

    if (matchScore <= 0) continue;

    const priceText =
      windowLines.find((line) => /^Etuhinta/i.test(line)) ||
      windowLines.find((line) => /^Hinta/i.test(line)) ||
      windowLines.find(looksLikePriceLine);

    const unitPriceText = windowLines.find(looksLikeUnitPriceLine);
    const validityText = windowLines.find(looksLikeValidityLine);
    const benefitText = windowLines.find((line) =>
      /plussa|mobiilietu|ilman plussa|vain k/i.test(line),
    );

    results.push({
      id: createStableOfferId([source.id, title, priceText, validityText]),
      source: source.id,
      chain: source.chain,
      title,
      priceText,
      unitPriceText,
      validityText,
      benefitText,
      storeLabel: source.storeLabel,
      productUrl: source.url,
      matchScore,
      rawText,
    });
  }

  return results;
}

export async function fetchKruokaOffers(
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
): Promise<ZiiplyOfferSearchResult[]> {
  const response = await fetch(source.url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "ZiiplyOfferSearch/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${source.id} tarjoushaku epäonnistui: ${response.status}`);
  }

  const html = await response.text();

  return parseKruokaOffersFromHtml(html, query, source);
}

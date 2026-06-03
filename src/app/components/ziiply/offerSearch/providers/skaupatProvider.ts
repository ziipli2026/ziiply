// src/app/components/ziiply/offerSearch/providers/skaupatProvider.ts
// ZIIPLY_SKAUPAT_OFFER_PROVIDER_V2_MODULE_FIX

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

function isLikelySKaupatProductTitle(line: string) {
  if (line.length < 4 || line.length > 150) return false;
  if (/^(Ohita listaus|Näytä lisää|Poista yksi|Lisää yksi|Lisää suosikkeihin|0 kappaletta|Vertailuhinta)/i.test(line)) return false;
  if (/^\d+\.$/.test(line)) return false;
  if (looksLikePriceLine(line) || looksLikeUnitPriceLine(line) || looksLikeValidityLine(line)) return false;
  if (/^##\s*/.test(line)) return false;

  return /[a-zåäö]/i.test(line);
}

function normalizeSKaupatTitle(line: string) {
  return line.replace(/^#+\s*/, "").trim();
}

function parseSKaupatOffersFromHtml(
  html: string,
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
): ZiiplyOfferSearchResult[] {
  const lines = stripHtmlToLines(html).map(normalizeSKaupatTitle);
  const results: ZiiplyOfferSearchResult[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const title = lines[index];

    if (!isLikelySKaupatProductTitle(title)) continue;

    const windowLines = lines.slice(index + 1, index + 9);
    const rawText = [title, ...windowLines].join(" ");
    const matchScore = scoreOfferMatch(title, query, rawText);

    if (matchScore <= 0) continue;

    const campaignPrice = windowLines.find((line) =>
      /\d+\s*kpl\s*=\s*\d+[,.]\d{1,2}\s*€/.test(line),
    );
    const singlePrice = windowLines.find((line) =>
      /^\d+[,.]\d{1,2}\s*€/.test(line),
    );
    const unitPriceText = windowLines.find(looksLikeUnitPriceLine);
    const validityText = windowLines.find(looksLikeValidityLine);

    results.push({
      id: createStableOfferId([
        source.id,
        title,
        campaignPrice || singlePrice,
        validityText,
      ]),
      source: source.id,
      chain: source.chain,
      title,
      priceText: campaignPrice || singlePrice,
      unitPriceText,
      validityText,
      benefitText: campaignPrice,
      storeLabel: source.storeLabel,
      productUrl: source.url,
      matchScore,
      rawText,
    });
  }

  return results;
}

export async function fetchSKaupatOffers(
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
    throw new Error(`${source.id} kampanjahaku epäonnistui: ${response.status}`);
  }

  const html = await response.text();

  return parseSKaupatOffersFromHtml(html, query, source);
}

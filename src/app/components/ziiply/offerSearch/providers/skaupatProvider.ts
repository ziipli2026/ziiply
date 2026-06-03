// src/app/components/ziiply/offerSearch/providers/skaupatProvider.ts
// ZIIPLY_SKAUPAT_OFFER_PROVIDER_V3_VISIBLE_HTML_PARSER
//
// Parsii S-kaupat kampanjasivun serveriltä palautuvasta HTML:stä.
// Debugin perusteella S-kaupat palauttaa tuotteet näkyvänä tekstinä,
// mutta skandit/eurot voivat tulla mojibake-muodossa. Parseri normalisoi ne.

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

function fixMojibake(value: string) {
  return value
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¥/g, "å")
    .replace(/Ã„/g, "Ä")
    .replace(/Ã–/g, "Ö")
    .replace(/Ã…/g, "Å")
    .replace(/â‚¬/g, "€")
    .replace(/â€‘/g, "-")
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSKaupatTitle(line: string) {
  return fixMojibake(line).replace(/^#+\s*/, "").trim();
}

function isNoiseLine(line: string) {
  return (
    !line ||
    /^(Ohita listaus|Näytä lisää|Poista yksi|Lisää yksi|Lisää suosikkeihin|0 kappaletta|Vertailuhinta|Tuotteet|Kirjaudu|Ohjeet|Ostoskori)$/i.test(line) ||
    /^Poista yksi kappale ostoskorista/i.test(line) ||
    /^Lisää yksi kappale ostoskoriin/i.test(line) ||
    /^0$/.test(line) ||
    /^kpl$/i.test(line) ||
    /^\d+\.$/.test(line)
  );
}

function isLikelyProductTitle(line: string) {
  const clean = normalizeSKaupatTitle(line);

  if (isNoiseLine(clean)) return false;
  if (clean.length < 5 || clean.length > 170) return false;
  if (looksLikePriceLine(clean) || looksLikeUnitPriceLine(clean) || looksLikeValidityLine(clean)) return false;
  if (/^Kampanjat ja alennustuotteet/i.test(clean)) return false;
  if (/^Kampanjahinta on voimassa/i.test(clean)) return false;

  return /[a-zåäö]/i.test(clean);
}

function isPriceText(line: string) {
  const clean = fixMojibake(line);
  return /\d+[,.]\d{1,2}\s*€/.test(clean) || /\d+\s*kpl\s*=\s*\d+[,.]\d{1,2}\s*€/.test(clean);
}

function parseSKaupatOffersFromHtml(
  html: string,
  query: string,
  source: ZiiplyOfferSearchSourceConfig,
): ZiiplyOfferSearchResult[] {
  const lines = stripHtmlToLines(html)
    .map(normalizeSKaupatTitle)
    .filter((line) => line && !isNoiseLine(line));

  const results: ZiiplyOfferSearchResult[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const title = lines[index];

    if (!isLikelyProductTitle(title)) continue;

    const windowLines = lines.slice(index + 1, index + 12);
    const rawText = [title, ...windowLines].join(" ");
    const matchScore = scoreOfferMatch(title, query, rawText);

    if (matchScore <= 0) continue;

    const priceText = windowLines.find(isPriceText);
    const unitPriceText = windowLines.find(looksLikeUnitPriceLine);
    const validityText = windowLines.find(looksLikeValidityLine);

    // V3: Palautetaan myös osumat, joilta ei löydy hintaa heti perästä.
    // Näin debugataan hakua ilman että oikeat nimiosumat putoavat pois.
    results.push({
      id: createStableOfferId([source.id, title, priceText, validityText]),
      source: source.id,
      chain: source.chain,
      title,
      priceText,
      unitPriceText,
      validityText,
      benefitText: priceText && priceText.includes("kpl") ? priceText : undefined,
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

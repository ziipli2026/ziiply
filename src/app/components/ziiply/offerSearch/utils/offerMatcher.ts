// src/app/components/ziiply/offerSearch/utils/offerMatcher.ts
// ZIIPLY_OFFER_MATCHER_V1

const FINNISH_ASCII: Record<string, string> = {
  ä: "a",
  ö: "o",
  å: "a",
};

export function normalizeOfferText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[äöå]/g, (char) => FINNISH_ASCII[char] || char)
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[^\p{L}\p{N},.%€/\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitOfferQuery(query: string) {
  return normalizeOfferText(query)
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

export function scoreOfferMatch(title: string, query: string, rawText = "") {
  const titleText = normalizeOfferText(title);
  const haystack = normalizeOfferText(`${title} ${rawText}`);
  const terms = splitOfferQuery(query);

  if (!terms.length) return 0;

  let score = 0;

  for (const term of terms) {
    if (titleText === term) score += 120;
    else if (titleText.startsWith(term)) score += 70;
    else if (titleText.includes(term)) score += 55;
    else if (haystack.includes(term)) score += 22;
  }

  if (terms.length > 1 && terms.every((term) => titleText.includes(term))) {
    score += 45;
  }

  return score;
}

export function createStableOfferId(parts: Array<string | number | undefined>) {
  return parts
    .map((part) => normalizeOfferText(part ?? ""))
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
}

export function cleanOfferLine(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+€/g, " €")
    .replace(/€\s+/g, "€ ")
    .trim();
}

export function stripHtmlToLines(html: string) {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<\/(li|p|div|section|article|h1|h2|h3|h4|a|span|button)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&euro;/g, "€")
    .replace(/&#xE4;/g, "ä")
    .replace(/&#xF6;/g, "ö")
    .replace(/&#xE5;/g, "å")
    .replace(/&#228;/g, "ä")
    .replace(/&#246;/g, "ö")
    .replace(/&#229;/g, "å")
    .replace(/\u00a0/g, " ");

  return text
    .split(/\n+/)
    .map(cleanOfferLine)
    .filter(Boolean);
}

export function looksLikePriceLine(line: string) {
  return /\d+[,.]\d{1,2}\s*€/.test(line) || /\d+\s*kpl\s*=\s*\d+[,.]\d{1,2}\s*€/.test(line);
}

export function looksLikeUnitPriceLine(line: string) {
  return /€\s*\/\s*(kg|l|kpl|pkt|ps|rs|pl)/i.test(line) || /kilogramma|litra|vertailuhinta/i.test(line);
}

export function looksLikeValidityLine(line: string) {
  return /voimassa/i.test(line);
}

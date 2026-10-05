import { finnishPublicationDate, publicationState } from "../publicationLifecycle";

type AnyRecord = Record<string, any>;

export type LidlPublicOffer = {
  id: string;
  source: "lidl-fi-public";
  chain: "Lidl";
  title: string;
  name: string;
  productName: string;
  brandName: string;
  price: number;
  offerPrice: number;
  priceText: string;
  originalPrice: number | null;
  normalPrice: number | null;
  priceBasis: "unit" | "per-kg" | "multi-buy-total";
  multiBuyQuantity?: number;
  multiBuyTotalPrice?: number;
  requiresLidlPlus: boolean;
  eligibility: "open" | "lidl-plus" | "limited-batch";
  validFrom: string;
  validUntil: string;
  validityText: string;
  imageUrl: string;
  image: string;
  pictureUrl: string;
  category: string;
  categoryPath: string;
  mainCategory: string;
  rawText: string;
  sourceUrl: string;
  hasConcretePrice: true;
  isWeightedProduct: boolean;
  ean: "";
};

const BASE = "https://www.lidl.fi";
const SEEDS = [
  "/",
  "/h/vihannekset/h10095593",
  "/h/lihat/h10095752",
  "/h/juustot-maitotuotteet-ja-kananmunat/h10095761",
  "/h/kuivatuotteet/h10096095",
  "/h/valmisateriat/h10097147",
  "/h/paistopiste-leivaet-ja-leivonnaiset/h10096086",
];

const HEADERS = {
  accept: "text/html,application/xhtml+xml",
  "accept-language": "fi-FI,fi;q=0.9",
  "user-agent": "ZiiplyLidlLeaflet/1.0",
};

const decode = (value: unknown) => String(value ?? "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const normalize = (value: unknown) => decode(value).toLocaleLowerCase("fi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9åäö]+/gi, " ").replace(/\s+/g, " ").trim();

const isoDate = (value: unknown) => {
  const match = String(value ?? "").match(/(20\d{2})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
};

const money = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

function categoryFor(name: string, sourceUrl: string) {
  const s = normalize(name + " " + sourceUrl);
  if (/vihanne|hedelm|tomaatti|peruna|kaali|porkkana|sipuli|kurkku|omena|banaani/.test(s)) return "Hevi";
  if (/juusto|maito|jogur|rahka|kerma|voi\b|kananmuna/.test(s)) return "Maitotuotteet";
  if (/liha|kana|broiler|nauta|sika|makkara|nakki|pekoni|jauheliha|lihapulla/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|katkarapu|tonnikala/.test(s)) return "Kala";
  if (/paistopiste|leip|croissant|pull|sampyl|rieska/.test(s)) return "Leipomo";
  if (/pakaste|jaatelo/.test(s)) return "Pakasteet";
  if (/valmisateria|pizza|keitto|ateria|nyytti|pata/.test(s)) return "Valmisruoka";
  if (/juoma|mehu|vesi|limu|cola|kahvi|tee/.test(s)) return "Juomat";
  if (/kark|makeis|suklaa|keksi|sips|chips/.test(s)) return "Makeiset & keksit";
  if (/koira|kissa|lemmik/.test(s)) return "Lemmikit";
  return "Kuivatuotteet";
}

function visitProducts(value: unknown, output: AnyRecord[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const row of value) visitProducts(row, output); return; }
  const row = value as AnyRecord;
  const types = Array.isArray(row["@type"]) ? row["@type"] : [row["@type"]];
  if (types.includes("Product")) output.push(row);
  if (row["@graph"]) visitProducts(row["@graph"], output);
  if (row.itemListElement) visitProducts(row.itemListElement, output);
  if (row.item) visitProducts(row.item, output);
}

export function parseLidlPublicCategoryHtml(html: string, sourceUrl: string, date = finnishPublicationDate()): LidlPublicOffer[] {
  const products: AnyRecord[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visitProducts(JSON.parse(decode(match[1])), products); } catch { /* ignore malformed unrelated JSON-LD */ }
  }

  const pageText = decode(html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const output: LidlPublicOffer[] = [];
  for (const product of products) {
    const name = String(product.name || "").trim();
    const brandName = typeof product.brand === "string" ? product.brand.trim() : String(product.brand?.name || "").trim();
    const offers = Array.isArray(product.offers) ? product.offers : product.offers ? [product.offers] : [];
    for (const offer of offers) {
      const price = money(offer?.price ?? offer?.priceSpecification?.price);
      const validFrom = isoDate(offer?.validFrom ?? offer?.priceSpecification?.validFrom);
      const validUntil = isoDate(offer?.validThrough ?? offer?.priceValidUntil ?? offer?.priceSpecification?.validThrough ?? offer?.priceSpecification?.priceValidUntil);
      if (!name || price == null || !validFrom || !validUntil) continue;
      if (publicationState({ validFrom, validUntil }, date) === "invalid") continue;

      const needle = normalize(name);
      const textIndex = needle ? normalize(pageText).indexOf(needle) : -1;
      const rawWindow = textIndex >= 0 ? normalize(pageText).slice(Math.max(0, textIndex - 100), textIndex + needle.length + 500) : normalize([product.description, offer.description].filter(Boolean).join(" "));
      const requiresLidlPlus = /lidl plus|lidlplus/.test(rawWindow);
      const limitedBatch = /\bera\b|erä/.test(rawWindow);
      const quantity = Number(name.match(/\b(\d+)\s*kpl\b/i)?.[1] || 0);
      const weighted = /(?:€|eur)\s*\/\s*kg|hinta\s*\/\s*kg|\birto\b/i.test([product.description, offer.description, rawWindow].join(" "));
      const priceBasis: LidlPublicOffer["priceBasis"] = weighted ? "per-kg" : quantity >= 2 ? "multi-buy-total" : "unit";
      const imageCandidate = Array.isArray(product.image) ? product.image[0] : product.image;
      const imageUrl = typeof imageCandidate === "string" && /^https:\/\//.test(imageCandidate) ? imageCandidate : "";
      const original = money(offer?.priceSpecification?.referencePrice ?? offer?.highPrice);
      const key = normalize([brandName, name, validFrom, validUntil, price].join(" ")).replace(/\s+/g, "-");
      const category = categoryFor(name, sourceUrl);
      output.push({
        id: `lidl-fi-${key}`, source: "lidl-fi-public", chain: "Lidl",
        title: name, name, productName: name, brandName,
        price, offerPrice: price, priceText: `${price.toFixed(2).replace(".", ",")} €`,
        originalPrice: original, normalPrice: original,
        priceBasis, ...(quantity >= 2 ? { multiBuyQuantity: quantity, multiBuyTotalPrice: price } : {}),
        requiresLidlPlus, eligibility: requiresLidlPlus ? "lidl-plus" : limitedBatch ? "limited-batch" : "open",
        validFrom, validUntil, validityText: `Voimassa ${validFrom}–${validUntil}`,
        imageUrl, image: imageUrl, pictureUrl: imageUrl,
        category, categoryPath: category, mainCategory: category,
        rawText: [brandName, name, product.description, offer.description, category].filter(Boolean).join(" "),
        sourceUrl, hasConcretePrice: true, isWeightedProduct: weighted, ean: "",
      });
    }
  }
  return output;
}

function categoryLinks(html: string) {
  const decoded = html.replace(/\\u002F/g, "/").replace(/\\\//g, "/");
  return [...new Set([...decoded.matchAll(/\/h\/[a-z0-9åäö-]+\/h\d{5,}/gi)].map(match => match[0]))];
}

async function fetchHtml(path: string) {
  const url = path.startsWith("http") ? path : BASE + path;
  const response = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Lidl.fi ${response.status}: ${url}`);
  return { url: response.url, html: await response.text() };
}

export async function fetchLidlPublicLeafletOffers(options: { date?: string; includeUpcoming?: boolean } = {}) {
  const date = options.date || finnishPublicationDate();
  const discovered = new Set<string>(SEEDS.filter(path => path !== "/"));
  const discoveryPages = await Promise.allSettled(SEEDS.map(fetchHtml));
  for (const result of discoveryPages) if (result.status === "fulfilled")
    for (const link of categoryLinks(result.value.html)) discovered.add(link);

  // Guard against an accidental navigation explosion. Lidl category URLs are enough;
  // individual /p/ product pages are deliberately excluded.
  const paths = [...discovered].slice(0, 80);
  const pages = await Promise.allSettled(paths.map(fetchHtml));
  const parsed: LidlPublicOffer[] = [];
  let failedPages = 0;
  for (const result of pages) {
    if (result.status === "rejected") { failedPages++; continue; }
    parsed.push(...parseLidlPublicCategoryHtml(result.value.html, result.value.url, date));
  }

  const byKey = new Map<string, LidlPublicOffer>();
  for (const row of parsed) {
    const state = publicationState({ validFrom: row.validFrom, validUntil: row.validUntil }, date);
    if (state === "expired" || state === "invalid" || (!options.includeUpcoming && state !== "current")) continue;
    const key = normalize([row.brandName, row.name, row.validFrom, row.validUntil].join(" "));
    const old = byKey.get(key);
    if (!old || (row.imageUrl && !old.imageUrl)) byKey.set(key, row);
  }
  return {
    offers: [...byKey.values()],
    audit: { date, discoveredCategoryPages: paths.length, fetchedCategoryPages: pages.length - failedPages, failedPages, parsedRows: parsed.length, uniqueRows: byKey.size },
  };
}

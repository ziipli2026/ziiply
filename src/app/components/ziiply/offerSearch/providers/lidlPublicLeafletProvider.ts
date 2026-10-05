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
  "/c/lidl-plus-kupongit/",
  "/c/lidl-plus/",
  "/c/template_sales_campaigns/",
  "/c/tarjouslehdet/",
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

const GROCERY_CATEGORIES = new Set([
  "Hevi", "Maitotuotteet", "Liha & makkarat", "Kala", "Leipomo", "Pakasteet",
  "Valmisruoka", "Juomat", "Kahvi & tee", "Kuivatuotteet", "Makeiset & keksit",
  "Lastenruoat", "Lemmikit", "Kodinhoito",
]);

function categoryFor(name: string, sourceUrl: string) {
  const s = normalize(name + " " + sourceUrl);
  // Explicit non-food exclusions run first so words such as "liha" in a tool
  // name can never leak a general-merchandise campaign into Gösta.
  if (/vaate|asuste|lupilu|esmara|silvercrest|parkside|livarno|tyokalu|kodinkone|airfryer|rasvakeitin|raastin|imuri|puhallin|pumppu|ruuvinvaannin|vasara|lelu|rakennussarja|kosmeti|shampoo|deodorant|hammastahna/.test(s)) return "Muut";
  if (/pyykin|astianpesu|pesuaine|puhdistus|talouspaperi|wc paperi|wc-paperi|vessapaperi|siivous/.test(s)) return "Kodinhoito";
  if (/vihanne|hedelm|tomaatti|peruna|kaali|porkkana|sipuli|kurkku|omena|banaani|selleri|punajuuri|paprika|salaatti|retiisi/.test(s)) return "Hevi";
  if (/juusto|maito|jogur|rahka|kerma|voi\b|kananmuna|viili|piima/.test(s)) return "Maitotuotteet";
  if (/liha|kana|broiler|nauta|sika|pors|makkara|nakki|pekoni|kinkku|jauheliha|lihapulla|nugget/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|katkarapu|tonnikala|silakka|seiti/.test(s)) return "Kala";
  if (/paistopiste|leip|croissant|pull|sampyl|rieska|patonki|karjalanpiirakka/.test(s)) return "Leipomo";
  if (/pakaste|jaatelo|jäätelö/.test(s)) return "Pakasteet";
  if (/valmisateria|pizza|keitto|ateria|nyytti|pata|laatikko|lasagne|wokki|risotto/.test(s)) return "Valmisruoka";
  if (/kahvi|espresso|cappuccino|tee\b/.test(s)) return "Kahvi & tee";
  if (/juoma|mehu|vesi|limu|cola|vichy|energiajuoma/.test(s)) return "Juomat";
  if (/kark|makeis|suklaa|keksi|sips|chips|lakrit|salmiak|purukumi/.test(s)) return "Makeiset & keksit";
  if (/lastenruo|vauvanruo|aidinmaidonkorvike/.test(s)) return "Lastenruoat";
  if (/koira|kissa|lemmik/.test(s)) return "Lemmikit";
  if (/pasta|riisi|jauho|hiutale|muro|mysli|sailyke|säilyke|kastike|oljy|öljy|mauste|sokeri|suola|nuudeli|makaroni|spagetti|pahkina|pähkinä/.test(s)) return "Kuivatuotteet";
  // Unknown is deliberately "Muut", never Kuivatuotteet. New products must earn
  // a grocery category before they can become visible in the grocery leaflet.
  return "Muut";
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

export function parseLidlGridDataOffers(html: string, sourceUrl: string, date = finnishPublicationDate()): LidlPublicOffer[] {
  const output: LidlPublicOffer[] = [];
  for (const match of html.matchAll(/data-grid-data="([^"]+)"/gi)) {
    let product: AnyRecord;
    try { product = JSON.parse(decode(match[1])); } catch { continue; }
    const name = String(product.fullTitle || product.title || product.keyfacts?.fullTitle || "").trim();
    const brandName = String(product.brand?.name || product.brandName || "").trim();
    const price = money(product.price?.price);
    const fromTs = Number(product.storeStartDate || product.stockAvailability?.badgeInfoV2?.[0]?.validFrom || 0);
    const untilTs = Number(product.storeEndDate || product.stockAvailability?.badgeInfoV2?.[0]?.validUntil || 0);
    const validFrom = fromTs ? new Date(fromTs * 1000).toISOString().slice(0,10) : "";
    const validUntil = untilTs ? new Date(untilTs * 1000).toISOString().slice(0,10) : "";
    if (!name || price == null || !validFrom || !validUntil) continue;
    if (publicationState({ validFrom, validUntil }, date) === "invalid") continue;
    const baseText = String(product.price?.basePrice?.text || "");
    const packageText = baseText.match(/^([^|]+)\|/)?.[1]?.trim() || "";
    const fullName = packageText && !normalize(name).includes(normalize(packageText)) ? `${name} ${packageText}` : name;
    const discountText = String(product.price?.discount?.discountText || "");
    const limitedBatch = /erä/i.test(discountText);
    const quantity = Number(fullName.match(/\b(\d+)\s*kpl\b/i)?.[1] || 0);
    const weighted = /(?:€|eur)\s*\/\s*kg/i.test(baseText) && !packageText;
    const priceBasis: LidlPublicOffer["priceBasis"] = weighted ? "per-kg" : quantity >= 2 ? "multi-buy-total" : "unit";
    const imageUrl = typeof product.image === "string" && /^https:\/\//.test(product.image) ? product.image : "";
    const category = categoryFor([brandName, fullName, product.keyfacts?.wonCategoryPrimary].filter(Boolean).join(" "), sourceUrl);
    output.push({
      id: `lidl-fi-grid-${product.productId || product.itemId || normalize(fullName)}-${validFrom}`,
      source: "lidl-fi-public", chain: "Lidl", title: fullName, name: fullName, productName: fullName, brandName,
      price, offerPrice: price, priceText: `${price.toFixed(2).replace(".", ",")} €`, originalPrice: money(product.price?.oldPrice), normalPrice: money(product.price?.oldPrice),
      priceBasis, ...(quantity >= 2 ? { multiBuyQuantity: quantity, multiBuyTotalPrice: price } : {}),
      requiresLidlPlus: false, eligibility: limitedBatch ? "limited-batch" : "open",
      validFrom, validUntil, validityText: `Voimassa ${validFrom}–${validUntil}`,
      imageUrl, image: imageUrl, pictureUrl: imageUrl, category, categoryPath: category, mainCategory: category,
      rawText: [brandName, fullName, baseText, discountText, category].filter(Boolean).join(" "), sourceUrl,
      hasConcretePrice: true, isWeightedProduct: weighted, ean: "",
    });
  }
  return output;
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
      const imageObjectUrl = imageCandidate && typeof imageCandidate === "object"
        ? (imageCandidate.url || imageCandidate.contentUrl || imageCandidate["@id"])
        : "";
      const offerImage = offer?.image || offer?.imageUrl || offer?.priceSpecification?.image;
      const imageValue = typeof imageCandidate === "string" ? imageCandidate : imageObjectUrl || offerImage;
      const imageUrl = typeof imageValue === "string" && /^https:\/\//.test(imageValue) ? imageValue : "";
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

function discoveryLinks(html: string) {
  const decoded = html.replace(/\\u002F/g, "/").replace(/\\\//g, "/");
  const category = [...decoded.matchAll(/\/h\/[a-z0-9åäö-]+\/h\d{5,}/gi)].map(match => match[0]);
  // Lidl's active campaign hub links live under /c/. Discover them dynamically.
  // Current Lidl campaign landing pages use an article id after the slug
  // (for example /c/uutta-valikoimassa/a10026611). The old matcher stopped at
  // /c/uutta-valikoimassa/, so we fetched a non-canonical/empty hub and never
  // reached the campaign's concrete /p/ product cards.
  const campaigns = [...decoded.matchAll(/\/c\/[a-z0-9åäö_-]+(?:\/(?:a|s)\d+)?\/?/gi)]
    .map(match => match[0])
    .filter(path => !/asiakaspalvelu|tietosuoja|evaste|saavutettavuus|yritys|ura/i.test(path));
  return [...new Set([...category, ...campaigns])];
}

function campaignProductJson(html: string) {
  const decoded = html
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/\\u0022/g, '"')
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/");
  const candidates: unknown[] = [];
  for (const match of decoded.matchAll(/\{[^{}]{0,12000}"(?:productName|name)"[^{}]{0,12000}\}/gi)) {
    try {
      const value = JSON.parse(match[0]);
      if (value && typeof value === "object") candidates.push(value);
    } catch {}
  }
  return candidates;
}

function parseCampaignVisibleProducts(html: string, sourceUrl: string, fallbackDate: string): LidlPublicOffer[] {
  const text = decode(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n"))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n");

  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  const output: LidlPublicOffer[] = [];
  const datePattern = /Myymälässä\s+(\d{1,2})\.(\d{1,2})\.\s*-\s*(\d{1,2})\.(\d{1,2})\./i;
  const pricePattern = /^(\d{1,3})[,.](\d{2})\s*€?$/;

  for (let i = 0; i < lines.length; i++) {
    const validity = lines[i].match(datePattern);
    if (!validity) continue;
    const year = Number(fallbackDate.slice(0, 4));
    const startMonth = Number(validity[2]);
    const endMonth = Number(validity[4]);
    const validFrom = `${year}-${String(startMonth).padStart(2, "0")}-${String(validity[1]).padStart(2, "0")}`;
    const endYear = endMonth < startMonth ? year + 1 : year;
    const validUntil = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(validity[3]).padStart(2, "0")}`;
    const window = lines.slice(Math.max(0, i - 12), i);
    let priceIndex = -1;
    for (let j = window.length - 1; j >= 0; j--) if (pricePattern.test(window[j])) { priceIndex = j; break; }
    if (priceIndex < 1) continue;
    const priceMatch = window[priceIndex].match(pricePattern);
    const price = priceMatch ? Number(`${priceMatch[1]}.${priceMatch[2]}`) : NaN;
    if (!Number.isFinite(price) || price <= 0) continue;

    const ignored = /^(alkaen|erilaisia|uutuus|lidl plus|\-\d+€|\d+\s*kpl\s*(?:jopa\s*)?-?\d+%|\d+\s*(?:g|kg|ml|l|kpl|cm)|\d+[,.]\d+\s*€\/kg)/i;
    let name = "";
    for (let j = priceIndex - 1; j >= 0; j--) {
      const candidate = window[j].replace(/\s*\^\{\}\s*$/, "").trim();
      if (!candidate || ignored.test(candidate) || pricePattern.test(candidate)) continue;
      if (candidate.length >= 3 && candidate.length <= 120) { name = candidate; break; }
    }
    if (!name) continue;
    const category = categoryFor(name, sourceUrl);
    if (!GROCERY_CATEGORIES.has(category)) continue;
    if (publicationState({ validFrom, validUntil }, fallbackDate) !== "current") continue;

    const key = normalize([name, price, validFrom, validUntil].join(" ")).replace(/\s+/g, "-");
    output.push({
      id: `lidl-fi-campaign-visible-${key}`, source: "lidl-fi-public", chain: "Lidl",
      title: name, name, productName: name, brandName: "",
      price, offerPrice: price, priceText: `${price.toFixed(2).replace(".", ",")} €`,
      originalPrice: null, normalPrice: null, priceBasis: "unit",
      requiresLidlPlus: false, eligibility: "open",
      validFrom, validUntil, validityText: `Voimassa ${validFrom}–${validUntil}`,
      imageUrl: "", image: "", pictureUrl: "",
      category, categoryPath: category, mainCategory: category,
      rawText: [name, category].join(" "), sourceUrl, hasConcretePrice: true,
      isWeightedProduct: false, ean: "",
    });
  }
  return output;
}

function parseCampaignProductCards(html: string, sourceUrl: string, fallbackDate: string): LidlPublicOffer[] {
  const output: LidlPublicOffer[] = [];
  for (const raw of campaignProductJson(html)) {
    const product = raw as Record<string, any>;
    const offer = (product.offers && typeof product.offers === "object" ? product.offers : product) as Record<string, any>;
    const name = String(product.productName || product.name || product.title || "").trim();
    const brandName = typeof product.brand === "string" ? product.brand : String(product.brand?.name || product.brandName || "").trim();
    const price = money(offer.price ?? offer.offerPrice ?? product.price ?? product.offerPrice);
    if (!name || price == null || price <= 0) continue;
    const validFrom = isoDate(offer.validFrom || offer.startDate || product.validFrom || product.startDate) || fallbackDate;
    const validUntil = isoDate(offer.validUntil || offer.endDate || product.validUntil || product.endDate) || fallbackDate;
    const category = categoryFor([brandName, name, product.description, product.category].filter(Boolean).join(" "), sourceUrl);
    if (!GROCERY_CATEGORIES.has(category)) continue;
    const imageUrl = (() => {
      const candidate = product.image || product.imageUrl || product.pictureUrl || offer.image || offer.imageUrl;
      const value = Array.isArray(candidate) ? candidate[0] : candidate;
      if (typeof value === "string") return /^https:\/\//.test(value) ? value : "";
      if (value && typeof value === "object") {
        const url = value.url || value.contentUrl || value["@id"] || "";
        return typeof url === "string" && /^https:\/\//.test(url) ? url : "";
      }
      return "";
    })();
    output.push({
      id: "lidl-fi-campaign-" + normalize([brandName, name, price, validFrom, validUntil].join("-")),
      source: "lidl-fi-public", chain: "Lidl",
      title: name, name, productName: name, brandName, price, priceText: `${price.toFixed(2).replace(".", ",")} €`, offerPrice: price,
      originalPrice: money(product.originalPrice ?? offer.originalPrice),
      normalPrice: money(product.normalPrice ?? offer.normalPrice ?? product.originalPrice ?? offer.originalPrice),
      priceBasis: "unit", isWeightedProduct: false, requiresLidlPlus: false, eligibility: "open",
      validFrom, validUntil, validityText: `Voimassa ${validFrom}–${validUntil}`,
      imageUrl, image: imageUrl, pictureUrl: imageUrl, category, categoryPath: category, mainCategory: category,
      rawText: [brandName, name, product.description, category].filter(Boolean).join(" "), sourceUrl, hasConcretePrice: true, ean: "",
    });
  }
  return output;
}

function productLinks(html: string) {
  const decoded = html.replace(/\\u002F/g, "/").replace(/\\\//g, "/");
  return [...new Set(
    [...decoded.matchAll(/\/p\/[a-z0-9åäö_-]+\/p\d{5,}/gi)].map(match => match[0])
  )];
}

async function fetchHtml(path: string) {
  const url = path.startsWith("http") ? path : BASE + path;
  const response = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Lidl.fi ${response.status}: ${url}`);
  return { url: response.url, html: await response.text() };
}

async function fetchHtmlCached(path: string) {
  const url = path.startsWith("http") ? path : BASE + path;
  const response = await fetch(url, {
    headers: HEADERS,
    cache: "force-cache",
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Lidl.fi ${response.status}: ${url}`);
  return { url: response.url, html: await response.text() };
}


export async function fetchLidlPublicCampaignOffers(options: { date?: string } = {}) {
  const date = options.date || finnishPublicationDate();

  // Gösta's Kampanjat feed must stay lightweight. The known grocery /h/ pages
  // are the authoritative first-party campaign surface we need here. Do not
  // crawl Lidl navigation/discovery and then fan out to dozens of extra pages:
  // that made every foreground Kampanjat request slow.
  const paths = [...new Set(SEEDS.filter(path => /\/h\//i.test(path)))];
  const pages = await Promise.allSettled(paths.map(fetchHtmlCached));
  const parsed: LidlPublicOffer[] = [];
  let failedPages = 0;

  for (const result of pages) {
    if (result.status === "rejected") { failedPages++; continue; }
    parsed.push(...[
      ...parseLidlPublicCategoryHtml(result.value.html, result.value.url, date),
      ...parseCampaignVisibleProducts(result.value.html, result.value.url, date),
    ].filter(row => GROCERY_CATEGORIES.has(row.category)));
  }

  const byKey = new Map<string, LidlPublicOffer>();
  for (const row of parsed) {
    if (publicationState({ validFrom: row.validFrom, validUntil: row.validUntil }, date) !== "current") continue;
    const key = normalize([row.brandName, row.name, row.validFrom, row.validUntil].join(" "));
    const old = byKey.get(key);
    if (!old || (row.imageUrl && !old.imageUrl)) byKey.set(key, row);
  }

  return {
    offers: [...byKey.values()],
    audit: {
      date,
      discoveredCategoryPages: paths.length,
      fetchedCategoryPages: pages.length - failedPages,
      failedPages,
      parsedRows: parsed.length,
      uniqueRows: byKey.size,
    },
  };
}

export async function fetchLidlPublicLeafletOffers(options: { date?: string; includeUpcoming?: boolean } = {}) {
  const date = options.date || finnishPublicationDate();
  const discovered = new Set<string>(SEEDS.filter(path => path !== "/"));
  const discoveryPages = await Promise.allSettled(SEEDS.map(fetchHtml));
  for (const result of discoveryPages) if (result.status === "fulfilled")
    for (const link of discoveryLinks(result.value.html)) discovered.add(link);

  // First fetch active campaign/category hubs, then follow their concrete /p/
  // product links. Lidl campaign hubs often carry cards but the complete Product
  // JSON-LD (price/validity/image) lives on the product page itself.
  const paths = [...discovered].slice(0, 160);
  const pages = await Promise.allSettled(paths.map(fetchHtml));
  const productPaths = new Set<string>();
  const parsed: LidlPublicOffer[] = [];
  let failedPages = 0;
  for (const result of pages) {
    if (result.status === "rejected") { failedPages++; continue; }
    for (const link of productLinks(result.value.html)) productPaths.add(link);
    parsed.push(...parseLidlGridDataOffers(result.value.html, result.value.url, date).filter(row => GROCERY_CATEGORIES.has(row.category)));
    parsed.push(...parseLidlPublicCategoryHtml(result.value.html, result.value.url, date).filter(row => GROCERY_CATEGORIES.has(row.category)));
    // Campaign landing pages also embed their own product-card payloads. Parse
    // those directly instead of requiring every card to expose a /p/ link.
    if (/\/c\//i.test(result.value.url)) {
      parsed.push(...parseCampaignProductCards(result.value.html, result.value.url, date));
      parsed.push(...parseCampaignVisibleProducts(result.value.html, result.value.url, date));
    }
  }

  // Bound the fan-out: enough for the current grocery campaign surface while
  // preventing a site-wide crawl if Lidl changes navigation markup.
  const productPages = await Promise.allSettled([...productPaths].slice(0, 220).map(fetchHtml));
  let failedProductPages = 0;
  for (const result of productPages) {
    if (result.status === "rejected") { failedProductPages++; continue; }
    parsed.push(...parseLidlPublicCategoryHtml(result.value.html, result.value.url, date).filter(row => GROCERY_CATEGORIES.has(row.category)));
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
    audit: { date, discoveredCategoryPages: paths.length, fetchedCategoryPages: pages.length - failedPages, failedPages, discoveredProductPages: productPaths.size, fetchedProductPages: productPages.length - failedProductPages, failedProductPages, parsedRows: parsed.length, uniqueRows: byKey.size },
  };
}

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
  packageSize?: string;
  packageText?: string;
  comparisonPriceText?: string;
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
  "/c/tarjouslehdet/s10019134",
  "/c/w5-siivotut-hinnat/",
  "/h/hedelmaet-ja-vihannekset/h10071012",
  "/h/lihat-ja-makkarat/h10071016",
  "/h/lihat/h10095752",
  "/h/juustot-maitotuotteet-ja-kananmunat/h10095761",
  "/h/kuivatuotteet/h10096095",
  "/h/valmisateriat/h10097147",
  "/h/pakasteet-pakastetut-elintarvikkeet/h10071049",
  "/h/paistopiste-leipaet-ja-leivonnaiset/h10096086",
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

function discountBundleQuantity(label: unknown) {
  return Number(String(label ?? "").match(/^\s*([1-9]\d*)\s*kpl\s*[−-]\s*\d+(?:[,.]\d+)?\s*%\s*$/i)?.[1] || 0);
}

function visibleBundleQuantity(text: string, price: number) {
  const match = text.match(/\b([1-9]\d*\s*kpl\s*[−-]\s*\d+(?:[,.]\d+)?\s*%)\s*(\d+[,.]\d{2})\s*€/i);
  return match && money(match[2]) === price ? discountBundleQuantity(match[1]) : 0;
}

const GROCERY_CATEGORIES = new Set([
  "Hevi", "Maitotuotteet", "Liha & makkarat", "Kala", "Leipomo", "Pakasteet",
  "Valmisruoka", "Juomat", "Kahvi & tee", "Kuivatuotteet", "Makeiset & keksit",
  "Lastenruoat", "Lemmikit", "Kodinhoito",
]);

/** Classify the actual product before considering the Lidl landing-page department.
 * Lidl sometimes displays food under an unrelated /h/ page; that page is not
 * evidence that a potato is frozen or a glögi is meat.
 */
function lidlProductCategory(name: string): string | null {
  const s = normalize(name);
  // Exclude non-grocery merchandise before food words (toy ice-cream carts).
  if (/\b(?:lelu\w*|lelut|jaatelokarry|makeiskoju|puinen|joulukaktus\w*|kukk\w*|kasvi\w*|parkside|silvercrest|esmara|livarno|vaatte\w*|tyokalu\w*|kodinkone\w*)\b/.test(s)) return "Muut";
  if (/\b(?:koira\w*|kissa\w*|lemmik\w*|elainten\w*)\b/.test(s)) return "Lemmikit";
  if (/\b(?:pyykinpesu\w*|astianpesu\w*|pesuaine\w*|talouspaperi\w*|wc paperi\w*)\b/.test(s)) return "Kodinhoito";
  if (/\b(?:glögi\w*|glogi\w*|limonadi\w*|energiajuoma\w*|smoothie\w*|mehu\w*|juoma\w*|olut\w*)\b/.test(s)) return "Juomat";
  if (/\b(?:kahvi\w*|espresso\w*|tee)\b/.test(s)) return "Kahvi & tee";
  if (/\b(?:lihapyor\w*|lihapyory\w*|kana\w*|broiler\w*|kinkku\w*|pekoni\w*|salami\w*|jauheliha\w*|naudan\w*|pors\w*|bresaola\w*|prosciutto\w*)\b/.test(s)) return "Liha & makkarat";
  if (/\b(?:lohi\w*|kala\w*|tonnikala\w*|ahven\w*)\b/.test(s)) return "Kala";
  if (/\b(?:pizza\w*|pitsa\w*|perunapaistos\w*|lasagne\w*|valmisateria\w*)\b/.test(s)) return "Valmisruoka";
  if (/\b(?:uuniperuna\w*|peruna\w*|sipuli\w*|omena\w*|avokado\w*|granaattiomena\w*|meloni\w*|salaatti\w*|paprika\w*)\b/.test(s)) return "Hevi";
  if (/\b(?:jaatelo\w*|pakaste\w*|pakastettu\w*|torttutaikina\w*|piparitaikina\w*)\b/.test(s)) return "Pakasteet";
  if (/\b(?:pikkuleipa\w*|keksi\w*|nougat\w*|konvehti\w*|karamelli\w*|suklaa\w*|makeis\w*|karkki\w*|tikkari\w*|piparkakku\w*)\b/.test(s)) return "Makeiset & keksit";
  if (/(?:tahtitorttu|croissant|sampyla|patonki|pullava|voisilmapulla|leivos|panettone|pandoro|juustokakku|kakku\w*|torttu\w*)/.test(s)) return "Leipomo";
  if (/\b(?:juusto\w*|jogurtti\w*|rahka\w*|maito\w*|kerma\w*|moussejalkiruoka\w*)\b/.test(s)) return "Maitotuotteet";
  if (/\b(?:aurinkokuivattu\w*|sailyke\w*|pastakastike\w*|pesto|oliivioljy\w*|marmeladi\w*|pistaasikreemi\w*)\b/.test(s)) return "Kuivatuotteet";
  return null;
}

function categoryFor(name: string, sourceUrl: string) {
  const productCategory = lidlProductCategory(name);
  if (productCategory) return productCategory;
  const s = normalize(name);
  // Whole words/product tokens only: never match 'liha' inside 'alkoholijuomat',
  // 'pulla' inside 'lihapulla' or 'voi' inside 'voisilmapulla'.
  if (/\b(?:vaate\w*|asuste\w*|lupilu|esmara|silvercrest|parkside|livarno|tyokalu\w*|kodinkone\w*|airfryer|rasvakeitin|raastin|imuri|puhallin|pumppu|ruuvinvaannin|vasara|lelu\w*|rakennussarja|kosmeti\w*|shampoo|deodorant|hammastahna)\b/.test(s)) return "Muut";
  if (/\b(?:pyykin\w*|astianpesu\w*|pesuaine\w*|puhdistus\w*|talouspaperi\w*|siivous\w*)\b/.test(s)) return "Kodinhoito";
  if (/\b(?:vihanne\w*|hedelm\w*|tomaatti\w*|peruna\w*|kaali\w*|porkkana\w*|sipuli\w*|kurkku\w*|omena\w*|banaani\w*|selleri\w*|punajuuri\w*|paprika\w*|salaatti\w*)\b/.test(s)) return "Hevi";
  if (/\b(?:leipa\w*|croissant\w*|pulla\w*|sampyla\w*|rieska\w*|patonki\w*)\b/.test(s)) return "Leipomo";
  if (/\b(?:juusto\w*|maito\w*|jogurtti\w*|rahka\w*|kerma\w*|kananmuna\w*|viili\w*|piima\w*)\b/.test(s)) return "Maitotuotteet";
  if (/\b(?:liha\w*|kana\w*|broiler\w*|nauta\w*|sika|pors\w*|makkara\w*|nakki\w*|pekoni\w*|kinkku\w*|jauheliha\w*|lihapulla\w*|nugget\w*)\b/.test(s)) return "Liha & makkarat";
  if (/\b(?:kala\w*|lohi\w*|katkarapu\w*|tonnikala\w*|silakka\w*|seiti)\b/.test(s)) return "Kala";
  if (/\b(?:pakaste\w*|jaatelo\w*)\b/.test(s)) return "Pakasteet";
  if (/\b(?:valmisateria\w*|pizza\w*|keitto\w*|ateria\w*|lasagne\w*|wokki|risotto)\b/.test(s)) return "Valmisruoka";
  if (/\b(?:kahvi\w*|espresso\w*|cappuccino\w*|tee)\b/.test(s)) return "Kahvi & tee";
  if (/\b(?:juoma\w*|mehu\w*|vesi|limu\w*|cola|vichy|energiajuoma\w*|glogi\w*)\b/.test(s)) return "Juomat";
  if (/\b(?:kark\w*|makeis\w*|suklaa\w*|keksi\w*|sips\w*|chips|lakrit\w*|salmiak\w*)\b/.test(s)) return "Makeiset & keksit";
  if (/\b(?:lastenruo\w*|vauvanruo\w*|aidinmaidonkorvike\w*)\b/.test(s)) return "Lastenruoat";
  if (/\b(?:pasta\w*|riisi\w*|jauho\w*|hiutale\w*|muro\w*|mysli\w*|sailyke\w*|kastike\w*|oljy\w*|mauste\w*|sokeri\w*|suola\w*|nuudeli\w*|makaroni\w*|spagetti\w*|pahkina\w*)\b/.test(s)) return "Kuivatuotteet";
  // Unknown products must not be assigned a grocery category based only on
  // the URL of a mixed campaign/category page.
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
    const packagingText = String(product.price?.packaging?.text || "");
    const baseText = String(product.price?.basePrice?.text || "");
    const packageText = [product.packageSize, product.packSize, product.keyfacts?.packageSize,
      product.keyfacts?.quantity, packagingText.split("|")[0], name, baseText.split("|")[0]]
      .map(value => String(value ?? "").trim())
      .filter(text => !/(?:€|eur)\s*\/|\b(?:kg|l)\s*=\s*\d/i.test(text))
      .map(text => text.match(/\b(?:(?:n\.|noin)\s*)?(?:\d+\s*[x×]\s*)?\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l|kpl)\b/i)?.[0])
      .find(Boolean) || "";
    const comparisonPriceText = [packagingText, baseText].join(" ")
      .match(/\d+(?:[,.]\d+)?\s*(?:€|eur)\s*\/\s*(?:kg|l|100\s*g|100\s*ml)\b/i)?.[0] || "";
    const fullName = name;
    const discountText = String(product.price?.discount?.discountText || "");
    const limitedBatch = /erä/i.test(discountText);
    const defaultRegion = Object.values(product.regionsV2 ?? {}).find((region: any) => region?.isDefault === true) as AnyRecord | undefined;
    const regionalPrice = defaultRegion ? product.regionsPrices?.[defaultRegion.regionPriceId]?.currentPrice : undefined;
    const regionalQuantity = money(regionalPrice?.price) === price
      ? discountBundleQuantity(regionalPrice?.discount?.discountText)
      : 0;
    const quantity = discountBundleQuantity(discountText) || regionalQuantity || Number(fullName.match(/\b(\d+)\s*kpl\b/i)?.[1] || 0);
    const weighted = quantity < 2 && /(?:€|eur)\s*\/\s*kg/i.test([packagingText, baseText].join(" ")) && !packageText;
    const priceBasis: LidlPublicOffer["priceBasis"] = weighted ? "per-kg" : quantity >= 2 ? "multi-buy-total" : "unit";
    const imageUrl = (() => {
      const candidate = product.image ?? product.imageUrl ?? product.pictureUrl ?? product.keyfacts?.image;
      const value = Array.isArray(candidate) ? candidate[0] : candidate;
      if (typeof value === "string") return /^https:\/\//.test(value) ? value : "";
      if (value && typeof value === "object") {
        const url = value.url || value.contentUrl || value["@id"] || "";
        return typeof url === "string" && /^https:\/\//.test(url) ? url : "";
      }
      return "";
    })();
    const category = categoryFor([brandName, fullName].filter(Boolean).join(" "), sourceUrl);
    output.push({
      id: `lidl-fi-grid-${product.productId || product.itemId || normalize(fullName)}-${validFrom}`,
      source: "lidl-fi-public", chain: "Lidl", title: fullName, name: fullName, productName: fullName, brandName,
      price, offerPrice: price, priceText: `${price.toFixed(2).replace(".", ",")} €${quantity >= 2 ? ` / ${quantity} kpl` : ""}`, originalPrice: money(product.price?.oldPrice), normalPrice: money(product.price?.oldPrice),
      priceBasis, packageSize: packageText, packageText, comparisonPriceText, ...(quantity >= 2 ? { multiBuyQuantity: quantity, multiBuyTotalPrice: price } : {}),
      requiresLidlPlus: false, eligibility: limitedBatch ? "limited-batch" : "open",
      validFrom, validUntil, validityText: `Voimassa ${validFrom}–${validUntil}`,
      imageUrl, image: imageUrl, pictureUrl: imageUrl, category, categoryPath: category, mainCategory: category,
      rawText: [brandName, fullName, packagingText, baseText, discountText, category].filter(Boolean).join(" "), sourceUrl,
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
      const packageSize = [product.size, product.weight, product.description, name].map(value => String(value ?? "").match(/\b(?:\d+\s*[x×]\s*)?\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l|kpl)\b/i)?.[0] || "").find(Boolean) || "";
      const comparisonPriceText = [offer.description, product.description].map(value => String(value ?? "").match(/\d+(?:[,.]\d+)?\s*(?:€|eur)\s*\/\s*(?:kg|l|100\s*g|100\s*ml)\b/i)?.[0] || "").find(Boolean) || "";
      const quantity = (products.length === 1 && /\/p\//i.test(sourceUrl) ? visibleBundleQuantity(pageText, price) : 0) || Number(name.match(/\b(\d+)\s*kpl\b/i)?.[1] || 0);
      const weighted = quantity < 2 && /(?:€|eur)\s*\/\s*kg|hinta\s*\/\s*kg|\birto\b/i.test([product.description, offer.description, rawWindow].join(" "));
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
        price, offerPrice: price, priceText: `${price.toFixed(2).replace(".", ",")} €${quantity >= 2 ? ` / ${quantity} kpl` : ""}`,
        originalPrice: original, normalPrice: original,
        packageSize, packageText: packageSize, comparisonPriceText,
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
  const datePattern = /Myymälässä\s+(\d{1,2})\.(\d{1,2})\.\s*(?:-|–|—)\s*(\d{1,2})\.(\d{1,2})\./i;
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
    let priceMatch: RegExpMatchArray | null = null;
    for (let j = window.length - 1; j >= 0; j--) {
      const match = window[j].match(pricePattern);
      if (match) { priceIndex = j; priceMatch = match; break; }
    }
    if (priceIndex < 1 || !priceMatch) continue;
    const price = Number(`${priceMatch[1]}.${priceMatch[2]}`);
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

    const quantity = discountBundleQuantity(window[priceIndex - 1]);
    const key = normalize([name, price, validFrom, validUntil].join(" ")).replace(/\s+/g, "-");
    output.push({
      id: `lidl-fi-campaign-visible-${key}`, source: "lidl-fi-public", chain: "Lidl",
      title: name, name, productName: name, brandName: "",
      price, offerPrice: price, priceText: `${price.toFixed(2).replace(".", ",")} €${quantity >= 2 ? ` / ${quantity} kpl` : ""}`,
      originalPrice: null, normalPrice: null, priceBasis: quantity >= 2 ? "multi-buy-total" : "unit",
      ...(quantity >= 2 ? { multiBuyQuantity: quantity, multiBuyTotalPrice: price } : {}),
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
    const category = categoryFor([brandName, name].filter(Boolean).join(" "), sourceUrl);
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
    if (!old) byKey.set(key, row);
    else {
      // Preserve complementary details when the same offer is discovered on
      // category and product pages; neither source is always complete.
      const preferred = row.imageUrl && !old.imageUrl ? row : old;
      const other = preferred === row ? old : row;
      byKey.set(key, {
        ...preferred,
        packageSize: preferred.packageSize || other.packageSize || "",
        packageText: preferred.packageText || other.packageText || "",
        comparisonPriceText: preferred.comparisonPriceText || other.comparisonPriceText || "",
      });
    }
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
    if (!old) {
      byKey.set(key, row);
      continue;
    }
    const preferred = row.imageUrl && !old.imageUrl ? row : old;
    const other = preferred === row ? old : row;
    if (!preferred.multiBuyQuantity && other.multiBuyQuantity && preferred.price === other.price) {
      byKey.set(key, {
        ...preferred,
        priceBasis: other.priceBasis,
        priceText: other.priceText,
        multiBuyQuantity: other.multiBuyQuantity,
        multiBuyTotalPrice: other.multiBuyTotalPrice,
        isWeightedProduct: false,
      });
    } else {
      byKey.set(key, preferred);
    }
  }
  return {
    offers: [...byKey.values()],
    audit: { date, discoveredCategoryPages: paths.length, fetchedCategoryPages: pages.length - failedPages, failedPages, discoveredProductPages: productPaths.size, fetchedProductPages: productPages.length - failedProductPages, failedProductPages, parsedRows: parsed.length, uniqueRows: byKey.size },
  };
}

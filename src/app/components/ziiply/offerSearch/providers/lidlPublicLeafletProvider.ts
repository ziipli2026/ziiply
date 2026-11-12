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
  "/h/juustot-maitotuotteet-ja-kananmunat/h10095761",
  "/h/kuivatuotteet/h10096095",
  "/h/valmisateriat/h10097147",
  "/h/paistopiste-leipaet-ja-leivonnaiset/h10096086",
];

const LIDL_PACKAGE_MEASURE = /\b(?:\d+\s*[x×]\s*)?\d+(?:[,.]\d+)?\s*(?:kg|g|ml|cl|dl|l|kpl|pkt|pss)\b/i;
function lidlPackageSize(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
    if (!text || /(?:€|eur)\s*\/|\b(?:kg|l)\s*=\s*\d/i.test(text)) continue;
    const match = text.match(LIDL_PACKAGE_MEASURE);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return "";
}

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

/** Product form takes precedence over ingredients and broad campaign headings. */
function lidlProductCategory(name: string): string | null {
  const s = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Pet products must precede both clothing and fish/food substrings.
  if (/koira|kissa|lemmik|elainten|turkinhoito/.test(s)) return 'Lemmikit';
  if (/jaatelo|pakaste|pakastettu/.test(s)) return 'Pakasteet';
  if (/pikkuleip|keksi|nougat|konvehti|karamelli|suklaa|makeis|karkki|tikkari/.test(s)) return 'Makeiset & keksit';
  if (/pasteija|juustokierre|juustotanko|korvapuusti|croissant|sampyla|patonki|karjalanpiirakka|ruisleipa|rieska|leivonnainen|leivos/.test(s)) return 'Leipomo';
  if (/aurinkokuivattu|kuivattu tomaatti|sailyke|pastakastike|pesto\b|oliivioljy|marmeladi|pistaasikreemi/.test(s)) return 'Kuivatuotteet';
  if (/kaurajuoma|riisijuoma|soijajuoma|kookosjuoma|mantelijuoma/.test(s)) return 'Juomat';
  return null;
}

function categoryFor(name: string, sourceUrl: string) {
  const productCategory = lidlProductCategory(name);
  if (productCategory) return productCategory;
  const s = normalize(name + " " + sourceUrl);
  // Explicit non-food exclusions run first so words such as "liha" in a tool
  // name can never leak a general-merchandise campaign into Gösta.
  if (/vaate|asuste|lupilu|esmara|silvercrest|parkside|livarno|tyokalu|kodinkone|airfryer|rasvakeitin|raastin|imuri|puhallin|pumppu|ruuvinvaannin|vasara|lelu|rakennussarja|kosmeti|shampoo|deodorant|hammastahna/.test(s)) return "Muut";
  if (/pyykin|astianpesu|pesuaine|puhdistus|talouspaperi|wc paperi|wc-paperi|vessapaperi|siivous/.test(s)) return "Kodinhoito";
  if (/vihanne|hedelm|tomaatti|peruna|kaali|porkkana|sipuli|kurkku|omena|banaani|selleri|punajuuri|paprika|salaatti|retiisi/.test(s)) return "Hevi";
  if (/paistopiste|leip|croissant|pull|sampyl|rieska|patonki|karjalanpiirakka/.test(s)) return "Leipomo";
  if (/juusto|maito|jogur|rahka|kerma|voi\b|kananmuna|viili|piima/.test(s)) return "Maitotuotteet";
  if (/liha|kana|broiler|nauta|sika|pors|makkara|nakki|pekoni|kinkku|jauheliha|lihapulla|nugget/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|katkarapu|tonnikala|silakka|seiti/.test(s)) return "Kala";
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
    const packageText = lidlPackageSize(product.packageSize, product.packSize, product.keyfacts?.packageSize, product.keyfacts?.quantity, product.keyfacts?.weight, product.keyfacts?.netWeight, product.weight, product.size, product.description, name, baseText.split("|")[0]);
    const comparisonPriceText = baseText.match(/\d+(?:[,.]\d+)?\s*(?:€|eur)\s*\/\s*(?:kg|l|100\s*g|100\s*ml)\b/i)?.[0] || "";
    const fullName = packageText && !normalize(name).includes(normalize(packageText)) ? `${name} ${packageText}` : name;
    const discountText = String(product.price?.discount?.discountText || "");
    const limitedBatch = /erä/i.test(discountText);
    const quantity = Number(fullName.match(/\b(\d+)\s*kpl\b/i)?.[1] || 0);
    const weighted = /(?:€|eur)\s*\/\s*kg/i.test(baseText) && !packageText;
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
    const category = categoryFor([brandName, fullName, product.keyfacts?.wonCategoryPrimary].filter(Boolean).join(" "), sourceUrl);
    output.push({
      id: `lidl-fi-grid-${product.productId || product.itemId || normalize(fullName)}-${validFrom}`,
      source: "lidl-fi-public", chain: "Lidl", title: fullName, name: fullName, productName: fullName, brandName,
      price, offerPrice: price, priceText: `${price.toFixed(2).replace(".", ",")} €${quantity >= 2 ? ` / ${quantity} kpl` : ""}`, originalPrice: money(product.price?.oldPrice), normalPrice: money(product.price?.oldPrice),
      priceBasis, packageSize: packageText, packageText, comparisonPriceText, ...(quantity >= 2 ? { multiBuyQuantity: quantity, multiBuyTotalPrice: price } : {}),
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
      const packageSize = lidlPackageSize(product.packageSize, product.packSize, product.keyfacts?.packageSize, product.keyfacts?.quantity, product.keyfacts?.weight, product.keyfacts?.netWeight, product.size, product.weight, product.description, name);
      const comparisonPriceText = [offer.description, product.description].map(value => String(value ?? "").match(/\d+(?:[,.]\d+)?\s*(?:€|eur)\s*\/\s*(?:kg|l|100\s*g|100\s*ml)\b/i)?.[0] || "").find(Boolean) || "";
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

    const packageSize = lidlPackageSize(name, ...window.slice(Math.max(0, priceIndex - 2), priceIndex + 1));
    const key = normalize([name, price, validFrom, validUntil].join(" ")).replace(/\s+/g, "-");
    output.push({
      id: `lidl-fi-campaign-visible-${key}`, source: "lidl-fi-public", chain: "Lidl",
      title: name, name, productName: name, brandName: "",
      price, offerPrice: price, priceText: `${price.toFixed(2).replace(".", ",")} €`,
      originalPrice: null, normalPrice: null, priceBasis: "unit", packageSize, packageText: packageSize,
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
    const packageSize = lidlPackageSize(product.packageSize, product.packSize, product.packageText, product.keyfacts?.packageSize, product.keyfacts?.quantity, product.keyfacts?.netWeight, product.size, product.weight, product.description, offer.description, name);
    output.push({
      id: "lidl-fi-campaign-" + normalize([brandName, name, price, validFrom, validUntil].join("-")),
      source: "lidl-fi-public", chain: "Lidl",
      title: name, name, productName: name, brandName, price, priceText: `${price.toFixed(2).replace(".", ",")} €`, offerPrice: price,
      originalPrice: money(product.originalPrice ?? offer.originalPrice),
      normalPrice: money(product.normalPrice ?? offer.normalPrice ?? product.originalPrice ?? offer.originalPrice),
      priceBasis: "unit", packageSize, packageText: packageSize, isWeightedProduct: false, requiresLidlPlus: false, eligibility: "open",
      validFrom, validUntil, validityText: `Voimassa ${validFrom}–${validUntil}`,
      imageUrl, image: imageUrl, pictureUrl: imageUrl, category, categoryPath: category, mainCategory: category,
      rawText: [brandName, name, product.description, category].filter(Boolean).join(" "), sourceUrl, hasConcretePrice: true, ean: "",
    });
  }
  return output;
}

function gridProductLinks(html: string): string[] {
  const paths = new Set<string>();
  for (const match of html.matchAll(/data-grid-data="([^"]+)"/gi)) {
    try {
      const product = JSON.parse(decode(match[1])) as AnyRecord;
      for (const value of [product.url, product.productUrl, product.canonicalUrl, product.link, product.href, product.keyfacts?.url]) {
        if (typeof value !== "string") continue;
        const path = value.startsWith(BASE) ? value.slice(BASE.length) : value;
        if (/^\/p\/[a-z0-9åäö_-]+\/p\d{5,}(?:[/?#]|$)/i.test(path)) paths.add(path.split(/[?#]/)[0]);
      }
    } catch { /* skip malformed grid payload */ }
  }
  return [...paths];
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
    for (const link of [...productLinks(result.value.html), ...gridProductLinks(result.value.html)]) productPaths.add(link);
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
  // Prefer product links whose URL slug actually overlaps a parsed offer name.
  // Generic navigation links otherwise consume the 220-page budget before the
  // grocery offers are reached. Keep unrelated links only as a fallback.
  const offerTokens = parsed.map(row => new Set(normalize(row.name).split(" ").filter(token => token.length >= 4)));
  const rankedProductPaths = [...productPaths].map(path => {
    const slug = normalize(decodeURIComponent(path.split("/p/")[1] || ""));
    const tokens = slug.split(" ").filter(token => token.length >= 4);
    const score = offerTokens.reduce((best, nameTokens) => Math.max(best, tokens.filter(token => nameTokens.has(token)).length), 0);
    return { path, score };
  }).sort((a, b) => b.score - a.score);
  const prioritizedProductPaths = rankedProductPaths.slice(0, 220);
  const prioritizedMatchingPaths = prioritizedProductPaths.filter(item => item.score > 0).length;
  const strongProductPathMatches = prioritizedProductPaths.filter(item => item.score >= 2).length;
  const productPathSamples = prioritizedProductPaths.filter(item => item.score >= 2).slice(0, 8).map(item => ({ path: item.path, score: item.score }));
  const productPages = await Promise.allSettled(prioritizedProductPaths.map(item => fetchHtml(item.path)));
  let failedProductPages = 0;
  let productDetailParsedRows = 0;
  let productDetailPackageRows = 0;
  let productDetailJsonLdPages = 0;
  let productDetailGridPages = 0;
  let productDetailVisibleSizePages = 0;
  const detailSizes = new Map<string, Set<string>>();
  let productDetailNamedSizes = 0;
  let productDetailMetaSizes = 0;
  const productDetailSamples: Array<{ url: string; title: string; description: string; visibleMeasures?: string[]; nearbyText?: string }> = [];
  for (const result of productPages) {
    if (result.status === "rejected") { failedProductPages++; continue; }
    // Extract package metadata independently of campaign price/validity. Only
    // JSON-LD Product names can be used to match an offer; never borrow an
    // arbitrary weight from the page (it may belong to another product).
    for (const match of result.value.html.matchAll(/<script\b[^>]*type=["\x27]application\/ld\+json["\x27][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const products: AnyRecord[] = [];
        visitProducts(JSON.parse(decode(match[1])), products);
        for (const product of products) {
          const key = normalize(product.name);
          const size = lidlPackageSize(product.packageSize, product.packSize, product.keyfacts?.packageSize, product.keyfacts?.quantity, product.keyfacts?.weight, product.keyfacts?.netWeight, product.size, product.weight, product.description, product.name);
          if (!key || !size) continue;
          productDetailNamedSizes++;
          if (!detailSizes.has(key)) detailSizes.set(key, new Set());
          detailSizes.get(key)!.add(size);
        }
      } catch { /* unrelated malformed JSON-LD */ }
    }
    // A product's own metadata can contain the pack size even when JSON-LD
    // omits it. Do not search the entire page: recommendations and navigation
    // contain unrelated product weights.
    const metaTitle = result.value.html.match(new RegExp('<meta\\s+property=["\\x27]og:title["\\x27]\\s+content=["\\x27]([^"\\x27]+)["\\x27]', 'i'))?.[1]
      || result.value.html.match(new RegExp('<title[^>]*>([^<]+)</title>', 'i'))?.[1] || "";
    const metaDescription = result.value.html.match(new RegExp('<meta\\s+name=["\\x27]description["\\x27]\\s+content=["\\x27]([^"\\x27]+)["\\x27]', 'i'))?.[1] || "";
    if (productDetailSamples.length < 6 && /(?:juusto|maito|kaura|filee|makkara)/i.test(result.value.url)) {
      const visible = decode(result.value.html.replace(/<script\\b[\\s\\S]*?<\\/script>/gi, " ").replace(/<style\\b[\\s\\S]*?<\\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\\s+/g, " ");
      const measures = [...visible.matchAll(/\\b\\d+(?:[,.]\\d+)?\\s*(?:kg|g|ml|cl|dl|l|kpl)\\b/gi)].slice(0, 12).map(match => match[0]);
      const needle = normalize(metaTitle.split("|").pop()?.replace(/- Lidl.*/i, "") || "");
      const near = needle ? normalize(visible).indexOf(needle) : -1;
      productDetailSamples.push({ url: result.value.url, title: decode(metaTitle).slice(0, 120), description: decode(metaDescription).slice(0, 180), visibleMeasures: measures, nearbyText: near >= 0 ? normalize(visible).slice(near, near + 260) : "" });
    }
    const ownSize = lidlPackageSize(decode(metaTitle), decode(metaDescription));
    if (ownSize && metaTitle) {
      const key = normalize(metaTitle.replace(/\s*[|–-]\s*Lidl.*$/i, ""));
      if (key) {
        productDetailMetaSizes++;
        if (!detailSizes.has(key)) detailSizes.set(key, new Set());
        detailSizes.get(key)!.add(ownSize);
      }
    }
    if (/application\/ld\+json/i.test(result.value.html)) productDetailJsonLdPages++;
    if (/data-grid-data=/i.test(result.value.html)) productDetailGridPages++;
    if (LIDL_PACKAGE_MEASURE.test(decode(result.value.html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")))) productDetailVisibleSizePages++;
    const detailRows = parseLidlPublicCategoryHtml(result.value.html, result.value.url, date).filter(row => GROCERY_CATEGORIES.has(row.category));
    productDetailParsedRows += detailRows.length;
    productDetailPackageRows += detailRows.filter(row => Boolean(row.packageSize || row.packageText)).length;
    parsed.push(...detailRows);
  }

  let enrichedFromDetail = 0;
  const offerNameKeys = new Set(parsed.map(row => normalize(row.name)));
  const detailNameMatches = [...detailSizes.keys()].filter(key => offerNameKeys.has(key)).length;
  const detailNameSamples = [...detailSizes.keys()].slice(0, 8);
  const offerNameSamples = [...offerNameKeys].slice(0, 8);
  const byKey = new Map<string, LidlPublicOffer>();
  for (const originalRow of parsed) {
    const sizes = detailSizes.get(normalize(originalRow.name));
    const matchedSize = sizes?.size === 1 ? [...sizes][0] : "";
    const row = matchedSize && !originalRow.packageSize
      ? { ...originalRow, packageSize: matchedSize, packageText: originalRow.packageText || matchedSize }
      : originalRow;
    if (row !== originalRow) enrichedFromDetail++;

    const state = publicationState({ validFrom: row.validFrom, validUntil: row.validUntil }, date);
    if (state === "expired" || state === "invalid" || (!options.includeUpcoming && state !== "current")) continue;
    const key = normalize([row.brandName, row.name, row.validFrom, row.validUntil].join(" "));
    const old = byKey.get(key);
    if (!old) byKey.set(key, row);
    else {
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
    audit: { date, discoveredCategoryPages: paths.length, fetchedCategoryPages: pages.length - failedPages, failedPages, discoveredProductPages: productPaths.size, prioritizedMatchingPaths, strongProductPathMatches, productPathSamples, fetchedProductPages: productPages.length - failedProductPages, failedProductPages, productDetailParsedRows, productDetailPackageRows, productDetailJsonLdPages, productDetailGridPages, productDetailVisibleSizePages, productDetailNamedSizes, productDetailMetaSizes, productDetailSamples, detailNameMatches, detailNameSamples, offerNameSamples, enrichedFromDetail, parsedRows: parsed.length, uniqueRows: byKey.size },
  };
}

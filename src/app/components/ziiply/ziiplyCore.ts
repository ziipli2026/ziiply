"use client";

import type React from "react";
import posthog from "posthog-js";

export type Offer = {
  id: number;
  discountPercent?: number | null;
  batchQuantity?: number | null;
  batchTotalPrice?: number | null;
  expiresAt?: string | null;
  item: {
    id: number;
    name: string;
    ean?: string;
    brandName?: string | null;
    pictureUrl?: string;
    category?: string;
  };
  storeItem?: {
    price?: number | null;
    comparisonPrice?: number | null;
    comparisonPriceUnit?: string | null;
  };
};

export type ZiiplyOffer = {
  id: string;
  chain: "S" | "K";
  storeName: string;
  offer: Offer;
};

export type Product = {
  id: number;
  name: string;
  ean?: string;
  brandName?: string;
  pictureUrl?: string;
  category?: string;
  storeItems?: { price: number }[];
  price?: number;
  comparisonPrice?: number;
  comparisonPriceUnit?: string;
};

export type KProduct = {
  id: string;
  name: string;
  ean?: string;
  brandName?: string;
  pictureUrl?: string;
  price: number;
};

export type EanSearchResult = {
  key: string;
  chain: "S" | "K";
  storeName: string;
  product: Product;
  eanMatch: boolean;
};

export type CartItem = {
  id: string;
  name: string;
  price?: number;
  image?: string;
  chain?: "S" | "K";
  storeName?: string;
  quantity: number;
  source: "manual" | "offer" | "search";
  product?: Product;
  ean?: string;
};

export type Area = {
  label: string;
  aliases: string[];

  // v228: alue ei enää kanna kovakoodattuja kauppoja.
  // Kaupat haetaan dynaamisesti käsin annetun alueen tai GPS:stä päätellyn alueen perusteella.
  sStoreId?: number;
  sStoreName?: string;
  kStoreId?: number;
  kStoreName?: string;
  sLocalStoreId?: number;
  sLocalStoreName?: string;
  kLocalStoreId?: number;
  kLocalStoreName?: string;
};

export type StoreSearchItem = {
  id: number;
  name: string;
  chain?: string;
  type?: "S" | "K" | string;
  city?: string;
  postalCode?: string;
  distanceKm?: number;
  distanceMeters?: number;
  distance?: number | string;
  distance_km?: number;
  distance_m?: number;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
  lng?: number | string;
};

export type Match = {
  product: Product;
  price: number;
  quantity: number;
  matchType: "ean" | "name" | "manual";
  fallbackStoreName?: string;
  cartItemId?: string;
};

export type ChainResult = {
  key: "s" | "k" | "lidl" | "tokmanni";
  chain: string;
  storeName: string;
  detail: string;
  totalPrice: number;
  foundItems: number;
  missingItems: number;
  offerCount: number;
  icon: string;
  matches: Match[];
  comingSoon?: boolean;
};

export type SingleProductCompareResult = {
  key: "s" | "k";
  chain: string;
  storeName: string;
  productName: string;
  price: number;
  ean?: string;
  image?: string;
  comparisonPrice?: string | null;
};

export type StoreMode = "hyper" | "local";
export type QualityMode = "cheapest" | "same_quality" | "own_brands" | "keep_brands";
export type StoreCompareScope = "none" | "between_chains" | "within_chain";

export type OptimizationSnapshot = {
  cart: CartItem[];
  sMatches: Record<string, Match>;
  kMatches: Record<string, Match>;
  alternativeResults: Record<string, Product[]>;
  expandedAlternatives: Record<string, boolean>;
  chainKey: ChainResult["key"];
  chainName: string;
  savedAt: number;
};


export type PriceSnapshot = {
  price: number;
  name: string;
  storeName?: string;
  chain?: string;
  updatedAt: number;
};

export type SavedShoppingList = {
  id: string;
  name: string;
  items: CartItem[];
  createdAt: number;
  updatedAt: number;
};

export type SearchDebugEntry = {
  term: string;
  query: string;
  storeName: string;
  rawCount: number;
  pricedCount: number;
  badFilterCount: number;
  safeCount: number;
  finalCount: number;
  rejectedByPrice: number;
  rejectedByBadFilter: number;
  fallbackStoreName?: string;
};

export type SearchIntentCategory =
  | "milk"
  | "coffee"
  | "cola"
  | "cheese"
  | "yogurt"
  | "meat"
  | "egg"
  | "chicken"
  | "bread"
  | "pasta"
  | "rice"
  | "fruit_veg"
  | "frozen"
  | "snacks"
  | "buttermilk"
  | "cooking_oil"
  | "generic";

export type SearchIntent = {
  category: SearchIntentCategory;
  label: string;
  variants: string[];
  requiredAny?: string[];
  preferredAny?: string[];
  bannedAny?: string[];
  preferredSizes?: { unitGroup: "weight" | "volume"; min: number; max: number; boost: number }[];
  preferredBrands?: string[];
  ownBrandFriendly?: boolean;
};

export const MAX_ITEMS = 8;
export const ALTERNATIVES_AUTO_CLOSE_MS = 12000;
export const PRICE_HISTORY_STORAGE_KEY = "ziiply-price-history-v1";
export const RECENT_CART_ITEMS_STORAGE_KEY = "ziiply-recent-cart-items-v1";
export const SAVED_SHOPPING_LISTS_STORAGE_KEY = "ziiply-saved-shopping-lists-v1";
export const MAX_RECENT_CART_ITEMS = 10;
export const MAX_SAVED_SHOPPING_LISTS = 8;
export const HTML5_QRCODE_SCRIPT_URL = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
export const EAN_SCANNER_REGION_ID = "ziiply-ean-scanner-region";
export const SAME_EAN_RESCAN_LOCK_MS = 9000;
export const APP_VERSION = "V320MOBTXT-9-EMPTY3";
export const SHOW_SEARCH_DEBUG_PANEL = false;

export function trackZiiplyEvent(eventName: string, properties: Record<string, unknown> = {}) {
  try {
    if (typeof window === "undefined") return;

    posthog.capture(eventName, {
      appVersion: APP_VERSION,
      ...properties,
    });
  } catch {
    // Analytics must never break the app.
  }
}

// Scanner UX:
// Käytetään lähes neliötä, jotta sekä pysty- että vaakaviivakoodit mahtuvat kehykseen.
// Tämä auttaa erityisesti maitopurkkien ja kaarevien pakkausten viivakoodeissa.

// v228:
// AREAS on nyt vain alue-/aliaslista. Kauppoja ei enää oteta kovakoodatusta listasta,
// vaan ne haetaan dynaamisesti käsin annetun alueen tai GPS:stä päätellyn alueen perusteella.
export const AREAS: Area[] = [
  { label: "Hyvinkää", aliases: ["hyvinkää", "hyvinkaa", "05800"] },
  { label: "Helsinki", aliases: ["helsinki", "pasila", "tripla", "ruoholahti"] },
  { label: "Espoo", aliases: ["espoo", "sello", "leppävaara", "leppavaara"] },
  { label: "Vantaa", aliases: ["vantaa", "tikkurila", "jumbo"] },
  { label: "Tampere", aliases: ["tampere", "kaleva"] },
  { label: "Turku", aliases: ["turku", "itäharju", "itaharju", "länsikeskus", "lansikeskus"] },
  { label: "Oulu", aliases: ["oulu", "limingantulli", "raksila"] },
  { label: "Jyväskylä", aliases: ["jyväskylä", "jyvaskyla", "seppälä", "seppala", "keljo"] },
  { label: "Kuopio", aliases: ["kuopio", "päiväranta", "paivaranta"] },
  { label: "Lahti", aliases: ["lahti", "holma", "paavola"] },
  { label: "Pori", aliases: ["pori", "mikkola", "puuvilla"] },
];

// =========================
// SEARCH ENGINE CORE
// =========================
// Tämä osio sisältää:
// - hakusanojen normalisoinnin
// - EAN-logiikan
// - tuoteryhmäfiltterit
// - cola/kahvi/maito hard rejectit
// - score-pohjaisen matchauksen
//
// HUOM:
// Tätä osiota EI pidä enää aggressiivisesti kiristää,
// koska liian tiukka logiikka hajotti:
// - maito-haun
// - kahvi-haun
// - cola-haun
//
// EAN-match on edelleen tärkein prioriteetti.
// =========================

export function fixText(value: string) {
  return value.replace(/Ã¤/g, "ä").replace(/Ã¶/g, "ö").replace(/Ã¥/g, "å").replace(/â„¢/g, "").replace(/Â/g, "");
}

export function normalize(value: string) {
  return fixText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[™®]/g, "")
    .replace(/[^\p{L}\p{N}\s,.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEan(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

export function isUsableEan(value?: string | null) {
  const ean = normalizeEan(value);
  return ean.length >= 8 && ean.length <= 14;
}

export function getEanSearchVariants(value?: string | null) {
  const ean = normalizeEan(value);
  const variants = new Set<string>();

  if (ean) variants.add(ean);

  // GTIN/EAN voi olla tietolähteessä 8, 12, 13 tai 14 numerolla.
  // UPC-A 12-numeroisena voi vastata EAN-13-muotoa etunollalla.
  if (ean.length === 12) variants.add(`0${ean}`);
  if (ean.length === 13 && ean.startsWith("0")) variants.add(ean.slice(1));
  if (ean.length >= 8 && ean.length < 13) variants.add(ean.padStart(13, "0"));
  if (ean.length >= 8 && ean.length < 14) variants.add(ean.padStart(14, "0"));

  if (ean.startsWith("0") && ean.length > 8) variants.add(ean.replace(/^0+/, ""));
  if (ean.length > 14) variants.add(ean.slice(-14));
  if (ean.length > 13) variants.add(ean.slice(-13));
  if (ean.length > 12) variants.add(ean.slice(-12));
  if (ean.length > 8) variants.add(ean.slice(-8));

  return Array.from(variants).filter((variant) => variant.length >= 8 && variant.length <= 14);
}

export function isSameEan(value: string | undefined | null, variants: string[]) {
  const candidate = normalizeEan(value);
  if (!candidate) return false;

  return variants.includes(candidate) || variants.includes(candidate.replace(/^0+/, ""));
}

export function cleanExternalProductName(value?: string | null) {
  return fixText(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function getOpenFoodFactsNames(product: any) {
  const names = [
    product?.product_name_fi,
    product?.product_name,
    product?.generic_name_fi,
    product?.generic_name,
    product?.brands,
  ]
    .map(cleanExternalProductName)
    .filter(Boolean);

  return Array.from(new Set(names));
}

export function splitProductTermsPreservingDecimalCommas(value: string) {
  const decimalCommaPlaceholder = "__ZIIPLY_DECIMAL_COMMA__";

  return fixText(String(value || ""))
    .replace(/(\d)\s*,\s*(\d)/g, `$1${decimalCommaPlaceholder}$2`)
    .split(/[\n,]+/)
    .map((x) => x.replaceAll(decimalCommaPlaceholder, ",").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function parseTerms(value: string) {
  const explicitRows = splitProductTermsPreservingDecimalCommas(value);

  if (explicitRows.length !== 1) return explicitRows.slice(0, MAX_ITEMS);

  const singleRow = explicitRows[0] || "";
  const normalizedSingleRow = normalize(singleRow);
  const words = getNormalizedWords(singleRow);

  // Fast multi-add UX:
  // Jos käyttäjä kirjoittaa useita yksinkertaisia ydintuotteita samalla rivillä
  // esim. "maito kahvi cola", käsitellään ne samana jonona kuin rivinvaihdolla/kommoilla.
  // Tuotenimet kuten "juhla mokka" tai "rasvaton maito" pidetään yhtenä hakuna.
  const simpleIntentWords = new Set([
    "maito",
    "kahvi",
    "cola",
    "kokis",
    "juusto",
    "jogurtti",
    "jogurt",
    "rahka",
    "voi",
    "leipa",
    "leipä",
    "pasta",
    "riisi",
    "banaani",
    "omena",
    "tomaatti",
    "kurkku",
    "kana",
    "jauheliha",
    "kananmuna",
    "kananmunat",
    "kananmunia",
    "munat",
    "sipsit",
    "sipsi",
    "piimä",
    "piima",
  ]);

  const allWordsAreSimpleProducts =
    words.length >= 2 &&
    words.length <= MAX_ITEMS &&
    words.every((word) => simpleIntentWords.has(word));

  if (allWordsAreSimpleProducts) return words.slice(0, MAX_ITEMS);

  if (!normalizedSingleRow) return [];
  return [singleRow].slice(0, MAX_ITEMS);
}

export function isLowSignalProductSearchTerm(value: string) {
  const normalizedValue = normalize(value);
  const compactValue = normalizedValue.replace(/\s+/g, "");

  if (!compactValue) return true;
  if (isUsableEan(compactValue)) return false;
  if (compactValue.length > 3) return false;
  if (SEARCH_ALIASES[normalizedValue]) return false;

  // Estää haamuhakuja kuten "kdk" / "sks", jotka jäivät aiemmin skeleton-tilaan.
  // Lyhyet oikeat tuotteet kuten "voi" säilyvät, koska niissä on vokaali / alias.
  return !/[aeiouyäöå]/i.test(compactValue);
}


export const SEARCH_ALIASES: Record<string, string> = {
  // Juomat
  maito: "maito",
  piima: "piimä",
  "piimä": "piimä",
  öljy: "öljy",
  oljy: "öljy",
  kahvi: "kahvi",
  kahvia: "kahvi",
  cola: "cola",
  kokis: "cola",

  // Perustuotteet
  jauheliha: "jauheliha 400g",
  juusto: "juusto 500g",
  jogurtti: "jogurtti 1kg",
  rahka: "rahka 200g",
  voi: "voi 500g",
  leipä: "leipä",
  pasta: "pasta",
  riisi: "riisi 1kg",

  // Hedelmät / vihannekset
  banaani: "banaani",
  omena: "omena",
  tomaatti: "tomaatti",
  kurkku: "kurkku",

  // Proteiinit
  kana: "kanasuikale",
  kananmuna: "kananmuna 10 kpl",
  kananmunat: "kananmuna 10 kpl",
  kananmunia: "kananmuna 10 kpl",
  munat: "kananmuna 10 kpl",
  muna: "kananmuna 10 kpl",
  kalapuikko: "kalapuikot",
  kalapuikot: "kalapuikot",

  // Snacks
  tortilla: "tortilla chips",
  sipsit: "sipsit",
};

export function getSearchQuery(term: string) {
  const normalized = normalize(term);
  return SEARCH_ALIASES[normalized] || term;
}

export function getColaSpecificSearchQueries(term: string) {
  const normalizedTerm = normalize(term);
  if (!hasAnyToken(normalizedTerm, ["cola", "coca-cola", "coca cola", "pepsi", "pepsi max", "kokis"])) return [];

  const sizeMatch = normalizedTerm.match(/\b\d+(?:[,\.]\d+)?\s?(?:l|ml)\b/i)?.[0] || "";
  const compactSize = sizeMatch.replace(/\s+/g, "");
  const spacedSize = compactSize.replace(/(\d(?:[,\.]\d+)?)(l|ml)$/i, "$1 $2");
  const isZero = hasAnyToken(normalizedTerm, ["zero"]);
  const isPepsiMax = hasAnyToken(normalizedTerm, ["pepsi max", "max"]);
  const isPepsi = hasAnyToken(normalizedTerm, ["pepsi"]);

  const brandBase = isPepsi ? "pepsi" : hasAnyToken(normalizedTerm, ["coca-cola", "coca cola"]) ? "coca-cola" : "cola";
  const variant = isPepsiMax ? "max" : isZero ? "zero" : "";
  const base = [brandBase, variant].filter(Boolean).join(" ");

  return uniqueNormalizedQueries([
    term,
    base && compactSize ? `${base} ${compactSize}` : "",
    base && spacedSize && spacedSize !== compactSize ? `${base} ${spacedSize}` : "",
    base,
    isZero ? "coca-cola zero" : "",
    isZero ? "coca cola zero" : "",
    isZero && compactSize ? `coca-cola zero ${compactSize}` : "",
    isZero && spacedSize && spacedSize !== compactSize ? `coca-cola zero ${spacedSize}` : "",
    isPepsiMax ? "pepsi max" : "",
    "cola zero",
    "coca-cola",
    "coca cola",
    "cola",
    "virvoitusjuoma cola",
  ]);
}

export function uniqueNormalizedQueries(values: string[]) {
  const queries: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const cleanValue = fixText(String(value || "")).replace(/\s+/g, " ").trim();
    const key = normalize(cleanValue);

    // Tärkeä v223-korjaus:
    // Dedupataan normalisoidulla avaimella, mutta palautetaan alkuperäinen ääkkösellinen hakusana.
    // API-haku ei saa lähteä muodossa "piima", jos käyttäjä haki "piimä".
    if (key && !seen.has(key)) {
      seen.add(key);
      queries.push(cleanValue);
    }
  }

  return queries;
}

export const SEARCH_INTENTS: SearchIntent[] = [
  {
    category: "milk",
    label: "Maidot",
    variants: ["maito", "kevytmaito", "rasvaton maito", "täysmaito", "ykkösmaito", "laktoositon maito", "luomu maito", "pirkka maito", "valio maito", "arla maito", "kauramaito"],
    requiredAny: ["maito", "kevytmaito", "rasvaton", "täysmaito", "taysmaito", "ykkösmaito", "ykkosmaito", "kauramaito"],
    preferredAny: ["kevytmaito", "rasvaton", "täysmaito", "taysmaito", "ykkösmaito", "ykkosmaito", "laktoositon"],
    bannedAny: ["maitorahka", "rahka", "kerma", "jogurtti", "jogurt", "kaakao", "suklaa", "kondensoitu", "maitojuoma", "proteiini", "latte", "maitojauhe", "cappuccino", "rasvaseos", "rasvasekoite", "rasvasekoitus", "voi", "levite", "margariini", "piimä", "piima"],
    preferredSizes: [{ unitGroup: "volume", min: 900, max: 1100, boost: 95 }],
    preferredBrands: ["kotimaista", "coop", "rainbow", "valio", "arla"],
    ownBrandFriendly: true,
  },
  {
    category: "buttermilk",
    label: "Piimät",
    variants: ["piimä", "piima", "rasvaton piimä", "laktoositon piimä", "valio piimä", "kotimaista piimä"],
    requiredAny: ["piimä", "piima"],
    preferredAny: ["piimä", "piima", "rasvaton", "laktoositon"],
    bannedAny: ["maito", "kerma", "jogurtti", "jogurt", "rahka", "raejuusto", "juusto", "kaakao", "proteiinijuoma", "maitojuoma"],
    preferredSizes: [{ unitGroup: "volume", min: 900, max: 1100, boost: 95 }],
    preferredBrands: ["valio", "kotimaista", "arla"],
    ownBrandFriendly: true,
  },
  {
    category: "cooking_oil",
    label: "Ruokaöljyt",
    variants: ["öljy", "oljy", "ruokaöljy", "ruokaoljy", "rypsiöljy", "rypsioljy", "rapsiöljy", "rapsioljy", "oliiviöljy", "oliivioljy", "auringonkukkaöljy", "auringonkukkaoljy"],
    requiredAny: ["öljy", "oljy", "ruokaöljy", "ruokaoljy", "rypsiöljy", "rypsioljy", "rapsiöljy", "rapsioljy", "oliiviöljy", "oliivioljy", "auringonkukkaöljy", "auringonkukkaoljy"],
    preferredAny: ["ruokaöljy", "ruokaoljy", "rypsiöljy", "rypsioljy", "rapsiöljy", "rapsioljy", "oliiviöljy", "oliivioljy", "paisto", "leivonta"],
    bannedAny: ["iho", "iholle", "kasvo", "kasvoille", "huuli", "huulikiilto", "arpi", "arville", "hius", "hiuksille", "vartalo", "hieronta", "hoitava", "kosmetiikka", "meikki", "meikinpoisto", "öljypohjainen", "oljyphjainen", "moottori", "voitelu"],
    preferredSizes: [{ unitGroup: "volume", min: 400, max: 1000, boost: 45 }],
    ownBrandFriendly: true,
  },
  {
    category: "coffee",
    label: "Kahvit",
    variants: ["kahvi", "suodatinkahvi", "kahvi suodatinjauhatus", "jauhettu kahvi", "juhla mokka", "presidentti kahvi", "kulta katriina", "paulig kahvi", "meira kahvi", "kahvipapu", "espresso kahvi", "pikakahvi"],
    requiredAny: ["kahvi", "suodatinkahvi", "suodatinjauhatus", "jauhettu", "kahvipapu", "espresso", "pikakahvi", "juhla mokka", "presidentti", "kulta katriina"],
    preferredAny: ["suodatinkahvi", "suodatinjauhatus", "jauhettu", "juhla mokka", "presidentti", "kulta katriina", "paulig", "meira"],
    bannedAny: ["kahvikuppi", "muki", "kahvimitta", "suodatinpussi", "kahvinkeitin", "energiajuoma", "proteiinijuoma", "jogurtti", "rahka", "jäätelö", "jaatelo", "patukka"],
    preferredSizes: [{ unitGroup: "weight", min: 400, max: 550, boost: 65 }],
    preferredBrands: ["juhla mokka", "presidentti", "kulta katriina", "paulig", "meira"],
  },
  {
    category: "cola",
    label: "Cola-juomat",
    variants: ["cola", "coca cola", "coca-cola", "pepsi", "pepsi max", "cola zero", "coca cola zero", "virvoitusjuoma cola"],
    requiredAny: ["cola", "coca-cola", "coca cola", "pepsi", "pepsi max"],
    preferredAny: ["coca-cola", "coca cola", "pepsi", "pepsi max", "zero", "virvoitusjuoma"],
    bannedAny: ["tiiviste", "siirappi", "syrup", "jauhe", "karkki", "makeinen", "jäätelö", "jaatelo", "kastike", "alkoholi", "olut", "siideri"],
    preferredSizes: [
      { unitGroup: "volume", min: 1400, max: 1600, boost: 42 },
      { unitGroup: "volume", min: 300, max: 550, boost: 24 },
    ],
    preferredBrands: ["coca-cola", "coca cola", "pepsi", "pepsi max"],
  },
  {
    category: "cheese",
    label: "Juustot",
    variants: ["juusto", "edam juusto", "emmental juusto", "oltermanni", "kermajuusto", "viipalejuusto", "raastejuusto"],
    requiredAny: ["juusto", "edam", "emmental", "gouda", "oltermanni"],
    preferredAny: ["viipale", "raaste", "kermajuusto", "edam", "emmental", "oltermanni"],
    bannedAny: ["tuorejuusto", "sulatejuusto", "raejuusto", "juustodippi", "dippi", "nacho", "kastike"],
    preferredSizes: [{ unitGroup: "weight", min: 350, max: 1000, boost: 35 }],
    preferredBrands: ["valio", "arla", "kotimaista", "pirkka", "oltermanni"],
    ownBrandFriendly: true,
  },
  {
    category: "yogurt",
    label: "Jogurtit",
    variants: ["jogurtti", "jogurt", "maustamaton jogurtti", "turkkilainen jogurtti", "kreikkalainen jogurtti", "jogurtti 1kg"],
    requiredAny: ["jogurtti", "jogurt"],
    preferredAny: ["maustamaton", "turkkilainen", "kreikkalainen"],
    bannedAny: ["rahka", "vanukas", "proteiinijuoma", "raejuusto", "tuorejuusto", "jäätelö", "jaatelo"],
    preferredSizes: [{ unitGroup: "weight", min: 750, max: 1100, boost: 35 }],
    ownBrandFriendly: true,
  },
  {
    category: "meat",
    label: "Jauhelihat ja lihat",
    variants: ["jauheliha", "naudan jauheliha", "sika-nauta jauheliha", "broilerin jauheliha", "jauheliha 400g"],
    requiredAny: ["jauheliha", "nauta", "sika-nauta", "broilerin jauheliha"],
    preferredAny: ["jauheliha", "naudan", "sika-nauta"],
    bannedAny: ["kastike", "keitto", "ateria", "pizza", "piirakka"],
    preferredSizes: [{ unitGroup: "weight", min: 300, max: 450, boost: 45 }],
    preferredBrands: ["atria", "hk", "snellman", "kotimaista"],
  },
  {
    category: "egg",
    label: "Kananmunat",
    variants: ["kananmuna", "kananmunat", "kananmunia", "munat", "kananmuna 10 kpl", "kananmunat 10 kpl", "vapaan kanan munat", "luomu kananmunat"],
    requiredAny: ["kananmuna", "kananmunat", "kananmunia", "munat"],
    preferredAny: ["kananmuna", "kananmunat", "kananmunia", "munat", "10 kpl", "15 kpl", "6 kpl"],
    bannedAny: ["suklaa", "pääsiäis", "paasiais", "yllätys", "yllatys", "makeinen", "karkki", "lelu", "majoneesi", "munavoi", "munakas", "kastike", "nuudeli", "pasta"],
    preferredSizes: [{ unitGroup: "weight", min: 0, max: 0, boost: 0 }],
    preferredBrands: ["kotimaista", "pirkka", "k-menu", "munax", "dava"],
    ownBrandFriendly: true,
  },
  {
    category: "chicken",
    label: "Kana ja broileri",
    variants: ["kana", "broileri", "kanasuikale", "broilerisuikale", "broilerin fileesuikale", "kanan filee"],
    requiredAny: ["kana", "broileri", "kanasuikale", "broilerisuikale", "fileesuikale"],
    preferredAny: ["suikale", "filee", "broileri"],
    bannedAny: ["kastike", "keitto", "pizza", "salaatti", "ateria"],
    preferredSizes: [{ unitGroup: "weight", min: 300, max: 700, boost: 35 }],
  },
  {
    category: "bread",
    label: "Leivät",
    variants: ["leipä", "ruisleipä", "paahtoleipä", "kauraleipä", "sämpylä", "rieska"],
    requiredAny: ["leipä", "leipa", "ruis", "paahto", "kaura", "sämpylä", "sampyla", "rieska"],
    preferredAny: ["ruisleipä", "paahtoleipä", "kauraleipä", "sämpylä"],
    bannedAny: ["keksi", "pullapitko", "kakku", "muro"],
    ownBrandFriendly: true,
  },
  {
    category: "pasta",
    label: "Pastat",
    variants: ["pasta", "spagetti", "makaroni", "fusilli", "penne", "lasagnelevy"],
    requiredAny: ["pasta", "spagetti", "makaroni", "fusilli", "penne", "lasagne"],
    preferredAny: ["spagetti", "makaroni", "fusilli", "penne"],
    bannedAny: ["kastike", "ateria", "salaatti"],
    preferredSizes: [{ unitGroup: "weight", min: 400, max: 1000, boost: 35 }],
    ownBrandFriendly: true,
  },
  {
    category: "rice",
    label: "Riisit",
    variants: ["riisi", "jasmiiniriisi", "basmatiriisi", "pitkäjyväinen riisi", "puuroriisi"],
    requiredAny: ["riisi", "jasmiini", "basmati", "pitkäjyväinen", "pitkajyvainen", "puuroriisi"],
    preferredAny: ["jasmiini", "basmati", "pitkäjyväinen", "puuroriisi"],
    bannedAny: ["ateria", "salaatti", "riisipiirakka"],
    preferredSizes: [{ unitGroup: "weight", min: 900, max: 1100, boost: 35 }],
    ownBrandFriendly: true,
  },
  {
    category: "fruit_veg",
    label: "Hedelmät ja vihannekset",
    variants: ["banaani", "omena", "tomaatti", "kurkku", "peruna", "sipuli", "porkkana"],
    requiredAny: ["banaani", "omena", "tomaatti", "kurkku", "peruna", "sipuli", "porkkana"],
    preferredAny: ["suomi", "kotimainen", "luomu"],
    bannedAny: ["mehu", "sose", "hillo", "kastike", "karkki"],
  },
  {
    category: "frozen",
    label: "Pakasteet",
    variants: ["pakaste", "kalapuikot", "ranskanperunat", "pakastevihannekset", "jäätelö", "jaatelo"],
    requiredAny: ["pakaste", "kalapuikko", "kalapuikot", "ranskanperuna", "ranskanperunat", "jäätelö", "jaatelo"],
    preferredAny: ["pakaste", "kalapuikot", "ranskanperunat"],
    bannedAny: ["tuore", "säilyke", "sailyke"],
  },
  {
    category: "snacks",
    label: "Herkut ja naposteltavat",
    variants: ["sipsit", "chips", "tortilla chips", "karkki", "suklaa", "keksi"],
    requiredAny: ["sipsi", "chips", "tortilla", "karkki", "suklaa", "keksi"],
    preferredAny: ["sipsi", "chips", "tortilla", "suklaa"],
    bannedAny: ["kastike", "dippi", "jogurtti"],
  },
];

export function detectSearchIntent(query: string): SearchIntent {
  const normalized = normalize(query);

  const exactIntent = SEARCH_INTENTS.find((intent) =>
    intent.variants.some((variant) => normalize(variant) === normalized)
  );

  if (exactIntent) return exactIntent;

  const tokenIntent = SEARCH_INTENTS.find((intent) =>
    [...intent.variants, ...(intent.requiredAny || [])].some((token) => normalized.includes(normalize(token)))
  );

  if (tokenIntent) return tokenIntent;

  const alias = getSearchQuery(query);
  const aliasIntent = SEARCH_INTENTS.find((intent) =>
    intent.variants.some((variant) => normalize(alias).includes(normalize(variant)) || normalize(variant).includes(normalize(alias)))
  );

  if (aliasIntent) return aliasIntent;

  return {
    category: "generic",
    label: "Yleishaku",
    variants: uniqueNormalizedQueries([alias, query]),
    requiredAny: getNormalizedWords(query).filter((word) => word.length > 2),
    preferredAny: getNormalizedWords(query).filter((word) => word.length > 3),
  };
}

export function isMilkSearchTerm(value: string) {
  return detectSearchIntent(value).category === "milk";
}

export function isColaSearchTerm(value: string) {
  return detectSearchIntent(value).category === "cola";
}

export function getPrimaryProductNounQuery(term: string) {
  const text = normalize(term);

  // v249:
  // Omalla sanalla kirjoitetuissa moniosaisissa ydintuotteissa haetaan ensin tuoteryhmän ydinsanalla.
  // Esim. "broilerin jauheliha" / "naudan jauheliha" pitää ensin hakea jauhelihoja,
  // ei broilerin fileitä tai muita broilerituotteita.
  if (hasAnyToken(text, ["jauheliha", "sika-nauta", "sikanauta"])) return "jauheliha";
  if (hasAnyToken(text, ["kananmuna", "kananmunat", "kananmunia", "munat", "muna"])) return "kananmuna";

  return "";
}


export function isVerySpecificSearch(term: string) {
  const text = normalize(term);

  return (
    getNormalizedWords(text).length >= 2 ||
    /\b\d+(?:[,\.]\d+)?\s?(l|ml|kg|g)\b/i.test(text) ||
    text.includes("zero") ||
    text.includes("2-pack") ||
    text.includes("1,5") ||
    text.includes("1.5")
  );
}

export function normalizeLooseProductMatch(value: string) {
  return normalize(value)
    .replace(/(\d+(?:[,\.]\d+)?)\s+(l|ml|kg|g)\b/g, "$1$2")
    .replace(/coca cola/g, "coca-cola")
    .replace(/\s+/g, " ")
    .trim();
}

export function getMetricSizeKey(value: string) {
  return normalizeLooseProductMatch(value).match(/\b\d+(?:[,\.]\d+)?(?:l|ml|kg|g)\b/i)?.[0] || "";
}

export function getNormalSearchQueries(term: string) {
  const intent = detectSearchIntent(term);
  const normalizedTerm = normalize(term);
  const looseTerm = normalizeLooseProductMatch(term);
  const words = getNormalizedWords(term).filter((word) => word.length > 2);
  const primaryProductNounQuery = getPrimaryProductNounQuery(term);
  const colaSpecificQueries = getColaSpecificSearchQueries(term);

  // Tarkat moniosaiset haut eivät saa pudota yksittäiseen sanaan.
  // Tämä estää loopit kuten "Coca Cola zero 1,5L" -> "cola"
  // sekä "tuore kala" -> viimeinen sana jää hakukenttään.
  if (isVerySpecificSearch(term)) {
    const exactQueries = uniqueNormalizedQueries([
      term,
      looseTerm,
      getSearchQuery(term),
      ...colaSpecificQueries.filter((query) => {
        const clean = normalizeLooseProductMatch(query);
        if (!clean) return false;

        // Cola-haussa pidetään tarkat brandi/variantti/koko -haut ennen geneeristä "cola"-fallbackia.
        if (colaSpecificQueries.length > 0) {
          if (clean === "cola" || clean === "coca-cola" || clean === "coca cola" || clean === "virvoitusjuoma cola") return false;
        }

        return true;
      }),
      ...intent.variants.filter((variant) => {
        const cleanVariant = normalizeLooseProductMatch(variant);
        if (!cleanVariant) return false;
        if (looseTerm.includes(cleanVariant) || cleanVariant.includes(looseTerm)) return true;
        if (primaryProductNounQuery === "jauheliha" && cleanVariant.includes("jauheliha")) return true;
        return false;
      }),
    ]);

    if (primaryProductNounQuery === "jauheliha") {
      exactQueries.push("jauheliha");
    }

    if (primaryProductNounQuery === "kananmuna") {
      exactQueries.push("kananmuna", "kananmunat", "kananmuna 10 kpl");
    }

    return uniqueNormalizedQueries(exactQueries);
  }

  const expanded = uniqueNormalizedQueries([
    term,
    getSearchQuery(term),
    primaryProductNounQuery,
    ...intent.variants,
  ]);

  if (words.length >= 1) {
    expanded.push(words[0]);
  }

  return uniqueNormalizedQueries(expanded);
}
export function isAliasSearch(term: string) {
  return normalize(getSearchQuery(term)) !== normalize(term);
}

export function formatEuro(cents?: number | null) {
  if (cents == null || Number.isNaN(cents)) return "—";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}


export function formatComparisonPrice(product: any) {
  const value =
    product?.storeItems?.[0]?.comparisonPrice ??
    product?.comparisonPrice;

  const unit =
    product?.storeItems?.[0]?.comparisonPriceUnit ??
    product?.comparisonPriceUnit;

  if (!value || !unit) return null;

  return `${(value / 100).toFixed(2).replace(".", ",")} €/${unit}`;
}


export function getProductCategoryLabel(name: string, category?: string) {
  const text = normalize(`${name} ${category || ""}`);

  if (hasAnyToken(text, ["banaani", "omena", "tomaatti", "kurkku", "hedelmä", "hedelma", "vihannes", "juures"])) return "Hedelmät ja vihannekset";
  if (hasAnyToken(text, ["maito", "juusto", "jogurtti", "jogurt", "rahka", "voi", "kerma", "raejuusto"])) return "Maitotuotteet";
  if (hasAnyToken(text, ["jauheliha", "kana", "broileri", "liha", "makkara", "kala", "kalapuikko", "kananmuna", "kananmunia", "kananmunat", "munat"])) return "Liha, kala ja proteiinit";
  if (hasAnyToken(text, ["leipä", "leipa", "sämpylä", "sampyla", "tortilla"])) return "Leivät ja viljatuotteet";
  if (hasAnyToken(text, ["kahvi", "cola", "mehu", "limu", "vesi", "juoma", "olut"])) return "Juomat";
  if (hasAnyToken(text, ["pakaste", "ranskanperuna", "jäätelö", "jaatelo", "kalapuikko"])) return "Pakasteet";
  if (hasAnyToken(text, ["pasta", "riisi", "jauho", "sokeri", "öljy", "oljy", "kastike"])) return "Kuivatuotteet";
  if (hasAnyToken(text, ["sipsi", "chips", "karkki", "suklaa", "keksi"])) return "Herkut ja naposteltavat";

  return "Muut tuotteet";
}

export function triggerHaptic() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(18);
    }
  } catch {}
}


export function playScanSuccessFeedback() {
  // Kevyt värinä onnistuneesta skannauksesta. iOS/Safari voi jättää tämän huomiotta,
  // mutta Androidissa ja osassa PWA-tilanteita se toimii suoraan.
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(70);
    }
  } catch {}

  // Lyhyt piippaus. Selain sallii äänen yleensä, koska käyttäjä on ensin painanut
  // skannerin käynnistyspainiketta. Jos ääntä ei sallita, epäonnistuminen ohitetaan.
  try {
    if (typeof window === "undefined") return;

    const AudioCtx =
      (window as any).AudioContext ||
      (window as any).webkitAudioContext;

    if (!AudioCtx) return;

    const audioContext = new AudioCtx();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.09);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);

    oscillator.onended = () => {
      try {
        audioContext.close();
      } catch {}
    };
  } catch {}
}


export function getScannerVideoElement() {
  if (typeof document === "undefined") return null;
  return document.querySelector(`#${EAN_SCANNER_REGION_ID} video`) as HTMLVideoElement | null;
}

export function getScannerVideoTrack() {
  const video = getScannerVideoElement();
  const stream = video?.srcObject as MediaStream | null;
  return stream?.getVideoTracks?.()[0] || null;
}

export async function applyBestEffortScannerCameraTuning() {
  try {
    const track = getScannerVideoTrack();
    if (!track) return;

    const capabilities = typeof track.getCapabilities === "function" ? (track.getCapabilities() as any) : {};
    const advanced: any[] = [];

    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
      advanced.push({ focusMode: "continuous" });
    }

    if (Array.isArray(capabilities.exposureMode) && capabilities.exposureMode.includes("continuous")) {
      advanced.push({ exposureMode: "continuous" });
    }

    if (Array.isArray(capabilities.whiteBalanceMode) && capabilities.whiteBalanceMode.includes("continuous")) {
      advanced.push({ whiteBalanceMode: "continuous" });
    }

    if (capabilities.zoom && typeof capabilities.zoom.min === "number") {
      advanced.push({ zoom: capabilities.zoom.min });
    }

    if (advanced.length > 0) {
      await track.applyConstraints({ advanced } as any);
    }
  } catch {
    // Kameralaitteet ja selaimet tukevat näitä eri tavoin. Epäonnistuminen ohitetaan.
  }
}

export async function focusScannerCameraAtPoint(event: React.PointerEvent<HTMLElement>) {
  try {
    const track = getScannerVideoTrack();
    const target = event.currentTarget;
    if (!track || !target) return;

    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
    const capabilities = typeof track.getCapabilities === "function" ? (track.getCapabilities() as any) : {};

    if ((window as any).ImageCapture) {
      try {
        const imageCapture = new (window as any).ImageCapture(track);
        await imageCapture.setOptions?.({
          pointsOfInterest: [{ x, y }],
          focusMode: Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("single-shot") ? "single-shot" : "continuous",
        });
        return;
      } catch {}
    }

    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("single-shot")) {
      await track.applyConstraints({ advanced: [{ focusMode: "single-shot" }] } as any);
      window.setTimeout(() => {
        void track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any).catch(() => undefined);
      }, 900);
    } else if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
      await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any);
    }
  } catch {
    // Tap-to-focus on best-effort; jos selain ei tue sitä, skanneri jatkaa normaalisti.
  }
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fi-FI");
}

export function getProductPrice(product: Product) {
  // S-products route normalisoi hinnan Product.price / storeItems[0].price -muotoon.
  // Tämä fallback pitää haun toimivana myös, jos raakadataan jää vanha storeItem.price.
  return (
    product.storeItems?.[0]?.price ||
    product.price ||
    (product as any)?.storeItem?.price ||
    0
  );
}

export function isManualShoppingItem(item: CartItem) {
  return item.source === "manual" || !item.price || item.price <= 0;
}

export function getPriceHistoryKeyFromProduct(product: Product, storeName?: string, chain?: string) {
  const ean = normalizeEan(product.ean);
  if (ean) return `ean:${ean}`;

  return `name:${normalize(`${product.name} ${storeName || ""} ${chain || ""}`)}`;
}

export function getPriceHistoryKeyFromCartItem(item: CartItem) {
  const ean = normalizeEan(item.ean || item.product?.ean);
  if (ean) return `ean:${ean}`;

  return `name:${normalize(`${item.name} ${item.storeName || ""} ${item.chain || ""}`)}`;
}

export function getPriceChangeInfo(previousPrice?: number, currentPrice?: number) {
  if (!previousPrice || !currentPrice || previousPrice <= 0 || currentPrice <= 0) return null;

  const difference = currentPrice - previousPrice;
  const threshold = Math.max(1, Math.round(previousPrice * 0.005));

  if (Math.abs(difference) <= threshold) {
    return {
      label: "Sama hinta kuin viimeksi",
      shortLabel: "sama hinta",
      tone: "neutral",
      difference,
      previousPrice,
      currentPrice,
    };
  }

  if (difference < 0) {
    return {
      label: `Halventunut ${formatEuro(Math.abs(difference))}`,
      shortLabel: "halventunut",
      tone: "down",
      difference,
      previousPrice,
      currentPrice,
    };
  }

  return {
    label: `Kallistunut ${formatEuro(difference)}`,
    shortLabel: "kallistunut",
    tone: "up",
    difference,
    previousPrice,
    currentPrice,
  };
}

export function getSizeToken(name: string) {
  return normalize(name).match(/\d+(,\d+)?\s?(l|kg|g|ml)/i)?.[0] || "";
}

export function hasWord(name: string, word: string) {
  return new RegExp(`\\b${word}\\b`, "i").test(normalize(name));
}

export function getNormalizedWords(value: string) {
  return normalize(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
}

export function hasExactNormalizedWord(value: string, word: string) {
  const normalizedWord = normalize(word);
  if (!normalizedWord) return false;
  return getNormalizedWords(value).includes(normalizedWord);
}

export function parseMetricSize(value: string) {
  const text = normalize(value).replace(/(\d),(\d)/g, "$1.$2");
  const match = text.match(/\b(\d+(?:\.\d+)?)\s?(kg|g|l|ml)\b/);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount)) return null;

  if (unit === "kg") return { unitGroup: "weight", amount: amount * 1000, label: `${amount}kg` };
  if (unit === "g") return { unitGroup: "weight", amount, label: `${amount}g` };
  if (unit === "l") return { unitGroup: "volume", amount: amount * 1000, label: `${amount}l` };
  return { unitGroup: "volume", amount, label: `${amount}ml` };
}

export function getExactWordScore(sourceName: string, targetName: string) {
  const sourceWords = getNormalizedWords(sourceName)
    .filter((word) => word.length > 2)
    .filter((word) => !["kotimaista", "suomalainen", "pirkka", "k-menu", "k", "menu", "valio", "arla", "coop", "rainbow", "xtra"].includes(word));
  const targetWords = new Set(getNormalizedWords(targetName));

  let score = 0;

  for (const word of sourceWords) {
    if (targetWords.has(word)) score += 14;
    else if (normalize(targetName).includes(word)) score += 5;
    else score -= 10;
  }

  if (sourceWords.length > 0 && sourceWords.every((word) => targetWords.has(word))) score += 24;

  return score;
}

export function getBrandMatchScore(sourceName: string, targetName: string) {
  const sourceBrand = getPrimaryBrand(sourceName);
  const targetBrand = getPrimaryBrand(targetName);

  if (!sourceBrand && !targetBrand) return 0;
  if (sourceBrand && targetBrand && sourceBrand === targetBrand) return 52;
  if (sourceBrand && targetBrand && sourceBrand !== targetBrand) return -28;
  if (sourceBrand && !targetBrand) return -8;
  return 0;
}

export function getSizeMatchScore(sourceName: string, targetName: string) {
  const sourceSize = parseMetricSize(sourceName);
  const targetSize = parseMetricSize(targetName);

  if (!sourceSize || !targetSize) return 0;
  if (sourceSize.unitGroup !== targetSize.unitGroup) return -45;

  const differenceRatio = Math.abs(sourceSize.amount - targetSize.amount) / Math.max(sourceSize.amount, targetSize.amount);

  if (differenceRatio <= 0.03) return 30;
  if (differenceRatio <= 0.15) return 8;
  return -42;
}

export function isDifferentColaBrand(sourceName: string, targetName: string) {
  const source = normalize(sourceName);
  const target = normalize(targetName);
  const sourceCocaCola = hasAnyToken(source, ["coca-cola", "coca cola"]);
  const targetCocaCola = hasAnyToken(target, ["coca-cola", "coca cola"]);
  const sourcePepsi = hasAnyToken(source, ["pepsi", "pepsi max"]);
  const targetPepsi = hasAnyToken(target, ["pepsi", "pepsi max"]);

  return (sourceCocaCola && targetPepsi) || (sourcePepsi && targetCocaCola);
}

export function buildKSearchName(name: string) {
  return normalize(name)
    .replace(/\bcoop\b/g, "")
    .replace(/\brainbow\b/g, "")
    .replace(/\bxtra\b/g, "")
    .replace(/\bkotimaista\b/g, "")
    .replace(/\bsuomalainen\b/g, "")
    .replace(/\bpirkka\b/g, "")
    .replace(/\bk-menu\b/g, "")
    .replace(/\bk menu\b/g, "")
    .replace(/\bvalio\b/g, "")
    .replace(/\barla\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getKSearchTerms(name: string) {
  const searchName = getSearchQuery(name);
  const cleaned = buildKSearchName(searchName);
  const normalized = normalize(searchName);
  const terms: string[] = [];
  const addTerm = (term: string) => {
    const clean = normalize(term);
    if (clean && !terms.includes(clean)) terms.push(clean);
  };

  for (const colaQuery of getColaSpecificSearchQueries(name).slice(0, 6)) {
    addTerm(colaQuery);
  }

  const isValueBrand = ["coop", "rainbow", "xtra", "kotimaista", "suomalainen"].some((brand) =>
    normalized.includes(brand)
  );

  // Kun S/halpamerkkiä verrataan K-ryhmään, haetaan ensin K:n omia merkkejä.
  if (isValueBrand) {
    if (hasAnyToken(normalized, ["kalapuikko", "kalapuikot", "fiskpinnar"])) {
      addTerm("pirkka kalapuikot");
      addTerm("k-menu kalapuikot");
      addTerm("kalapuikot");
      addTerm("kalapuikko");
    }

    if (normalized.includes("maito")) {
      addTerm("pirkka maito");
      addTerm("k-menu maito");
    }

    if (normalized.includes("cola")) {
      addTerm("pirkka cola");
    }
  }

  if (cleaned) addTerm(cleaned);

  const fallbackWords = [
    "tortilla chips",
    "tortilla",
    "sipsi",
    "chips",
    "maito",
    "jauheliha",
    "kahvi suodatinjauhatus",
    "suodatinkahvi",
    "kahvi",
    "juusto",
    "cola",
    "rahka",
    "jogurtti",
    "jogurt",
    "kana",
    "leipä",
    "leipa",
    "voi",
    "kananmuna",
    "kananmunia",
    "munat",
    "makkara",
    "pasta",
    "riisi",
    "banaani",
    "omena",
    "kurkku",
    "tomaatti",
    "kalapuikko",
    "kalapuikot",
    "kalafile",
    "kalapalat",
  ];

  if (hasAnyToken(normalized, ["kalapuikko", "kalapuikot", "fiskpinnar"])) {
    addTerm("kalapuikot");
    addTerm("kalapuikko");
  }

  // v262: EAN/viivakoodihaussa K-vastine haetaan usein S-tuotteen nimellä.
  // Kananmunat taipuvat nimissä eri tavoin (kananmuna / kananmunia / munat),
  // joten lisätään tuoteryhmän ydintermit ennen geneerisiä fallbackeja.
  if (hasAnyToken(normalized, ["kananmuna", "kananmunia", "kananmunat", "muna", "munia", "munat", "egg", "eggs"])) {
    addTerm("kananmuna");
    addTerm("kananmunia");
    addTerm("munat");
  }

  for (const word of fallbackWords) {
    if (normalized.includes(word)) addTerm(word);
  }

  const importantWords = cleaned
    .split(" ")
    .filter((word) => word.length > 3)
    .filter((word) => !/^\\d/.test(word))
    .slice(0, 3);

  if (importantWords.length >= 2) addTerm(importantWords.join(" "));
  if (importantWords.length >= 1) addTerm(importantWords[0]);

  return terms.filter(Boolean);
}

export function hasAnyBrand(text: string, brands: string[]) {
  return brands.some((brand) => text.includes(normalize(brand)));
}

export function hasAnyToken(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(normalize(token)));
}

export function isEggSearchTerm(value: string) {
  const text = normalize(value);

  if (hasAnyToken(text, ["kananmunaton", "munaton", "egg-free", "egg free"])) return false;

  return (
    hasExactNormalizedWord(text, "kananmuna") ||
    hasExactNormalizedWord(text, "kananmunat") ||
    hasExactNormalizedWord(text, "kananmunia") ||
    hasExactNormalizedWord(text, "munat") ||
    hasExactNormalizedWord(text, "muna") ||
    hasExactNormalizedWord(text, "egg") ||
    hasExactNormalizedWord(text, "eggs")
  );
}

export function isClearlyEggProduct(name: string) {
  const text = normalize(name);

  // Tärkeä: "kananmunaton" tarkoittaa nimenomaan EI kananmunaa.
  // Pelkkä includes("kananmuna") hyväksyi aiemmin pastat ja lasagnet väärin.
  if (hasAnyToken(text, [
    "kananmunaton",
    "munaton",
    "egg-free",
    "egg free",
    "suklaa",
    "pääsiäis",
    "paasiais",
    "yllätys",
    "yllatys",
    "makeinen",
    "karkki",
    "lelu",
    "majoneesi",
    "munavoi",
    "munakas",
    "kastike",
    "nuudeli",
    "pasta",
    "tagliatelle",
    "lasagne",
  ])) return false;

  return (
    hasExactNormalizedWord(name, "kananmuna") ||
    hasExactNormalizedWord(name, "kananmunat") ||
    hasExactNormalizedWord(name, "kananmunia") ||
    hasExactNormalizedWord(name, "munat") ||
    hasExactNormalizedWord(name, "egg") ||
    hasExactNormalizedWord(name, "eggs")
  );
}

export function isCoffeeSearchTerm(value: string) {
  const text = normalize(value);
  return hasAnyToken(text, [
    "kahvi",
    "kahvia",
    "juhla mokka",
    "presidentti",
    "kulta katriina",
    "paulig",
    "meira",
    "suodatinkahvi",
    "suodatinjauhatus",
    "kahvipapu",
    "espresso",
    "pikakahvi",
  ]);
}

export function isCoffeeAccessory(name: string) {
  const text = normalize(name);

  return hasAnyToken(text, [
    "kahvikuppi",
    "kuppi",
    "kahvimuki",
    "muki",
    "kahvipurkki",
    "purkki",
    "kahvimitta",
    "mitta",
    "kahvilusikka",
    "lusikka",
    "kahvisuppilo",
    "suppilo",
    "kahvi-/teepannu",
    "kahvi teepannu",
    "teepannu",
    "kahvipannu",
    "pannu",
    "kahvinkeittimen",
    "kahvinkeitin",
    "keitin",
    "keitinharja",
    "harja",
    "kahvinsuodatin",
    "suodatinpussi",
    "suodatinpaperi",
    "kahvitikku",
    "sekoitustikku",
    "tikku",
    "take away",
    "termos",
    "kapseliteline",
    "kahvilaite",
  ]);
}

export function hasStrongCoffeeSignal(name: string) {
  const text = normalize(name);

  return hasAnyToken(text, [
    "juhla mokka",
    "presidentti",
    "kulta katriina",
    "paulig",
    "meira",
    "lavazza",
    "löfbergs",
    "lofbergs",
    "arvid nordquist",
    "nescafe",
    "nescafé",
    "segafredo",
    "starbucks",
    "suodatinkahvi",
    "suodatinjauhatus",
    "jauhettu",
    "jauhatus",
    "kahvipapu",
    "espresso",
    "pikakahvi",
    "instant coffee",
  ]);
}

export function hasCoffeePackSize(name: string) {
  const text = normalize(name);

  return /\b(100|200|250|400|450|500|750)\s?g\b/.test(text) || /\b1\s?kg\b/.test(text);
}

export function isClearlyColaProduct(name: string) {
  const productText = normalize(name);

  const colaSignals = [
    "cola",
    "coca-cola",
    "coca cola",
    "pepsi",
    "pepsi max",
    "kokis",
  ];

  const drinkSignals = [
    "0,25",
    "0.25",
    "0,33",
    "0.33",
    "0,5",
    "0.5",
    "1,5",
    "1.5",
    "2 l",
    "2l",
    "ml",
    "plo",
    "pullo",
    "tölkki",
    "tolkki",
    "tlk",
    "virvoitusjuoma",
    "limu",
    "limonadi",
    "hiilihapotettu virvoitusjuoma",
  ];

  const forbiddenColaContext = [
    // Alkoholit ja drinkit
    "jaloviina",
    "alkoholi",
    "alkoholijuoma",
    "olut",
    "siideri",
    "lonkero",
    "viini",
    "gin",
    "vodka",
    "rommi",
    "viski",
    "whisky",
    "likööri",
    "likoori",
    "drink",
    "cocktail",

    // Ei valmiita cola-limsoja
    "mysoda",
    "sodastream",
    "soda stream",
    "tiiviste",
    "makutiiviste",
    "juomatiiviste",
    "siirappi",
    "syrup",
    "jauhe",
    "juomajauhe",
    "urheilujuomajauhe",
    "sports drink",
    "proteiinijuoma",
    "proteiini",
    "energiajuoma",
    "energy",
    "battery",
    "ed",
    "red bull",

    // Makeiset ja muu ruoka
    "candy",
    "karkki",
    "makeinen",
    "lakritsi",
    "laku",
    "sour",
    "bar",
    "date bar",
    "taateli",
    "bites",
    "suklaa",
    "patukka",
    "jäätelö",
    "jaatelo",
    "mehujää",
    "mehujaa",
    "sorbetti",
    "jogurtti",
    "rahka",
    "vanukas",
    "kastike",
    "marinadi",
    "mehu",
    "appelsiini",
    "omena",
    "rypäle",
    "rypale",
    "marja",
    "smoothie",
    "nektari",
    "jäätee",
    "jaatee",
    "tee",
    "vichy",
    "kivennäisvesi",
    "kivennisvesi",
    "vesi",
  ];

  if (!hasAnyToken(productText, colaSignals)) return false;
  if (hasAnyToken(productText, forbiddenColaContext)) return false;

  // Hyväksy vain valmis juotava cola/limsa, ei tiiviste/jauhe/alkoholi.
  if (hasAnyToken(productText, ["coca-cola", "coca cola", "pepsi", "pepsi max"]) && hasAnyToken(productText, drinkSignals)) return true;

  return hasAnyToken(productText, drinkSignals);
}

export function isClearlyCoffeeProduct(name: string) {
  const productText = normalize(name);

  const forbiddenCoffeeContext = [
    "jaloviina",
    "alkoholi",
    "alkoholijuoma",
    "olut",
    "siideri",
    "lonkero",
    "viini",
    "gin",
    "vodka",
    "rommi",
    "viski",
    "whisky",
    "likööri",
    "likoori",
    "drink",
    "cocktail",
    "kahvimarja",
    "cascara",
    "energiajuoma",
    "energy",
    "proteiinijuoma",
    "proteiini",
    "jogurtti",
    "jogurt",
    "rahka",
    "jäätelö",
    "jaatelo",
    "vanukas",
    "suklaa",
    "keksi",
    "patukka",
    "maitokahvijuoma",
    "lattejuoma",
    "cappuccinojuoma",
    "maito-kahvijauhe",
    "maitokahvijauhe",
  ];

  const positiveCoffeeContext = [
    "kahvi",
    "suodatinkahvi",
    "suodatinjauhatus",
    "jauhettu",
    "jauhatus",
    "kahvipapu",
    "papukahvi",
    "espresso",
    "pikakahvi",
    "instant coffee",
    "juhla mokka",
    "presidentti",
    "kulta katriina",
    "paulig",
    "meira",
    "lavazza",
    "löfbergs",
    "lofbergs",
    "arvid nordquist",
    "nescafe",
    "nescafé",
    "segafredo",
    "starbucks",
  ];

  if (isCoffeeAccessory(name)) return false;
  if (hasAnyToken(productText, forbiddenCoffeeContext)) return false;

  return hasAnyToken(productText, positiveCoffeeContext) || hasCoffeePackSize(name);
}

export function isHardRejectedAlternative(sourceName: string, candidateName: string) {
  const source = normalize(sourceName);

  if (isCoffeeSearchTerm(source)) {
    return !isClearlyCoffeeProduct(candidateName);
  }

  const sourceIsMilk = hasAnyToken(source, ["maito", "kevytmaito", "rasvaton maito", "täysmaito", "taysmaito"]);
  if (sourceIsMilk) {
    return isBadNormalResult(
      {
        id: 0,
        name: candidateName,
        price: 1,
        storeItems: [{ price: 1 }],
      },
      sourceName
    );
  }

  const sourceIsCola = hasAnyToken(source, [
    "cola",
    "coca-cola",
    "coca cola",
    "pepsi",
    "kokis",
  ]);

  if (sourceIsCola) {
    return !isClearlyColaProduct(candidateName);
  }

  if (isEggSearchTerm(source)) {
    return !isClearlyEggProduct(candidateName);
  }

  return false;
}

export function isHardRejectedOptimizationAlternative(sourceName: string, candidateName: string) {
  const source = normalize(sourceName);
  const candidate = normalize(candidateName);

  if (isCoffeeSearchTerm(source)) {
    const forbiddenCoffeeOptimisationWords = [
      "kahvimarja",
      "energiajuoma",
      "energy",
      "proteiinijuoma",
      "maitokahvijuoma",
      "latte",
      "cappuccino",
      "jogurtti",
      "jogurt",
      "rahka",
      "jäätelö",
      "jaatelo",
      "vanukas",
      "suklaa",
      "keksi",
      "patukka",
      "alkoholi",
      "olut",
      "siideri",
      "lonkero",
      "viini",
      "drink",
      "cocktail",
    ];

    if (hasAnyToken(candidate, forbiddenCoffeeOptimisationWords)) return true;
  }

  return isHardRejectedAlternative(sourceName, candidateName);
}

export const VALUE_BRANDS = ["coop", "rainbow", "xtra", "kotimaista", "suomalainen"];
export const K_OWN_BRANDS = ["pirkka", "k-menu", "k menu"];
export const S_OWN_BRANDS = ["coop", "rainbow", "xtra", "kotimaista", "suomalainen"];
export const PREMIUM_BRANDS = ["findus", "atria", "hk", "saarioinen", "snellman", "valio", "arla"];

export function isValueBrandProduct(name: string) {
  const text = normalize(name);
  return hasAnyBrand(text, VALUE_BRANDS) || hasAnyBrand(text, K_OWN_BRANDS);
}

export function isKOwnBrandProduct(name: string) {
  return hasAnyBrand(normalize(name), K_OWN_BRANDS);
}

export function isPremiumBrandProduct(name: string) {
  return hasAnyBrand(normalize(name), PREMIUM_BRANDS);
}

// HARD SAFETY FILTER
// Estää täysin väärät tuoteryhmät:
// esim:
// - kalapuikot ↔ ranskalaiset
// - cola ↔ karkit
// - kahvi ↔ energiajuomat
//
// Maito ja kahvi jätetään tarkoituksella
// hieman löysemmiksi, jotta hakutuloksia ei katoa liikaa.
export function productGroupGate(sourceName: string, targetName: string) {
  const source = normalize(sourceName);
  const target = normalize(targetName);

  if (source.includes("jauheliha") && !target.includes("jauheliha")) return false;

  const sourceIsFishStick = hasAnyToken(source, ["kalapuikko", "kalapuikot", "fiskpinnar"]);
  if (sourceIsFishStick) {
    const targetIsFishStick = hasAnyToken(target, ["kalapuikko", "kalapuikot", "fiskpinnar"]);
    const targetIsWrongSideProduct = hasAnyToken(target, [
      "ranskanperuna",
      "ranskanperunat",
      "fries",
      "peruna",
      "perunat",
      "muusi",
      "perunamuusi",
      "crinkle",
      "wedge",
      "lohkoperuna",
      "ateria",
      "meal",
      "combo",
      "setti",
      "annos",
      "ja muusi",
      "sekavihannes",
      "kasvis",
    ]);

    if (!targetIsFishStick) return false;
    if (targetIsWrongSideProduct) return false;
  }

  const sourceIsFries = hasAnyToken(source, ["ranskanperuna", "ranskanperunat", "fries", "peruna", "perunat"]);
  if (sourceIsFries) {
    const targetIsFries = hasAnyToken(target, ["ranskanperuna", "ranskanperunat", "fries", "peruna", "perunat"]);
    const targetIsFishStick = hasAnyToken(target, ["kalapuikko", "kalapuikot", "fiskpinnar"]);

    if (!targetIsFries) return false;
    if (targetIsFishStick) return false;
  }

  const sourceIsEgg = isEggSearchTerm(source);
  if (sourceIsEgg && !isClearlyEggProduct(targetName)) return false;

  // Maito ja kahvi eivät saa käyttää kovaa tuoteryhmäporttia:
  // aiempi versio pudotti liikaa oikeita tuotteita pois.

  const sourceIsCola = hasAnyToken(source, ["cola", "coca-cola", "coca cola", "pepsi", "kokis"]);
  if (sourceIsCola) {
    if (!isClearlyColaProduct(targetName)) return false;
  }

  const sourceIsYogurt = hasAnyToken(source, ["jogurtti", "jogurt"]);
  if (sourceIsYogurt) {
    const targetIsYogurt = hasAnyToken(target, ["jogurtti", "jogurt"]);
    const targetIsWrongYogurtProduct = hasAnyToken(target, [
      "rahka",
      "vanukas",
      "juoma",
      "proteiinijuoma",
      "raejuusto",
      "tuorejuusto",
      "jäätelö",
      "jaatelo",
    ]);

    if (!targetIsYogurt) return false;
    if (targetIsWrongYogurtProduct) return false;
  }

  const sourceIsCheese = hasAnyToken(source, ["juusto", "edam", "emmental", "gouda", "oltermanni"]);
  if (sourceIsCheese) {
    const targetIsCheese = hasAnyToken(target, ["juusto", "edam", "emmental", "gouda", "oltermanni"]);
    const targetIsWrongCheeseProduct = hasAnyToken(target, [
      "tuorejuusto",
      "sulatejuusto",
      "raejuusto",
      "juustodippi",
      "dippi",
      "nacho",
      "kastike",
    ]);

    if (!targetIsCheese) return false;
    if (targetIsWrongCheeseProduct) return false;
  }

  return true;
}

export function isHardRejectedKMatch(query: string, candidateName: string) {
  const source = normalize(query);
  const target = normalize(candidateName);

  // Maito ja kahvi jätetään tarkoituksella vähemmän aggressiivisiksi.
  // Kova reject poisti liian monta oikeaa tuotetta K-haussa.

  const sourceIsFishStick = hasAnyToken(source, ["kalapuikko", "kalapuikot", "fiskpinnar"]);
  if (sourceIsFishStick) {
    const requiredFishWord = hasAnyToken(target, ["kalapuikko", "kalapuikot", "fiskpinnar"]);
    const forbiddenWords = hasAnyToken(target, [
      "aviko",
      "ranskanperuna",
      "ranskanperunat",
      "fries",
      "peruna",
      "perunat",
      "muusi",
      "perunamuusi",
      "crinkle",
      "wedge",
      "lohkoperuna",
      "ateria",
      "meal",
      "combo",
      "setti",
      "annos",
      "ja muusi",
      "kalapuikot ja muusi",
    ]);

    if (!requiredFishWord) return true;
    if (forbiddenWords) return true;
  }

  const sourceIsCoffee = isCoffeeSearchTerm(source);
  if (sourceIsCoffee) {
    if (isCoffeeAccessory(candidateName)) return true;
  }

  const sourceIsCola = hasAnyToken(source, ["cola", "coca-cola", "coca cola", "pepsi", "kokis"]);
  if (sourceIsCola) {
    if (!isClearlyColaProduct(candidateName)) return true;
  }

  const sourceIsYogurt = hasAnyToken(source, ["jogurtti", "jogurt"]);
  if (sourceIsYogurt) {
    const targetIsYogurt = hasAnyToken(target, ["jogurtti", "jogurt"]);
    const forbiddenWords = hasAnyToken(target, ["rahka", "vanukas", "juoma", "proteiinijuoma", "raejuusto", "tuorejuusto", "jäätelö", "jaatelo"]);

    if (!targetIsYogurt) return true;
    if (forbiddenWords) return true;
  }

  const sourceIsCheese = hasAnyToken(source, ["juusto", "edam", "emmental", "gouda", "oltermanni"]);
  if (sourceIsCheese) {
    const targetIsCheese = hasAnyToken(target, ["juusto", "edam", "emmental", "gouda", "oltermanni"]);
    const forbiddenWords = hasAnyToken(target, ["tuorejuusto", "sulatejuusto", "raejuusto", "juustodippi", "dippi", "nacho", "kastike"]);

    if (!targetIsCheese) return true;
    if (forbiddenWords) return true;
  }

  const sourceIsEgg = isEggSearchTerm(source);
  if (sourceIsEgg && !isClearlyEggProduct(candidateName)) return true;

  return false;
}

export function scoreNameMatch(sourceName: string, targetName: string) {
  const sourceText = normalize(sourceName);
  const targetText = normalize(targetName);

  if (isDifferentColaBrand(sourceName, targetName)) return -9999;
  if (isCoffeeSearchTerm(sourceName) && isCoffeeAccessory(targetName)) return -9999;
  if (isHardRejectedAlternative(sourceName, targetName)) return -9999;
  if (!productGroupGate(sourceName, targetName)) return -9999;

  const sourceIsValueBrand = hasAnyBrand(sourceText, VALUE_BRANDS) || hasAnyBrand(sourceText, K_OWN_BRANDS);
  const targetIsKOwnBrand = hasAnyBrand(targetText, K_OWN_BRANDS);
  const targetIsSOwnBrand = hasAnyBrand(targetText, S_OWN_BRANDS);
  const targetIsPremiumBrand = hasAnyBrand(targetText, PREMIUM_BRANDS);

  const specialWords = ["plus", "luomu", "laktoositon", "uht", "cafe", "barista", "kondensoitu", "proteiini", "kaakao", "maitojuoma"];
  for (const word of specialWords) {
    const sourceHas = sourceText.includes(word);
    const targetHas = targetText.includes(word);
    if (!sourceHas && targetHas) return -9999;
  }

  let score = 0;

  // Tarkat sanasamat ensin: nämä painavat enemmän kuin tarjousprosentti tai halpa hinta.
  score += getExactWordScore(sourceName, targetName);

  // Brändi on vahva signaali. Coca-Cola ei saa vaihtua Pepsiin eikä päinvastoin.
  score += getBrandMatchScore(sourceName, targetName);

  // Private label / edullisen oman merkin logiikka:
  // Coop/Rainbow/Xtra/Kotimaista vastaa K-ryhmässä yleensä paremmin Pirkka/K-Menua kuin premium-brändejä.
  if (sourceIsValueBrand && targetIsKOwnBrand) score += 32;
  if (sourceIsValueBrand && targetIsPremiumBrand) score -= 18;
  if (sourceIsValueBrand && targetIsSOwnBrand) score += 8;

  // Koko/paino tulee ennen hintaa: 1 l maito ei ole sama kuin 2 dl maitojuoma.
  score += getSizeMatchScore(sourceName, targetName);

  [
    "maito",
    "rasvaton",
    "kevyt",
    "täysmaito",
    "cola",
    "zero",
    "oivariini",
    "juusto",
    "jauheliha",
    "tortilla",
    "chips",
    "sipsi",
    "rahka",
    "kana",
    "kahvi",
    "kananmuna",
    "kananmunia",
    "munat",
    "laktoositon",
    "luomu",
    "kalapuikko",
    "kalapuikot",
    "kalafile",
    "kalapalat",
  ].forEach((word) => {
    const sourceHas = hasExactNormalizedWord(sourceName, word) || sourceText.includes(normalize(word));
    const targetHas = hasExactNormalizedWord(targetName, word) || targetText.includes(normalize(word));
    if (sourceHas && targetHas) score += 18;
    if (sourceHas && !targetHas) score -= 38;
  });

  return score;
}


export function scoreDirectQueryNameMatch(query: string, productName: string) {
  const queryText = normalize(query);
  const nameText = normalize(productName);

  if (!queryText || !nameText) return 0;

  let score = 0;

  // Tärkein hakusääntö:
  // jos käyttäjän hakusana löytyy tuotteen nimestä, tuote kuuluu listan kärkeen.
  // Esim. "cola" => Coca-Cola / Pirkka Cola ennen Pepsiä.
  if (nameText === queryText) score += 900;
  else if (nameText.startsWith(queryText)) score += 720;
  else if (nameText.includes(queryText)) score += 560;

  const queryWords = getNormalizedWords(query)
    .filter((word) => word.length > 2)
    .filter((word) => !["ja", "tai", "the", "with"].includes(word));

  if (queryWords.length > 0) {
    const matchingWords = queryWords.filter((word) =>
      hasExactNormalizedWord(productName, word) || nameText.includes(word)
    );

    if (matchingWords.length === queryWords.length) score += 320;
    else if (matchingWords.length > 0) score += matchingWords.length * 120;

    const firstWord = queryWords[0];
    if (firstWord && (hasExactNormalizedWord(productName, firstWord) || nameText.includes(firstWord))) {
      score += 220;
    }
  }

  return score;
}


export type ScoredProduct = {
  product: Product;
  score: number;
  categoryConfidence: number;
  preferredSizeScore: number;
  nonFoodPenalty: number;
};

export function getProductSearchText(product: Product) {
  return normalize(`${product.name} ${product.brandName || ""} ${product.category || ""}`);
}

export function getPreferredSizeScore(intent: SearchIntent, product: Product) {
  const size = parseMetricSize(product.name);
  if (!intent.preferredSizes?.length) return 0;

  // Jos tuotteesta ei saada kokoa, älä rankaise kovaa. Kaikissa lähteissä koko ei ole nimessä.
  if (!size) return 0;

  let bestScore = 0;
  for (const preferredSize of intent.preferredSizes) {
    if (size.unitGroup !== preferredSize.unitGroup) continue;

    const targetMidpoint = (preferredSize.min + preferredSize.max) / 2;
    const distanceRatio = Math.abs(size.amount - targetMidpoint) / targetMidpoint;

    if (size.amount >= preferredSize.min && size.amount <= preferredSize.max) {
      bestScore = Math.max(bestScore, preferredSize.boost + Math.max(0, 24 - distanceRatio * 50));
    } else if (distanceRatio <= 0.25) {
      bestScore = Math.max(bestScore, Math.round(preferredSize.boost * 0.35));
    }
  }

  if (bestScore > 0) return bestScore;

  // Selvästi väärät minikoot pois kärjestä, mutta ei hard rejectiä.
  if (size.unitGroup === "volume" && size.amount < 250) return -70;
  if (size.unitGroup === "weight" && size.amount < 100) return -70;

  return 0;
}


export function looksLikeNonFoodProduct(product: Product) {
  const text = getProductSearchText(product);

  const nonFoodSignals = [
    "iholle",
    "iholle ja",
    "iho",
    "ihon",
    "kasvo",
    "kasvoille",
    "huuli",
    "huulikiilto",
    "huulipuna",
    "ripsiväri",
    "ripsivari",
    "meikki",
    "meikinpoisto",
    "kosmetiikka",
    "arville",
    "arpi",
    "hoitava öljy",
    "hoitava oljy",
    "kuivalle iholle",
    "hiusöljy",
    "hiusoljy",
    "hiuksille",
    "vartaloöljy",
    "vartalooljy",
    "hierontaöljy",
    "hierontaoljy",
    "öljypohjainen",
    "oljypohjainen",
    "moottoriöljy",
    "moottorioljy",
    "voiteluöljy",
    "voiteluoljy",
  ];

  const foodSignals = [
    "ruokaöljy",
    "ruokaoljy",
    "rypsiöljy",
    "rypsioljy",
    "rapsiöljy",
    "rapsioljy",
    "oliiviöljy",
    "oliivioljy",
    "auringonkukkaöljy",
    "auringonkukkaoljy",
    "paistoöljy",
    "paistooljy",
    "seesamiöljy",
    "seesamioljy",
    "avokadoöljy",
    "avokadooljy",
    "salaattiöljy",
    "salaattioljy",
    "leivonta",
    "paistamiseen",
    "elintarvike",
  ];

  return hasAnyToken(text, nonFoodSignals) && !hasAnyToken(text, foodSignals);
}

export function getGroceryNonFoodPenalty(query: string, product: Product) {
  const queryText = normalize(query);
  const productText = getProductSearchText(product);

  if (!looksLikeNonFoodProduct(product)) return 0;

  // Kun käyttäjä hakee ruokakaupan geneeristä ydintuotetta kuten "öljy",
  // kosmetiikan ja muun ei-ruoan ei pidä nousta kärkeen vain siksi että nimi sisältää saman sanan.
  const groceryCoreQuery = hasAnyToken(queryText, [
    "öljy",
    "oljy",
    "maito",
    "piimä",
    "piima",
    "kahvi",
    "cola",
    "juusto",
    "jogurtti",
    "jogurt",
    "pasta",
    "riisi",
    "leipä",
    "leipa",
    "kana",
    "jauheliha",
    "ranskanperuna",
    "ranskanperunat",
  ]);

  if (!groceryCoreQuery) return -120;
  if (productText.includes(queryText)) return -1400;
  return -900;
}

export function isWrongMilkSearchProduct(product: Product) {
  const text = getProductSearchText(product);

  const wrongMilkSignals = [
    "rasvaseos",
    "rasvasekoite",
    "rasvasekoitus",
    "maitorahka",
    "rahka",
    "kerma",
    "ruokakerma",
    "kuohukerma",
    "vispikerma",
    "jogurtti",
    "jogurt",
    "piimä",
    "piima",
    "raejuusto",
    "juusto",
    "voi",
    "levite",
    "margariini",
    "kaakao",
    "vanukas",
    "maitojauhe",
    "maitokahvijuoma",
    "latte",
    "cappuccino",
    "proteiinijuoma",
    "maitojuoma",
    "kondensoitu",
  ];

  // Brändinimi kuten "Maitokolmion" ei vielä tee tuotteesta maitoa.
  if (hasAnyToken(text, wrongMilkSignals)) return true;

  return false;
}

export function hasStrongMilkSignal(product: Product) {
  const text = getProductSearchText(product);

  return hasAnyToken(text, [
    "kevytmaito",
    "rasvaton maito",
    "rasvatonmaito",
    "täysmaito",
    "taysmaito",
    "ykkösmaito",
    "ykkosmaito",
    "laktoositon maito",
    "luomu maito",
    "maito 1l",
    "maito 1 l",
    "maito 1,5l",
    "maito 1,5 l",
    "maitojuoma 1l", // pieni signaali vain jos muut väärät signaalit eivät osu
  ]) || /maito\s+(1|1[,.]5|2)\s?l/.test(text);
}

export function getCategoryConfidence(intent: SearchIntent, product: Product) {
  if (intent.category === "generic") return 0;

  const text = getProductSearchText(product);
  let confidence = 0;

  if (intent.requiredAny?.length && hasAnyToken(text, intent.requiredAny)) confidence += 95;
  if (intent.preferredAny?.length && hasAnyToken(text, intent.preferredAny)) confidence += 38;
  if (intent.bannedAny?.length && hasAnyToken(text, intent.bannedAny)) confidence -= 180;

  if (intent.category === "milk") {
    if (!isBadNormalResult(product, "maito")) confidence += 120;
    if (hasStrongMilkSignal(product)) confidence += 95;
    if (hasAnyToken(text, ["kevytmaito", "rasvaton", "täysmaito", "taysmaito", "ykkösmaito", "ykkosmaito", "maito 1l", "maito 1 l"])) confidence += 55;
    if (isWrongMilkSearchProduct(product)) confidence -= 360;
    if (hasAnyToken(text, ["maitojuoma", "proteiinijuoma", "latte", "kaakao", "maitojauhe", "rasvaseos", "rasvasekoite"])) confidence -= 220;
  }

  if (intent.category === "buttermilk") {
    if (hasAnyToken(text, ["piimä", "piima"])) confidence += 180;
    if (hasAnyToken(text, ["rasvaton", "laktoositon"])) confidence += 35;
    if (hasAnyToken(text, ["maito", "kerma", "jogurtti", "jogurt", "rahka", "juusto", "raejuusto", "kaakao", "maitojuoma", "proteiinijuoma"])) confidence -= 240;
  }


  if (intent.category === "cooking_oil") {
    if (hasAnyToken(text, ["ruokaöljy", "ruokaoljy", "rypsiöljy", "rypsioljy", "rapsiöljy", "rapsioljy", "oliiviöljy", "oliivioljy", "auringonkukkaöljy", "auringonkukkaoljy", "öljy", "oljy"])) confidence += 120;
    if (hasAnyToken(text, ["ruokaöljy", "ruokaoljy", "rypsiöljy", "rypsioljy", "rapsiöljy", "rapsioljy", "oliiviöljy", "oliivioljy"])) confidence += 85;
    if (looksLikeNonFoodProduct(product)) confidence -= 900;
  }

  if (intent.category === "coffee") {
    if (isClearlyCoffeeProduct(product.name)) confidence += 125;
    if (hasStrongCoffeeSignal(product.name)) confidence += 60;
    if (isCoffeeAccessory(product.name)) confidence -= 260;
  }

  if (intent.category === "cola") {
    if (isClearlyColaProduct(product.name)) confidence += 135;
    else confidence -= 260;

    // Käyttäjän "cola"-haku tarkoittaa ensisijaisesti cola-nimisiä tuotteita.
    // Pepsi saa edelleen näkyä, mutta vasta Cola-nimisten jälkeen.
    if (hasAnyToken(text, ["coca-cola", "coca cola", "cola"])) confidence += 85;
    if (hasAnyToken(text, ["pepsi", "pepsi max"]) && !hasAnyToken(normalize(product.name), ["cola"])) confidence -= 20;
  }

  return confidence;
}


export function getImportantQueryWordsForStrictMatch(query: string) {
  const genericWords = new Set([
    "tuote",
    "tuotteet",
    "pakkaus",
    "pkt",
    "kpl",
    "pl",
    "tlk",
    "plo",
    "pullo",
    "virvoitusjuoma",
    "juoma",
    "kokonainen",
    "tuore",
    "pakaste",
  ]);

  return getNormalizedWords(query)
    .filter((word) => word.length > 2)
    .filter((word) => !genericWords.has(word))
    .filter((word) => !/^\d+$/.test(word));
}

export function getStrictMultiWordMatchScore(query: string, product: Product) {
  const words = getImportantQueryWordsForStrictMatch(query);
  if (words.length < 2) return 0;

  const text = getProductSearchText(product);
  let score = 0;
  let missing = 0;

  for (const word of words) {
    if (hasExactNormalizedWord(product.name, word) || text.includes(word)) {
      score += 34;
    } else {
      missing += 1;
      score -= 105;
    }
  }

  // Moniosaisissa hauissa kuten "broilerin jauheliha" tai
  // "coca cola zero 1,5l" tärkeiden sanojen pitää pysyä mukana.
  // Muuten hakukone saa nostaa väärän alaryhmän kärkeen.
  if (missing === 0) score += 140;
  if (missing >= 2) score -= 180;

  return score;
}

export function scoreBaseNormalResult(query: string, product: Product) {
  const intent = detectSearchIntent(query);
  const queryText = normalize(query);
  const productText = getProductSearchText(product);
  const nameText = normalize(product.name);
  const queryWords = getNormalizedWords(query).filter((word) => word.length > 1);

  let score = 0;

  score += scoreDirectQueryNameMatch(query, product.name);
  score += getStrictMultiWordMatchScore(query, product);

  if (productText === queryText) score += 140;
  if (nameText.startsWith(queryText)) score += 90;
  if (productText.includes(queryText)) score += 65;

  for (const word of queryWords) {
    if (hasExactNormalizedWord(product.name, word)) score += 24;
    else if (productText.includes(word)) score += 10;
    else score -= 7;
  }

  score += getCategoryConfidence(intent, product);
  score += getPreferredSizeScore(intent, product);

  if (intent.preferredBrands?.length && hasAnyBrand(nameText, intent.preferredBrands)) score += 22;
  if (intent.ownBrandFriendly && isValueBrandProduct(product.name)) score += 16;

  if (isBadNormalResult(product, query)) score -= intent.category === "generic" ? 70 : 120;

  score += getGroceryNonFoodPenalty(query, product);

  const price = getProductPrice(product);
  if (price > 0) score -= Math.min(18, price / 1000);

  return score;
}

export function scoreMilkProduct(query: string, product: Product) {
  let score = scoreBaseNormalResult(query, product);
  const text = getProductSearchText(product);
  const size = parseMetricSize(product.name);

  if (isBadNormalResult(product, "maito")) score -= 260;
  if (isWrongMilkSearchProduct(product)) score -= 650;
  if (hasStrongMilkSignal(product)) score += 150;
  if (size?.unitGroup === "volume" && size.amount >= 900 && size.amount <= 1100) score += 90;
  if (size?.unitGroup === "volume" && size.amount >= 1400 && size.amount <= 2100) score += 35;
  if (size?.unitGroup === "volume" && size.amount < 500) score -= 85;

  if (hasAnyToken(text, ["kevytmaito", "rasvaton", "täysmaito", "taysmaito", "ykkösmaito", "ykkosmaito"])) score += 55;
  if (hasAnyToken(text, ["kauramaito", "soijamaito", "mantelimaito"]) && !hasAnyToken(normalize(query), ["kaura", "soija", "manteli"])) score -= 45;

  return score;
}

export function scoreCoffeeProduct(query: string, product: Product) {
  let score = scoreBaseNormalResult(query, product);
  const text = getProductSearchText(product);
  const size = parseMetricSize(product.name);

  if (!isClearlyCoffeeProduct(product.name)) score -= 320;
  if (hasStrongCoffeeSignal(product.name)) score += 85;
  if (isCoffeeAccessory(product.name)) score -= 420;
  if (size?.unitGroup === "weight" && size.amount >= 400 && size.amount <= 550) score += 85;
  if (size?.unitGroup === "weight" && size.amount < 100) score -= 95;
  if (hasAnyToken(text, ["suodatinkahvi", "suodatinjauhatus", "jauhettu", "jauhatus"])) score += 45;

  return score;
}

export function scoreColaProduct(query: string, product: Product) {
  let score = scoreBaseNormalResult(query, product);
  const text = getProductSearchText(product);
  const size = parseMetricSize(product.name);

  if (!isClearlyColaProduct(product.name)) score -= 360;
  if (hasAnyToken(text, ["coca-cola", "coca cola"])) score += 110;
  if (hasAnyToken(text, ["cola"])) score += 90;
  if (hasAnyToken(text, ["pepsi", "pepsi max"]) && normalize(query).includes("cola")) score -= 35;
  const querySize = parseMetricSize(query);
  if (querySize?.unitGroup === "volume" && size?.unitGroup === "volume") {
    const sizeRatio = Math.abs(querySize.amount - size.amount) / Math.max(querySize.amount, size.amount);
    if (sizeRatio <= 0.04) score += 260;
    else if (sizeRatio <= 0.16) score += 80;
    else score -= 180;
  }

  if (size?.unitGroup === "volume" && size.amount >= 1400 && size.amount <= 1600) score += 70;
  if (size?.unitGroup === "volume" && size.amount >= 300 && size.amount <= 550) score += querySize ? 0 : 35;
  if (size?.unitGroup === "volume" && size.amount < 250) score -= 80;

  return score;
}

export function scoreButtermilkProduct(query: string, product: Product) {
  let score = scoreBaseNormalResult(query, product);
  const text = getProductSearchText(product);
  const size = parseMetricSize(product.name);

  if (hasAnyToken(text, ["piimä", "piima"])) score += 220;
  if (!hasAnyToken(text, ["piimä", "piima"])) score -= 320;
  if (hasAnyToken(text, ["maito", "kerma", "jogurtti", "jogurt", "rahka", "juusto", "raejuusto", "kaakao", "maitojuoma", "proteiinijuoma"])) score -= 260;
  if (size?.unitGroup === "volume" && size.amount >= 900 && size.amount <= 1100) score += 90;
  if (size?.unitGroup === "volume" && size.amount < 500) score -= 85;

  return score;
}


export function scoreCookingOilProduct(query: string, product: Product) {
  let score = scoreBaseNormalResult(query, product);
  const text = getProductSearchText(product);
  const size = parseMetricSize(product.name);

  if (looksLikeNonFoodProduct(product)) score -= 1400;
  if (hasAnyToken(text, ["ruokaöljy", "ruokaoljy", "rypsiöljy", "rypsioljy", "rapsiöljy", "rapsioljy", "oliiviöljy", "oliivioljy", "auringonkukkaöljy", "auringonkukkaoljy"])) score += 170;
  if (hasAnyToken(text, ["paistamiseen", "leivonta", "salaatti", "extra virgin", "neitsytoliivi"])) score += 35;
  if (size?.unitGroup === "volume" && size.amount >= 400 && size.amount <= 1000) score += 55;
  if (size?.unitGroup === "volume" && size.amount < 150) score -= 55;

  return score;
}

export function scoreCategorySpecificResult(query: string, product: Product) {
  const intent = detectSearchIntent(query);

  if (intent.category === "milk") return scoreMilkProduct(query, product);
  if (intent.category === "buttermilk") return scoreButtermilkProduct(query, product);
  if (intent.category === "cooking_oil") return scoreCookingOilProduct(query, product);
  if (intent.category === "coffee") return scoreCoffeeProduct(query, product);
  if (intent.category === "cola") return scoreColaProduct(query, product);

  return scoreBaseNormalResult(query, product);
}

export function scoreNormalSResult(query: string, product: Product) {
  return scoreCategorySpecificResult(query, product);
}

export function rankNormalSearchResults(query: string, products: Product[]) {
  const intent = detectSearchIntent(query);
  const queryIsEgg = intent.category === "egg" || isEggSearchTerm(query);

  return products
    .filter((product: Product) => !queryIsEgg || isClearlyEggProduct(product.name))
    .map((product: Product): ScoredProduct => ({
      product,
      score: scoreNormalSResult(query, product),
      categoryConfidence: getCategoryConfidence(intent, product),
      preferredSizeScore: getPreferredSizeScore(intent, product),
      nonFoodPenalty: getGroceryNonFoodPenalty(query, product),
    }))
    .sort((a, b) => {
      const scoreDifference = b.score - a.score;
      if (Math.abs(scoreDifference) > 8) return scoreDifference;

      // Tasatilanteissa aito tuoteryhmä ja normaali pakkauskoko voittavat halvimman hinnan.
      const categoryDifference = b.categoryConfidence - a.categoryConfidence;
      if (Math.abs(categoryDifference) > 20) return categoryDifference;

      const sizeDifference = b.preferredSizeScore - a.preferredSizeScore;
      if (Math.abs(sizeDifference) > 8) return sizeDifference;

      // Ei-ruokatuotteet jätetään ruokahakujen viimeisiksi, vaikka nimessä olisi täsmäosuma.
      const nonFoodDifference = b.nonFoodPenalty - a.nonFoodPenalty;
      if (Math.abs(nonFoodDifference) > 100) return nonFoodDifference;

      return getProductPrice(a.product) - getProductPrice(b.product);
    })
    .map(({ product }) => product);
}

export function isNonFoodOffer(offer: ZiiplyOffer) {
  const text = normalize(`${offer.offer.item.name} ${offer.offer.item.category || ""}`);
  const blocked = [
    "lumene",
    "klassikko",
    "kasvovoide",
    "päivävoide",
    "paivavoide",
    "voide",
    "kosteuttava",
    "hoitava",
    "ihonhoito",
    "kosmetiikka",
    "meikki",
    "huulirasva",
    "lip balm",
    "moira",
    "pigment",
    "sieniliina",
    "siivous",
    "leivinpaperi",
    "kukka",
    "kimppu",
    "tulppaani",
    "ruusu",
    "shampoo",
    "saippua",
    "deodorantti",
    "hammastahna",
    "hammasharja",
    "wc paperi",
    "talouspaperi",
    "pesuaine",
    "pyykinpesu",
    "roskapussi",
    "laastari",
    "vitamiini",
    "ravintolisa",
    "ravintolisä",
  ];
  return blocked.some((word) => text.includes(normalize(word)));
}

export function isBadNormalResult(product: Product, query: string) {
  const normalizedQuery = normalize(query);
  const normalizedName = normalize(product.name);
  const category = normalize(product.category || "");
  const productText = `${normalizedName} ${category}`;

  if (normalizedQuery.includes("jauheliha") && !productText.includes("jauheliha")) return true;

  const queryIsMilk = hasAnyToken(normalizedQuery, ["maito", "kevytmaito", "rasvaton maito", "täysmaito", "taysmaito"]);
  if (queryIsMilk) {
    const positiveMilkSignals = [
      "maito",
      "kevytmaito",
      "rasvaton maito",
      "rasvaton",
      "täysmaito",
      "taysmaito",
      "ykkösmaito",
      "ykkosmaito",
      "luomumaito",
      "kauramaito",
      "soijamaito",
      "mantelimaito",
      "laktoositon maito",
    ];

    const forbiddenMilkContext = [
      "maitorahka",
      "rahka",
      "kuohukerma",
      "kerma",
      "ruokakerma",
      "vispikerma",
      "raejuusto",
      "jogurtti",
      "jogurt",
      "vanukas",
      "jäätelö",
      "jaatelo",
      "maitosuklaa",
      "suklaa",
      "kondensoitu",
      "maitohappo",
      "kaakao",
      "keksi",
      "liima",
      "ravintolisä",
      "ravintolisa",
      "patukka",
      "konvehti",
      "maitojuoma",
      "maitokahvijuoma",
      "latte",
      "cafe",
      "proteiinijuoma",
      "proteiini",
      "maito-kahvijauhe",
      "maitokahvijauhe",
      "maitojauhe",
      "cappuccino",
    ];

    if (!hasAnyToken(normalizedName, positiveMilkSignals)) return true;
    if (hasAnyToken(productText, forbiddenMilkContext)) return true;
  }

  const queryIsCoffee = isCoffeeSearchTerm(normalizedQuery) || normalizedQuery.includes("juhla mokka");
  if (queryIsCoffee) {
    if (!isClearlyCoffeeProduct(product.name)) return true;
  }

  const queryIsCola = hasAnyToken(normalizedQuery, ["cola", "coca-cola", "coca cola", "pepsi", "kokis"]);
  if (queryIsCola) {
    if (!isClearlyColaProduct(product.name)) return true;
    if (isDifferentColaBrand(query, product.name)) return true;
  }

  const queryIsEgg = isEggSearchTerm(normalizedQuery);
  if (queryIsEgg) {
    if (!isClearlyEggProduct(product.name)) return true;
  }

  if (normalizedQuery.includes("jogurtti") || normalizedQuery.includes("jogurt")) {
    const targetIsYogurt = hasAnyToken(normalizedName, ["jogurtti", "jogurt"]);
    const forbiddenWords = hasAnyToken(productText, ["rahka", "vanukas", "juoma", "proteiinijuoma", "raejuusto", "tuorejuusto", "jäätelö", "jaatelo"]);
    if (!targetIsYogurt || forbiddenWords) return true;
  }

  if (normalizedQuery.includes("juusto")) {
    const targetIsCheese = hasAnyToken(normalizedName, ["juusto", "edam", "emmental", "gouda", "oltermanni"]);
    const forbiddenWords = hasAnyToken(productText, ["tuorejuusto", "sulatejuusto", "raejuusto", "juustodippi", "dippi", "nacho", "kastike"]);
    if (!targetIsCheese || forbiddenWords) return true;
  }

  return false;
}

export function findArea(value: string) {
  const q = normalize(value);
  return AREAS.find((area) => area.aliases.some((alias) => normalize(alias) === q || q.includes(normalize(alias))));
}

export function storeText(store: StoreSearchItem) {
  return normalize(`${store.name || ""} ${store.chain || ""} ${store.city || ""} ${store.postalCode || ""}`);
}

export function isPrisma(store: StoreSearchItem) {
  const text = storeText(store);
  return store.type === "S" && text.includes("prisma");
}

export function isKCitymarket(store: StoreSearchItem) {
  const text = storeText(store);
  return store.type === "K" && (text.includes("k-citymarket") || text.includes("kcitymarket"));
}

export function isSLocalStore(store: StoreSearchItem) {
  const text = storeText(store);
  return (
    store.type === "S" &&
    !text.includes("prisma") &&
    (text.includes("s-market") ||
      text.includes("smarket") ||
      text.includes("sale") ||
      text.includes("alepa"))
  );
}

export function isKLocalStore(store: StoreSearchItem) {
  const text = storeText(store);
  return (
    store.type === "K" &&
    !text.includes("k-citymarket") &&
    !text.includes("kcitymarket") &&
    (text.includes("k-supermarket") ||
      text.includes("ksupermarket") ||
      text.includes("k-market") ||
      text.includes("kmarket"))
  );
}

export function pickStore(stores: StoreSearchItem[], predicate: (store: StoreSearchItem) => boolean) {
  return stores.find(predicate);
}

export function offerToProduct(item: ZiiplyOffer): Product {
  return {
    id: Number(`${item.chain === "S" ? 1 : 2}${item.offer.item.id}`),
    name: fixText(item.offer.item.name),
    ean: item.offer.item.ean,
    
    pictureUrl: item.offer.item.pictureUrl,
    category: item.offer.item.category,
    price: item.offer.storeItem?.price || 0,
    storeItems: [{ price: item.offer.storeItem?.price || 0 }],
  };
}

export type ScoredOfferResult = {
  item: ZiiplyOffer;
  score: number;
  directHit: boolean;
};

export function scoreOfferForTerm(term: string, item: ZiiplyOffer): { score: number; directHit: boolean } {
  const product = offerToProduct(item);
  const productText = getProductSearchText(product);
  const queries = getNormalSearchQueries(term);
  const directHit = queries.some((query) => {
    const normalizedQuery = normalize(query);
    return Boolean(normalizedQuery) && productText.includes(normalizedQuery);
  });

  const intent = detectSearchIntent(term);
  const categoryConfidence = getCategoryConfidence(intent, product);
  const preferredSizeScore = getPreferredSizeScore(intent, product);
  const nonFoodPenalty = getGroceryNonFoodPenalty(term, product);
  const baseScore = scoreCategorySpecificResult(term, product);

  let score = baseScore + categoryConfidence * 0.7 + preferredSizeScore * 0.5 + nonFoodPenalty;

  // Tarjousbackend pysyy ennallaan, mutta tarjouslistan relevanssi seuraa nyt samaa
  // intentti-, tuoteryhmä-, koko- ja ei-ruoka-logiikkaa kuin normaali tuotteenhaku.
  if (isNonFoodOffer(item)) score -= 1600;
  if (isBadNormalResult(product, term)) score -= 650;
  if (isHardRejectedAlternative(term, product.name)) score -= 900;

  // Jos tarjouksen nimi ei osu yhteenkään normaalihaun laajennettuun queryyn,
  // sen pitää todistaa relevanssinsa category confidencella tai korkealla scorerilla.
  if (!directHit && categoryConfidence < 70 && baseScore < 120) score -= 900;

  return { score, directHit };
}

export function rankOfferSearchResults(offers: ZiiplyOffer[], terms: string[]) {
  const searchTerms = terms.map((term) => term.trim()).filter(Boolean);
  if (searchTerms.length === 0) return [];

  return offers
    .map((item): ScoredOfferResult => {
      const best = searchTerms
        .map((term) => scoreOfferForTerm(term, item))
        .sort((a, b) => b.score - a.score)[0];

      return {
        item,
        score: best?.score ?? -9999,
        directHit: best?.directHit ?? false,
      };
    })
    .filter(({ score, directHit }) => directHit || score > 120)
    .sort((a, b) => {
      const scoreDifference = b.score - a.score;
      if (Math.abs(scoreDifference) > 12) return scoreDifference;

      const priceDifference = (a.item.offer.storeItem?.price || 0) - (b.item.offer.storeItem?.price || 0);
      if (priceDifference !== 0) return priceDifference;

      return (b.item.offer.discountPercent || 0) - (a.item.offer.discountPercent || 0);
    })
    .map(({ item }) => item);
}

export function convertKProductToProduct(product: KProduct): Product {
  return {
    id: Number(product.id.replace(/\D/g, "").slice(0, 9)) || Date.now(),
    name: fixText(product.name),
    
    brandName: product.brandName,
    pictureUrl: product.pictureUrl,
    price: product.price,
    storeItems: [{ price: product.price }],
  };
}

export function getPrimaryBrand(name: string) {
  const text = normalize(name);

  const brandGroups = [
    "juhla mokka",
    "coca-cola",
    "coca cola",
    "pepsi",
    "valio",
    "arla",
    "atria",
    "hk",
    "snellman",
    "saarioinen",
    "findus",
    "pirkka",
    "k-menu",
    "k menu",
    "coop",
    "rainbow",
    "xtra",
    "kotimaista",
    "suomalainen",
  ];

  return brandGroups.find((brand) => text.includes(normalize(brand))) || "";
}

export function isAllowedByQualityMode(sourceName: string, candidateName: string, qualityMode: QualityMode) {
  if (qualityMode === "cheapest") return true;

  const source = normalize(sourceName);
  const candidate = normalize(candidateName);

  const sourceBrand = getPrimaryBrand(sourceName);
  const candidateBrand = getPrimaryBrand(candidateName);

  const sourceOwnBrand = isValueBrandProduct(sourceName);
  const candidateOwnBrand = isValueBrandProduct(candidateName);

  if (qualityMode === "own_brands") {
    return candidateOwnBrand;
  }

  if (qualityMode === "keep_brands") {
    if (!sourceBrand) return true;
    return sourceBrand === candidateBrand;
  }

  if (qualityMode === "same_quality") {
    if (sourceOwnBrand) return candidateOwnBrand;

    const sourceIsPremium = isPremiumBrandProduct(sourceName) || Boolean(sourceBrand);
    const candidateIsCheapOwnBrand = candidateOwnBrand && !sourceOwnBrand;

    if (sourceIsPremium && candidateIsCheapOwnBrand) return false;

    if (hasAnyToken(source, ["coca-cola", "coca cola", "pepsi"])) {
      return hasAnyToken(candidate, ["coca-cola", "coca cola", "pepsi"]);
    }

    if (source.includes("juhla mokka")) {
      return candidate.includes("juhla mokka");
    }

    return true;
  }

  return true;
}

export function scoreQualityMode(sourceName: string, candidateName: string, qualityMode: QualityMode) {
  if (!isAllowedByQualityMode(sourceName, candidateName, qualityMode)) return -9999;

  const sourceBrand = getPrimaryBrand(sourceName);
  const candidateBrand = getPrimaryBrand(candidateName);

  let score = 0;

  if (qualityMode === "cheapest") {
    if (isValueBrandProduct(candidateName)) score += 8;
  }

  if (qualityMode === "own_brands") {
    if (isValueBrandProduct(candidateName)) score += 35;
  }

  if (qualityMode === "keep_brands") {
    if (sourceBrand && candidateBrand === sourceBrand) score += 50;
  }

  if (qualityMode === "same_quality") {
    if (sourceBrand && candidateBrand === sourceBrand) score += 28;
    if (isValueBrandProduct(sourceName) && isValueBrandProduct(candidateName)) score += 20;
    if (isPremiumBrandProduct(sourceName) && isPremiumBrandProduct(candidateName)) score += 14;
  }

  return score;
}

export function pickBestSProduct(items: Product[], query: string, ean?: string) {
  const normalizedEan = normalizeEan(ean);
  const eanMatch = items.find((item) => isUsableEan(normalizedEan) && normalizeEan(item.ean) === normalizedEan && getProductPrice(item) > 0);
  if (eanMatch) return eanMatch;

  return items
    .filter((item) => getProductPrice(item) > 0)
    .filter((item) => !isHardRejectedAlternative(query, item.name))
    .filter((item) => !isBadNormalResult(item, query))
    .map((item) => ({ item, score: scoreNameMatch(query, item.name) }))
    .filter((x) => x.score > -100)
    .sort((a, b) => b.score - a.score || getProductPrice(a.item) - getProductPrice(b.item))[0]?.item;
}

export function pickBestKProduct(items: KProduct[], query: string, ean?: string) {
  const usableItems = items.filter(
    (item) =>
      item.price > 0 &&
      !isHardRejectedAlternative(query, item.name) &&
      !isHardRejectedKMatch(query, item.name) &&
      productGroupGate(query, item.name)
  );

  const normalizedEan = normalizeEan(ean);
  const eanMatch = usableItems.find((item) => isUsableEan(normalizedEan) && normalizeEan(item.ean) === normalizedEan);
  if (eanMatch) return eanMatch;

  const queryIsValueBrand = isValueBrandProduct(query);

  // Jos lähtötuote on Coop/Rainbow/Xtra/Kotimaista tai muu private label,
  // K-vastineeksi haetaan ensisijaisesti Pirkka/K-Menu. Premium-brändit arvioidaan
  // vasta jos omaa merkkiä ei löydy lainkaan samasta tuoteryhmästä.
  const primaryPool =
    queryIsValueBrand && usableItems.some((item) => isKOwnBrandProduct(item.name))
      ? usableItems.filter((item) => isKOwnBrandProduct(item.name))
      : queryIsValueBrand && usableItems.some((item) => !isPremiumBrandProduct(item.name))
      ? usableItems.filter((item) => !isPremiumBrandProduct(item.name))
      : usableItems;

  return primaryPool
    .map((item) => ({ item, score: scoreNameMatch(query, item.name) }))
    .filter((x) => x.score > -100)
    .sort((a, b) => {
      const scoreDifference = b.score - a.score;

      // Jos osumat ovat lähes yhtä hyviä, edullisempi vaihtoehto on parempi MVP-vastaavuus.
      if (Math.abs(scoreDifference) <= 14) {
        return a.item.price - b.item.price;
      }

      return scoreDifference;
    })[0]?.item;
}


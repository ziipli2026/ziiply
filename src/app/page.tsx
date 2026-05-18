"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Offer = {
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

type ZiiplyOffer = {
  id: string;
  chain: "S" | "K";
  storeName: string;
  offer: Offer;
};

type Product = {
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

type KProduct = {
  id: string;
  name: string;
  ean?: string;
  brandName?: string;
  pictureUrl?: string;
  price: number;
};

type EanSearchResult = {
  key: string;
  chain: "S" | "K";
  storeName: string;
  product: Product;
  eanMatch: boolean;
};

type CartItem = {
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

type Area = {
  label: string;
  aliases: string[];

  // Tavaratalot / isot kaupat
  sStoreId: number;
  sStoreName: string;
  kStoreId: number;
  kStoreName: string;

  // Lähikaupat. Jos näitä ei ole vielä täytetty, koodi käyttää yllä olevia tavarataloja fallbackina.
  sLocalStoreId?: number;
  sLocalStoreName?: string;
  kLocalStoreId?: number;
  kLocalStoreName?: string;
};

type StoreSearchItem = {
  id: number;
  name: string;
  chain?: string;
  type?: "S" | "K" | string;
  city?: string;
  postalCode?: string;
};

type Match = {
  product: Product;
  price: number;
  quantity: number;
  matchType: "ean" | "name" | "manual";
  fallbackStoreName?: string;
  cartItemId?: string;
};

type ChainResult = {
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

type StoreMode = "hyper" | "local";
type QualityMode = "cheapest" | "same_quality" | "own_brands" | "keep_brands";

type OptimizationSnapshot = {
  cart: CartItem[];
  sMatches: Record<string, Match>;
  kMatches: Record<string, Match>;
  alternativeResults: Record<string, Product[]>;
  expandedAlternatives: Record<string, boolean>;
  chainKey: ChainResult["key"];
  chainName: string;
  savedAt: number;
};


type PriceSnapshot = {
  price: number;
  name: string;
  storeName?: string;
  chain?: string;
  updatedAt: number;
};

type SavedShoppingList = {
  id: string;
  name: string;
  items: CartItem[];
  createdAt: number;
  updatedAt: number;
};

const MAX_ITEMS = 8;
const ALTERNATIVES_AUTO_CLOSE_MS = 12000;
const PRICE_HISTORY_STORAGE_KEY = "ziiply-price-history-v1";
const RECENT_CART_ITEMS_STORAGE_KEY = "ziiply-recent-cart-items-v1";
const SAVED_SHOPPING_LISTS_STORAGE_KEY = "ziiply-saved-shopping-lists-v1";
const MAX_RECENT_CART_ITEMS = 10;
const MAX_SAVED_SHOPPING_LISTS = 8;
const HTML5_QRCODE_SCRIPT_URL = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
const EAN_SCANNER_REGION_ID = "ziiply-ean-scanner-region";

// Scanner UX:
// Käytetään lähes neliötä, jotta sekä pysty- että vaakaviivakoodit mahtuvat kehykseen.
// Tämä auttaa erityisesti maitopurkkien ja kaarevien pakkausten viivakoodeissa.

// Local store fallback:
// Jos alueelta ei vielä löydy oikeaa lähikaupan storeId:tä,
// käytetään automaattisesti hypermarket-versiota fallbackina.
const AREAS: Area[] = [
  { label: "Hyvinkää", aliases: ["hyvinkää", "hyvinkaa", "05800"], sStoreId: 292, sStoreName: "Prisma Hyvinkää", kStoreId: 3221, kStoreName: "K-Citymarket Hyvinkää" },
  { label: "Helsinki", aliases: ["helsinki", "pasila", "tripla", "ruoholahti"], sStoreId: 945, sStoreName: "Prisma Tripla", kStoreId: 3275, kStoreName: "K-Citymarket Ruoholahti" },
  { label: "Espoo", aliases: ["espoo", "sello", "leppävaara", "leppavaara"], sStoreId: 1020, sStoreName: "Prisma Sello", kStoreId: 3695, kStoreName: "K-Citymarket Sello" },
  { label: "Vantaa", aliases: ["vantaa", "tikkurila", "jumbo"], sStoreId: 3, sStoreName: "Prisma Tikkurila", kStoreId: 3227, kStoreName: "K-Citymarket Jumbo" },
  { label: "Tampere", aliases: ["tampere", "kaleva"], sStoreId: 423, sStoreName: "Prisma Kaleva", kStoreId: 3343, kStoreName: "K-Supermarket Kaleva" },
  { label: "Turku", aliases: ["turku", "itäharju", "itaharju", "länsikeskus", "lansikeskus"], sStoreId: 225, sStoreName: "Prisma Itäharju", kStoreId: 3256, kStoreName: "K-Citymarket Länsikeskus" },
  { label: "Oulu", aliases: ["oulu", "limingantulli", "raksila"], sStoreId: 1047, sStoreName: "Prisma Limingantulli", kStoreId: 3271, kStoreName: "K-Citymarket Raksila" },
  { label: "Jyväskylä", aliases: ["jyväskylä", "jyvaskyla", "seppälä", "seppala", "keljo"], sStoreId: 247, sStoreName: "Prisma Seppälä", kStoreId: 3235, kStoreName: "K-Citymarket Keljo" },
  { label: "Kuopio", aliases: ["kuopio", "päiväranta", "paivaranta"], sStoreId: 929, sStoreName: "Prisma Kuopio", kStoreId: 3268, kStoreName: "K-Citymarket Päiväranta" },
  { label: "Lahti", aliases: ["lahti", "holma", "paavola"], sStoreId: 493, sStoreName: "Prisma Holma", kStoreId: 3262, kStoreName: "K-Citymarket Paavola" },
  { label: "Pori", aliases: ["pori", "mikkola", "puuvilla"], sStoreId: 360, sStoreName: "Prisma Mikkola", kStoreId: 3267, kStoreName: "K-Citymarket Puuvilla" },
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

function fixText(value: string) {
  return value.replace(/Ã¤/g, "ä").replace(/Ã¶/g, "ö").replace(/Ã¥/g, "å").replace(/â„¢/g, "").replace(/Â/g, "");
}

function normalize(value: string) {
  return fixText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[™®]/g, "")
    .replace(/[^\p{L}\p{N}\s,.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEan(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function isUsableEan(value?: string | null) {
  const ean = normalizeEan(value);
  return ean.length >= 8 && ean.length <= 14;
}

function getEanSearchVariants(value?: string | null) {
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

function isSameEan(value: string | undefined | null, variants: string[]) {
  const candidate = normalizeEan(value);
  if (!candidate) return false;

  return variants.includes(candidate) || variants.includes(candidate.replace(/^0+/, ""));
}

function cleanExternalProductName(value?: string | null) {
  return fixText(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function getOpenFoodFactsNames(product: any) {
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

function parseTerms(value: string) {
  return value.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean).slice(0, MAX_ITEMS);
}

const SEARCH_ALIASES: Record<string, string> = {
  // Juomat
  maito: "maito",
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
  kalapuikko: "kalapuikot",
  kalapuikot: "kalapuikot",

  // Snacks
  tortilla: "tortilla chips",
  sipsit: "sipsit",
};

function getSearchQuery(term: string) {
  const normalized = normalize(term);
  return SEARCH_ALIASES[normalized] || term;
}

function getNormalSearchQueries(term: string) {
  const normalized = normalize(term);
  const queries: string[] = [];

  const addQuery = (query: string) => {
    const clean = normalize(query);
    if (clean && !queries.includes(clean)) queries.push(clean);
  };

  if (isCoffeeSearchTerm(normalized)) {
    addQuery("kahvi");
    addQuery("suodatinkahvi");
    addQuery("juhla mokka");
    addQuery("presidentti kahvi");
    addQuery("kulta katriina");
    addQuery("paulig suodatinjauhatus");
    addQuery("paulig kahvi");
    addQuery("meira kahvi");
    addQuery("suodatinkahvi");
    addQuery("kahvi suodatinjauhatus");
    addQuery("kahvipapu");
    addQuery("espresso kahvi");
    return queries;
  }

  if (hasAnyToken(normalized, ["maito", "kevytmaito", "rasvaton maito", "täysmaito", "taysmaito", "ykkösmaito", "ykkosmaito", "laktoositon maito"])) {
    // Laaja maitohaku: yksi "maito"-query palautti liian vähän osumia.
    // Haetaan usealla aidolla maitotermillä ja suodatetaan roskat jälkikäteen.
    addQuery("maito");
    addQuery("rasvaton maito");
    addQuery("kevytmaito");
    addQuery("täysmaito");
    addQuery("ykkösmaito");
    addQuery("laktoositon maito");
    addQuery("luomu maito");
    addQuery("kauramaito");
    return queries;
  }

  if (hasAnyToken(normalized, ["cola", "coca-cola", "coca cola", "pepsi", "kokis"])) {
    addQuery("cola");
    addQuery("coca cola");
    addQuery("coca-cola");
    addQuery("pepsi");
    return queries;
  }

  addQuery(getSearchQuery(term));
  return queries;
}

function isAliasSearch(term: string) {
  return normalize(getSearchQuery(term)) !== normalize(term);
}

function formatEuro(cents?: number | null) {
  if (cents == null || Number.isNaN(cents)) return "—";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}


function formatComparisonPrice(product: any) {
  const value =
    product?.storeItems?.[0]?.comparisonPrice ??
    product?.comparisonPrice;

  const unit =
    product?.storeItems?.[0]?.comparisonPriceUnit ??
    product?.comparisonPriceUnit;

  if (!value || !unit) return null;

  return `${(value / 100).toFixed(2).replace(".", ",")} €/${unit}`;
}


function getProductCategoryLabel(name: string, category?: string) {
  const text = normalize(`${name} ${category || ""}`);

  if (hasAnyToken(text, ["banaani", "omena", "tomaatti", "kurkku", "hedelmä", "hedelma", "vihannes", "juures"])) return "Hedelmät ja vihannekset";
  if (hasAnyToken(text, ["maito", "juusto", "jogurtti", "jogurt", "rahka", "voi", "kerma", "raejuusto"])) return "Maitotuotteet";
  if (hasAnyToken(text, ["jauheliha", "kana", "broileri", "liha", "makkara", "kala", "kalapuikko"])) return "Liha, kala ja proteiinit";
  if (hasAnyToken(text, ["leipä", "leipa", "sämpylä", "sampyla", "tortilla"])) return "Leivät ja viljatuotteet";
  if (hasAnyToken(text, ["kahvi", "cola", "mehu", "limu", "vesi", "juoma", "olut"])) return "Juomat";
  if (hasAnyToken(text, ["pakaste", "ranskanperuna", "jäätelö", "jaatelo", "kalapuikko"])) return "Pakasteet";
  if (hasAnyToken(text, ["pasta", "riisi", "jauho", "sokeri", "öljy", "oljy", "kastike"])) return "Kuivatuotteet";
  if (hasAnyToken(text, ["sipsi", "chips", "karkki", "suklaa", "keksi"])) return "Herkut ja naposteltavat";

  return "Muut tuotteet";
}

function triggerHaptic() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(18);
    }
  } catch {}
}


function playScanSuccessFeedback() {
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fi-FI");
}

function getProductPrice(product: Product) {
  return product.storeItems?.[0]?.price || product.price || 0;
}

function isManualShoppingItem(item: CartItem) {
  return item.source === "manual" || !item.price || item.price <= 0;
}

function getPriceHistoryKeyFromProduct(product: Product, storeName?: string, chain?: string) {
  const ean = normalizeEan(product.ean);
  if (ean) return `ean:${ean}`;

  return `name:${normalize(`${product.name} ${storeName || ""} ${chain || ""}`)}`;
}

function getPriceHistoryKeyFromCartItem(item: CartItem) {
  const ean = normalizeEan(item.ean || item.product?.ean);
  if (ean) return `ean:${ean}`;

  return `name:${normalize(`${item.name} ${item.storeName || ""} ${item.chain || ""}`)}`;
}

function getPriceChangeInfo(previousPrice?: number, currentPrice?: number) {
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

function getSizeToken(name: string) {
  return normalize(name).match(/\d+(,\d+)?\s?(l|kg|g|ml)/i)?.[0] || "";
}

function hasWord(name: string, word: string) {
  return new RegExp(`\\b${word}\\b`, "i").test(normalize(name));
}

function getNormalizedWords(value: string) {
  return normalize(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
}

function hasExactNormalizedWord(value: string, word: string) {
  const normalizedWord = normalize(word);
  if (!normalizedWord) return false;
  return getNormalizedWords(value).includes(normalizedWord);
}

function parseMetricSize(value: string) {
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

function getExactWordScore(sourceName: string, targetName: string) {
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

function getBrandMatchScore(sourceName: string, targetName: string) {
  const sourceBrand = getPrimaryBrand(sourceName);
  const targetBrand = getPrimaryBrand(targetName);

  if (!sourceBrand && !targetBrand) return 0;
  if (sourceBrand && targetBrand && sourceBrand === targetBrand) return 52;
  if (sourceBrand && targetBrand && sourceBrand !== targetBrand) return -28;
  if (sourceBrand && !targetBrand) return -8;
  return 0;
}

function getSizeMatchScore(sourceName: string, targetName: string) {
  const sourceSize = parseMetricSize(sourceName);
  const targetSize = parseMetricSize(targetName);

  if (!sourceSize || !targetSize) return 0;
  if (sourceSize.unitGroup !== targetSize.unitGroup) return -45;

  const differenceRatio = Math.abs(sourceSize.amount - targetSize.amount) / Math.max(sourceSize.amount, targetSize.amount);

  if (differenceRatio <= 0.03) return 30;
  if (differenceRatio <= 0.15) return 8;
  return -42;
}

function isDifferentColaBrand(sourceName: string, targetName: string) {
  const source = normalize(sourceName);
  const target = normalize(targetName);
  const sourceCocaCola = hasAnyToken(source, ["coca-cola", "coca cola"]);
  const targetCocaCola = hasAnyToken(target, ["coca-cola", "coca cola"]);
  const sourcePepsi = hasAnyToken(source, ["pepsi", "pepsi max"]);
  const targetPepsi = hasAnyToken(target, ["pepsi", "pepsi max"]);

  return (sourceCocaCola && targetPepsi) || (sourcePepsi && targetCocaCola);
}

function buildKSearchName(name: string) {
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

function getKSearchTerms(name: string) {
  const searchName = getSearchQuery(name);
  const cleaned = buildKSearchName(searchName);
  const normalized = normalize(searchName);
  const terms: string[] = [];
  const addTerm = (term: string) => {
    const clean = normalize(term);
    if (clean && !terms.includes(clean)) terms.push(clean);
  };

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

function hasAnyBrand(text: string, brands: string[]) {
  return brands.some((brand) => text.includes(normalize(brand)));
}

function hasAnyToken(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(normalize(token)));
}

function isCoffeeSearchTerm(value: string) {
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

function isCoffeeAccessory(name: string) {
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

function hasStrongCoffeeSignal(name: string) {
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

function hasCoffeePackSize(name: string) {
  const text = normalize(name);

  return /\b(100|200|250|400|450|500|750)\s?g\b/.test(text) || /\b1\s?kg\b/.test(text);
}

function isClearlyColaProduct(name: string) {
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

function isClearlyCoffeeProduct(name: string) {
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

function isHardRejectedAlternative(sourceName: string, candidateName: string) {
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

  return false;
}

function isHardRejectedOptimizationAlternative(sourceName: string, candidateName: string) {
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

const VALUE_BRANDS = ["coop", "rainbow", "xtra", "kotimaista", "suomalainen"];
const K_OWN_BRANDS = ["pirkka", "k-menu", "k menu"];
const S_OWN_BRANDS = ["coop", "rainbow", "xtra", "kotimaista", "suomalainen"];
const PREMIUM_BRANDS = ["findus", "atria", "hk", "saarioinen", "snellman", "valio", "arla"];

function isValueBrandProduct(name: string) {
  const text = normalize(name);
  return hasAnyBrand(text, VALUE_BRANDS) || hasAnyBrand(text, K_OWN_BRANDS);
}

function isKOwnBrandProduct(name: string) {
  return hasAnyBrand(normalize(name), K_OWN_BRANDS);
}

function isPremiumBrandProduct(name: string) {
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
function productGroupGate(sourceName: string, targetName: string) {
  const source = normalize(sourceName);
  const target = normalize(targetName);

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

function isHardRejectedKMatch(query: string, candidateName: string) {
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

  return false;
}

function scoreNameMatch(sourceName: string, targetName: string) {
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

function isNonFoodOffer(offer: ZiiplyOffer) {
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

function isBadNormalResult(product: Product, query: string) {
  const normalizedQuery = normalize(query);
  const normalizedName = normalize(product.name);
  const category = normalize(product.category || "");
  const productText = `${normalizedName} ${category}`;

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

function findArea(value: string) {
  const q = normalize(value);
  return AREAS.find((area) => area.aliases.some((alias) => normalize(alias) === q || q.includes(normalize(alias))));
}

function storeText(store: StoreSearchItem) {
  return normalize(`${store.name || ""} ${store.chain || ""} ${store.city || ""} ${store.postalCode || ""}`);
}

function isPrisma(store: StoreSearchItem) {
  const text = storeText(store);
  return store.type === "S" && text.includes("prisma");
}

function isKCitymarket(store: StoreSearchItem) {
  const text = storeText(store);
  return store.type === "K" && (text.includes("k-citymarket") || text.includes("kcitymarket"));
}

function isSLocalStore(store: StoreSearchItem) {
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

function isKLocalStore(store: StoreSearchItem) {
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

function pickStore(stores: StoreSearchItem[], predicate: (store: StoreSearchItem) => boolean) {
  return stores.find(predicate);
}

function offerToProduct(item: ZiiplyOffer): Product {
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

function convertKProductToProduct(product: KProduct): Product {
  return {
    id: Number(product.id.replace(/\D/g, "").slice(0, 9)) || Date.now(),
    name: fixText(product.name),
    
    brandName: product.brandName,
    pictureUrl: product.pictureUrl,
    price: product.price,
    storeItems: [{ price: product.price }],
  };
}

function getPrimaryBrand(name: string) {
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

function isAllowedByQualityMode(sourceName: string, candidateName: string, qualityMode: QualityMode) {
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

function scoreQualityMode(sourceName: string, candidateName: string, qualityMode: QualityMode) {
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

function pickBestSProduct(items: Product[], query: string, ean?: string) {
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

function pickBestKProduct(items: KProduct[], query: string, ean?: string) {
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

export default function Page() {
  const [input, setInput] = useState("");
  const [locationInput, setLocationInput] = useState("Hyvinkää");
  const [activeArea, setActiveArea] = useState<Area>(AREAS[0]);
  const [storeMode, setStoreMode] = useState<StoreMode>("hyper");
  const [locationMessage, setLocationMessage] = useState("Demo käyttää Hyvinkään aluetta.");
  const [storeSearchLoading, setStoreSearchLoading] = useState(false);
  const [foundStores, setFoundStores] = useState<StoreSearchItem[]>([]);

  const [offers, setOffers] = useState<ZiiplyOffer[]>([]);
  const [hasSearchedOffers, setHasSearchedOffers] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [chainFilter, setChainFilter] = useState<"all" | "S" | "K">("all");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const [activeResult, setActiveResult] = useState<"none" | "offers" | "compare">("none");
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  // Mobile comparison view uses the same activeResult state as desktop, but renders as its own overlay.
  const [cart, setCart] = useState<CartItem[]>([]);

  const [normalResults, setNormalResults] = useState<Product[]>([]);
  const [loadingNormal, setLoadingNormal] = useState(false);
  const [visibleNormalCount, setVisibleNormalCount] = useState(8);
  const [eanModalOpen, setEanModalOpen] = useState(false);
  const [eanInput, setEanInput] = useState("");
  const [eanLoading, setEanLoading] = useState(false);
  const [eanResults, setEanResults] = useState<EanSearchResult[]>([]);
  const [eanMessage, setEanMessage] = useState("");
  const [eanCache, setEanCache] = useState<Record<string, string>>({});
  const [lastAutoEanSearch, setLastAutoEanSearch] = useState("");
  const [eanSearchStartedAutomatically, setEanSearchStartedAutomatically] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceOpenSearchPanelAfterResultRef = useRef(false);
  const cartSectionRef = useRef<HTMLElement | null>(null);
  const comparisonSectionRef = useRef<HTMLElement | null>(null);
  const normalResultsSectionRef = useRef<HTMLElement | null>(null);
  const savingsSummaryRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLTextAreaElement | null>(null);
  const alternativesTimeoutsRef = useRef<Record<string, number>>({});
  const eanAutoSearchTimeoutRef = useRef<number | null>(null);
  const eanAutoSearchActiveRef = useRef(false);
  const eanInputRef = useRef<HTMLInputElement | null>(null);
  const lastEanCartAddRef = useRef<{ key: string; at: number } | null>(null);
  const lastEanToastRef = useRef<{ message: string; at: number } | null>(null);
  const eanSearchInFlightRef = useRef<string | null>(null);
  const cartSaveTimeoutRef = useRef<number | null>(null);
  const cartHasLoadedRef = useRef(false);
  const shoppingChecksSaveTimeoutRef = useRef<number | null>(null);
  const shoppingChecksHaveLoadedRef = useRef(false);
  const priceHistorySaveTimeoutRef = useRef<number | null>(null);
  const priceHistoryBaselineRef = useRef<Record<string, PriceSnapshot>>({});
  const priceHistoryHasLoadedRef = useRef(false);


  const [checkedCartItems, setCheckedCartItems] = useState<Record<string, boolean>>({});
  const [priceHistoryBaseline, setPriceHistoryBaseline] = useState<Record<string, PriceSnapshot>>({});
  const [recentCartItems, setRecentCartItems] = useState<CartItem[]>([]);
  const [savedShoppingLists, setSavedShoppingLists] = useState<SavedShoppingList[]>([]);
  const [savedListName, setSavedListName] = useState("");
  const [lastSavingsToast, setLastSavingsToast] = useState<string | null>(null);
  const [lastCartToast, setLastCartToast] = useState<string | null>(null);


  const [qualityModesByCart, setQualityModesByCart] = useState<Record<string, QualityMode>>({});
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [sMatches, setSMatches] = useState<Record<string, Match>>({});
  const [kMatches, setKMatches] = useState<Record<string, Match>>({});
  const [expandedAlternatives, setExpandedAlternatives] = useState<Record<string, boolean>>({});
  const [alternativeResults, setAlternativeResults] = useState<Record<string, Product[]>>({});
  const [loadingAlternatives, setLoadingAlternatives] = useState<Record<string, boolean>>({});
  const [optimizingChains, setOptimizingChains] = useState<Record<string, boolean>>({});
  const [lastOptimizationSnapshot, setLastOptimizationSnapshot] = useState<OptimizationSnapshot | null>(null);

  const [selectedChains, setSelectedChains] = useState<Record<ChainResult["key"], boolean>>({
    s: true,
    k: true,
    lidl: false,
    tokmanni: false,
  });

  const [isOnline, setIsOnline] = useState(true);
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [eanScannerOpen, setEanScannerOpen] = useState(false);
  const [eanScannerMessage, setEanScannerMessage] = useState("");
  const [scanSuccessFlash, setScanSuccessFlash] = useState(false);
  const [scanMissFlash, setScanMissFlash] = useState(false);
  const eanHtml5ScannerRef = useRef<any | null>(null);
  const eanScannerStoppingRef = useRef(false);
  const lastContinuousScanRef = useRef<{ code: string; at: number } | null>(null);
  const scanSuccessFlashTimeoutRef = useRef<number | null>(null);
  const scanMissFlashTimeoutRef = useRef<number | null>(null);

  // =========================
  // MOBILE APP SHELL
  // =========================
  // PWA-käytössä sivu tuntuu enemmän omalta mobiilisovellukselta:
  // - kevyt app-header
  // - offline-banneri
  // - appimaisempi bottom nav
  // - lyhyt launch/splash overlay

  useEffect(() => {
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLaunchScreen(false), 900);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    return () => {
      if (scanSuccessFlashTimeoutRef.current) {
        window.clearTimeout(scanSuccessFlashTimeoutRef.current);
        scanSuccessFlashTimeoutRef.current = null;
      }

      if (scanMissFlashTimeoutRef.current) {
        window.clearTimeout(scanMissFlashTimeoutRef.current);
        scanMissFlashTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!eanModalOpen) stopEanCameraScanner();

    return () => {
      stopEanCameraScanner();
    };
  }, [eanModalOpen]);

  // =========================
  // DERIVED VIEW STATE
  // =========================
  // Raskaimmat listat ja summat pidetään useMemo-pohjaisina.
  // Tämä vähentää mobiilin turhia renderöintejä ilman että käyttölogiikka muuttuu.
  // Varsinainen komponenttijako kannattaa tehdä myöhemmin omiin tiedostoihin.

  const terms = useMemo(() => parseTerms(input), [input]);

  const activeStores = useMemo(() => {
    if (storeMode === "local") {
      return {
        sStoreId: activeArea.sLocalStoreId ?? activeArea.sStoreId,
        sStoreName: activeArea.sLocalStoreName ?? activeArea.sStoreName,
        kStoreId: activeArea.kLocalStoreId ?? activeArea.kStoreId,
        kStoreName: activeArea.kLocalStoreName ?? activeArea.kStoreName,
      };
    }

    return {
      sStoreId: activeArea.sStoreId,
      sStoreName: activeArea.sStoreName,
      kStoreId: activeArea.kStoreId,
      kStoreName: activeArea.kStoreName,
    };
  }, [activeArea, storeMode]);

  function shouldUseLocalFallback(chain: "S" | "K") {
    if (storeMode !== "local") return false;

    if (chain === "S") {
      return activeStores.sStoreId !== activeArea.sStoreId;
    }

    return activeStores.kStoreId !== activeArea.kStoreId;
  }

  async function fetchSProducts(search: string, storeId: number) {
    const response = await fetch(
      `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(search)}&storeIds=${storeId}&skip=0&take=80`,
      { cache: "no-store" }
    );
    const data = await response.json();
    return (data.items || []) as Product[];
  }

  async function fetchKProducts(search: string, storeId: number) {
    const response = await fetch(
      `/api/k-products?search=${encodeURIComponent(search)}&store=${encodeURIComponent(String(storeId))}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    return (data.items || []) as KProduct[];
  }

  async function fetchOpenFoodFactsNames(ean: string) {
    const normalizedEan = normalizeEan(ean);
    if (!isUsableEan(normalizedEan)) return [];

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedEan)}.json?fields=product_name,product_name_fi,generic_name,generic_name_fi,brands,code`,
      { cache: "no-store" }
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (data?.status !== 1 || !data?.product) return [];

    return getOpenFoodFactsNames(data.product);
  }

  function showCartToast(message: string) {
    const now = Date.now();

    // Sama ilmoitus saa näkyä vain kerran lyhyessä ajassa. Tämä pitää EAN-flow'n rauhallisena,
    // vaikka automaattihaku tai tuplaklikkaus ehtisi yrittää näyttää saman toastin uudelleen.
    if (lastEanToastRef.current?.message === message && now - lastEanToastRef.current.at < 2500) {
      return;
    }

    lastEanToastRef.current = { message, at: now };
    setLastCartToast(message);

    // UI debounce / anti-duplicate protection
    window.setTimeout(() => {
      setLastCartToast((current) => (current === message ? null : current));
    }, 2600);
  }

  function showScanSuccessFlash() {
    setScanMissFlash(false);
    setScanSuccessFlash(true);

    if (scanSuccessFlashTimeoutRef.current) {
      window.clearTimeout(scanSuccessFlashTimeoutRef.current);
    }

    scanSuccessFlashTimeoutRef.current = window.setTimeout(() => {
      setScanSuccessFlash(false);
      scanSuccessFlashTimeoutRef.current = null;
    }, 700);
  }

  function showScanMissFlash() {
    setScanSuccessFlash(false);
    setScanMissFlash(true);

    if (scanMissFlashTimeoutRef.current) {
      window.clearTimeout(scanMissFlashTimeoutRef.current);
    }

    scanMissFlashTimeoutRef.current = window.setTimeout(() => {
      setScanMissFlash(false);
      scanMissFlashTimeoutRef.current = null;
    }, 700);
  }


  // =========================
  // LOCAL STORAGE PERSISTENCE
  // =========================
  // Tallennetaan:
  // - ostoskori
  // - keräilyrastit
  // - hintahistoria
  // - viimeisimmät tuotteet
  // - tallennetut listat
  //
  // Kaikki persistence tehdään debounce-viiveellä,
  // jotta mobile Safari ei kuormitu liikaa.
  // =========================

  function getCartItemMemoryKey(item: CartItem) {
    const ean = normalizeEan(item.ean || item.product?.ean);
    if (ean) return `ean:${ean}`;
    return `name:${normalize(item.name)}`;
  }

  function sanitizeCartItemForStorage(item: CartItem): CartItem {
    return {
      id: item.id,
      name: fixText(item.name),
      price: item.price,
      image: item.image,
      chain: item.chain,
      storeName: item.storeName,
      quantity: Math.max(1, item.quantity || 1),
      source: item.source,
      product: item.product,
      ean: item.ean,
    };
  }

  function rememberRecentCartItems(items: CartItem[]) {
    const validItems = items
      .filter((item) => item.name?.trim())
      .map(sanitizeCartItemForStorage);

    if (validItems.length === 0) return;

    setRecentCartItems((current) => {
      const next = [...validItems.reverse(), ...current];
      const seen = new Set<string>();
      const unique = next.filter((item) => {
        const key = getCartItemMemoryKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, MAX_RECENT_CART_ITEMS);

      try {
        window.localStorage.setItem(
          RECENT_CART_ITEMS_STORAGE_KEY,
          JSON.stringify({ version: 1, savedAt: Date.now(), items: unique })
        );
      } catch {}

      return unique;
    });
  }

  function mergeItemsIntoCart(baseCart: CartItem[], itemsToAdd: CartItem[]) {
    const nextCart = [...baseCart];

    for (const sourceItem of itemsToAdd) {
      const item = sanitizeCartItemForStorage(sourceItem);
      const key = getCartItemMemoryKey(item);
      const existingIndex = nextCart.findIndex((cartItem) => getCartItemMemoryKey(cartItem) === key);

      if (existingIndex >= 0) {
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity: Math.max(1, nextCart[existingIndex].quantity || 1) + Math.max(1, item.quantity || 1),
        };
        continue;
      }

      if (nextCart.length >= MAX_ITEMS) break;

      nextCart.push({
        ...item,
        id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
    }

    return nextCart.slice(0, MAX_ITEMS);
  }

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem("ziiply-cart-v1");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);

        if (Array.isArray(parsed)) {
          setCart(parsed.slice(0, MAX_ITEMS));
        } else if (Array.isArray(parsed?.items)) {
          setCart(parsed.items.slice(0, MAX_ITEMS));
        }
      }
    } catch {
      // Ignore broken saved cart data.
    } finally {
      cartHasLoadedRef.current = true;
    }
  }, []);

  function persistCartImmediately(nextCart: CartItem[]) {
    try {
      window.localStorage.setItem(
        "ziiply-cart-v1",
        JSON.stringify({
          version: 2,
          savedAt: Date.now(),
          items: nextCart.slice(0, MAX_ITEMS),
        })
      );
    } catch {
      // Ignore storage errors in private browsing.
    }
  }

  useEffect(() => {
    if (!cartHasLoadedRef.current) return;

    if (cartSaveTimeoutRef.current) {
      window.clearTimeout(cartSaveTimeoutRef.current);
    }

    // UI debounce / anti-duplicate protection
    cartSaveTimeoutRef.current = window.setTimeout(() => {
      persistCartImmediately(cart);
    }, 250);

    return () => {
      if (cartSaveTimeoutRef.current) {
        window.clearTimeout(cartSaveTimeoutRef.current);
        cartSaveTimeoutRef.current = null;
      }
    };
  }, [cart]);


  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_CART_ITEMS_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const items = Array.isArray(parsed) ? parsed : parsed?.items;

      if (Array.isArray(items)) {
        setRecentCartItems(items.map(sanitizeCartItemForStorage).slice(0, MAX_RECENT_CART_ITEMS));
      }
    } catch {
      // Ignore broken recent-item data.
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVED_SHOPPING_LISTS_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const lists = Array.isArray(parsed) ? parsed : parsed?.lists;

      if (Array.isArray(lists)) {
        setSavedShoppingLists(
          lists
            .filter((list) => list?.name && Array.isArray(list.items))
            .map((list) => ({
              id: String(list.id || `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
              name: String(list.name),
              items: list.items.map(sanitizeCartItemForStorage).slice(0, MAX_ITEMS),
              createdAt: Number(list.createdAt || Date.now()),
              updatedAt: Number(list.updatedAt || Date.now()),
            }))
            .slice(0, MAX_SAVED_SHOPPING_LISTS)
        );
      }
    } catch {
      // Ignore broken saved-list data.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SAVED_SHOPPING_LISTS_STORAGE_KEY,
        JSON.stringify({ version: 1, savedAt: Date.now(), lists: savedShoppingLists })
      );
    } catch {
      // Ignore storage errors in private browsing.
    }
  }, [savedShoppingLists]);

  useEffect(() => {
    if (!cartHasLoadedRef.current || cart.length === 0) return;
    rememberRecentCartItems(cart);
  }, [cart]);


  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PRICE_HISTORY_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const items = parsed?.items && typeof parsed.items === "object" ? parsed.items : parsed;

      if (items && typeof items === "object") {
        priceHistoryBaselineRef.current = items;
        setPriceHistoryBaseline(items);
      }
    } catch {
      // Ignore broken price history data.
    } finally {
      priceHistoryHasLoadedRef.current = true;
    }
  }, []);

  function getPriceHistorySnapshot(key: string) {
    return priceHistoryBaseline[key] || priceHistoryBaselineRef.current[key];
  }

  function renderPriceHistoryBadge(key: string, currentPrice?: number | null) {
    const snapshot = getPriceHistorySnapshot(key);
    const info = getPriceChangeInfo(snapshot?.price, currentPrice || 0);

    if (!info) {
      return (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          uusi hinta
        </span>
      );
    }

    const className =
      info.tone === "down"
        ? "bg-emerald-100 text-emerald-700"
        : info.tone === "up"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-500";

    return (
      <span
        title={`Viimeksi nähty ${formatEuro(info.previousPrice)}`}
        className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${className}`}
      >
        {info.shortLabel}
      </span>
    );
  }

  useEffect(() => {
    if (!priceHistoryHasLoadedRef.current) return;

    if (priceHistorySaveTimeoutRef.current) {
      window.clearTimeout(priceHistorySaveTimeoutRef.current);
    }

    // UI debounce / anti-duplicate protection
    priceHistorySaveTimeoutRef.current = window.setTimeout(() => {
      try {
        const next: Record<string, PriceSnapshot> = { ...priceHistoryBaselineRef.current };
        const remember = (key: string, price: number, name: string, storeName?: string, chain?: string) => {
          if (!key || !price || price <= 0) return;

          next[key] = {
            price,
            name: fixText(name),
            storeName,
            chain,
            updatedAt: Date.now(),
          };
        };

        for (const item of cart) {
          if (item.price) remember(getPriceHistoryKeyFromCartItem(item), item.price, item.name, item.storeName, item.chain);
        }

        for (const product of normalResults) {
          const storeName = (product as Product & { fallbackStoreName?: string }).fallbackStoreName || activeStores.sStoreName;
          remember(getPriceHistoryKeyFromProduct(product, storeName), getProductPrice(product), product.name, storeName);
        }

        for (const item of offers) {
          const product = offerToProduct(item);
          remember(getPriceHistoryKeyFromProduct(product, item.storeName, item.chain), getProductPrice(product), product.name, item.storeName, item.chain);
        }

        for (const result of eanResults) {
          remember(getPriceHistoryKeyFromProduct(result.product, result.storeName, result.chain), getProductPrice(result.product), result.product.name, result.storeName, result.chain);
        }

        window.localStorage.setItem(
          PRICE_HISTORY_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            savedAt: Date.now(),
            items: next,
          })
        );
      } catch {
        // Ignore storage errors in private browsing.
      }
    }, 500);

    return () => {
      if (priceHistorySaveTimeoutRef.current) {
        window.clearTimeout(priceHistorySaveTimeoutRef.current);
        priceHistorySaveTimeoutRef.current = null;
      }
    };
  }, [cart, normalResults, offers, eanResults, activeStores.sStoreName]);




  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ziiply-ean-cache-v1");
      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (parsed && typeof parsed === "object") {
        setEanCache(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("ziiply-ean-cache-v1", JSON.stringify(eanCache));
    } catch {}
  }, [eanCache]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ziiply-default-stores-v1");
      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (parsed?.activeArea) {
        setActiveArea(parsed.activeArea);
      }

      if (parsed?.storeMode === "hyper" || parsed?.storeMode === "local") {
        setStoreMode(parsed.storeMode);
      }

      if (parsed?.locationInput) {
        setLocationInput(parsed.locationInput);
      }
    } catch {
      // Ignore broken saved store data.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "ziiply-default-stores-v1",
        JSON.stringify({
          activeArea,
          storeMode,
          locationInput,
        })
      );
    } catch {
      // Ignore storage errors in private browsing.
    }
  }, [activeArea, storeMode, locationInput]);


  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    setSpeechSupported(true);

    const recognition = new SpeechRecognition();

    recognition.lang = "fi-FI";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || "")
        .join(" ");

      const cleaned = transcript
        .toLowerCase()
        .replace(/\s+ja\s+/gi, ",")
        .replace(/\s+/g, ",")
        .replace(/,+/g, ",")
        .replace(/^,|,$/g, "")
        .trim();

      setInput(cleaned);

      if (voiceOpenSearchPanelAfterResultRef.current) {
        voiceOpenSearchPanelAfterResultRef.current = false;
        setSearchPanelOpen(true);

        window.setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    };

    recognitionRef.current = recognition;
  }, [cart]);

  const closeFloatingPanels = useCallback(() => {
    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setEanModalOpen(false);
  }, []);

  function openSearchPanel() {
    // Hae-paneeli toimii mobiilissa erillisenä näkymänä: se sulkee korin/EANin/vertailun ja näkyy aina viewportissa.
    setCartModalOpen(false);
    setEanModalOpen(false);
    setActiveResult("none");
    setSearchPanelOpen(true);

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }

  function toggleSearchPanel() {
    // Toinen painallus sulkee Hae-näkymän. Jos Kori on auki, vaihdetaan suoraan Hae-näkymään.
    if (searchPanelOpen) {
      setSearchPanelOpen(false);
      return;
    }

    openSearchPanel();
  }

  function closeSearchPanel() {
    setSearchPanelOpen(false);
  }

  function openSearchPanelAndStartVoice() {
    voiceOpenSearchPanelAfterResultRef.current = true;
    startVoiceInput();
  }

  function startVoiceInput(openPanelAfterResult = false) {
    if (openPanelAfterResult) {
      voiceOpenSearchPanelAfterResultRef.current = true;
    }

    if (!recognitionRef.current) {
      alert("Puhesanelu ei ole käytettävissä tässä selaimessa tai tässä osoitteessa. Kokeile puhelimella HTTPS-osoitteessa, esimerkiksi Vercel-testilinkissä.");
      return;
    }

    if (isListening) return;

    try {
      recognitionRef.current.start();
    } catch {
      alert("Puhesanelua ei saatu käyntiin. Tarkista selaimen mikrofonilupa.");
    }
  }

  const filteredOffers = useMemo(() => {
    const normalizedTerms = terms.map(normalize);

    return offers
      .filter((item) => chainFilter === "all" || item.chain === chainFilter)
      .filter((item) => !isNonFoodOffer(item))
      .filter((item) => {
        if (normalizedTerms.length === 0) return false;
        const name = normalize(item.offer.item.name);

        return normalizedTerms.some((term) => {
          if (!name.includes(term)) return false;

          const productLike: Product = {
            id: item.offer.item.id,
            name: item.offer.item.name,
            ean: item.offer.item.ean,
            pictureUrl: item.offer.item.pictureUrl,
            category: item.offer.item.category,
            price: item.offer.storeItem?.price || 0,
            storeItems: [{ price: item.offer.storeItem?.price || 0 }],
          };

          return !isBadNormalResult(productLike, term);
        });
      })
      .sort((a, b) => {
        const primaryTerm = terms[0] || "";
        const aScore = scoreNameMatch(primaryTerm, a.offer.item.name);
        const bScore = scoreNameMatch(primaryTerm, b.offer.item.name);
        const scoreDifference = bScore - aScore;

        // Ensin tuotteen relevanssi, sitten hinta ja vasta viimeisenä tarjousprosentti.
        if (Math.abs(scoreDifference) > 12) return scoreDifference;

        const priceDifference = (a.offer.storeItem?.price || 0) - (b.offer.storeItem?.price || 0);
        if (priceDifference !== 0) return priceDifference;

        return (b.offer.discountPercent || 0) - (a.offer.discountPercent || 0);
      });
  }, [offers, terms, chainFilter]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  }, [cart]);

  const cartNameSet = useMemo(() => {
    return new Set(cart.map((item) => normalize(item.name)));
  }, [cart]);

  const visibleNormalResults = useMemo(() => {
    return normalResults.filter((product) => !cartNameSet.has(normalize(product.name)));
  }, [normalResults, cartNameSet]);

  const comparableCart = useMemo(() => {
    // Muistilistarivit ovat keräilyä varten, eivät hintavertailua varten.
    // Näin pelkkä "maito,kala,cola"-muistilista ei riko halvinta koria tai ketjuvertailua.
    return cart.filter((item) => !isManualShoppingItem(item));
  }, [cart]);

  const chainResults = useMemo<ChainResult[]>(() => {
    if (cart.length === 0) return [];
    const sList = comparableCart.map((item) => sMatches[item.id]).filter(Boolean);
    const kList = comparableCart.map((item) => kMatches[item.id]).filter(Boolean);
    const sTotal = sList.reduce((sum, match) => sum + match.price * match.quantity, 0);
    const kTotal = kList.reduce((sum, match) => sum + match.price * match.quantity, 0);

    const results: ChainResult[] = [
      {
        key: "s",
        chain: "S-ryhmä",
        storeName: activeStores.sStoreName,
        detail: "Oikea hinta valitusta S-kaupasta",
        totalPrice: sTotal,
        foundItems: sList.length,
        missingItems: comparableCart.length - sList.length,
        offerCount: 0,
        icon: "🟢",
        matches: sList,
      },
      {
        key: "k",
        chain: "K-ryhmä",
        storeName: activeStores.kStoreName,
        detail: "Tarkka K-hinta: erikoistuotteet suodatetaan",
        totalPrice: kTotal,
        foundItems: kList.length,
        missingItems: comparableCart.length - kList.length,
        offerCount: 0,
        icon: "🔴",
        matches: kList,
      },
      {
        key: "lidl",
        chain: "Lidl",
        storeName: "Lidl alueella",
        detail: "Hintadata lisätään myöhemmin",
        totalPrice: 0,
        foundItems: 0,
        missingItems: comparableCart.length,
        offerCount: 0,
        icon: "🔵",
        matches: [],
        comingSoon: true,
      },
      {
        key: "tokmanni",
        chain: "Tokmanni / Spar",
        storeName: "Tokmanni / Spar alueella",
        detail: "Hintadata lisätään myöhemmin",
        totalPrice: 0,
        foundItems: 0,
        missingItems: comparableCart.length,
        offerCount: 0,
        icon: "🟡",
        matches: [],
        comingSoon: true,
      },
    ];

    return results
      .filter((result) => selectedChains[result.key])
      .sort((a, b) => {
        if (a.comingSoon && !b.comingSoon) return 1;
        if (!a.comingSoon && b.comingSoon) return -1;
        const aComplete = a.missingItems === 0 && a.totalPrice > 0;
        const bComplete = b.missingItems === 0 && b.totalPrice > 0;
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        if (a.totalPrice === 0) return 1;
        if (b.totalPrice === 0) return -1;
        return a.totalPrice - b.totalPrice;
      });
  }, [cart.length, comparableCart, sMatches, kMatches, activeStores, selectedChains]);

  const { completeResults, cheapest, secondCheapest, savings, savingsPercent } = useMemo(() => {
    const complete = chainResults.filter((result) => !result.comingSoon && result.totalPrice > 0 && result.missingItems === 0);
    const best = complete[0];
    const runnerUp = complete[1];
    const difference = best && runnerUp ? runnerUp.totalPrice - best.totalPrice : 0;
    const percent = best && runnerUp && runnerUp.totalPrice > 0 ? (difference / runnerUp.totalPrice) * 100 : 0;

    return {
      completeResults: complete,
      cheapest: best,
      secondCheapest: runnerUp,
      savings: difference,
      savingsPercent: percent,
    };
  }, [chainResults]);

  const isShoppingListReady = cart.length > 0 && terms.length === 0;

  const topSavingsText = useMemo(() => {
    if (cheapest && secondCheapest && savings > 0) {
      return `Halvin täysi kori: ${cheapest.storeName} · ${savingsPercent.toFixed(1).replace(".", ",")} % edullisempi kuin seuraava`;
    }

    return cheapest ? `Halvin täysi kori: ${cheapest.storeName}` : "";
  }, [cheapest, secondCheapest, savings, savingsPercent]);

  const showCheapestSticky = useMemo(() => {
    return isShoppingListReady && Boolean(cheapest) && Boolean(secondCheapest) && savings > 0;
  }, [isShoppingListReady, cheapest, secondCheapest, savings]);


  function getShoppingListItemKey(match: Match, index?: number) {
    // Stable key that survives refresh and grouping changes.
    // Do not depend on category-local index, because category rendering resets index per group.
    return match.cartItemId || match.product.ean || `${match.product.id}-${normalize(match.product.name)}`;
  }

  const shoppingListItems = useMemo(() => {
    const matchedCartIds = new Set((cheapest?.matches || []).map((match) => match.cartItemId).filter(Boolean));

    const manualMatches = cart
      .filter((item) => isManualShoppingItem(item) || !matchedCartIds.has(item.id))
      .map((item) => ({
        product: item.product || {
          id: Number(item.id.replace(/\D/g, "").slice(0, 9)) || Date.now(),
          name: item.name,
          ean: item.ean,
          pictureUrl: item.image,
          price: item.price || 0,
          storeItems: [{ price: item.price || 0 }],
        },
        price: item.price || 0,
        quantity: item.quantity,
        matchType: item.ean ? "ean" : "manual",
        cartItemId: item.id,
      } as Match));

    return cheapest?.matches?.length ? [...cheapest.matches, ...manualMatches] : manualMatches;
  }, [cheapest, cart]);

  const shoppingListKeys = useMemo(() => {
    return shoppingListItems.map((match, index) => getShoppingListItemKey(match, index));
  }, [shoppingListItems]);

  const bestShoppingListGroups = useMemo(() => {
    return shoppingListItems.reduce((groups, match) => {
      const category = getProductCategoryLabel(match.product.name, match.product.category);
      if (!groups[category]) groups[category] = [];
      groups[category].push(match);
      return groups;
    }, {} as Record<string, Match[]>);
  }, [shoppingListItems]);

  const { checkedCount, shoppingListCount, shoppingProgressPercent } = useMemo(() => {
    const checked = shoppingListKeys.filter((key) => checkedCartItems[key]).length;
    const total = shoppingListKeys.length;

    return {
      checkedCount: checked,
      shoppingListCount: total,
      shoppingProgressPercent: Math.round((checked / Math.max(1, total)) * 100),
    };
  }, [shoppingListKeys, checkedCartItems]);


  useEffect(() => {
    try {
      const savedChecks = window.localStorage.getItem("ziiply-shopping-checks-v1");
      if (savedChecks) {
        const parsed = JSON.parse(savedChecks);
        if (parsed && typeof parsed === "object") {
          setCheckedCartItems(parsed.items && typeof parsed.items === "object" ? parsed.items : parsed);
        }
      }
    } catch {
      // Ignore broken checklist data.
    } finally {
      shoppingChecksHaveLoadedRef.current = true;
    }
  }, []);

  function persistShoppingChecksImmediately(nextChecks: Record<string, boolean>) {
    try {
      window.localStorage.setItem(
        "ziiply-shopping-checks-v1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          items: nextChecks,
        })
      );
    } catch {
      // Ignore storage errors in private browsing.
    }
  }

  useEffect(() => {
    if (!shoppingChecksHaveLoadedRef.current) return;
    if (shoppingListKeys.length === 0) return;

    const validKeys = new Set(shoppingListKeys);
    setCheckedCartItems((current) => {
      let changed = false;
      const next: Record<string, boolean> = {};

      for (const key of Object.keys(current)) {
        if (validKeys.has(key) && current[key]) {
          next[key] = true;
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [shoppingListKeys.join("|")]);

  useEffect(() => {
    if (!shoppingChecksHaveLoadedRef.current) return;

    if (shoppingChecksSaveTimeoutRef.current) {
      window.clearTimeout(shoppingChecksSaveTimeoutRef.current);
    }

    // UI debounce / anti-duplicate protection
    shoppingChecksSaveTimeoutRef.current = window.setTimeout(() => {
      persistShoppingChecksImmediately(checkedCartItems);
    }, 250);

    return () => {
      if (shoppingChecksSaveTimeoutRef.current) {
        window.clearTimeout(shoppingChecksSaveTimeoutRef.current);
        shoppingChecksSaveTimeoutRef.current = null;
      }
    };
  }, [checkedCartItems]);

  useEffect(() => {
    if (!cheapest || !secondCheapest || savings <= 0) return;

    const toastText = `Säästit ${formatEuro(savings)} valitsemalla ${cheapest.storeName}`;
    setLastSavingsToast(toastText);

    const timeout = window.setTimeout(() => {
      setLastSavingsToast(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [cheapest?.key, cheapest?.totalPrice, savings]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleShoppingListItem(match: Match, index: number) {
    const key = getShoppingListItemKey(match, index);

    setCheckedCartItems((current) => {
      const next = {
        ...current,
        [key]: !current[key],
      };
      persistShoppingChecksImmediately(next);
      return next;
    });

    triggerHaptic();
  }

  function markAllShoppingListItemsChecked() {
    if (shoppingListKeys.length === 0) return;

    setCheckedCartItems((current) => {
      const next = { ...current };
      for (const key of shoppingListKeys) {
        next[key] = true;
      }
      persistShoppingChecksImmediately(next);
      return next;
    });

    showCartToast("Kaikki ostokset merkitty kerätyiksi");
    triggerHaptic();
  }

  function openShoppingListForCheapest() {
    setSearchPanelOpen(false);
    setEanModalOpen(false);
    setActiveResult("none");
    setCartModalOpen((current) => !current);
    triggerHaptic();
  }

  function clearShoppingListChecks() {
    if (shoppingListKeys.length === 0) return;

    const checkedCount = shoppingListKeys.filter((key) => checkedCartItems[key]).length;
    const ok = window.confirm(`Nollataanko keräilymerkinnät (${checkedCount}/${shoppingListKeys.length} kerätty)? Ostoskoriin jäävät tuotteet säilyvät.`);
    if (!ok) return;

    setCheckedCartItems((current) => {
      const next = { ...current };
      for (const key of shoppingListKeys) {
        delete next[key];
      }
      persistShoppingChecksImmediately(next);
      return next;
    });
    showCartToast("Keräily nollattu");
    triggerHaptic();
  }

  function restorePreviousOptimization() {
    if (!lastOptimizationSnapshot) return;

    setCart(lastOptimizationSnapshot.cart);
    setSMatches(lastOptimizationSnapshot.sMatches);
    setKMatches(lastOptimizationSnapshot.kMatches);
    setAlternativeResults(lastOptimizationSnapshot.alternativeResults);
    setExpandedAlternatives(lastOptimizationSnapshot.expandedAlternatives);
    setOptimizingChains({});
    setLastOptimizationSnapshot(null);
    setActiveResult("compare");
  }

  function clearSearchAndComparisonState() {
    setOffers([]);
    setNormalResults([]);
    setSMatches({});
    setKMatches({});
    setHasSearchedOffers(false);
    setVisibleNormalCount(8);
    setLastOptimizationSnapshot(null);
    setActiveResult("none");
  }

  function handleStoreModeChange(nextMode: StoreMode) {
    setStoreMode(nextMode);
    clearSearchAndComparisonState();
  }

  function selectStoreForCurrentMode(store: StoreSearchItem) {
    if (!store.id || !store.name) return;

    setActiveArea((current) => {
      if (storeMode === "local") {
        if (store.type === "S") {
          return {
            ...current,
            sLocalStoreId: store.id,
            sLocalStoreName: store.name,
          };
        }

        if (store.type === "K") {
          return {
            ...current,
            kLocalStoreId: store.id,
            kLocalStoreName: store.name,
          };
        }
      }

      if (store.type === "S") {
        return {
          ...current,
          sStoreId: store.id,
          sStoreName: store.name,
        };
      }

      if (store.type === "K") {
        return {
          ...current,
          kStoreId: store.id,
          kStoreName: store.name,
        };
      }

      return current;
    });

    clearSearchAndComparisonState();
    setLocationMessage(`${store.name} valittu ${store.type === "S" ? "S-ryhmän" : "K-ryhmän"} ${
      storeMode === "local" ? "lähikaupaksi" : "tavarataloksi"
    }.`);
  }

  async function applyLocation() {
    const query = locationInput.trim();

    if (!query) {
      setLocationMessage("Kirjoita ensin kaupunki, alue tai postinumero.");
      return;
    }

    setStoreSearchLoading(true);

    try {
      const response = await fetch(`/api/store-search?search=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const data = await response.json();
      const stores = ((data.items || []) as StoreSearchItem[]).filter((store) => store.id && store.name);

      setFoundStores(stores);

      const fallbackArea = findArea(query) || activeArea;
      const prisma = pickStore(stores, isPrisma);
      const kCitymarket = pickStore(stores, isKCitymarket);
      const sLocal = pickStore(stores, isSLocalStore);
      const kLocal = pickStore(stores, isKLocalStore);

      const nextArea: Area = {
        label: fallbackArea?.label || query,
        aliases: Array.from(new Set([...(fallbackArea?.aliases || []), normalize(query), query])),
        sStoreId: prisma?.id ?? fallbackArea.sStoreId,
        sStoreName: prisma?.name ?? fallbackArea.sStoreName,
        kStoreId: kCitymarket?.id ?? fallbackArea.kStoreId,
        kStoreName: kCitymarket?.name ?? fallbackArea.kStoreName,
        sLocalStoreId: sLocal?.id ?? fallbackArea.sLocalStoreId ?? fallbackArea.sStoreId,
        sLocalStoreName: sLocal?.name ?? fallbackArea.sLocalStoreName ?? fallbackArea.sStoreName,
        kLocalStoreId: kLocal?.id ?? fallbackArea.kLocalStoreId ?? fallbackArea.kStoreId,
        kLocalStoreName: kLocal?.name ?? fallbackArea.kLocalStoreName ?? fallbackArea.kStoreName,
      };

      setActiveArea(nextArea);
      setOffers([]);
      setNormalResults([]);
      setVisibleNormalCount(8);
      setSMatches({});
      setKMatches({});
      setHasSearchedOffers(false);
      setActiveResult("none");

      const foundLocal = Boolean(sLocal || kLocal);
      const foundHyper = Boolean(prisma || kCitymarket);

      if (stores.length === 0) {
        setLocationMessage(
          `Kauppoja ei löytynyt haulla "${query}". Käytetään nykyistä/demoalueen kauppadataa.`
        );
      } else {
        setLocationMessage(
          `Haulla "${query}" löytyi ${stores.length} kauppaa. ${
            foundLocal ? "Lähikaupat päivitetty." : "Lähikaupoille käytetään fallback-kauppoja."
          } ${foundHyper ? "Tavaratalot päivitetty." : "Tavarataloille käytetään fallback-kauppoja."}`
        );
      }
    } catch (error) {
      console.error(error);

      const area = findArea(query);

      if (!area) {
        setLocationMessage(`Aluetta ei löytynyt. Tuetut fallback-alueet: ${AREAS.map((x) => x.label).join(", ")}.`);
        return;
      }

      setActiveArea(area);
      setOffers([]);
      setNormalResults([]);
      setVisibleNormalCount(8);
      setSMatches({});
      setKMatches({});
      setHasSearchedOffers(false);
      setActiveResult("none");
      setLocationMessage(`Store-haku epäonnistui. Käytetään fallback-aluetta: ${area.label}.`);
    } finally {
      setStoreSearchLoading(false);
    }
  }

  async function searchOffers(termOverride?: string) {
    const useTerms = termOverride ? parseTerms(termOverride) : terms;

    if (useTerms.length === 0) {
      setHasSearchedOffers(false);
      setOffers([]);
      setActiveResult("offers");
      return;
    }

    const isMainOfferSearch = !termOverride;

    if (termOverride) setInput(termOverride);

    // Uusi tarjoushaku ei enää tyhjennä ostoskoria. Käyttäjä voi lisätä tuotteita nykyiseen koriin.
    if (isMainOfferSearch && cart.length > 0) {
      setSMatches({});
      setKMatches({});
      setLastOptimizationSnapshot(null);
    }

    setLoadingOffers(true);
    setHasSearchedOffers(true);
    setActiveResult("offers");

    try {
      const [sRes, kRes] = await Promise.all([
        fetch(`/api/offers?storeId=${activeStores.sStoreId}`, { cache: "no-store" }),
        fetch(`/api/offers?storeId=${activeStores.kStoreId}`, { cache: "no-store" }),
      ]);

      const sData = await sRes.json();
      const kData = await kRes.json();

      const sItems: ZiiplyOffer[] = (sData.items || []).map((offer: Offer) => ({
        id: `S-${offer.id}`,
        chain: "S",
        storeName: activeStores.sStoreName,
        offer,
      }));

      const kItems: ZiiplyOffer[] = (kData.items || []).map((offer: Offer) => ({
        id: `K-${offer.id}`,
        chain: "K",
        storeName: activeStores.kStoreName,
        offer,
      }));

      setOffers([...sItems, ...kItems]);
    } catch (error) {
      console.error(error);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }

  async function searchNormalPrices(termOverride?: string, forceEan = false) {
    const useTerms = termOverride ? parseTerms(termOverride) : terms;
    if (useTerms.length === 0) return;

    const isMainSearch = !termOverride;

    if (termOverride) setInput(termOverride);

    if (isMainSearch) {
      // Uusi Hae-haku ei enää tyhjennä ostoskoria. Vain vanhat vertailuosumat nollataan,
      // jotta seuraava vertailu rakennetaan nykyisen korin ja uusien hakutulosten pohjalta.
      setSMatches({});
      setKMatches({});
      setLastOptimizationSnapshot(null);
    }

    setLoadingNormal(true);
    setVisibleNormalCount(8);
    setActiveResult("compare");

    try {
      const all: Product[] = [];

      for (const term of useTerms) {
        // Käytä normaalihaussa useampaa hakusanaa silloin, kun termi on laaja kuten "kahvi".
        // Tämä palauttaa hakumoottorin laajaksi: yksi liian tarkka query ei saa tappaa osumia.
        const searchQueries = getNormalSearchQueries(term).slice(0, 8);

        for (const searchQuery of searchQueries) {
          let rawItems = await fetchSProducts(searchQuery, activeStores.sStoreId);
          let fallbackStoreName = "";

          if (rawItems.length === 0 && shouldUseLocalFallback("S")) {
            rawItems = await fetchSProducts(searchQuery, activeArea.sStoreId);
            fallbackStoreName = activeArea.sStoreName;
          }

          const items = rawItems
            .filter((product) => getProductPrice(product) > 0)
            .filter((product) => !isBadNormalResult(product, searchQuery))
            .map((product) => ({ product, score: scoreNameMatch(searchQuery, product.name) }))
            // Älä leikkaa maito/kahvi-osumia liian aggressiivisesti. Roskat poistetaan isBadNormalResultillä,
            // mutta muuten annetaan scoringin ja hinnan järjestää tulokset.
            .filter(({ score }) => score > -250)
            .sort((a, b) => {
              const scoreDifference = b.score - a.score;

              // Relevanssi ensin, hinta vasta tasapisteissä.
              if (Math.abs(scoreDifference) > 12) return scoreDifference;
              return getProductPrice(a.product) - getProductPrice(b.product);
            })
            .slice(0, 40)
            .map(({ product }) => {
              const withMeta = {
                ...product,
                originalSearchTerm: term,
                usedSearchQuery: searchQuery,
                fallbackStoreName: fallbackStoreName || undefined,
              } as Product & {
                originalSearchTerm?: string;
                usedSearchQuery?: string;
                fallbackStoreName?: string;
              };

              return withMeta;
            });
          all.push(...items);
        }
      }

      const unique = Array.from(new Map(all.map((item) => [item.id, item])).values());

      setEanCache((prev) => {
        const next = { ...prev };

        for (const item of unique) {
          const ean = normalizeEan(item.ean);

          if (isUsableEan(ean)) {
            next[ean] = item.name;
          }
        }

        return next;
      });

      setNormalResults(unique);
    } catch (error) {
      console.error(error);
      setNormalResults([]);
    } finally {
      setLoadingNormal(false);
    }
  }

  function shouldKeepSearchingKOwnBrand(query: string, candidate?: KProduct) {
    if (!candidate) return true;
    if (!isValueBrandProduct(query)) return false;
    if (isKOwnBrandProduct(candidate.name)) return false;

    // Jos haetaan private label -vastinetta, älä pysähdy premiumiin liian aikaisin.
    return isPremiumBrandProduct(candidate.name);
  }

  async function findBestKMatchForStore(query: string, storeId: number, ean?: string) {
    let fallbackCandidate: KProduct | undefined;

    for (const searchTerm of getKSearchTerms(query)) {
      const items = await fetchKProducts(searchTerm, storeId);
      const candidate = pickBestKProduct(items, query, ean);

      if (!candidate) continue;

      if (isValueBrandProduct(query)) {
        if (isKOwnBrandProduct(candidate.name)) return candidate;

        if (!fallbackCandidate) fallbackCandidate = candidate;

        if (shouldKeepSearchingKOwnBrand(query, candidate)) {
          continue;
        }
      }

      return candidate;
    }

    return fallbackCandidate;
  }

  async function updateChainComparison(nextCart = cart) {
    setComparisonLoading(true);
    setActiveResult("compare");

    try {
      const nextSMatches: Record<string, Match> = {};
      const nextKMatches: Record<string, Match> = {};

      await Promise.all(
        nextCart.map(async (item) => {
          if (item.chain === "S" && item.price && item.product) {
            nextSMatches[item.id] = { product: item.product, price: item.price, quantity: item.quantity, matchType: "ean", cartItemId: item.id };
          } else {
            try {
              let items = await fetchSProducts(item.name, activeStores.sStoreId);
              let best = pickBestSProduct(items, item.name, item.ean);
              let fallbackStoreName = "";

              if (!best && shouldUseLocalFallback("S")) {
                items = await fetchSProducts(item.name, activeArea.sStoreId);
                best = pickBestSProduct(items, item.name, item.ean);
                fallbackStoreName = activeArea.sStoreName;
              }

              if (best) {
                nextSMatches[item.id] = {
                  product: best,
                  price: getProductPrice(best),
                  quantity: item.quantity,
                  matchType: best.ean && item.ean === best.ean ? "ean" : "name",
                  fallbackStoreName: fallbackStoreName || undefined,
                  cartItemId: item.id,
                };
              }
            } catch {}
          }

          if (item.chain === "K" && item.price && item.product) {
            nextKMatches[item.id] = { product: item.product, price: item.price, quantity: item.quantity, matchType: "ean", cartItemId: item.id };
          } else {
            try {
              let best: KProduct | undefined;
              let fallbackStoreName = "";

              best = await findBestKMatchForStore(item.name, activeStores.kStoreId, item.ean);

              if (!best && shouldUseLocalFallback("K")) {
                best = await findBestKMatchForStore(item.name, activeArea.kStoreId, item.ean);

                if (best) {
                  fallbackStoreName = activeArea.kStoreName;
                }
              }

              if (best) {
                const product = convertKProductToProduct(best);
                nextKMatches[item.id] = {
                  product: { ...product, ean: best.ean },
                  price: best.price,
                  quantity: item.quantity,
                  matchType: best.ean && item.ean === best.ean ? "ean" : "name",
                  fallbackStoreName: fallbackStoreName || undefined,
                  cartItemId: item.id,
                };
              }
            } catch {}
          }
        })
      );

      setSMatches(nextSMatches);
      setKMatches(nextKMatches);
    } finally {
      setComparisonLoading(false);
    }
  }

  function addOfferToCart(item: ZiiplyOffer) {
    setJustAdded(item.id);
    setTimeout(() => setJustAdded(null), 1200);

    if (cart.length >= MAX_ITEMS) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const name = fixText(item.offer.item.name);
    if (cart.some((x) => normalize(x.name) === normalize(name))) return;

    const product = offerToProduct(item);
    const newItem: CartItem = {
      id: item.id,
      name,
      price: item.offer.storeItem?.price || 0,
      image: item.offer.item.pictureUrl,
      chain: item.chain,
      storeName: item.storeName,
      quantity: 1,
      source: "offer",
      product,
      
    };

    setCart((prev) => [...prev, newItem]);
    showCartToast(`Lisätty ostoskoriin: ${name}`);
  }

  function loadHtml5QrCodeScript() {
    return new Promise<any>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Html5Qrcode can only be loaded in browser"));
        return;
      }

      if ((window as any).Html5Qrcode) {
        resolve((window as any).Html5Qrcode);
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${HTML5_QRCODE_SCRIPT_URL}"]`);

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve((window as any).Html5Qrcode), { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = HTML5_QRCODE_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve((window as any).Html5Qrcode);
      script.onerror = () => reject(new Error("Html5Qrcode loading failed"));
      document.body.appendChild(script);
    });
  }

  function finishScannedEan(code: string) {
    const normalizedCode = normalizeEan(code);
    if (!isUsableEan(normalizedCode)) return;

    const now = Date.now();
    const previous = lastContinuousScanRef.current;

    // TÄRKEÄ: älä pysäytä kameraa onnistuneen skannauksen jälkeen.
    // Sarjaskannauksessa kamera pysyy päällä ja käyttäjä voi lukea seuraavan tuotteen heti.
    if (previous?.code === normalizedCode && now - previous.at < 3200) {
      return;
    }

    lastContinuousScanRef.current = { code: normalizedCode, at: now };

    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }

    triggerHaptic();
    setEanInput(normalizedCode);
    setLastAutoEanSearch(normalizedCode);
    setEanSearchStartedAutomatically(true);
    eanAutoSearchActiveRef.current = true;
    setEanScannerOpen(true);
    setEanScannerMessage(`Luettu ${normalizedCode}. Kamera pysyy päällä seuraavaa tuotetta varten.`);
    setEanMessage(`Skannattu EAN: ${normalizedCode}. Haetaan...`);
    void searchByEan(normalizedCode);
  }

  async function stopEanCameraScanner() {
    const scanner = eanHtml5ScannerRef.current;
    eanHtml5ScannerRef.current = null;
    lastContinuousScanRef.current = null;

    if (scanner && !eanScannerStoppingRef.current) {
      eanScannerStoppingRef.current = true;

      try {
        await scanner.stop();
      } catch {}

      try {
        await scanner.clear();
      } catch {}

      eanScannerStoppingRef.current = false;
    }

    setEanScannerOpen(false);
  }

  async function startEanCameraScanner() {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    if (!window.isSecureContext) {
      setEanScannerMessage("Kamera toimii vain HTTPS-osoitteessa. Avaa Ziiply Vercelin live-osoitteesta.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setEanScannerMessage("Kamera ei ole käytettävissä tässä ympäristössä.");
      return;
    }

    try {
      await stopEanCameraScanner();
      setEanScannerOpen(true);
      setEanScannerMessage("Ladataan kameraskanneria...");

      const Html5Qrcode = await loadHtml5QrCodeScript();

      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

      const scannerElement = document.getElementById(EAN_SCANNER_REGION_ID);

      if (!scannerElement) {
        setEanScannerMessage("Kameranäkymää ei saatu avattua. Sulje EAN-ikkuna ja yritä uudelleen.");
        return;
      }

      const supportedFormats = (window as any).Html5QrcodeSupportedFormats;
      const formatsToSupport = supportedFormats
        ? [
            supportedFormats.EAN_13,
            supportedFormats.EAN_8,
            supportedFormats.UPC_A,
            supportedFormats.UPC_E,
          ].filter(Boolean)
        : undefined;

      const scanner = new Html5Qrcode(EAN_SCANNER_REGION_ID, formatsToSupport ? { formatsToSupport } : undefined);
      eanHtml5ScannerRef.current = scanner;

      const scannerSize = Math.max(260, Math.min(360, window.innerWidth - 56));

      setEanScannerMessage("Aseta viivakoodi vihreän kehyksen sisään. Käännä puhelinta tarvittaessa pysty- tai vaakakoodille.");

      await scanner.start(
        {
          facingMode: { exact: "environment" },
        },
        {
          fps: 10,
          qrbox: { width: scannerSize, height: scannerSize },
          aspectRatio: 1.0,
          disableFlip: false,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: "continuous",
            exposureMode: "continuous",
            advanced: [
              { focusMode: "continuous" },
              { exposureMode: "continuous" },
            ],
          },
        },
        (decodedText: string) => {
          const code = normalizeEan(decodedText);
          if (isUsableEan(code)) finishScannedEan(code);
        },
        () => undefined
      );
    } catch (error) {
      console.error(error);
      await stopEanCameraScanner();
      setEanScannerMessage("Kameraa ei saatu avattua tai skanneri ei käynnistynyt. Tarkista kameran lupa ja yritä uudelleen.");
    }
  }

  function closeEanModal() {
    stopEanCameraScanner();

    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }

    setEanModalOpen(false);
    setEanInput("");
    setEanResults([]);
    setEanMessage("");
    setEanScannerMessage("");
    setEanLoading(false);
    eanSearchInFlightRef.current = null;
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
  }

  function openEanModal() {
    if (eanModalOpen) {
      closeEanModal();
      return;
    }

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setEanModalOpen(true);
    setEanMessage("");
    setEanResults([]);
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;

    window.setTimeout(() => {
      eanInputRef.current?.focus();
    }, 50);
  }

  function clearEanSearch() {
    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }

    setEanInput("");
    setEanResults([]);
    setEanMessage("");
    setEanScannerMessage("");
    setEanLoading(false);
    eanSearchInFlightRef.current = null;
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;

    window.setTimeout(() => {
      eanInputRef.current?.focus();
    }, 0);
  }


  async function searchByEan(eanOverride?: string) {
    const ean = normalizeEan(eanOverride ?? eanInput);

    if (!isUsableEan(ean)) {
      setEanMessage("Syötä 8–14 numeron EAN-koodi.");
      setEanResults([]);
      return;
    }

    if (eanSearchInFlightRef.current === ean) return;

    eanSearchInFlightRef.current = ean;
    setEanLoading(true);
    setEanMessage("");
    setEanResults([]);

    try {
      const variants = getEanSearchVariants(ean);

      const cachedName =
        variants.map((variant) => eanCache[variant]).find(Boolean) ||
        eanCache[ean];

      const externalNames = cachedName ? [] : await fetchOpenFoodFactsNames(ean);
      const nameCandidates = Array.from(new Set([cachedName, ...externalNames].filter(Boolean) as string[]));

      const exactResultsByKey = new Map<string, EanSearchResult>();

      // EAN-modalissa näytetään vain tarkat EAN-osumat.
      // Open Food Factsia ja cachea käytetään vain nimen löytämiseen,
      // jotta ruoanhinta.fi:n nimihaku palauttaa tuotteita, joiden EAN tarkistetaan vielä erikseen.
      for (const nameCandidate of nameCandidates) {
        const [sProducts, kProducts] = await Promise.all([
          fetchSProducts(nameCandidate, activeStores.sStoreId).catch(() => [] as Product[]),
          fetchKProducts(nameCandidate, activeStores.kStoreId).catch(() => [] as KProduct[]),
        ]);

        for (const product of sProducts) {
          if (getProductPrice(product) <= 0) continue;
          if (!isSameEan(product.ean, variants)) continue;

          exactResultsByKey.set(`S-${normalizeEan(product.ean)}-${product.id}`, {
            key: `S-ean-exact-${product.id}`,
            chain: "S" as const,
            storeName: activeStores.sStoreName,
            product,
            eanMatch: true,
          });
        }

        for (const product of kProducts) {
          if (product.price <= 0) continue;
          if (!isSameEan(product.ean, variants)) continue;

          const converted = convertKProductToProduct(product);

          exactResultsByKey.set(`K-${normalizeEan(product.ean)}-${product.id}`, {
            key: `K-ean-exact-${product.id}`,
            chain: "K" as const,
            storeName: activeStores.kStoreName,
            product: {
              ...converted,
              ean: product.ean,
            },
            eanMatch: true,
          });
        }
      }

      // Debug-varmistus: kokeillaan myös suoraa EAN-hakua, mutta hyväksytään vain tarkat EAN-osumat.
      const [sDirectGroups, kDirectGroups] = await Promise.all([
        Promise.all(variants.map((variant) => fetchSProducts(variant, activeStores.sStoreId).catch(() => [] as Product[]))),
        Promise.all(variants.map((variant) => fetchKProducts(variant, activeStores.kStoreId).catch(() => [] as KProduct[]))),
      ]);

      for (const product of sDirectGroups.flat()) {
        if (getProductPrice(product) <= 0) continue;
        if (!isSameEan(product.ean, variants)) continue;

        exactResultsByKey.set(`S-${normalizeEan(product.ean)}-${product.id}`, {
          key: `S-ean-direct-${product.id}`,
          chain: "S" as const,
          storeName: activeStores.sStoreName,
          product,
          eanMatch: true,
        });
      }

      for (const product of kDirectGroups.flat()) {
        if (product.price <= 0) continue;
        if (!isSameEan(product.ean, variants)) continue;

        const converted = convertKProductToProduct(product);

        exactResultsByKey.set(`K-${normalizeEan(product.ean)}-${product.id}`, {
          key: `K-ean-direct-${product.id}`,
          chain: "K" as const,
          storeName: activeStores.kStoreName,
          product: {
            ...converted,
            ean: product.ean,
          },
          eanMatch: true,
        });
      }

      const exactResults = Array.from(exactResultsByKey.values()).sort(
        (a, b) => getProductPrice(a.product) - getProductPrice(b.product)
      );

      if (exactResults.length > 0) {
        const cacheName = exactResults[0]?.product?.name;

        if (cacheName) {
          setEanCache((prev) => ({
            ...prev,
            [ean]: cacheName,
          }));
        }

        if (exactResults.length === 1 && eanAutoSearchActiveRef.current) {
          // Automaattisen EAN-haun yhden täsmäosuman polku pidetään hiljaisena:
          // ei renderöidä välissä tuloskorttia, jotta EAN-ikkuna ei hypi.
          addEanResultToCart(exactResults[0]);
        } else if (exactResults.length === 1) {
          setEanResults(exactResults.slice(0, 8));
          setEanMessage("Löytyi 1 tarkka EAN-osuma.");
        } else {
          setEanResults(exactResults.slice(0, 8));
          setEanMessage(`Löytyi ${exactResults.length} tarkkaa EAN-osumaa.`);
        }

        setEanSearchStartedAutomatically(false);
        eanAutoSearchActiveRef.current = false;
        return;
      }

      setEanResults([]);

      setEanSearchStartedAutomatically(false);
      eanAutoSearchActiveRef.current = false;

      if (eanScannerOpen || eanHtml5ScannerRef.current) {
        showScanMissFlash();
      }

      if (externalNames.length > 0) {
        setEanMessage("Tuote tunnistettiin osittain, mutta valituista kaupoista ei löytynyt tarkkaa EAN-osumaa.");
      } else {
        setEanMessage("EAN-koodilla ei löytynyt tarkkaa tuotetta valituista kaupoista.");
      }
    } catch (error) {
      console.error(error);
      setEanResults([]);
      setEanSearchStartedAutomatically(false);
      eanAutoSearchActiveRef.current = false;
      setEanMessage("EAN-haku epäonnistui. Kokeile uudelleen tai käytä normaalia hakua.");
    } finally {
      if (eanSearchInFlightRef.current === ean) {
        eanSearchInFlightRef.current = null;
      }
      setEanLoading(false);
    }
  }

  useEffect(() => {
    if (!eanModalOpen) return;

    const ean = normalizeEan(eanInput);

    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }

    if (!ean) {
      setEanResults([]);
      setEanMessage("");
      setLastAutoEanSearch("");
      return;
    }

    // Älä näytä virhettä kesken kirjoittamisen. Haku käynnistyy vasta kun EAN on käyttökelpoinen.
    if (!isUsableEan(ean)) {
      setEanResults([]);
      if (eanMessage.startsWith("Syötä")) setEanMessage("");
      return;
    }

    if (ean === lastAutoEanSearch || eanLoading) return;

    const delay = ean.length >= 13 ? 300 : 650;

    // UI debounce / anti-duplicate protection
    eanAutoSearchTimeoutRef.current = window.setTimeout(() => {
      setLastAutoEanSearch(ean);
      setEanSearchStartedAutomatically(true);
      eanAutoSearchActiveRef.current = true;
      void searchByEan(ean);
    }, delay);

    return () => {
      if (eanAutoSearchTimeoutRef.current) {
        window.clearTimeout(eanAutoSearchTimeoutRef.current);
        eanAutoSearchTimeoutRef.current = null;
      }
    };
  }, [eanInput, eanModalOpen, eanLoading, lastAutoEanSearch, eanMessage]);

  function addEanResultToCart(result: EanSearchResult) {
    const ean = normalizeEan(result.product.ean || eanInput);
    const productName = fixText(result.product.name);
    const addKey = `${result.chain}-${ean || normalize(productName)}-${result.product.id}`;
    const now = Date.now();

    // Estää saman EAN-osuman tupla-ajon, jos automaattihaku ja käyttäjän toiminto
    // ehtivät kutsua lisäystä lähes samaan aikaan.
    if (lastEanCartAddRef.current?.key === addKey && now - lastEanCartAddRef.current.at < 2500) {
      return;
    }

    lastEanCartAddRef.current = { key: addKey, at: now };
    triggerHaptic();
    playScanSuccessFeedback();
    showScanSuccessFlash();

    const existingItem = cart.find((item) => {
      const itemEan = normalizeEan(item.ean || item.product?.ean);
      if (isUsableEan(ean) && itemEan === ean) return true;
      return normalize(item.name) === normalize(productName);
    });

    if (existingItem) {
      const nextCart = cart.map((item) =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );

      setCart(nextCart);
      persistCartImmediately(nextCart);
      // Sarjaskannauksessa ei vaihdeta vertailunäkymään, koska se voi peittää tai katkaista kameran.
      // Vertailu päivittyy silti taustalla.
      if (!eanScannerOpen) setActiveResult("compare");
      void updateChainComparison(nextCart);

      setEanInput("");
      setEanResults([]);
      setEanLoading(false);
      setEanSearchStartedAutomatically(false);
      eanAutoSearchActiveRef.current = false;
      setEanMessage("");
      if (eanHtml5ScannerRef.current) {
        setEanScannerOpen(true);
        setEanScannerMessage("Lisätty koriin. Kamera pysyy päällä seuraavaa tuotetta varten.");
      }
      showCartToast(`Määrä +1: ${existingItem.name}`);
      setLastAutoEanSearch("");

      window.setTimeout(() => {
        eanInputRef.current?.focus();
      }, 0);

      return;
    }

    if (cart.length >= MAX_ITEMS) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const newItem: CartItem = {
      id: `ean-${result.chain}-${result.product.id}-${Date.now()}`,
      name: productName,
      price: getProductPrice(result.product),
      image: result.product.pictureUrl,
      chain: result.chain,
      storeName: result.storeName,
      quantity: 1,
      source: "search",
      product: result.product,
      ean: ean || result.product.ean,
    };

    const nextCart = [...cart, newItem];

    const normalizedEan = normalizeEan(newItem.ean);

    if (isUsableEan(normalizedEan)) {
      setEanCache((prev) => ({
        ...prev,
        [normalizedEan]: newItem.name,
      }));
    }

    setCart(nextCart);
    persistCartImmediately(nextCart);
    // Sarjaskannauksessa ei vaihdeta vertailunäkymään, koska kamera halutaan pitää auki.
    // Vertailu päivittyy silti taustalla.
    if (!eanScannerOpen) setActiveResult("compare");
    void updateChainComparison(nextCart);

    // Jätä EAN-ikkuna auki seuraavaa koodia/kameraskannausta varten.
    setEanInput("");
    setEanResults([]);
    setEanLoading(false);
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setEanMessage("");
    if (eanHtml5ScannerRef.current) {
      setEanScannerOpen(true);
      setEanScannerMessage("Lisätty koriin. Kamera pysyy päällä seuraavaa tuotetta varten.");
    }
    showCartToast(`Lisätty: ${newItem.name}`);
    setLastAutoEanSearch("");

    window.setTimeout(() => {
      eanInputRef.current?.focus();
    }, 0);
  }


  function removeMatchingSearchTerm(product: Product) {
    const currentTerms = parseTerms(input);
    const productName = normalize(product.name);

    const matchedTerm = currentTerms.find((term) => {
      const normalizedTerm = normalize(term);
      const normalizedSearchQuery = normalize(getSearchQuery(term));
      return (
        normalizedTerm.length > 0 &&
        (productName.includes(normalizedTerm) || productName.includes(normalizedSearchQuery))
      );
    });

    if (!matchedTerm) return currentTerms;

    return currentTerms.filter((term) => term !== matchedTerm);
  }

  function addProductToCart(product: Product) {
    const remainingTerms = removeMatchingSearchTerm(product);
    const matchedTerms = parseTerms(input).filter((term) => !remainingTerms.includes(term));
    const normalizedProductName = normalize(product.name);

    const cartWithoutMatchingManualRows = cart.filter((item) => {
      if (item.source !== "manual") return true;

      const normalizedItemName = normalize(item.name);

      const matchedBySearchTerm = matchedTerms.some((term) => {
        const normalizedTerm = normalize(term);
        return normalizedTerm.length > 0 && normalizedItemName === normalizedTerm;
      });

      const matchedByProductName =
        normalizedItemName.length > 0 && normalizedProductName.includes(normalizedItemName);

      return !matchedBySearchTerm && !matchedByProductName;
    });

    if (cartWithoutMatchingManualRows.some((x) => normalize(x.name) === normalize(product.name))) return;

    if (cartWithoutMatchingManualRows.length >= MAX_ITEMS) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const newItem: CartItem = {
      id: `search-${product.id}`,
      name: fixText(product.name),
      price: getProductPrice(product),
      image: product.pictureUrl,
      chain: "S",
      storeName: activeStores.sStoreName,
      quantity: 1,
      source: "search",
      product,
      ean: product.ean,
    };

    const nextCart = [...cartWithoutMatchingManualRows, newItem];
    setCart(nextCart);
    showCartToast(`Lisätty ostoskoriin: ${newItem.name}`);
    void updateChainComparison(nextCart);

    const nextInput = remainingTerms.join(",");

    setInput(nextInput);

    if (remainingTerms.length > 0) {
      void searchNormalPrices(nextInput);
    } else {
      setNormalResults([]);
      setVisibleNormalCount(8);
    }
  }

  function addInputToCart() {
    triggerHaptic();
    const rows = parseTerms(input);
    const uniqueRows = Array.from(new Map(rows.map((row) => [normalize(row), row])).values()).slice(0, MAX_ITEMS);

    if (uniqueRows.length === 0) {
      alert("Kirjoita ensin tuotteita hakukenttään.");
      return;
    }

    const existingNames = new Set(cart.map((item) => normalize(item.name)));
    const rowsToAdd = uniqueRows.filter((row) => !existingNames.has(normalize(row)));

    if (rowsToAdd.length === 0) {
      showCartToast("Nämä muistilistarivit ovat jo ostoskorissa");
      setSearchPanelOpen(false);
      setCartModalOpen(true);
      return;
    }

    const freeSlots = Math.max(0, MAX_ITEMS - cart.length);
    if (freeSlots === 0) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const addedRows = rowsToAdd.slice(0, freeSlots);
    const now = Date.now();
    const newItems: CartItem[] = addedRows.map((row, index) => ({
      id: `memo-${now}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      name: row,
      quantity: 1,
      source: "manual",
    }));

    setNormalResults([]);
    setVisibleNormalCount(8);

    const nextCart = [...cart, ...newItems].slice(0, MAX_ITEMS);
    setCart(nextCart);
    persistCartImmediately(nextCart);

    const addedNames = new Set(addedRows.map((row) => normalize(row)));
    const remainingRows = rows.filter((row) => !addedNames.has(normalize(row)));
    setInput(remainingRows.join(","));

    showCartToast(`Lisätty muistilistaan: ${newItems.length} ${newItems.length === 1 ? "rivi" : "riviä"}`);
    setActiveResult("compare");
    void updateChainComparison(nextCart);
    setSearchPanelOpen(false);
    setCartModalOpen(true);
  }

  function addRecentItemToCart(item: CartItem) {
    triggerHaptic();
    const nextCart = mergeItemsIntoCart(cart, [item]);

    if (nextCart.length === cart.length && !cart.some((cartItem) => getCartItemMemoryKey(cartItem) === getCartItemMemoryKey(item))) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    setCart(nextCart);
    persistCartImmediately(nextCart);
    showCartToast(`Lisätty uudelleen: ${item.name}`);
    setSearchPanelOpen(false);
    setCartModalOpen(true);
    setActiveResult("compare");
    void updateChainComparison(nextCart);
  }

  function saveCurrentCartAsList() {
    triggerHaptic();

    if (cart.length === 0) {
      alert("Lisää ensin tuotteita ostoskoriin.");
      return;
    }

    const trimmedName = savedListName.trim();
    const defaultName = `Ostoslista ${new Date().toLocaleDateString("fi-FI")}`;
    const listName = trimmedName || defaultName;
    const now = Date.now();
    const items = cart.map(sanitizeCartItemForStorage).slice(0, MAX_ITEMS);

    setSavedShoppingLists((current) => {
      const existingIndex = current.findIndex((list) => normalize(list.name) === normalize(listName));
      const nextList: SavedShoppingList = {
        id: existingIndex >= 0 ? current[existingIndex].id : `list-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: listName,
        items,
        createdAt: existingIndex >= 0 ? current[existingIndex].createdAt : now,
        updatedAt: now,
      };

      const withoutExisting = current.filter((_, index) => index !== existingIndex);
      return [nextList, ...withoutExisting].slice(0, MAX_SAVED_SHOPPING_LISTS);
    });

    setSavedListName("");
    showCartToast(`Tallennettu lista: ${listName}`);
  }

  function addSavedListToCart(list: SavedShoppingList) {
    triggerHaptic();

    if (!list.items.length) return;

    const nextCart = mergeItemsIntoCart(cart, list.items);

    if (nextCart.length === cart.length && list.items.every((item) => !cart.some((cartItem) => getCartItemMemoryKey(cartItem) === getCartItemMemoryKey(item)))) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    setCart(nextCart);
    persistCartImmediately(nextCart);
    showCartToast(`Lisätty lista: ${list.name}`);
    setSearchPanelOpen(false);
    setCartModalOpen(true);
    setActiveResult("compare");
    void updateChainComparison(nextCart);
  }

  function deleteSavedShoppingList(id: string) {
    const list = savedShoppingLists.find((item) => item.id === id);
    const label = list ? `”${list.name}”` : "tämä tallennettu lista";
    const itemCount = list?.items.length || 0;

    const ok = window.confirm(`Poistetaanko tallennettu lista ${label}${itemCount ? ` (${itemCount} tuotetta)` : ""}? Tätä ei voi perua.`);
    if (!ok) return;

    setSavedShoppingLists((current) => current.filter((list) => list.id !== id));
    showCartToast("Tallennettu lista poistettu");
  }

  function showCart() {
    // Kori-paneeli toimii erillisenä näkymänä: se sulkee Haen/EANin/vertailun ja avautuu heti näkyville.
    setSearchPanelOpen(false);
    setEanModalOpen(false);
    setActiveResult("none");
    setCartModalOpen(true);
    if (cart.length > 0) void updateChainComparison(cart);
  }

  function toggleCartModal() {
    // Toinen painallus sulkee Korin. Jos Hae on auki, vaihdetaan suoraan Koriin.
    if (cartModalOpen) {
      setCartModalOpen(false);
      return;
    }

    showCart();
  }

  function closeCartModal() {
    setCartModalOpen(false);
  }

  function openComparisonView() {
    // Vertailu avautuu mobiilissa omana näkymänä eikä jää taustalle sivun scrolliin.
    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setEanModalOpen(false);
    setActiveResult("compare");
    if (cart.length > 0) void updateChainComparison(cart);
  }

  function toggleComparisonView() {
    if (activeResult === "compare" && !searchPanelOpen && !cartModalOpen && !eanModalOpen) {
      setActiveResult("none");
      return;
    }

    openComparisonView();
  }

  function scrollToNormalResults() {
    window.setTimeout(() => {
      const target = normalResultsSectionRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

  function handleMainNormalSearch() {
    setSearchPanelOpen(false);
    void searchNormalPrices();
    scrollToNormalResults();
  }

  function handleMainOfferSearch() {
    setSearchPanelOpen(false);
    void searchOffers();
    window.setTimeout(() => {
      normalResultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

  function getMatchEan(match: Match) {
    return (
      match.product.ean ||
      (match.product as any)?.ean ||
      (match.product as any)?.product?.ean ||
      ""
    );
  }

  function buildShoppingListText(chain: ChainResult) {
    const lines = chain.matches.map((match) => {
      const ean = getMatchEan(match);
      const eanLine = ean ? `\nEAN: ${ean}` : "";
      return `${match.quantity} × ${fixText(match.product.name)} — ${formatEuro(match.price * match.quantity)}${eanLine}`;
    });

    const savingsLine =
      cheapest && secondCheapest && cheapest.key === chain.key && savings > 0
        ? `\nSäästö seuraavaan täyteen koriin verrattuna: ${formatEuro(savings)} (${savingsPercent.toFixed(1).replace(".", ",")} %)`
        : "";

    return [
      `Ziiply ostoskori — ${chain.storeName}`,
      `Yhteensä: ${chain.totalPrice > 0 ? formatEuro(chain.totalPrice) : "—"}`,
      savingsLine.trim(),
      "",
      ...lines,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function copyTextToClipboard(textToCopy: string) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert("Ostoskori kopioitu leikepöydälle.");
    } catch {
      window.prompt("Kopioi ostoskori:", textToCopy);
    }
  }

  async function shareShoppingList(chain: ChainResult) {
    const textToShare = buildShoppingListText(chain);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Ziiply ostoskori — ${chain.storeName}`,
          text: textToShare,
        });
        return;
      }
    } catch {
      // User may cancel native share; fallback below is still useful.
    }

    await copyTextToClipboard(textToShare);
  }

  async function buyShoppingList(chain: ChainResult) {
    const textToShare = buildShoppingListText(chain);
    await copyTextToClipboard(textToShare);
    alert("Osta-toiminto on MVP:ssä ostoskorin kopiointi. Myöhemmin tämä voi avata valitun kaupan verkkokaupan.");
  }

  function syncCartDependentState(nextCart: CartItem[], changedId?: string, removedId?: string) {
    const quantityById = nextCart.reduce((map, item) => {
      map[item.id] = item.quantity;
      return map;
    }, {} as Record<string, number>);

    setLastOptimizationSnapshot(null);

    setSMatches((current) => {
      const next = { ...current };

      if (removedId) delete next[removedId];
      if (changedId && next[changedId] && quantityById[changedId]) {
        next[changedId] = { ...next[changedId], quantity: quantityById[changedId] };
      }

      return next;
    });

    setKMatches((current) => {
      const next = { ...current };

      if (removedId) delete next[removedId];
      if (changedId && next[changedId] && quantityById[changedId]) {
        next[changedId] = { ...next[changedId], quantity: quantityById[changedId] };
      }

      return next;
    });
  }

  function changeQuantity(id: string, delta: number) {
    const currentItem = cart.find((item) => item.id === id);
    if (!currentItem) return;

    const nextQuantity = currentItem.quantity + delta;
    const removedItem = nextQuantity <= 0 ? currentItem : null;
    const nextCart = cart
      .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
      .filter((item) => item.quantity > 0);

    setCart(nextCart);
    syncCartDependentState(nextCart, id, removedItem?.id);

    if (removedItem) {
      setCheckedCartItems((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setQualityModesByCart((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      showCartToast(`Poistettu: ${removedItem.name}`);
    } else {
      showCartToast(`${currentItem.name}: ${nextQuantity} kpl`);
    }

    triggerHaptic();
    void updateChainComparison(nextCart);
  }

  function removeCartItem(id: string) {
    const removedItem = cart.find((item) => item.id === id);
    const nextCart = cart.filter((item) => item.id !== id);

    if (!removedItem) return;

    setCart(nextCart);
    syncCartDependentState(nextCart, undefined, id);
    setCheckedCartItems((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setQualityModesByCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSMatches((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setKMatches((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    showCartToast(`Poistettu: ${removedItem.name}`);
    void updateChainComparison(nextCart);
  }

  function clearCart() {
    if (cart.length === 0) return false;

    const ok = window.confirm(`Tyhjennetäänkö koko ostoskori (${cart.length} tuotetta)?`);
    if (!ok) return false;

    setCart([]);
    setCheckedCartItems({});
    setQualityModesByCart({});
    setSMatches({});
    setKMatches({});
    setAlternativeResults({});
    setExpandedAlternatives({});
    setLoadingAlternatives({});
    setOptimizingChains({});
    setLastOptimizationSnapshot(null);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setActiveResult("none");
    showCartToast("Ostoskori tyhjennetty");
    return true;
  }

  function clearCartAndCloseModal() {
    const cleared = clearCart();
    if (cleared) setCartModalOpen(false);
  }



  function getAlternativeKey(chainKey: ChainResult["key"], match: Match, index: number) {
    return `${chainKey}-${match.cartItemId || match.product.id}-${index}`;
  }

  function getAlternativeSearchTerm(productName: string) {
    const normalized = normalize(productName);

    if (hasAnyToken(normalized, ["maito", "kevytmaito", "rasvaton maito", "täysmaito", "taysmaito"])) {
      return "maito 1l";
    }

    return buildKSearchName(productName) || getSearchQuery(productName) || productName;
  }

  function getAlternativeSearchTerms(productName: string, chainKey: ChainResult["key"]) {
    const normalized = normalize(productName);
    const terms: string[] = [];

    const addTerm = (term: string) => {
      const clean = normalize(term);
      if (clean && !terms.includes(clean)) terms.push(clean);
    };

    if (hasAnyToken(normalized, ["maito", "kevytmaito", "rasvaton maito", "täysmaito", "taysmaito"])) {
      if (chainKey === "k") {
        addTerm("pirkka maito 1l");
        addTerm("k-menu maito 1l");
      }
      addTerm("maito 1l");
      addTerm("maito");
      return terms;
    }

    if (hasAnyToken(normalized, ["ranskanperuna", "ranskanperunat", "fries", "peruna", "perunat", "poimutettu"])) {
      if (chainKey === "k") {
        addTerm("pirkka ranskanperunat");
        addTerm("k-menu ranskanperunat");
      }
      addTerm("ranskanperunat");
      addTerm("ranskanperuna");
      addTerm("pakasteperunat");
      addTerm("perunat pakaste");
      return terms;
    }

    if (hasAnyToken(normalized, ["kalapuikko", "kalapuikot", "fiskpinnar"])) {
      if (chainKey === "k") {
        addTerm("pirkka kalapuikot");
        addTerm("k-menu kalapuikot");
      }
      addTerm("kalapuikot");
      addTerm("kalapuikko");
      return terms;
    }

    if (hasAnyToken(normalized, ["kahvi", "juhla mokka"])) {
      addTerm("kahvi suodatinjauhatus");
      addTerm("kahvi");
    }

    if (hasAnyToken(normalized, ["cola", "coca-cola", "coca cola", "pepsi"])) {
      addTerm("cola 0,33l");
      addTerm("cola");
    }

    addTerm(getAlternativeSearchTerm(productName));

    const cleaned = buildKSearchName(productName);
    if (cleaned) addTerm(cleaned);

    const importantWords = cleaned
      .split(" ")
      .filter((word) => word.length > 3)
      .filter((word) => !/^\d/.test(word))
      .slice(0, 2);

    if (importantWords.length >= 1) addTerm(importantWords.join(" "));

    return terms;
  }

  function getQualityModeLabel(mode: QualityMode) {
    if (mode === "cheapest") return "Halvin";
    if (mode === "same_quality") return "Sama taso";
    if (mode === "own_brands") return "Omat merkit";
    return "Sama brändi";
  }

  function getMatchQualityMode(match: Match) {
    if (!match.cartItemId) return "cheapest" as QualityMode;
    return qualityModesByCart[match.cartItemId] || "cheapest";
  }

  function setMatchQualityMode(
    match: Match,
    mode: QualityMode,
    alternativeKey?: string,
    chainKey?: ChainResult["key"]
  ) {
    if (!match.cartItemId) return;

    setLastOptimizationSnapshot({
      cart: [...cart],
      sMatches: { ...sMatches },
      kMatches: { ...kMatches },
      alternativeResults: { ...alternativeResults },
      expandedAlternatives: { ...expandedAlternatives },
      chainKey: chainKey || "s",
      chainName: chainKey === "k" ? "K-ryhmä" : "S-ryhmä",
      savedAt: Date.now(),
    });

    setQualityModesByCart((prev) => ({
      ...prev,
      [match.cartItemId as string]: mode,
    }));

    if (alternativeKey) {
      clearAlternativesAutoCloseTimer(alternativeKey);

      setAlternativeResults((prev) => {
        const next = { ...prev };
        delete next[alternativeKey];
        return next;
      });

      // Jos vaihtoehtoikkuna on jo auki, pidetään se auki ja haetaan listaus uudella korvaustavalla.
      if (expandedAlternatives[alternativeKey] && chainKey) {
        void loadAlternatives(alternativeKey, chainKey, match, mode, true);
      }
    }
  }

  async function fetchAlternativesForMatch(
    chainKey: ChainResult["key"],
    match: Match,
    forcedQualityMode?: QualityMode
  ) {
    const matchQualityMode = forcedQualityMode || getMatchQualityMode(match);
    let alternatives: Product[] = [];

    if (chainKey === "s") {
      const sTerms = getAlternativeSearchTerms(match.product.name, "s");
      const allSItems: Product[] = [];

      for (const term of sTerms.slice(0, 5)) {
        const items = await fetchSProducts(term, activeStores.sStoreId);
        allSItems.push(...items);
      }

      const uniqueSItems = Array.from(new Map(allSItems.map((item) => [item.id, item])).values());

      alternatives = uniqueSItems
        .filter((product) => getProductPrice(product) > 0)
        .filter((product) => product.id !== match.product.id)
        .filter((product) => !isHardRejectedOptimizationAlternative(match.product.name, product.name))
        .filter((product) => productGroupGate(match.product.name, product.name))
        .filter((product) => isAllowedByQualityMode(match.product.name, product.name, matchQualityMode))
        .filter((product) => scoreNameMatch(match.product.name, product.name) + scoreQualityMode(match.product.name, product.name, matchQualityMode) > -100)
        .sort((a, b) => {
          const aScore = scoreNameMatch(match.product.name, a.name) + scoreQualityMode(match.product.name, a.name, matchQualityMode);
          const bScore = scoreNameMatch(match.product.name, b.name) + scoreQualityMode(match.product.name, b.name, matchQualityMode);

          if (matchQualityMode !== "cheapest" && Math.abs(bScore - aScore) > 20) {
            return bScore - aScore;
          }

          return getProductPrice(a) - getProductPrice(b);
        })
        .slice(0, 3);
    }

    if (chainKey === "k") {
      const kTerms = getAlternativeSearchTerms(match.product.name, "k");
      const allKItems: KProduct[] = [];

      for (const term of kTerms.slice(0, 4)) {
        const items = await fetchKProducts(term, activeStores.kStoreId);
        allKItems.push(...items);
      }

      const uniqueKItems = Array.from(new Map(allKItems.map((item) => [item.id, item])).values());

      alternatives = uniqueKItems
        .filter((product) => product.price > 0)
        .filter((product) => product.id !== String(match.product.id))
        .filter((product) => !isHardRejectedOptimizationAlternative(match.product.name, product.name))
        .filter((product) => !isHardRejectedKMatch(match.product.name, product.name))
        .filter((product) => productGroupGate(match.product.name, product.name))
        .filter((product) => isAllowedByQualityMode(match.product.name, product.name, matchQualityMode))
        .filter((product) => scoreNameMatch(match.product.name, product.name) + scoreQualityMode(match.product.name, product.name, matchQualityMode) > -100)
        .map(convertKProductToProduct)
        .sort((a, b) => {
          const aScore = scoreNameMatch(match.product.name, a.name) + scoreQualityMode(match.product.name, a.name, matchQualityMode);
          const bScore = scoreNameMatch(match.product.name, b.name) + scoreQualityMode(match.product.name, b.name, matchQualityMode);

          if (matchQualityMode !== "cheapest" && Math.abs(bScore - aScore) > 20) {
            return bScore - aScore;
          }

          return getProductPrice(a) - getProductPrice(b);
        })
        .slice(0, 3);
    }

    return alternatives;
  }

  async function loadAlternatives(
    key: string,
    chainKey: ChainResult["key"],
    match: Match,
    forcedQualityMode?: QualityMode,
    forceReload = false
  ) {
    if (!forceReload && (alternativeResults[key]?.length || loadingAlternatives[key])) return;

    setLoadingAlternatives((prev) => ({ ...prev, [key]: true }));

    if (forceReload) {
      setAlternativeResults((prev) => ({
        ...prev,
        [key]: [],
      }));
    }

    try {
      const alternatives = await fetchAlternativesForMatch(chainKey, match, forcedQualityMode);

      setAlternativeResults((prev) => ({
        ...prev,
        [key]: alternatives,
      }));
    } catch (error) {
      console.error(error);
      setAlternativeResults((prev) => ({
        ...prev,
        [key]: [],
      }));
    } finally {
      setLoadingAlternatives((prev) => ({ ...prev, [key]: false }));

      setExpandedAlternatives((prev) => {
        if (prev[key]) {
          startAlternativesAutoCloseTimer(key);
        }

        return prev;
      });
    }
  }


  function clearAlternativesAutoCloseTimer(key: string) {
    const existing = alternativesTimeoutsRef.current[key];

    if (existing) {
      window.clearTimeout(existing);
      delete alternativesTimeoutsRef.current[key];
    }
  }

  function startAlternativesAutoCloseTimer(key: string) {
    clearAlternativesAutoCloseTimer(key);

    // UI debounce / anti-duplicate protection
    alternativesTimeoutsRef.current[key] = window.setTimeout(() => {
      setExpandedAlternatives((prev) => ({
        ...prev,
        [key]: false,
      }));

      delete alternativesTimeoutsRef.current[key];
    }, ALTERNATIVES_AUTO_CLOSE_MS);
  }

  function closeAlternatives(key: string) {
    clearAlternativesAutoCloseTimer(key);

    setExpandedAlternatives((prev) => ({
      ...prev,
      [key]: false,
    }));
  }

  function toggleAlternatives(key: string, chainKey: ChainResult["key"], match: Match) {
    const isExpanded = expandedAlternatives[key];

    if (isExpanded) {
      closeAlternatives(key);
      return;
    }

    setExpandedAlternatives((prev) => ({
      ...prev,
      [key]: true,
    }));

    void loadAlternatives(key, chainKey, match);
  }

  function formatPriceDifference(currentPrice: number, nextPrice: number) {
    const diff = nextPrice - currentPrice;
    if (diff === 0) return "sama hinta";

    const prefix = diff > 0 ? "+" : "-";
    return `${prefix}${formatEuro(Math.abs(diff))}`;
  }

  function isSameAlternativeAsMatch(match: Match, alternative: Product) {
    const matchEan = getMatchEan(match);
    const alternativeEan = alternative.ean || "";

    if (matchEan && alternativeEan && matchEan === alternativeEan) return true;

    return normalize(match.product.name) === normalize(alternative.name);
  }

  function getAlternativeActionText(currentPrice: number, nextPrice: number) {
    const diff = nextPrice - currentPrice;

    if (diff < 0) {
      return `Vaihda · säästä ${formatEuro(Math.abs(diff))}`;
    }

    if (diff > 0) {
      return `Vaihda · +${formatEuro(diff)}`;
    }

    return "Vaihda";
  }

  function getCheaperAlternatives(chainKey: ChainResult["key"], match: Match, index: number) {
    const key = getAlternativeKey(chainKey, match, index);
    return (alternativeResults[key] || [])
      .filter((alternative) => getProductPrice(alternative) < match.price)
      .sort((a, b) => getProductPrice(a) - getProductPrice(b));
  }

  function hasKnownCheaperAlternatives(chain: ChainResult) {
    return chain.matches.some((match, index) => getCheaperAlternatives(chain.key, match, index).length > 0);
  }

  function hasUncheckedOptimizationCandidates(chain: ChainResult) {
    return chain.matches.some((match, index) => {
      const key = getAlternativeKey(chain.key, match, index);
      return !(key in alternativeResults);
    });
  }

  function canOptimizeChain(chain: ChainResult) {
    return !chain.comingSoon && chain.matches.length > 0 && (hasKnownCheaperAlternatives(chain) || hasUncheckedOptimizationCandidates(chain));
  }

  function getKnownOptimizationSavings(chain: ChainResult) {
    return chain.matches.reduce((sum, match, index) => {
      const cheapestAlternative = getCheaperAlternatives(chain.key, match, index)[0];
      if (!cheapestAlternative) return sum;

      return sum + Math.max(0, match.price - getProductPrice(cheapestAlternative)) * match.quantity;
    }, 0);
  }

  function getOptimizeCartLabel(chain: ChainResult) {
    if (optimizingChains[chain.key]) return "Haetaan halvimmat...";

    const savings = getKnownOptimizationSavings(chain);

    if (savings > 0) {
      return `Optimoi kori · säästä ${formatEuro(savings)}`;
    }

    if (hasUncheckedOptimizationCandidates(chain)) {
      return "Optimoi kori";
    }

    return "Ei optimoitavaa";
  }

  function replaceMatchProduct(
    chainKey: ChainResult["key"],
    match: Match,
    alternative: Product,
    alternativeKey?: string
  ) {
    if (!match.cartItemId) return;

    setLastOptimizationSnapshot({
      cart: [...cart],
      sMatches: { ...sMatches },
      kMatches: { ...kMatches },
      alternativeResults: { ...alternativeResults },
      expandedAlternatives: { ...expandedAlternatives },
      chainKey,
      chainName: chainKey === "s" ? "S-ryhmä" : chainKey === "k" ? "K-ryhmä" : "Valittu ketju",
      savedAt: Date.now(),
    });

    const nextMatch: Match = {
      ...match,
      product: alternative,
      price: getProductPrice(alternative),
      matchType:
        alternative.ean && alternative.ean === match.product.ean
          ? "ean"
          : "name",
      fallbackStoreName: undefined,
    };

    if (chainKey === "s") {
      setSMatches((prev) => ({
        ...prev,
        [match.cartItemId as string]: nextMatch,
      }));
    }

    if (chainKey === "k") {
      setKMatches((prev) => ({
        ...prev,
        [match.cartItemId as string]: nextMatch,
      }));
    }

    if (alternativeKey) {
      clearAlternativesAutoCloseTimer(alternativeKey);

      setExpandedAlternatives((prev) => ({
        ...prev,
        [alternativeKey]: false,
      }));
    }
  }

  async function optimizeCart(chain: ChainResult) {
    if (!canOptimizeChain(chain) || optimizingChains[chain.key]) return;

    const snapshotBeforeOptimization: OptimizationSnapshot = {
      cart: [...cart],
      sMatches: { ...sMatches },
      kMatches: { ...kMatches },
      alternativeResults: { ...alternativeResults },
      expandedAlternatives: { ...expandedAlternatives },
      chainKey: chain.key,
      chainName: chain.chain,
      savedAt: Date.now(),
    };

    setOptimizingChains((prev) => ({
      ...prev,
      [chain.key]: true,
    }));

    try {
      const fetchedAlternativeResults: Record<string, Product[]> = {};
      const nextMatches: Record<string, Match> = {};
      const keysToClose: Record<string, boolean> = {};
      let replacedCount = 0;

      await Promise.all(
        chain.matches.map(async (match, index) => {
          if (!match.cartItemId) return;

          const key = getAlternativeKey(chain.key, match, index);
          let alternatives = alternativeResults[key];

          if (!alternatives) {
            alternatives = await fetchAlternativesForMatch(chain.key, match);
            fetchedAlternativeResults[key] = alternatives;
          }

          const cheapestAlternative = alternatives
            .filter((alternative) => !isHardRejectedOptimizationAlternative(match.product.name, alternative.name))
            .filter((alternative) => productGroupGate(match.product.name, alternative.name))
            .filter((alternative) => getProductPrice(alternative) < match.price)
            .sort((a, b) => getProductPrice(a) - getProductPrice(b))[0];

          if (!cheapestAlternative) return;

          nextMatches[match.cartItemId] = {
            ...match,
            product: cheapestAlternative,
            price: getProductPrice(cheapestAlternative),
            matchType:
              cheapestAlternative.ean && cheapestAlternative.ean === match.product.ean
                ? "ean"
                : "name",
            fallbackStoreName: undefined,
          };

          keysToClose[key] = false;
          replacedCount += 1;
        })
      );

      if (Object.keys(fetchedAlternativeResults).length > 0) {
        setAlternativeResults((prev) => ({
          ...prev,
          ...fetchedAlternativeResults,
        }));
      }

      if (replacedCount === 0) {
        setLastOptimizationSnapshot(null);
        return;
      }

      setLastOptimizationSnapshot(snapshotBeforeOptimization);

      if (chain.key === "s") {
        setSMatches((prev) => ({
          ...prev,
          ...nextMatches,
        }));
      }

      if (chain.key === "k") {
        setKMatches((prev) => ({
          ...prev,
          ...nextMatches,
        }));
      }

      Object.keys(keysToClose).forEach(clearAlternativesAutoCloseTimer);

      setExpandedAlternatives((prev) => ({
        ...prev,
        ...keysToClose,
      }));
    } catch (error) {
      console.error(error);
      alert("Korivaihtoehtojen haku epäonnistui. Kokeile hetken päästä uudelleen.");
    } finally {
      setOptimizingChains((prev) => ({
        ...prev,
        [chain.key]: false,
      }));
    }
  }

  function getBarWidth(chain: ChainResult) {

    if (!cheapest || chain.totalPrice <= 0 || chain.comingSoon) return 0;
    return Math.max(15, Math.min(100, (cheapest.totalPrice / chain.totalPrice) * 100));
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 px-2 pb-32 pt-[4.75rem] text-slate-950 sm:px-4 sm:py-4 md:pb-4">
      {showLaunchScreen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white sm:hidden">
          <div className="mx-auto flex w-full max-w-[320px] flex-col items-center px-8 text-center">
            <img
              src="/ziiply.png"
              alt="Ziiply"
              className="h-auto w-full max-w-[280px] object-contain"
            />
            <p className="mt-4 rounded-full bg-green-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-green-700 ring-1 ring-green-100">
              MVP
            </p>
          </div>
        </div>
      )}

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.55rem)] shadow-sm backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="min-w-0">
            <img
              src="/ziiply.png"
              alt="Ziiply"
              className="h-9 w-auto max-w-[128px] shrink-0 object-contain"
            />
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">MVP</span>
        </div>
        {!isOnline && (
          <div className="mx-auto mt-2 max-w-md rounded-2xl bg-amber-100 px-3 py-2 text-center text-[11px] font-black text-amber-900 ring-1 ring-amber-200">
            Ei verkkoyhteyttä – kori toimii, hinnat eivät päivity.
          </div>
        )}
      </header>

      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <section className="-mx-2 hidden bg-slate-100/95 px-2 pb-2 pt-2 sm:-mx-4 sm:block sm:px-4 sm:pb-4 sm:pt-4">
          <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-[1.75rem] bg-white px-4 py-1 shadow-sm sm:rounded-[2rem] sm:px-6">
            <img
              src="/ziiply.png"
              alt="Ziiply"
              className="mx-auto max-h-[150px] w-auto object-contain py-2 sm:max-h-[180px] sm:py-3"
            />
            <p className="mx-auto mt-1 max-w-3xl text-center text-sm leading-snug text-slate-600 sm:text-base">
              Hae mitä tarvitset. Ziiply etsii siihen liittyvät tarjoukset ja auttaa vertaamaan ostoskorin hinnat.
            </p>
          </div>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-slate-200 bg-white/95 p-2 shadow-sm sm:rounded-[1.75rem] sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-2 text-[11px] font-extrabold text-slate-700 ring-1 ring-slate-200 sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-600 sm:h-5 sm:w-5"
                readOnly
              />
              <span className="hidden xs:inline sm:inline">Oma sijainti</span>
              <span className="inline xs:hidden sm:hidden">Oma</span>
            </label>

            <div className="shrink-0 text-xs font-black text-slate-500 sm:text-sm">TAI</div>

            <input
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              placeholder="05510 tai Hyvinkää"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base"
            />


          <button
              type="button"
              onClick={applyLocation}
              className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white transition active:scale-[0.98] sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
            >
              {storeSearchLoading ? "..." : "Käytä"}
            </button>
          </div>

          <div className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-900 sm:mt-3 sm:rounded-2xl sm:p-3 sm:text-sm">
            {locationMessage}
          </div>


        </section>

        <section className="rounded-[1.5rem] bg-white p-5 text-center shadow-sm sm:rounded-[2rem] sm:p-8">
          <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            Mitä haluat ostaa halvemmalla?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base font-semibold leading-relaxed text-slate-500">
            Lisää tuotteet, valitse alue ja katso mistä koko kori löytyy halvimmalla.
          </p>


          <div className="mx-auto mt-3 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-left">
            <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">Testiympäristö</p>
            <p className="mt-0.5 text-xs font-bold leading-snug text-amber-900">
              IP/local-testissä kamera, mikrofoni ja clipboard voivat olla rajoitettuja. Haku ja ostoskori toimivat.
            </p>
          </div>

          <div className="mx-auto mt-5 grid max-w-2xl grid-cols-3 gap-2 text-left">
            {[
              ["1", "Lisää tuotteet"],
              ["2", "Vertaa kaupat"],
              ["3", "Näytä ostoslista"],
            ].map(([step, label]) => (
              <div key={step} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
                  {step}
                </div>
                <p className="text-xs font-black leading-tight text-slate-700 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={openSearchPanel}
            className="mt-8 w-full rounded-2xl bg-green-600 px-6 py-5 text-xl font-black text-white shadow-sm transition active:scale-[0.98] sm:w-auto sm:min-w-[20rem]"
          >
            🛒 Aloita ostoskori
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={openSearchPanelAndStartVoice}
              className={`touch-manipulation rounded-2xl px-4 py-4 text-sm font-extrabold text-white transition active:scale-[0.98] ${
                isListening
                  ? "bg-red-600"
                  : speechSupported
                  ? "bg-blue-600"
                  : "bg-slate-500"
              }`}
            >
              {isListening ? "🎙️ Kuunnellaan..." : "🎤 Sanele haku"}
            </button>
            <button
              type="button"
              onClick={openEanModal}
              className="touch-manipulation rounded-2xl bg-emerald-700 px-4 py-4 text-sm font-extrabold text-white transition active:scale-[0.98]"
            >
              ▦ EAN / viivakoodi
            </button>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={showCart}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-extrabold text-white transition active:scale-[0.98]"
            >
              Näytä ostoskori ({cart.length})
            </button>
          )}

          <div className="mt-5 rounded-2xl bg-green-50 p-3 text-left ring-1 ring-green-100">
            <p className="text-xs font-black uppercase tracking-wide text-green-700">Kokeile nopeasti</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["maito", "kahvi", "jauheliha", "banaani"].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setInput((current) => {
                      const existing = parseTerms(current);
                      return Array.from(new Set([...existing, term])).join(",");
                    });
                    openSearchPanel();
                  }}
                  className="rounded-full bg-white px-3 py-2 text-xs font-black text-green-800 ring-1 ring-green-200 transition active:scale-[0.98]"
                >
                  + {term}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setInput("maito,kahvi,banaani,jauheliha");
                  openSearchPanel();
                }}
                className="rounded-full bg-green-600 px-3 py-2 text-xs font-black text-white ring-1 ring-green-600 transition active:scale-[0.98]"
              >
                Täytä testikori
              </button>
            </div>
          </div>


        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Hakutapa</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleStoreModeChange("hyper")}
              className={`rounded-2xl px-4 py-4 text-base font-extrabold transition ${
                storeMode === "hyper"
                  ? "bg-green-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              🏬 Tavaratalot
            </button>
            <button
              type="button"
              onClick={() => handleStoreModeChange("local")}
              className={`rounded-2xl px-4 py-4 text-base font-extrabold transition ${
                storeMode === "local"
                  ? "bg-green-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              🏪 Lähikaupat
            </button>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <p className="font-bold text-slate-700">
              {storeMode === "hyper" ? "Haetaan tavarataloista" : "Haetaan lähikaupoista"}
            </p>
            <p className="mt-1">S: {activeStores.sStoreName}</p>
            <p>K: {activeStores.kStoreName}</p>
            <p className="mt-2 text-slate-400">Valitut kaupat tallennetaan tälle selaimelle.</p>

            {storeMode === "local" && (!activeArea.sLocalStoreId || !activeArea.kLocalStoreId) && foundStores.length === 0 && (
              <p className="mt-2 text-amber-700">
                Paina Käytä, niin Ziiply hakee lähialueen kaupat valittavaksi.
              </p>
            )}
          </div>

          {foundStores.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-bold text-slate-700">Valitse kaupat ({foundStores.length})</p>
                <p className="text-slate-400">ID näkyy testaukseen</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700">S-ryhmä</p>
                  <div className="max-h-44 space-y-2 overflow-auto pr-1">
                    {foundStores.filter((store) => store.type === "S").map((store) => {
                      const selected =
                        storeMode === "local"
                          ? activeArea.sLocalStoreId === store.id
                          : activeArea.sStoreId === store.id;

                      return (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => selectStoreForCurrentMode(store)}
                          className={`w-full rounded-xl px-3 py-2 text-left transition ${
                            selected
                              ? "bg-green-600 text-white"
                              : "bg-slate-50 text-slate-700 hover:bg-green-50"
                          }`}
                        >
                          <span className="block truncate font-bold">{store.name}</span>
                          <span className={`block text-[11px] ${selected ? "text-green-50" : "text-slate-400"}`}>
                            ID {store.id} · {store.city || ""} {store.postalCode || ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-700">K-ryhmä</p>
                  <div className="max-h-44 space-y-2 overflow-auto pr-1">
                    {foundStores.filter((store) => store.type === "K").map((store) => {
                      const selected =
                        storeMode === "local"
                          ? activeArea.kLocalStoreId === store.id
                          : activeArea.kStoreId === store.id;

                      return (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => selectStoreForCurrentMode(store)}
                          className={`w-full rounded-xl px-3 py-2 text-left transition ${
                            selected
                              ? "bg-red-600 text-white"
                              : "bg-slate-50 text-slate-700 hover:bg-red-50"
                          }`}
                        >
                          <span className="block truncate font-bold">{store.name}</span>
                          <span className={`block text-[11px] ${selected ? "text-red-50" : "text-slate-400"}`}>
                            ID {store.id} · {store.city || ""} {store.postalCode || ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-2xl font-extrabold">Vertailtavat ketjut</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                key: "s" as const,
                title: "S-ryhmä",
                subtitle: "Prisma, S-market, Sale, Alepa",
              },
              {
                key: "k" as const,
                title: "K-ryhmä",
                subtitle: "K-Citymarket, K-Supermarket, K-Market",
              },
              {
                key: "lidl" as const,
                title: "Lidl",
                subtitle: "Tulossa myöhemmin",
                comingSoon: true,
              },
              {
                key: "tokmanni" as const,
                title: "Tokmanni / Spar",
                subtitle: "Tulossa myöhemmin",
                comingSoon: true,
              },
            ].map((chain) => {
              const selected = selectedChains[chain.key];

              return (
                <button
                  key={chain.key}
                  type="button"
                  onClick={() =>
                    setSelectedChains((current) => ({
                      ...current,
                      [chain.key]: !current[chain.key],
                    }))
                  }
                  className={`rounded-2xl border p-4 text-left transition min-h-[5.75rem] ${
                    selected ? "border-green-600 bg-green-50" : "border-slate-200 bg-white opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-950">{chain.title}</p>
                        {chain.comingSoon && (
                          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">
                            Tulossa
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{chain.subtitle}</p>
                    </div>

                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        selected ? "bg-green-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {activeResult === "offers" && (
          <>
            <section ref={cartSectionRef} className="rounded-[2rem] bg-green-700 p-6 text-white shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-green-100">Tarjousmoottori</p>
                  <h2 className="mt-1 text-3xl font-extrabold">{hasSearchedOffers ? "Hakusi mukaiset tarjoukset" : "Aloita hakemalla tuotetta"}</h2>
                  <p className="mt-2 max-w-2xl text-green-100">Näytämme yksittäisen tuotteen tai oman ostoskorin mukaiset tarjousosumat.</p>
                </div>
                <button onClick={showCart} className="rounded-2xl bg-white/10 p-4 text-right hover:bg-white/20">
                  <p className="text-sm text-green-100">Ostoskori</p>
                  <p className="text-4xl font-extrabold">{cart.length}</p>
                </button>
              </div>
            </section>

            {hasSearchedOffers && (
              <section className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold">Tarjoukset</h2>
                    <p className="min-w-0 break-words text-sm text-slate-500">Löytyneet tarjoukset: {filteredOffers.length}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setChainFilter("all")} className={`rounded-full px-4 py-2 text-sm font-bold ${chainFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Kaikki</button>
                    <button onClick={() => setChainFilter("S")} className={`rounded-full px-4 py-2 text-sm font-bold ${chainFilter === "S" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"}`}>S-ryhmä</button>
                    <button onClick={() => setChainFilter("K")} className={`rounded-full px-4 py-2 text-sm font-bold ${chainFilter === "K" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"}`}>K-ryhmä</button>
                  </div>
                </div>

                {filteredOffers.length === 0 ? (
                  <div className="rounded-2xl bg-slate-100 p-5 text-sm font-semibold text-slate-600 sm:p-6">Ei tarjouksia annetulle haulle. Kokeile lyhyempää hakusanaa tai lisää tuote ostoskoriin.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredOffers.map((item) => (
                      <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex gap-4">
                          {item.offer.item.pictureUrl && <img src={item.offer.item.pictureUrl} alt={item.offer.item.name} className="h-20 w-20 shrink-0 rounded-2xl bg-slate-100 object-contain" />}
                          <div className="min-w-0 max-w-full flex-1 overflow-hidden">
                            <div className="mb-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-extrabold text-red-700">🔥 Tarjous</span>
                              <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.chain === "S" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{item.chain === "S" ? "S-ryhmä" : "K-ryhmä"}</span>
                            </div>
                            <h3 className="line-clamp-2 font-extrabold">{fixText(item.offer.item.name)}</h3>
                            <p className="mt-1 text-sm text-slate-500">{item.storeName}</p>
                            {item.offer.item.ean && (
                              <p className="mt-1 text-xs text-slate-400">EAN: {item.offer.item.ean}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                              <p className="text-3xl font-extrabold text-green-700">{formatEuro(item.offer.storeItem?.price)}</p>
                              {renderPriceHistoryBadge(getPriceHistoryKeyFromProduct(offerToProduct(item), item.storeName, item.chain), item.offer.storeItem?.price || 0)}
                            </div>
                            {item.offer.batchQuantity && item.offer.batchTotalPrice && <p className="mt-1 text-sm font-bold text-green-700">{item.offer.batchQuantity} kpl = {formatEuro(item.offer.batchTotalPrice)}</p>}
                            <p className="mt-1 text-xs text-slate-500">Yksikköhinta: {item.offer.storeItem?.comparisonPrice ? `${formatEuro(item.offer.storeItem.comparisonPrice)} / ${item.offer.storeItem.comparisonPriceUnit || ""}` : "—"}</p>
                            <p className="mt-1 text-xs text-slate-400">Voimassa asti: {formatDate(item.offer.expiresAt)}</p>
                          </div>
                          <div className="text-right">
                            {item.offer.discountPercent ? <div className="mb-3 rounded-full bg-red-600 px-3 py-2 text-lg font-extrabold text-white">-{item.offer.discountPercent} %</div> : null}
                            <button
                              onClick={() => addOfferToCart(item)}
                              className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition ${justAdded === item.id ? "bg-emerald-700" : "bg-green-600 hover:bg-green-700"}`}
                            >
                              {justAdded === item.id ? "✓ Lisätty" : "Lisää koriin"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {activeResult === "compare" && (
          <div className="fixed inset-0 z-40 flex items-end justify-center overflow-hidden bg-slate-950/40 px-2 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-3 sm:static sm:block sm:overflow-visible sm:bg-transparent sm:p-0">
            <div className="max-h-[calc(100dvh-7rem)] w-full max-w-[42rem] overflow-y-auto overflow-x-hidden rounded-[1.5rem] bg-slate-50 p-3 shadow-2xl sm:max-h-none sm:max-w-none sm:overflow-visible sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none">
              <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm sm:hidden">
                <div className="min-w-0">
                  <p className="text-lg font-black text-slate-900">Vertailu</p>
                  <p className="text-xs font-bold text-slate-500">Kauppaketjujen hinnat ja halvin kori</p>
                </div>
                <button type="button" onClick={() => setActiveResult("none")} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700 active:scale-[0.98]">Sulje</button>
              </div>
            <div className="grid min-w-0 max-w-full gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {showCheapestSticky && cheapest && secondCheapest ? (
                <section ref={savingsSummaryRef} className="min-w-0 max-w-full overflow-hidden rounded-[1.5rem] bg-white p-3 shadow-sm sm:rounded-[2rem] sm:p-6">
                  <div className="rounded-[1.5rem] border border-green-200 bg-white/95 p-5 text-center shadow-sm">
                    <div className="relative mx-auto max-w-sm rounded-2xl border border-green-200 bg-white px-5 pb-4 pt-3 shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[12px] font-extrabold uppercase tracking-wide text-green-700">
                          Halvin täysi kori
                        </p>
                        <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xl font-black leading-none text-red-500">
                          −{savingsPercent.toFixed(1).replace(".", ",")}%
                        </span>
                      </div>

                      <p className="mt-3 text-6xl font-black leading-none tracking-tight text-green-700">
                        {formatEuro(cheapest.totalPrice)}
                      </p>

                      <p className="mt-4 text-3xl font-black leading-none text-green-800">
                        Säästit {formatEuro(savings)}
                      </p>

                      <p className="mt-2 truncate text-xl font-extrabold leading-tight text-slate-800">
                        {cheapest.storeName}
                      </p>


                      {lastOptimizationSnapshot && (
                        <button
                          type="button"
                          onClick={restorePreviousOptimization}
                          className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-800 transition active:scale-[0.98]"
                        >
                          ↩ Peruuta optimointi
                        </button>
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-left">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                        Yhteenveto
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                          <p className="text-xs font-bold text-slate-400">Tuotteita</p>
                          <p className="text-lg font-black text-slate-900">{cart.length}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                          <p className="text-xs font-bold text-slate-400">Vertailtu</p>
                          <p className="text-lg font-black text-slate-900">{completeResults.length} ketjua</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-500">
                        Tähän voidaan lisätä myöhemmin ostohistoria, aiemmat säästöt ja optimointien vaikutus.
                      </p>
                    </div>
                  </div>
                </section>
              ) : (loadingNormal || normalResults.length > 0 || activeResult === "compare") && (
<section ref={normalResultsSectionRef} className="min-w-0 max-w-full overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-extrabold">Normaalihintojen hakutulokset</h2>
                    <p className="min-w-0 break-words text-sm text-slate-500">
                      Hakutulokset halvimmasta kalleimpaan. Näytetään {Math.min(visibleNormalCount, visibleNormalResults.length)} / {visibleNormalResults.length}.
                      {terms.length > 0 ? ` Jäljellä haussa: ${terms.join(", ")}.` : ""}
                    </p>
                  </div>

                  {loadingNormal && (
                    <div className="rounded-full bg-green-50 px-3 py-2 text-sm font-black text-green-700 ring-1 ring-green-100">
                      Verrataan hintoja...
                    </div>
                  )}
                </div>

                {loadingNormal ? (
                  <div className="grid gap-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 animate-pulse rounded-xl bg-slate-100" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                            <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : visibleNormalResults.length === 0 ? (
                  <div className="rounded-2xl bg-slate-100 p-5 text-sm font-semibold text-slate-600">
                    {normalResults.length === 0 ? (terms.length === 0 && cart.length > 0 ? "Ostoskori valmis. Voit siirtyä kauppaketjuvertailuun." : "Ei normaalihintojen hakutuloksia vielä. Tee hintavertailuhaku tai hae tuotetta nimellä.") : "Kaikki näkyvät hakutulokset on jo lisätty ostoskoriin."}
                  </div>
                ) : (
                  <>
                    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
                      {visibleNormalResults.slice(0, visibleNormalCount).map((product) => {
                        return (
                          <div key={product.id} className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 p-3 transition hover:border-green-300 hover:bg-green-50/30 sm:p-4">
                            <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden">
                              {product.pictureUrl && <img src={product.pictureUrl} alt={product.name} className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain sm:h-16 sm:w-16" />}
                              <div className="min-w-0 max-w-full flex-1 overflow-hidden">
                                <h3 className="line-clamp-2 max-w-full break-words font-bold leading-tight">{fixText(product.name)}</h3>
                                <p className="min-w-0 break-words text-sm text-slate-500">
                                  {(product as Product & { fallbackStoreName?: string }).fallbackStoreName || activeStores.sStoreName}
                                </p>
                                {(product as Product & { originalSearchTerm?: string; usedSearchQuery?: string }).usedSearchQuery &&
                                  normalize((product as Product & { originalSearchTerm?: string; usedSearchQuery?: string }).usedSearchQuery || "") !==
                                    normalize((product as Product & { originalSearchTerm?: string; usedSearchQuery?: string }).originalSearchTerm || "") && (
                                  <p className="mt-1 line-clamp-2 max-w-full break-words text-xs font-semibold text-blue-600">
                                    haettu oletustuotteena: {(product as Product & { usedSearchQuery?: string }).usedSearchQuery}
                                  </p>
                                )}
                                {(product as Product & { fallbackStoreName?: string }).fallbackStoreName && (
                                  <p className="mt-1 text-xs font-semibold text-amber-600">
                                    fallback: {(product as Product & { fallbackStoreName?: string }).fallbackStoreName}
                                  </p>
                                )}
                                {formatComparisonPrice(product) && (
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {formatComparisonPrice(product)}
                                  </p>
                                )}
                                {product.ean && (
                                  <p className="mt-1 max-w-full truncate text-xs text-slate-400">EAN: {product.ean}</p>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-3">
                                  <p className="text-lg font-bold text-green-700">{formatEuro(getProductPrice(product))}</p>
                                  {renderPriceHistoryBadge(getPriceHistoryKeyFromProduct(product, (product as Product & { fallbackStoreName?: string }).fallbackStoreName || activeStores.sStoreName), getProductPrice(product))}
                                  <button
                                    onClick={() => addProductToCart(product)}
                                    className="shrink-0 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                                  >
                                    Lisää
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {visibleNormalCount < visibleNormalResults.length && (
                      <button
                        type="button"
                        onClick={() => setVisibleNormalCount((current) => current + 8)}
                        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-green-300 hover:bg-green-50"
                      >
                        Näytä lisää
                      </button>
                    )}
                  </>
                )}
              </section>
              )}

            {cart.length > 0 && (
                <section ref={comparisonSectionRef} className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                <div className="mb-5">
                  <h2 className="text-2xl font-extrabold">Kauppaketjuvertailu</h2>
                  <p className="min-w-0 break-words text-sm text-slate-500">Halvin valitaan vain ketjuista, joista löytyvät kaikki ostoskorin tuotteet.</p>
                </div>

                {cheapest && (
                  <div className="mb-4 max-w-full overflow-hidden rounded-[1.5rem] bg-slate-950 p-4 text-white shadow-sm sm:p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-green-300">Halvin täysi kori</p>
                    <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-black leading-tight">{cheapest.storeName}</h3>
                        <p className="mt-1 text-sm font-bold text-slate-300">{cheapest.chain} · {cheapest.foundItems}/{cart.length} tuotetta löytyi</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-4xl font-black text-green-300">{formatEuro(cheapest.totalPrice)}</p>
                        {secondCheapest && savings > 0 && (
                          <p className="mt-1 text-sm font-extrabold text-green-200">
                            Säästö {formatEuro(savings)} · {savingsPercent.toFixed(1).replace(".", ",")} %
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openShoppingListForCheapest}
                      className="mt-4 w-full rounded-2xl bg-green-500 px-4 py-3 text-sm font-black text-slate-950 transition active:scale-[0.98] sm:w-auto"
                    >
                      Näytä ostoslista kauppaan
                    </button>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {chainResults.map((chain) => {
                    const isCheapest = cheapest?.key === chain.key;
                    const isComplete = !chain.comingSoon && chain.totalPrice > 0 && chain.missingItems === 0;
                    const logoLabel =
                      chain.key === "s"
                        ? "S"
                        : chain.key === "k"
                        ? "K"
                        : chain.key === "lidl"
                        ? "Lidl"
                        : "TOK";

                    return (
                      <div
                        key={chain.key}
                        className={`flex min-w-0 max-w-full flex-col overflow-hidden rounded-[1.5rem] border p-3 sm:min-h-[25rem] sm:p-5 ${
                          chain.comingSoon
                            ? "border-slate-200 bg-slate-50 opacity-80"
                            : isCheapest
                            ? "border-green-500 bg-green-50 shadow-lg shadow-green-100 ring-2 ring-green-200"
                            : isComplete
                            ? "border-slate-200 bg-white"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="min-w-0 break-words text-sm text-slate-500">{chain.chain}</p>
                          <h3 className="mt-1 line-clamp-2 max-w-full break-words text-lg font-bold">{chain.storeName}</h3>
                          {isCheapest && (
                            <div className="mt-2 inline-flex rounded-full bg-green-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                              Halvin kori
                            </div>
                          )}
                          <p className="mt-2 line-clamp-3 text-sm text-slate-500">{chain.detail}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center sm:gap-2">
                          <div className="rounded-2xl bg-green-100 p-2 sm:p-3">
                            <p className="text-xl font-bold text-green-700 sm:text-2xl">{chain.foundItems}</p>
                            <p className="text-xs text-green-800">löytyi</p>
                          </div>
                          <div className="rounded-2xl bg-red-100 p-2 sm:p-3">
                            <p className="text-xl font-bold text-red-700 sm:text-2xl">{chain.missingItems}</p>
                            <p className="text-xs text-red-800">puuttuu</p>
                          </div>
                          <div className="rounded-2xl bg-yellow-100 p-2 sm:p-3">
                            <p className="text-xl font-bold text-yellow-700 sm:text-2xl">{chain.offerCount}</p>
                            <p className="text-xs text-yellow-800">tarjousta</p>
                          </div>
                        </div>

                        {chain.matches.length > 0 ? (
                          <div className="mt-4 max-w-full overflow-hidden rounded-2xl bg-slate-50 p-3">
                            <div className="mb-2">
                              <p className="text-xs font-bold uppercase text-slate-500">Tuotematchit</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">Status kertoo miksi tuote valittiin.</p>
                            </div>
                            <div className="space-y-2">
                              {chain.matches.map((match, index) => {
                                const isOwnBrandMatch =
                                  (chain.key === "k" && isKOwnBrandProduct(match.product.name)) ||
                                  (chain.key === "s" && hasAnyBrand(normalize(match.product.name), S_OWN_BRANDS));

                                return (
                                  <div key={`${chain.key}-${match.product.id}-${match.product.name}-${index}`} className="max-w-full overflow-hidden rounded-xl bg-white/70 p-2 text-sm">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="min-w-0 flex-1 truncate">{match.quantity} × {fixText(match.product.name)}</span>
                                      <span className="shrink-0 text-slate-500">{formatEuro(match.price * match.quantity)}</span>
                                    </div>

                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                          match.matchType === "ean"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {match.matchType === "ean" ? "Tarkka EAN-osuma" : "Vastaava tuote"}
                                      </span>

                                      {isOwnBrandMatch && (
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                                          {chain.key === "k" ? "Pirkka/K-Menu-vastine" : "S-oma merkki"}
                                        </span>
                                      )}

                                      {match.fallbackStoreName && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                                          Fallback-hinta
                                        </span>
                                      )}

                                      {formatComparisonPrice(match.product) && (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                                          {formatComparisonPrice(match.product)}
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => toggleAlternatives(getAlternativeKey(chain.key, match, index), chain.key, match)}
                                      className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
                                    >
                                      {expandedAlternatives[getAlternativeKey(chain.key, match, index)]
                                        ? "Piilota vaihtoehdot"
                                        : "Näytä vaihtoehdot"}
                                    </button>

                                    {/* =========================
                                      MOBILE ALTERNATIVES MODAL
                                      =========================
                                      Tämä käyttää mobile-first bottom sheet -renderöintiä.

                                      Tärkeää:
                                      - vain yksi modal näkyy kerrallaan
                                      - auto-close 12 s
                                      - renderöidään fixed-overlayna
                                      - mobiili priorisoitu
                                      ========================= */}
                                    {expandedAlternatives[getAlternativeKey(chain.key, match, index)] && (
                                      <div
                                        onPointerDown={() => startAlternativesAutoCloseTimer(getAlternativeKey(chain.key, match, index))}
                                        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-3 pb-3 pt-10 sm:items-center sm:p-4"
                                      >
                                        <div className="max-h-[82vh] w-full max-w-xl overflow-y-auto rounded-t-[1.75rem] bg-slate-50 p-3 text-[11px] text-slate-600 shadow-2xl ring-1 ring-slate-200 sm:rounded-[1.75rem]"><div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0 flex-1 overflow-hidden">
                                            <p className="font-extrabold text-slate-700">Vaihtoehdot tuotteelle</p>
                                            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">{fixText(match.product.name)}</p>
                                            <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                                              {getQualityModeLabel(getMatchQualityMode(match))}
                                            </p>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => closeAlternatives(getAlternativeKey(chain.key, match, index))}
                                            className="shrink-0 rounded-lg bg-slate-200 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-700 transition hover:bg-slate-300 active:scale-[0.98]"
                                            aria-label="Sulje vaihtoehtoikkuna"
                                          >
                                            Sulje
                                          </button>
                                        </div>

                                        <div className="mt-3 rounded-xl bg-white p-2 ring-1 ring-slate-100">
                                          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                                            Korvaustapa
                                          </p>
                                          <p className="mb-2 text-[10px] font-bold text-slate-400">
                                            Valitse korvaustapa ja vaihda tuote. Sulje-painike palauttaa kauppavertailuun.
                                          </p>
                                          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                                            {[
                                              ["cheapest", "💰 Halvin"],
                                              ["same_quality", "⭐ Sama taso"],
                                              ["own_brands", "🏷️ Omat"],
                                              ["keep_brands", "🔒 Brändi"],
                                            ].map(([mode, label]) => (
                                              <button
                                                key={`${chain.key}-${match.cartItemId || match.product.id}-${mode}`}
                                                type="button"
                                                onClick={() =>
                                                  setMatchQualityMode(
                                                    match,
                                                    mode as QualityMode,
                                                    getAlternativeKey(chain.key, match, index),
                                                    chain.key
                                                  )
                                                }
                                                className={`rounded-lg px-2 py-1.5 text-[10px] font-extrabold transition ${
                                                  getMatchQualityMode(match) === mode
                                                    ? "bg-green-600 text-white"
                                                    : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                                                }`}
                                              >
                                                {label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {loadingAlternatives[getAlternativeKey(chain.key, match, index)] && (
                                          <p className="mt-2 text-slate-500">Haetaan vaihtoehtoja...</p>
                                        )}

                                        {!loadingAlternatives[getAlternativeKey(chain.key, match, index)] &&
                                          (alternativeResults[getAlternativeKey(chain.key, match, index)] || []).length === 0 && (
                                          <p className="mt-2 text-slate-500">Ei löytynyt muita järkeviä vaihtoehtoja.</p>
                                        )}

                                        {getCheaperAlternatives(chain.key, match, index).length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              replaceMatchProduct(
                                                chain.key,
                                                match,
                                                getCheaperAlternatives(chain.key, match, index)[0],
                                                getAlternativeKey(chain.key, match, index)
                                              )
                                            }
                                            className="mt-2 w-full rounded-xl bg-green-600 px-3 py-2 text-xs font-extrabold text-white transition active:scale-[0.98]"
                                          >
                                            Korvaa halvimmalla · säästö {formatEuro(match.price - getProductPrice(getCheaperAlternatives(chain.key, match, index)[0]))}
                                          </button>
                                        )}

                                        <div className="mt-2 space-y-2">
                                          {(alternativeResults[getAlternativeKey(chain.key, match, index)] || []).map((alternative, alternativeIndex) => {
                                            const alternativePrice = getProductPrice(alternative);
                                            const priceDiff = alternativePrice - match.price;
                                            const isCurrentAlternative = isSameAlternativeAsMatch(match, alternative);
                                            const isRecommendedAlternative = alternativeIndex === 0 && !isCurrentAlternative;
                                            return (
                                              <div
                                                key={`${chain.key}-alt-${alternative.id}-${alternative.name}`}
                                                className={`rounded-xl bg-white p-3 ring-1 ${
                                                  isRecommendedAlternative
                                                    ? "ring-2 ring-green-300"
                                                    : "ring-slate-100"
                                                }`}
                                              >
                                                <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                                                  <div className="min-w-0 text-left">
                                                    <p className="font-bold leading-tight text-slate-800">
                                                      {fixText(alternative.name)}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                      {isRecommendedAlternative && (
                                                        <span className="rounded-full bg-green-100 px-2 py-0.5 font-extrabold text-green-700">
                                                          Suositus
                                                        </span>
                                                      )}
                                                      {isCurrentAlternative && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-extrabold text-slate-500">
                                                          Nykyinen valinta
                                                        </span>
                                                      )}
                                                      {formatComparisonPrice(alternative) && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
                                                          {formatComparisonPrice(alternative)}
                                                        </span>
                                                      )}
                                                      <span
                                                        className={`rounded-full px-2 py-0.5 font-extrabold ${
                                                          priceDiff <= 0
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-amber-100 text-amber-700"
                                                        }`}
                                                      >
                                                        {formatPriceDifference(match.price, alternativePrice)}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <div className="shrink-0 text-right">
                                                    <p className="font-extrabold text-green-700">{formatEuro(alternativePrice)}</p>
                                                    {isCurrentAlternative ? (
                                                      <span className="mt-2 inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-500">
                                                        Nykyinen
                                                      </span>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          replaceMatchProduct(
                                                            chain.key,
                                                            match,
                                                            alternative,
                                                            getAlternativeKey(chain.key, match, index)
                                                          )
                                                        }
                                                        className="mt-2 rounded-lg bg-green-600 px-2.5 py-1 text-[10px] font-extrabold text-white transition active:scale-[0.98]"
                                                      >
                                                        {getAlternativeActionText(match.price, alternativePrice)}
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        </div>
                                      </div>
                                    )}

                                    {match.fallbackStoreName && (
                                      <p className="mt-1 truncate text-[11px] font-semibold text-amber-600">
                                        fallback: {match.fallbackStoreName}
                                      </p>
                                    )}
                                    {match.product.ean && (
                                      <p className="mt-0.5 truncate text-[11px] text-slate-400">EAN: {match.product.ean}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl bg-white/70 p-3 text-sm text-slate-500">
                            {chain.comingSoon ? "Hintadata lisätään myöhemmin. Tämä ketju näkyy demossa roadmap-merkintänä." : "Ei vielä matchattuja tuotteita."}
                          </div>
                        )}

                        <div className="mt-auto pt-5">
                          <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-end gap-3 sm:grid-cols-[4rem_1fr]">
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-xl bg-white text-center text-2xl font-black shadow-sm sm:h-16 sm:w-16 ${
                                chain.key === "k"
                                  ? "text-red-600"
                                  : chain.key === "s"
                                  ? "text-green-700"
                                  : "text-slate-500"
                              }`}
                            >
                              {logoLabel}
                            </div>

                            <div className="min-w-0 text-center">
                              {isCheapest && (
                                <div className="mb-2 inline-block rounded-full bg-green-600 px-4 py-1 text-sm font-bold text-white">
                                  Halvin
                                </div>
                              )}
                              {!isComplete && !chain.comingSoon && (
                                <div className="mb-2 inline-block rounded-full bg-amber-500 px-4 py-1 text-sm font-bold text-white">
                                  Vajaa kori
                                </div>
                              )}
                              {chain.comingSoon && (
                                <div className="mb-2 inline-block rounded-full bg-slate-500 px-4 py-1 text-sm font-bold text-white">
                                  Tulossa myöhemmin
                                </div>
                              )}

                              <p className="max-w-full break-words text-3xl font-extrabold leading-none text-green-700 sm:whitespace-nowrap sm:text-4xl">
                                {chain.comingSoon ? "—" : chain.totalPrice > 0 ? formatEuro(chain.totalPrice) : "—"}
                              </p>
                              {!chain.comingSoon && <p className="text-sm text-green-700">oikea data</p>}
                              {chain.comingSoon && <p className="text-sm font-bold text-green-700">Tulossa myöhemmin</p>}
                            </div>
                          </div>

                          {!chain.comingSoon && chain.matches.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => void shareShoppingList(chain)}
                                className="rounded-xl bg-slate-900 px-3 py-3 text-sm font-extrabold text-white transition active:scale-[0.98]"
                              >
                                Jaa
                              </button>
                              <button
                                type="button"
                                onClick={() => void buyShoppingList(chain)}
                                className="rounded-xl bg-green-600 px-3 py-3 text-sm font-extrabold text-white transition active:scale-[0.98]"
                              >
                                Osta
                              </button>

                              <button
                                type="button"
                                disabled={!canOptimizeChain(chain) || optimizingChains[chain.key]}
                                onClick={() => void optimizeCart(chain)}
                                className={`col-span-2 rounded-xl px-3 py-3 text-sm font-extrabold transition ${
                                  canOptimizeChain(chain) && !optimizingChains[chain.key]
                                    ? "bg-emerald-700 text-white active:scale-[0.98]"
                                    : "cursor-not-allowed bg-slate-200 text-slate-500"
                                }`}
                              >
                                {getOptimizeCartLabel(chain)}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    


        {cartModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center overflow-hidden bg-slate-950/40 px-2 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-3 sm:items-start sm:p-6">
          <div className="max-h-[calc(100dvh-7rem)] w-full max-w-3xl overflow-y-auto overflow-x-hidden rounded-[1.5rem] bg-green-700 p-4 text-white shadow-2xl sm:max-h-none sm:rounded-[2rem] sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">Ostoskori ({cart.length}/{MAX_ITEMS})</h2>
                <p className="text-sm text-green-100">Ostoskorin tuotteille voi hakea tarjoukset ja vertailla normaalihintoja.</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCartAndCloseModal}
                    className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                  >
                    🗑 Tyhjennä kaikki
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeCartModal}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-800 transition active:scale-[0.98]"
                >
                  Sulje
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-green-100">Tämänhetkinen korihinta</p>
              <p className="text-4xl font-extrabold">{formatEuro(cartTotal)}</p>
              <p className="mt-1 text-xs font-bold text-green-100">Hintamerkinnät perustuvat tällä laitteella aiemmin nähtyihin hintoihin.</p>
            </div>

            {cart.length > 0 && (
              <div className="mb-4 rounded-2xl bg-white/10 p-4 text-white">
                <p className="text-xs font-black uppercase tracking-wide text-green-200">Tallenna ostoslista</p>
                <p className="mt-1 text-sm font-semibold text-green-50">Tallenna nykyinen kori myöhempää käyttöä varten.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={savedListName}
                    onChange={(event) => setSavedListName(event.target.value)}
                    placeholder="Esim. Viikko-ostos"
                    className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-green-300"
                  />
                  <button
                    type="button"
                    onClick={saveCurrentCartAsList}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-900 transition active:scale-[0.98]"
                  >
                    Tallenna lista
                  </button>
                </div>
              </div>
            )}

            {savedShoppingLists.length > 0 && (
              <div className="mb-4 rounded-2xl bg-white/10 p-4 text-white">
                <p className="text-xs font-black uppercase tracking-wide text-green-200">Tallennetut listat</p>
                <div className="mt-3 grid gap-2">
                  {savedShoppingLists.slice(0, 4).map((list) => (
                    <div key={list.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 p-2 ring-1 ring-white/10">
                      <button
                        type="button"
                        onClick={() => addSavedListToCart(list)}
                        className="min-w-0 flex-1 text-left transition active:scale-[0.99]"
                      >
                        <span className="block truncate text-sm font-extrabold">{list.name}</span>
                        <span className="block text-xs font-semibold text-green-100">{list.items.length} riviä · lisää ostoskoriin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedShoppingList(list.id)}
                        className="rounded-lg bg-white/10 px-2 py-1 text-xs font-black text-green-50 transition active:scale-[0.96]"
                      >
                        Poista
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div className="mb-4 rounded-[1.25rem] bg-slate-950 p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-green-300">Keräily kaupassa</p>
                    <h3 className="mt-1 text-xl font-black">{cheapest?.storeName || "Muistilista"}</h3>
                    <p className="mt-1 text-sm font-bold text-slate-300">
                      {checkedCount}/{shoppingListCount} ostosta kerätty{cheapest ? ` · kori ${formatEuro(cheapest.totalPrice)}` : " · ei hintavertailussa"}
                      {checkedCount === shoppingListCount && shoppingListCount > 0 && (
                        <span className="mt-2 block rounded-xl bg-green-500 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-950">
                          ✓ Valmis kassalle
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-green-500 px-3 py-2 text-sm font-black text-slate-950">
                    {shoppingProgressPercent} %
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all"
                    style={{ width: `${shoppingProgressPercent}%` }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={markAllShoppingListItemsChecked}
                    disabled={shoppingListCount === 0 || checkedCount === shoppingListCount}
                    className="rounded-xl bg-green-400 px-3 py-2 text-xs font-black text-slate-950 transition active:scale-[0.98] disabled:opacity-50"
                  >
                    Kaikki kerätty
                  </button>
                  <button
                    type="button"
                    onClick={clearShoppingListChecks}
                    disabled={checkedCount === 0}
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition active:scale-[0.98] disabled:opacity-50"
                  >
                    Nollaa keräily
                  </button>
                </div>

                <p className="mt-3 text-center text-xs font-bold text-slate-400">
                  Merkitse tuote kerätyksi, kun olet poiminut sen hyllystä. Merkinnät säilyvät sivun päivityksen jälkeen.
                </p>

                <div className="mt-4 max-h-[46vh] space-y-4 overflow-auto pr-1">
                  {(Object.entries(bestShoppingListGroups) as [string, Match[]][]).map(([category, matches]) => (
                    <div key={category}>
                      <p className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-400"><span>{category}</span><span>{matches.filter((match, index) => checkedCartItems[getShoppingListItemKey(match, index)]).length}/{matches.length}</span></p>
                      <div className="space-y-2">
                        {matches.map((match, index) => {
                          const key = getShoppingListItemKey(match, index);
                          const checked = Boolean(checkedCartItems[key]);

                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleShoppingListItem(match, index)}
                              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.99] ${
                                checked ? "bg-green-500/20 text-slate-300" : "bg-white/10 text-white"
                              }`}
                            >
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                                checked ? "border-green-300 bg-green-400 text-slate-950" : "border-white/30"
                              }`}>
                                {checked ? "✓" : ""}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`line-clamp-2 text-sm font-black leading-tight ${checked ? "line-through opacity-70" : ""}`}>
                                  {match.quantity} × {fixText(match.product.name)}
                                </p>
                                <p className="mt-1 text-xs font-bold text-slate-400">{match.price > 0 ? formatEuro(match.price * match.quantity) : "Muistilista · ei hintaa"}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="rounded-2xl bg-white/10 p-4 text-green-50">Lisää tuotteita hausta, tarjouksista, EAN-haulla tai muistilistana.</div>
            ) : (
              <div className="grid gap-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-2xl bg-white p-3 text-slate-950 sm:p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden">
                      {item.image && <img src={item.image} alt={item.name} className="h-14 w-14 shrink-0 object-contain" />}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="line-clamp-2 break-words font-bold leading-tight">{item.name}</p>
                        <p className="min-w-0 break-words text-sm text-slate-500">{item.storeName ? `${item.storeName} · ${item.chain}` : "Muistilistarivi · ei mukana hintavertailussa"}</p>
                        {item.price ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-green-700">{item.quantity} × {formatEuro(item.price)} = {formatEuro(item.price * item.quantity)}</p>
                            {renderPriceHistoryBadge(getPriceHistoryKeyFromCartItem(item), item.price)}
                          </div>
                        ) : <p className="text-sm font-bold text-slate-500">Ei hintaa · mukana vain keräilyssä</p>}
                      </div>
                    </div>

                    <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                      <div className="col-span-2 flex items-center justify-center rounded-xl bg-slate-100 p-1 sm:col-span-1 sm:justify-start">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.id, -1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl font-black text-slate-700 shadow-sm transition active:scale-[0.94]"
                          aria-label={item.quantity <= 1 ? `Poista ${item.name} ostoskorista` : `Vähennä tuotteen ${item.name} määrää`}
                          title={item.quantity <= 1 ? "Poista korista" : "Vähennä määrää"}
                        >
                          −
                        </button>
                        <span className="min-w-12 px-2 text-center text-lg font-extrabold" aria-label={`Määrä ${item.quantity}`}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.id, 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-xl font-black text-white shadow-sm transition active:scale-[0.94]"
                          aria-label={`Lisää tuotteen ${item.name} määrää`}
                          title="Lisää määrää"
                        >
                          +
                        </button>
                      </div>
                      <button onClick={() => searchOffers(item.name)} className="rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-700">🔥 Tarjoukset</button>
                      <button onClick={() => searchNormalPrices(item.name)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">🛒 Hintavertailu</button>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                        className="col-span-2 rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-700 transition active:scale-[0.98] sm:col-span-1"
                        aria-label={`Poista ${item.name} ostoskorista`}
                      >
                        🗑 Poista
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {searchPanelOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-slate-950/40 p-3 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:items-start sm:p-6">
          <div className="w-full max-w-3xl">
          <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-sm sm:max-h-none sm:rounded-[2rem] sm:p-6">
            <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
              <h1 className="text-xl font-extrabold sm:text-2xl">Mitä haluat ostaa halvemmalla?</h1>
              <button
                type="button"
                onClick={closeSearchPanel}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700 transition active:scale-[0.98]"
              >
                Sulje
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => startVoiceInput()}
                className={`touch-manipulation rounded-2xl px-4 py-4 text-sm font-extrabold text-white transition active:scale-[0.98] ${
                  isListening
                    ? "bg-red-600"
                    : speechSupported
                    ? "bg-blue-600"
                    : "bg-slate-500"
                }`}
              >
                {isListening ? "🎙️ Kuunnellaan..." : "🎤 Sanele haku"}
              </button>

              <button
                type="button"
                onClick={openEanModal}
                className="touch-manipulation rounded-2xl bg-emerald-700 px-4 py-4 text-sm font-extrabold text-white transition active:scale-[0.98]"
              >
                ▦ EAN / viivakoodi
              </button>
            </div>

            <textarea
              ref={searchInputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={"Kirjoita esim. maito,kahvi,jauheliha\nTai liitä muistilista pilkulla tai riveittäin, max 8 tuotetta"}
              className="h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-green-600 sm:h-32"
            />

            {terms.length > 0 && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Jäljellä haussa</p>
                  <p className="text-xs font-semibold text-slate-400">{terms.length} / {MAX_ITEMS}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {terms.map((term) => (
                    <span
                      key={term}
                      className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {savedShoppingLists.length > 0 && (
              <div className="mt-3 grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Tallennetut listat</p>
                  <div className="mt-2 grid gap-2">
                    {savedShoppingLists.slice(0, 4).map((list) => (
                      <div key={list.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2 ring-1 ring-slate-200">
                        <button
                          type="button"
                          onClick={() => addSavedListToCart(list)}
                          className="min-w-0 flex-1 text-left transition active:scale-[0.99]"
                        >
                          <span className="block truncate text-sm font-extrabold text-slate-800">{list.name}</span>
                          <span className="block text-xs font-semibold text-slate-500">{list.items.length} riviä · lisää koriin</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedShoppingList(list.id)}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-500 transition active:scale-[0.96]"
                          aria-label={`Poista tallennettu lista ${list.name}`}
                        >
                          Poista
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isShoppingListReady && (
              <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
                <p className="text-base font-extrabold">✅ Ostoskori valmis</p>
                <p className="mt-1 text-sm font-semibold text-green-800">
                  Kaikki hakusanat on käsitelty. Seuraavaksi voit vertailla kauppaketjut.
                </p>
                <button
                  type="button"
                  onClick={openComparisonView}
                  className="mt-3 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-extrabold text-white transition active:scale-[0.98] sm:w-auto"
                >
                  Vertaa kauppaketjut
                </button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <button type="button" onClick={handleMainOfferSearch} className="touch-manipulation rounded-xl bg-green-600 px-3 py-3 text-sm font-bold text-white transition active:scale-[0.98] sm:px-5 sm:text-base">
                {loadingOffers ? "Haetaan..." : "🔥 Tarjoukset"}
              </button>
              <button type="button" onClick={handleMainNormalSearch} className="touch-manipulation rounded-xl bg-green-600 px-3 py-3 text-sm font-bold text-white transition active:scale-[0.98] sm:px-5 sm:text-base">
                {loadingNormal ? "Haetaan..." : "🛒 Hintavertailu"}
              </button>
              <button onClick={addInputToCart} className="touch-manipulation rounded-xl bg-slate-900 px-3 py-3 text-sm font-bold text-white transition active:scale-[0.98] sm:px-5 sm:text-base">
                Lisää muistilistana
              </button>
              <button onClick={showCart} className="touch-manipulation rounded-xl bg-slate-900 px-3 py-3 text-sm font-bold text-white transition active:scale-[0.98] sm:px-5 sm:text-base">
                Näytä ostoskori ({cart.length})
              </button>
            
              </div>

            <p className="mt-3 text-sm text-slate-500">Kirjoita muistilistaksi esim. maito,kahvi,banaani. Hintavertailu hakee hintoja, Lisää muistilistana lisää rivit ilman hintaa keräilyyn.</p>
          </div>

          </div>
        </div>
      )}

      {eanModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-3 pb-3 pt-10 sm:items-center sm:p-4">
            <div className="w-[min(94vw,34rem)] rounded-[1.5rem] bg-white p-4 shadow-2xl ring-1 ring-slate-200 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold text-slate-900">EAN / viivakoodi</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Syötä tai liitä EAN-numero. Haku käynnistyy automaattisesti ja yksi tarkka osuma lisätään ostoskoriin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEanModal}
                  className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
                >
                  Sulje
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  ref={eanInputRef}
                  value={eanInput}
                  onChange={(event) => setEanInput(event.target.value.replace(/\D/g, ""))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void searchByEan();
                  }}
                  inputMode="numeric"
                  placeholder="Syötä EAN, esim. 641..."
                  className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-base font-bold tracking-wide outline-none transition focus:border-green-600"
                  onPaste={(event) => {
                    const pastedText = event.clipboardData.getData("text");
                    const code = normalizeEan(pastedText);

                    if (!isUsableEan(code)) return;

                    event.preventDefault();

                    if (eanAutoSearchTimeoutRef.current) {
                      window.clearTimeout(eanAutoSearchTimeoutRef.current);
                      eanAutoSearchTimeoutRef.current = null;
                    }

                    setEanInput(code);
                    setLastAutoEanSearch(code);
                    setEanSearchStartedAutomatically(true);
                    eanAutoSearchActiveRef.current = true;
                    setEanMessage(`Liitetty koodi: ${code}. Haetaan...`);
                    void searchByEan(code);
                  }}
                />
                <button
                  type="button"
                  onClick={clearEanSearch}
                  disabled={!eanInput && eanResults.length === 0 && !eanMessage}
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700 transition active:scale-[0.98] disabled:opacity-40"
                >
                  Tyhjennä
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void startEanCameraScanner()}
                  className="touch-manipulation rounded-2xl bg-green-600 px-4 py-3 text-sm font-extrabold text-white transition active:scale-[0.98]"
                >
                  📷 Skannaa viivakoodi
                </button>
                {eanScannerOpen && (
                  <button
                    type="button"
                    onClick={stopEanCameraScanner}
                    className="touch-manipulation rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition active:scale-[0.98]"
                  >
                    Sulje kamera
                  </button>
                )}
              </div>

              {eanScannerMessage && (
                <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
                  {eanScannerMessage}
                </div>
              )}

              {eanScannerOpen && (
                <div className="mt-3 overflow-hidden rounded-2xl bg-slate-950 p-2 ring-1 ring-slate-200">
                  <div className="relative mx-auto h-[min(78vw,360px)] max-h-[360px] min-h-[260px] w-full max-w-[360px] overflow-hidden rounded-xl bg-slate-950">
                    <div
                      id={EAN_SCANNER_REGION_ID}
                      className="h-full w-full overflow-hidden rounded-xl bg-slate-950 [&_canvas]:!hidden [&_video]:!h-full [&_video]:!w-full [&_video]:rounded-xl [&_video]:object-cover"
                    />
                    <div className="pointer-events-none absolute inset-5 rounded-2xl border-4 border-green-400 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]">
                      <div className="absolute -left-1 -top-1 h-5 w-5 rounded-tl-2xl border-l-4 border-t-4 border-white/90" />
                      <div className="absolute -right-1 -top-1 h-5 w-5 rounded-tr-2xl border-r-4 border-t-4 border-white/90" />
                      <div className="absolute -bottom-1 -left-1 h-5 w-5 rounded-bl-2xl border-b-4 border-l-4 border-white/90" />
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-br-2xl border-b-4 border-r-4 border-white/90" />
                    </div>

                    {eanLoading && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-700/45 backdrop-blur-[1px]">
                        <div className="flex flex-col items-center gap-3 rounded-3xl bg-slate-900/80 px-6 py-5 text-white shadow-2xl ring-2 ring-white/20">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-4xl font-black animate-pulse">
                            ⏳
                          </div>
                          <div className="text-sm font-black uppercase tracking-[0.22em] text-white/90">
                            Haetaan
                          </div>
                        </div>
                      </div>
                    )}

                    {scanSuccessFlash && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-green-400/35 backdrop-brightness-125 transition-opacity duration-700">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500 text-5xl font-black text-white shadow-2xl ring-4 ring-white/80 animate-pulse">
                          ✓
                        </div>
                        <div className="absolute bottom-5 rounded-full bg-green-600 px-4 py-2 text-sm font-black text-white shadow-xl ring-2 ring-white/70">
                          Lisätty koriin
                        </div>
                      </div>
                    )}

                    {scanMissFlash && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-red-500/35 backdrop-brightness-90 transition-opacity duration-700">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-5xl font-black text-white shadow-2xl ring-4 ring-white/80 animate-pulse">
                          ?
                        </div>
                        <div className="absolute bottom-5 rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white shadow-xl ring-2 ring-white/70">
                          Ei löytynyt
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 rounded-xl border border-green-400/50 bg-green-500/10 p-2 text-center text-xs font-extrabold text-green-100">
                    Aseta viivakoodi vihreän kehyksen sisään. Käännä puhelinta tarvittaessa; maitopurkin pystyviivakoodi toimii parhaiten läheltä ja hyvässä valossa.
                  </div>
                </div>
              )}

              {eanMessage && !eanSearchStartedAutomatically && (
                <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
                  {eanMessage}
                </div>
              )}

              {eanResults.length > 0 && !eanSearchStartedAutomatically && (
                <div className="mt-4 grid gap-2">
                  {eanResults.map((result) => (
                    <div key={result.key} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {result.product.pictureUrl && (
                          <img src={result.product.pictureUrl} alt={result.product.name} className="h-14 w-14 shrink-0 rounded-xl object-contain" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-extrabold leading-tight text-slate-900">
                            {fixText(result.product.name)}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                              {result.storeName}
                            </span>
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-extrabold text-green-700">
                              Tarkka EAN-osuma
                            </span>
                            {result.product.ean && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                                EAN {result.product.ean}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black text-green-700">
                              {formatEuro(getProductPrice(result.product))}
                            </p>
                            {renderPriceHistoryBadge(getPriceHistoryKeyFromProduct(result.product, result.storeName, result.chain), getProductPrice(result.product))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addEanResultToCart(result)}
                          className="shrink-0 rounded-xl bg-green-600 px-3 py-2 text-sm font-extrabold text-white transition active:scale-[0.98]"
                        >
                          Lisää ostoskoriin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      {cheapest && !cartModalOpen && !searchPanelOpen && !eanModalOpen && activeResult !== "compare" && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-2 right-2 z-40 mx-auto max-w-3xl rounded-[1.2rem] bg-slate-950/95 p-2.5 text-white shadow-2xl sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-green-300">Halvin täysi kori</p>
              <p className="truncate text-sm font-black">{cheapest.storeName}</p>
              {secondCheapest && savings > 0 && (
                <p className="text-[11px] font-bold text-green-200">Säästö {formatEuro(savings)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={openShoppingListForCheapest}
              className="shrink-0 rounded-2xl bg-green-500 px-4 py-3 text-sm font-black text-slate-950"
            >
              {formatEuro(cheapest.totalPrice)}
            </button>
          </div>
        </div>
      )}



      {lastCartToast && (
        <div className="fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] mx-auto max-w-md animate-[ziiplyFade_2.6s_ease-in-out] rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white shadow-2xl sm:hidden">
          ✓ {lastCartToast}
        </div>
      )}

      {lastSavingsToast && (
        <div className="mx-auto mb-4 max-w-md rounded-2xl bg-green-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg">
          💰 {lastSavingsToast}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-2 sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2 rounded-[1.6rem] border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur">
          <button
            type="button"
            onClick={toggleSearchPanel}
            className={`flex flex-col items-center justify-center rounded-[1.25rem] px-2 py-2.5 text-xs font-black transition active:scale-[0.98] ${searchPanelOpen ? "bg-green-600 text-white shadow-md" : "text-slate-700 active:bg-slate-100"}`}
          >
            <span className="text-lg leading-none">🔎</span>
            <span className="mt-1 block">Hae</span>
          </button>
          <button
            type="button"
            onClick={toggleCartModal}
            className={`relative flex flex-col items-center justify-center rounded-[1.25rem] px-2 py-2.5 text-xs font-black transition active:scale-[0.98] ${cartModalOpen ? "bg-green-600 text-white shadow-md" : "text-slate-700 active:bg-slate-100"}`}
          >
            <span className="text-lg leading-none">🛒</span>
            <span className="mt-1 block">Kori</span>
            {cart.length > 0 && (
              <span className={`absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black ${cartModalOpen ? "bg-white text-green-700" : "bg-green-600 text-white"}`}>
                {cart.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={toggleComparisonView}
            className={`flex flex-col items-center justify-center rounded-[1.25rem] px-2 py-2.5 text-xs font-black transition active:scale-[0.98] ${activeResult === "compare" && !searchPanelOpen && !cartModalOpen ? "bg-green-600 text-white shadow-md" : "text-slate-700 active:bg-slate-100"}`}
          >
            <span className="text-lg leading-none">⚖️</span>
            <span className="mt-1 block">Vertailu</span>
          </button>
        </div>
      </nav>



      <style>{`
        @keyframes ziiplyFade {
          0% { opacity: 0; transform: translateY(10px); }
          12% { opacity: 1; transform: translateY(0); }
          82% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(8px); }
        }
      `}</style>

</main>
  );
}

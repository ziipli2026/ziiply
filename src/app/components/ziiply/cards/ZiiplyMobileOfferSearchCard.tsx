// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V55_K_EMPTY_STATE_FIX
// Revision: V55-K-EMPTY-STATE-FIX
// Date: 2026-09-21
//
// Muutos V54:ään:
// - K-ryhmän 0-tuloksen ilmoitus ei enää viittaa S-kaupat.fi-palveluun.
// - S-ryhmän nykyinen S-kaupat.fi-ilmoitus säilyy ennallaan.
// - Ei muuta provider-, haku-, store-, category-, dedupe- tai debug-logiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V54_KRUOKA_PIPELINE_DEBUG_PROP
// Revision: V54-KRUOKA-PIPELINE-DEBUG-PROP
// Date: 2026-09-21
//
// Muutos V53:een:
// - Lisää kruokaDebug-propin nykyiseen pieneen DBG-overlayhin.
// - K-Ruoka pipeline-debug kulkee erillisenä datana, ei tarjousrivinä.
// - DBG-painike pysyy V53:n minimikokoisena.
// - Ei muuta haku-, store-, category-, dedupe- tai S/K-logiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V53_MINI_DEBUG_BUTTON
// Revision: V53-MINI-DEBUG-BUTTON
// Date: 2026-09-21
//
// Muutos V52:een:
// - Pienentää debugin avauspainikkeen mahdollisimman huomaamattomaksi DBG-napiksi.
// - Varsinainen debug-overlay ja KOPIOI DEBUG säilyvät ennallaan.
// - Ei muuta haku-, provider-, store-, category-, dedupe- tai S/K-logiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V52_DEBUG_OVERLAY_RESTORED
// Revision: V52-DEBUG-OVERLAY-RESTORED
// Date: 2026-09-21
//
// Muutos V49:ään:
// - Poistaa väliaikaisen BUILD CHECK 1 -deployment-markerin.
// - Palauttaa S-ryhmän korjauksessa käytetyn DEBUG · AVAA TÄSTÄ -ikkunan.
// - Debug toimii sekä S- että K-ryhmän valinnan jälkeen.
// - KOPIOI DEBUG kopioi Cardille saapuvan query/filter/loading/store/categoryCounts/rawItems-datan.
// - Ei muuta haku-, provider-, store-, category-, dedupe- tai S/K-logiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V49_K_CHAIN_ENABLED
// Revision: V49-K-CHAIN-ENABLED
// Date: 2026-09-20
//
// Muutos V48:aan:
// - K-ryhmän porttinappi on valittavissa ja kutsuu onSelectOfferChain("K").
// - Ei muuta tarjoushakua, kategorioita, tyhjän tuloksen käsittelyä tai S-puolta.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V48_RESTORE_EMPTY_STATE
// Revision: V48-RESTORE-EMPTY-STATE
// Date: 2026-09-20
//
// Korjaus V47:ään:
// - Palauttaa V46:ssa jo olleen 0-tuloksen S-kaupat.fi-ilmoituksen landing-näkymään.
// - Palauttaa selectedStoreName-propin, jotta valitun kaupan nimi säilyy myös 0-tuloksella.
// - V47:n kompakti kategoriapalkki, tekstit ja asettelu säilyvät ennallaan.
// - Ei muuta provider-, resolver-, haku-, category/count-, dedupe-, store- tai S/K-logiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V47_COMPACT_CATEGORY_LAYOUT
// Revision: V47-COMPACT-CATEGORY-LAYOUT
// Date: 2026-09-20
//
// Muutos nykyiseen V46-versioon:
// - Poistaa landing-näkymästä Tarjoushaku-otsikon alta oletustekstin
//   "Tarjoukset tuoteryhmittäin"; Tarjoushaku jää näkyviin.
// - Säilyttää kaupan nimen sekä vanhahtavan kauppatekstin ennallaan.
// - Poistaa landing-näkymästä ruskean Gösta-selitetekstin
//   "Valitse tuoteryhmä alta. Gösta näyttää vain valitun kaupan tarjoukset.".
// - Nostaa kauppapalkkia ja kategoriaruudukkoa vapautuneeseen pystysuuntaiseen tilaan.
// - Kategoriapainikkeissa ikoni siirretty vasemmalle omaan kapeaan sarakkeeseensa,
//   jotta nimelle + tarjousmäärälle jää mahdollisimman paljon vaakasuuntaista tilaa.
// - Näkyvä "Liha & makkarat" -> "Liha&makkara"; sisäinen category-arvo ei muutu.
// - Kategoriapainikkeet ovat normaalisti saman matalan korkeuden; pitkä nimi saa
//   rivittyä vain silloin, kun se ei oikeasti mahdu yhdelle riville.
// - Ei muuta haku-, provider-, category/count-, dedupe-, store- tai S/K-porttilogiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V44_COMPACT_FIXED_STORE_HEADING
// Revision: V44-COMPACT-FIXED-STORE-HEADING
// Date: 2026-09-20
//
// Muutos V43:een:
// - Kiinteä kaupparuutu levennetty headerin koko sisällön levyiseksi.
// - Kaupan nimi ja vanhahtava tarjousteksti pidetään kumpikin yhdellä rivillä.
// - Ruutua nostettu ja pystypaddingia pienennetty, jotta kategoriat alkavat ylempää.
// - Ei muuta haku-, provider-, kategoria- tai S/K-porttilogiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V43_DEBUG_UI_REMOVED
// Revision: V43-DEBUG-UI-REMOVED
// Date: 2026-09-20
//
// Muutos V42:een:
// - Poistaa kortin näkyvän DEBUG · AVAA TÄSTÄ -painikkeen sekä debug-overlayn.
// - Palauttaa normaalin otsikon näkyviin myös S-ryhmän valinnan jälkeen.
// - Ei muuta haku-, provider-, kategoria-, S/K-portti- tai kauppaotsikkologiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V42_FIXED_STORE_HEADING
// Revision: V42-FIXED-STORE-HEADING
// Date: 2026-09-20
//
// Muutos V41:een:
// - Valitun kaupan nimi ja vanhahtava tarjousteksti siirretty scrollaavan <main>-alueen
//   ulkopuolelle kiinteään headeriin, joten ne pysyvät näkyvissä kategorioita selattaessa.
// - Prisma: "Valitsemasi kauppahuoneen huojennetut hinnat ja tarjoukset".
// - S-market / Alepa / Sale: "Valitsemasi lähipuodin huojennetut hinnat ja tarjoukset".
// - Ei muuta haku-, provider-, kategoria-, S/K-portti- tai debug-logiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V41_SELECTED_STORE_HEADING
// Revision: V41-SELECTED-STORE-HEADING
// Date: 2026-09-20
//
// Muutos V40:een:
// - Näyttää valitun kaupan nimen tuoteryhmälistan yläpuolella.
// - Prisma: "Valitsemasi kauppahuoneen huojennetut hinnat ja tarjoukset".
// - S-market / Alepa / Sale: "Valitsemasi lähipuodin huojennetut hinnat ja tarjoukset".
// - Kaupan nimi poimitaan jo ladatun tarjousdatan oikeasta storeName-kentästä;
//   debug-rivit ohitetaan. Ei muuta haku-, provider-, kategoria- tai S/K-logiikkaa.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V40_CHAIN_GATE_DEBUG_RESTORED
// Revision: V40-CHAIN-GATE-DEBUG-RESTORED
// Date: 2026-09-20
//
// Muutos V39:ään:
// - Palauttaa näkyvän DEBUG / KOPIOI DEBUG -näkymän S-ryhmän diagnostiikkaa varten.
// - Debug-painike näkyy vasta S-ryhmän valinnan jälkeen.
// - S/K-portti säilyy: S toimii, K pysyy harmaana ja disabled.
// - Ei muuta provideria, hakulogiikkaa, kategorioita tai normaalia tuotehakua.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V39_CHAIN_GATE_K_DISABLED
// Revision: V39-CHAIN-GATE-K-DISABLED
// Date: 2026-09-20
//
// Muutos:
// - Göstan avautuessa käyttäjä valitsee ensin S- tai K-ryhmän.
// - S-ryhmän valinta avaa nykyisen tarjoushaun ja käynnistää parentin nykyisen S-haun.
// - K-ryhmän logo näkyy harmaana ja on disabled; K-hakua ei käynnistetä.
// - Käyttää olemassa olevia /storelogos/s-group.png ja /storelogos/k-group.png -grafiikoita.
// - Näkyvä DEBUG/KOPIOI DEBUG -käyttöliittymä poistettu.
// - V38:n kategoriat, V37:n EAN-dedupe ja muu tarjouskortin toiminta säilyvät.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V38_CATEGORY_DISPLAY_LABEL_FIX_DEBUG
// Revision: V38-CATEGORY-DISPLAY-LABEL-FIX-DEBUG
// Date: 2026-09-20
//
// V38:
// - Päivittää OfferSearchCardin näkyvän pääkategorianimen:
//   "Leipomo" -> "Leivät & leivonnaiset".
// - Muutos on vain näyttönimessä: sisäinen category/filter-arvo säilyy "Leipomo".
// - Näin SearchCore V173:n juuri korjattu category gate, categoryOfferCounts,
//   aliaslogiikka ja CategoryCore V168 eivät muutu.
// - V37 EAN-dedupekorjaus sekä DEBUG / KOPIOI DEBUG säilyvät ennallaan.
// - Muut nykyiset pääkategorianimet säilyvät, koska niille ei löytynyt vastaavaa
//   ristiriitaa nykyisen Card/CategoryCore-rakenteen välillä.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V37_SOURCE_EAN_DEDUPE_FIX_DEBUG
// Revision: V37-SOURCE-EAN-DEDUPE-FIX-DEBUG
// Date: 2026-09-19
//
// Korjaus:
// - Cardille mapatun itemin EAN ei ole top-level item.ean-kentässä, vaan
//   __sourceOfferSearchResult.ean-kentässä.
// - Dedupe lukee EANin nyt sekä top-levelistä että source-objektista.
// - EAN-tuotteet deduplikoidaan vain EANilla.
// - root+hinta-fallback vain aidosti EANittomille tuotteille.
// - DEBUG / KOPIOI DEBUG säilyy.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V36_EAN_DEDUPE_FIX_DEBUG
// Revision: V36-EAN-DEDUPE-FIX-DEBUG
// Date: 2026-09-19
//
// Korjaus:
// - Cardin oma dedupe ei enää yhdistä eri EAN-tuotteita root+hinta-avaimella.
// - Jos EAN on olemassa, dedupe tehdään vain EANilla.
// - root+hinta-fallback säilyy vain tuotteille, joilta EAN puuttuu.
// - DEBUG / KOPIOI DEBUG säilyy ennallaan.
// - Ei muita toiminnallisia muutoksia.
// ============================================================================

"use client";

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V35_CATEGORY_LABELS_DEBUG
// Revision: V35
// Date: 2026-09-19
// - Muuttaa näkyvän Kahvi-kategorian nimeksi "Kahvi & tee".
// - Muuttaa näkyvän Liha-kategorian nimeksi "Liha & makkarat".
// - Säilyttää aliasyhteensopivuuden vanhoihin Kahvi/Liha categoryOfferCounts-arvoihin.
// - Säilyttää koko DEBUG-overlayn ja KOPIOI DEBUG -toiminnon ennallaan.
// ============================================================================

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V34_EXPANDED_CATEGORIES_DEBUG_RESTORED
// Revision: V34
// Date: 2026-09-19
// - Säilyttää koko aiemman DEBUG-overlayn ja KOPIOI DEBUG -toiminnon.
// - Lisää uudet tarjouskategoriat ja niiden näyttöjärjestyksen.
// - DEBUG tarvitaan categoryOfferCounts/rawItems-luokittelun tarkistamiseen.
// Date: 2026-07-12
// Debug avataan suoraan aina näkyvästä Tarjoushaku-otsikosta.
// Lisätty mobiilissa toimiva KOPIOI DEBUG -painike koko JSON-datalle.
// ============================================================================

// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V2_GOSTA_FILTER_AND_CATEGORIES
// Pohjana V1.
// - Göstan kortilla on oma hakukenttä/tuoteryhmärajaus.
// - Tyhjä Gösta-haku tarkoittaa: näytä alueen kaikki tarjoukset.
// - Tuoteryhmächipit helpottavat selaamista ilman käyttäjän arvauksia.
// - Page hoitaa varsinaisen haun ja roskaosumien suodatuksen; kortti vain renderöi annetut tarjoukset.

import React from "react";

export type ZiiplyMobileOfferSearchItem = {
  id?: string | number;
  ean?: string | number;
  name?: string;
  title?: string;
  productName?: string;
  brandName?: string;
  storeName?: string;
  shopName?: string;
  chain?: string;
  category?: string;
  price?: number | string;
  offerPrice?: number | string;
  normalPrice?: number | string;
  originalPrice?: number | string;
  savings?: number | string;
  discountText?: string;
  image?: string;
  imageUrl?: string;
  pictureUrl?: string;
  comparisonPrice?: string | number | null;
  comparisonPriceText?: string | number | null;
  unitPrice?: string | number | null;
  comparisonUnit?: string;
  [key: string]: any;
};

export type ZiiplyMobileOfferSearchCardProps = {
  open?: boolean;
  title?: string;
  subtitle?: string;
  query?: string;
  filter?: string;
  offers?: ZiiplyMobileOfferSearchItem[];
  results?: ZiiplyMobileOfferSearchItem[];
  loading?: boolean;
  emptyText?: string;
  selectedStoreName?: string;
  storeTraceV787?: unknown;
  kruokaDebug?: {
    deploy?: {
      gitCommitSha?: string | null;
      gitCommitRef?: string | null;
      vercelEnv?: string | null;
      deploymentId?: string | null;
    };
    requestContext?: {
      rawKStoreId?: string | null;
      rawKStoreName?: string | null;
      kStoreIds?: string[];
      kStoreNames?: string[];
    };
    selectedStoreName?: string;
    selectedStoreId?: string;
    resolvedTjekStoreId?: string | null;
    brochureUrl?: string;
    brochureHttp?: number | null;
    applicationState?: string;
    kStoreId?: string | null;
    brochureOffers?: number | null;
    eans?: number | null;
    productMapHttp?: number | null;
    productMapProducts?: number | null;
    activeOffers?: number | null;
    error?: string | null;
    kSupermarketPublicationResolverDebug?: unknown;
  } | null;
  contentTab?: "offers" | "campaigns";
  onContentTabChange?: (tab: "offers" | "campaigns") => void;
  hasCampaigns?: boolean;
  categorySuggestions?: string[];
  categoryOfferCounts?: Record<string, number | null | undefined>;
  testedEmptyCategories?: Record<string, boolean | undefined>;
  onFilterChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onSelectOfferChain?: (chain: "S" | "K" | "EUROSPAR" | "LIDL" | "TOKMANNI") => void;
  showSChain?: boolean;
  showKChain?: boolean;
  showLidlChain?: boolean;
  showEurosparChain?: boolean;
  showTokmanniChain?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onAddOffer?: (offer: ZiiplyMobileOfferSearchItem) => void;
  onAddAllOffers?: (offers: ZiiplyMobileOfferSearchItem[]) => void;
  className?: string;
};

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizePrice(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    return `${price.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  const text = String(price ?? "").trim();
  if (!text) return "";

  const numeric = Number(
    text.replace(/\s/g, "").replace("€", "").replace(",", "."),
  );

  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  return text.includes("€") ? text : `${text} €`;
}

function getNumericPrice(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    return price;
  }

  const numeric = Number(
    String(price ?? "")
      .replace(/\s/g, "")
      .replace("€", "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );

  return Number.isFinite(numeric) ? numeric : 0;
}

function getOfferName(offer: ZiiplyMobileOfferSearchItem) {
  return String(offer.name || offer.title || offer.productName || offer.brandName || "Tarjoustuote");
}

function splitOfferNameComparisonPrice(name: string) {
  const match = name.match(/\s*(\((?:\d+[,.]\d+)(?:\s*[–-]\s*\d+[,.]\d+)?\s*\/\s*(?:kg|l|kpl)\))\s*$/i);
  if (!match || match.index == null) return { productName: name, embeddedComparisonPrice: "" };
  return {
    productName: name.slice(0, match.index).trim(),
    embeddedComparisonPrice: match[1].replace(/\s*\/\s*/g, "/"),
  };
}

function getStoreName(offer: ZiiplyMobileOfferSearchItem) {
  return String(offer.storeName || offer.shopName || offer.chain || "Kauppa");
}

function normalizeOfferCardKeyV13(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getOfferCardTitleRootV13(offer: ZiiplyMobileOfferSearchItem) {
  const stopWords = new Set([
    "snellman",
    "snellmanin",
    "atria",
    "hk",
    "kotimaista",
    "pirkka",
    "rainbow",
    "xtra",
    "coop",
    "nopea",
    "ohut",
    "murea",
    "suikale",
    "pala",
    "viipale",
    "marinoitu",
    "maustettu",
    "grilli",
    "grillattu",
    "pakkaus",
    "rasia",
    "tuore",
    "tuotettu",
    "suomi",
    "suomalainen",
    "kg",
    "g",
  ]);

  const normalized = normalizeOfferCardKeyV13(getOfferName(offer))
    .replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g, " ")
    .replace(/\b\d+\s*x\s*\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  return words.slice(0, 2).join(" ");
}

function getOfferCardDedupeKeyV13(offer: ZiiplyMobileOfferSearchItem) {
  const source = (offer as any)?.__sourceOfferSearchResult || offer;
  const ean = normalizeOfferCardKeyV13(
    (offer as any)?.ean || source?.ean || source?.gtin || source?.barcode || "",
  );

  // Distinct regional/local Tjek publication rows must survive final mobile-card dedupe.
  if (source?.source === "etarjouslehdet" && source?.offerId && source?.debug?.publicationId) {
    return `tjek:${String(source.debug.publicationId)}:${String(source.offerId)}:${String(source.campaignType || (offer as any)?.campaignType || "offer")}`;
  }

  if (ean) return `ean:${ean}`;

  const visibleName = normalizeOfferCardKeyV13(getOfferName(offer))
    .replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g, " ")
    .replace(/\b\d+\s*x\s*\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const visiblePrice = normalizeOfferCardKeyV13(offer.offerPrice ?? offer.price ?? "");

  // V15: final visible-card dedupe.
  // Use what the user actually sees: normalized visible product name + visible price.
  // Do not include store/category/source/id because those can differ for the same S-kaupat offer.
  if (visibleName && visiblePrice) return `visible:${visibleName}|${visiblePrice}`;

  const root = getOfferCardTitleRootV13(offer);
  return root ? `root:${root}` : "";
}

function dedupeOfferCardsV13(items: ZiiplyMobileOfferSearchItem[]) {
  const seen = new Set<string>();
  const seenRoots = new Set<string>();
  const unique: ZiiplyMobileOfferSearchItem[] = [];

  for (const item of items) {
    const source = (item as any)?.__sourceOfferSearchResult || item;
    const ean = normalizeOfferCardKeyV13(
      (item as any)?.ean || source?.ean || source?.gtin || source?.barcode || "",
    );
    const key = getOfferCardDedupeKeyV13(item);

    if (source?.source === "etarjouslehdet" && source?.offerId && source?.debug?.publicationId) {
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
      continue;
    }

    // V36: EAN-tuote on yksilöllinen tuote. Älä käytä sille root+hinta-dedupea,
    // koska sama kampanja/hinta voi sisältää useita eri EAN-variantteja.
    if (ean) {
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      unique.push(item);
      continue;
    }

    // Fallback vain tuotteille, joilta EAN puuttuu.
    const root = getOfferCardTitleRootV13(item);
    const price = normalizeOfferCardKeyV13(item.offerPrice ?? item.price ?? "");
    const rootKey = root && price ? `${root}|${price}` : "";

    if ((key && seen.has(key)) || (rootKey && seenRoots.has(rootKey))) continue;

    if (key) seen.add(key);
    if (rootKey) seenRoots.add(rootKey);

    unique.push(item);
  }

  return unique;
}


function cleanRepeatedOfferTextV4(value: unknown) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  const parts = text
    .split(/\s*[·|]\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return Array.from(new Set(parts)).join(" · ");
  }

  const half = Math.floor(text.length / 2);
  if (text.length % 2 === 0) {
    const left = text.slice(0, half).trim();
    const right = text.slice(half).trim();
    if (left && left === right) return left;
  }

  const repeatedOfferPattern =
    /^(.+?\b(?:kpl|pkt|ps|plo|prk|kg|g|l|ml)\s*=\s*[\d,.]+\s*€)\s+\1$/i;
  const repeatedMatch = text.match(repeatedOfferPattern);
  if (repeatedMatch?.[1]) return repeatedMatch[1].trim();

  return text;
}

export function getOfferPrice(offer: ZiiplyMobileOfferSearchItem) {
  const source = offer.__sourceOfferSearchResult || {};
  const quantity = Number(source.offerQuantity ?? offer.offerQuantity ?? source.multiBuyQuantity ?? offer.multiBuyQuantity);
  const unit = String(source.offerUnit ?? offer.offerUnit ?? "kpl").trim() || "kpl";
  const rawPriceText = String(source.priceText ?? offer.priceText ?? "").trim();
  const numericPrice = offer.offerPrice ?? offer.price ?? source.offerPrice ?? source.price;

  // Shared rule for every chain and for both Tarjoukset/Kampanjat:
  // preserve an explicit source multi-buy expression when it contains both
  // a price and quantity. Otherwise combine the provider's structured
  // offerQuantity with the total offer price. Never divide a multi-buy total
  // into a synthetic per-item offer price.
  if (rawPriceText && /€/.test(rawPriceText) && /\b\d+\s*(?:kpl|pkt|ps|prk|plo|kg|g|l|ml)\b/i.test(rawPriceText)) {
    return rawPriceText.replace(/\s+/g, " ").trim();
  }

  const price = normalizePrice(numericPrice);
  if (Number.isFinite(quantity) && quantity > 1 && price) {
    return `${price} / ${quantity} ${unit}`;
  }

  if (rawPriceText && /€/.test(rawPriceText)) return rawPriceText;
  if (price) return price;
  // Some leaflet campaigns publish only a percentage discount, not a euro price.
  // Display the published discount instead of an empty price or an invented amount.
  const percent = Number(source.discountPercent ?? offer.discountPercent);
  if (Number.isFinite(percent) && percent > 0 && percent < 100) return `−${percent} %`;
  const benefit = String(source.discountText ?? offer.discountText ?? source.benefitText ?? offer.benefitText ?? "").trim();
  if (/^[−–-]?\s*\d{1,2}\s*%$/.test(benefit)) return benefit;
  return "";
}

// Shared display-only price layout for both Gösta offers and campaigns.
export function splitOfferDisplayPrice(value: string) {
  const clean = String(value || "").trim();
  const after = clean.match(/^(.+?€)\s*\/\s*(\d+(?:[,.]\d+)?\s*(?:kpl|pkt|ps|prk|plo|kg|g|l|ml))$/i);
  if (after) return { amount: after[1].trim(), basis: `/ ${after[2].trim()}` };
  const before = clean.match(/^(\d+(?:[,.]\d+)?\s*(?:kpl|pkt|ps|prk|plo|kg|g|l|ml))\s*\/\s*(.+?€)$/i);
  if (before) return { amount: before[2].trim(), basis: `/ ${before[1].trim()}` };
  return { amount: clean || "—", basis: "" };
}

function getNormalPrice(offer: ZiiplyMobileOfferSearchItem) {
  const source = offer.__sourceOfferSearchResult || {};
  const isEurospar = String(source.chain || offer.chain || "").trim().toUpperCase() === "EUROSPAR";
  const quantity = Number(source.offerQuantity);
  const isMultiBuy =
    isEurospar &&
    source.priceBasis === "multi-buy-total" &&
    Number.isFinite(quantity) &&
    quantity > 1;

  if (isMultiBuy) {
    const normalText = String(source.normalPriceText || "").trim();
    if (normalText) return `${normalText} €/${String(source.offerUnit || "kpl").trim()}`;
    return "";
  }

  return normalizePrice(offer.normalPrice ?? offer.originalPrice);
}

function getSavingsText(offer: ZiiplyMobileOfferSearchItem) {
  const source = offer.__sourceOfferSearchResult || {};
  const isEurospar = String(source.chain || offer.chain || "").trim().toUpperCase() === "EUROSPAR";
  const quantity = Number(source.offerQuantity);
  const unit = String(source.offerUnit || "kpl").trim();
  const isMultiBuy =
    isEurospar &&
    source.priceBasis === "multi-buy-total" &&
    Number.isFinite(quantity) &&
    quantity > 1;

  // V58: EUROSPAR's mapped discountText is normally the validity period, not
  // a saving. For multi-buy offers show comparable per-unit pricing instead of
  // letting that validity text hide the useful normal-price information.
  if (isMultiBuy) {
    const equivalent = Number(source.singleEquivalentPrice);
    const normalText = String(source.normalPriceText || "").trim();
    const percent = Number(source.discountPercent);
    const parts: string[] = [];

    if (Number.isFinite(equivalent) && equivalent > 0) {
      parts.push(`${equivalent.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/${unit}`);
    }
    if (normalText) parts.push(`norm. ${normalText} €/${unit}`);
    if (Number.isFinite(percent) && percent > 0) parts.push(`-${Math.round(percent)} %`);

    if (parts.length) return parts.join(" · ");
  }

  if (offer.discountText) return cleanRepeatedOfferTextV4(offer.discountText);

  const explicit = normalizePrice(offer.savings);
  if (explicit) return `Säästö ${explicit}`;

  const normal = getNumericPrice(offer.normalPrice ?? offer.originalPrice);
  const current = getNumericPrice(offer.offerPrice ?? offer.price);
  const diff = normal - current;

  if (normal > 0 && current > 0 && diff > 0.01) return cleanRepeatedOfferTextV4(`Säästö ${normalizePrice(diff)}`);
  return "";
}

function getOfferValidityTextV59(offer: ZiiplyMobileOfferSearchItem) {
  const source = offer.__sourceOfferSearchResult || {};
  const explicit = String(offer.validityText ?? source.validityText ?? "").trim();
  const from = String(offer.validFrom ?? source.validFrom ?? "").slice(0, 10);
  const until = String(offer.validUntil ?? source.validUntil ?? "").slice(0, 10);

  const formatDate = (value: string) => {
    const match = value.match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return `${Number(match[2])}.${Number(match[1])}.`;
  };

  if (from && until) return `Voimassa ${formatDate(from)}–${formatDate(until)}`;
  if (until) return `Voimassa ${formatDate(until)} asti`;
  if (from) return `Voimassa alkaen ${formatDate(from)}`;

  if (explicit) {
    return explicit.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_all, _year, month, day) =>
      `${Number(day)}.${Number(month)}.`,
    );
  }
  return "";
}

function getOfferEan(offer: ZiiplyMobileOfferSearchItem) {
  const source = offer.__sourceOfferSearchResult || {};
  const value = offer.ean ?? source.ean;
  const text = String(value ?? "").trim();
  return /^\d{8,14}$/.test(text) ? text : "";
}

function getOfferComparisonPrice(offer: ZiiplyMobileOfferSearchItem) {
  const source = offer.__sourceOfferSearchResult || {};
  const value =
    offer.comparisonPriceText ??
    offer.unitPrice ??
    offer.comparisonPrice ??
    source.unitPriceText ??
    source.comparisonPriceText ??
    source.comparisonPrice;
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/€\s*\/\s*(?:kg|l|kpl)/i.test(text)) return text;
  const number = Number(text.replace(",", ".").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return text;
  const unit = String(offer.comparisonUnit ?? source.comparisonUnit ?? "kg").trim().toLowerCase();
  return `${number.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/${unit || "kg"}`;
}

function getOfferImage(offer: ZiiplyMobileOfferSearchItem) {
  const ean = getOfferEan(offer);
  const source = offer.__sourceOfferSearchResult || {};
  const explicit = String(offer.imageUrl || offer.pictureUrl || offer.image || source.imageUrl || "").trim();
  if (explicit) return explicit;
  if (String(offer.chain || source.chain || "").toUpperCase() === "K" && ean) {
    return `https://public.keskofiles.com/f/k-ruoka/product/${ean}`;
  }
  return "";
}

function getCategoryIcon(category?: string) {
  const text = String(category || "").toLowerCase();
  if (text.includes("kahvi")) return "☕";
  if (text.includes("maito")) return "🥛";
  if (text.includes("liha")) return "🥩";
  if (text.includes("kala")) return "🐟";
  if (text.includes("leip")) return "🥐";
  if (text.includes("hevi")) return "🍎";
  if (text.includes("juoma")) return "🥤";
  if (text.includes("pakaste")) return "❄️";
  if (text.includes("valmis")) return "🍽️";
  if (text.includes("kuiva")) return "🥣";
  if (text.includes("make") || text.includes("keksi") || text.includes("kark")) return "🍬";
  if (text.includes("lemmik")) return "🐾";
  if (text.includes("koti")) return "🧽";
  if (text.includes("muu")) return "📦";
  return "🏷️";
}

function OfferImageBox({
  src,
  category,
}: {
  src: string;
  category?: string;
}) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const cleanSrc = String(src || "").trim();
  const showImage = cleanSrc.length > 0 && failedSrc !== cleanSrc;

  if (!showImage) return <>{getCategoryIcon(category)}</>;

  return (
    <img
      src={cleanSrc}
      alt=""
      className="h-full w-full object-contain bg-[#fffaf0]"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFailedSrc(cleanSrc)}
    />
  );
}

function LeatherBackButton({ onClick }: { onClick?: () => void }) {
  if (!onClick) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-[1.18rem] top-[0.88rem] z-[35] grid h-[2.62rem] w-[2.86rem] place-items-center rounded-l-[0.42rem] rounded-r-[0.8rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
      aria-label="Takaisin"
      title="Takaisin"
    >
      <span className="grid h-[1.50rem] w-[1.50rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[1.02rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
        ←
      </span>
    </button>
  );
}

export default function ZiiplyMobileOfferSearchCard({
  open = true,
  title = "Tarjous- ja kampanjahaku",
  subtitle,
  query = "",
  filter = "",
  offers,
  results,
  loading = false,
  emptyText = "Gösta ei löytänyt tarjouksia vielä.",
  selectedStoreName = "",
  kruokaDebug = null,
  storeTraceV787 = null,
  contentTab = "offers",
  onContentTabChange,
  hasCampaigns = false,
  categorySuggestions = ["Kahvi & tee", "Maitotuotteet", "Liha & makkarat", "Kala", "Leipomo", "Hevi", "Juomat", "Pakasteet", "Valmisruoka", "Kuivatuotteet", "Makeiset & keksit", "Lastenruoat", "Vitamiinit & ravinteet", "Lemmikit", "Hygienia & kosmetiikka", "Kodinhoito", "Koti & vapaa-aika", "Muut"],
  categoryOfferCounts,
  testedEmptyCategories,
  onFilterChange,
  onSearch,
  onSelectOfferChain,
  showSChain = true,
  showKChain = true,
  showLidlChain = true,
  showEurosparChain = false,
  showTokmanniChain = false,
  onBack,
  onClose,
  onAddOffer,
  onAddAllOffers,
  className = "",
}: ZiiplyMobileOfferSearchCardProps) {
  const [lastOpenedCategoryV27, setLastOpenedCategoryV27] = React.useState("");
  const [selectedOfferChainV39, setSelectedOfferChainV39] = React.useState<"S" | "K" | "EUROSPAR" | "LIDL" | "TOKMANNI" | null>(null);
  const [debugOpenV52, setDebugOpenV52] = React.useState(false);
  const [expandedOfferB, setExpandedOfferB] = React.useState<ZiiplyMobileOfferSearchItem | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setLastOpenedCategoryV27(
      window.localStorage.getItem("ziiply-gosta-last-category-v27") || "",
    );
  }, []);

  // V57: Do not derive the chain gate from an empty query/filter.
  // Empty filter is also the normal "Tuoteryhmät" landing view inside the
  // already selected chain, so resetting here incorrectly jumped back to the
  // S/K/EUROSPAR logo gate. The card is unmounted when Gösta is closed, so the
  // local chain selection naturally resets on the next fresh open.

  const rememberGostaCategoryV27 = React.useCallback((category: string) => {
    const clean = String(category || "").trim();
    if (!clean) return;
    setLastOpenedCategoryV27(clean);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ziiply-gosta-last-category-v27", clean);
    }
  }, []);

  if (!open) return null;

  const rawItems = Array.isArray(offers) ? offers : Array.isArray(results) ? results : [];
  const items = dedupeOfferCardsV13(rawItems);
  const shownQuery = query.trim();
  const shownFilter = filter.trim();
  const showLandingView = !shownQuery && !shownFilter;
  const visibleItems = showLandingView ? [] : items;
  const hasVisibleOffers = visibleItems.length > 0;

  const normalizeCategoryKey = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9åäö]/gi, "")
      .trim();

  const getCategoryCount = (category: string) => {
    if (!categoryOfferCounts) return undefined;

    const direct = categoryOfferCounts[category];
    if (typeof direct === "number") return direct;

    const wanted = normalizeCategoryKey(category);
    const matched = Object.entries(categoryOfferCounts).find(
      ([key]) => normalizeCategoryKey(key) === wanted,
    );

    return typeof matched?.[1] === "number" ? matched[1] : undefined;
  };

  const hasCurrentOfferForCategory = (category: string) => {
    const wanted = normalizeCategoryKey(category);
    if (!wanted) return false;

    return items.some((offer) => {
      const offerCategory = normalizeCategoryKey(String(offer.category || ""));
      return offerCategory === wanted;
    });
  };

  const isTestedEmptyCategory = (category: string) => {
    if (!testedEmptyCategories) return false;

    const direct = testedEmptyCategories[category];
    if (typeof direct === "boolean") return direct;

    const wanted = normalizeCategoryKey(category);
    const matched = Object.entries(testedEmptyCategories).find(
      ([key]) => normalizeCategoryKey(key) === wanted,
    );

    return matched?.[1] === true;
  };

  const categoryAliases: Record<string, string[]> = {
    kahvitee: ["kahvitee", "kahvi", "kahvit", "tee", "teet"],
    liha: ["liha", "lihapakkaukset", "makkara", "makkarat", "nakki", "nakit", "grilli", "grillimakkara", "leikkele", "leikkeleet", "kinkku", "meetvursti", "metvursti", "pekoni", "lihavalmiste", "lihavalmisteet"],
    lihamakkarat: ["lihamakkarat", "liha", "lihapakkaukset", "makkara", "makkarat", "nakki", "nakit", "grilli", "grillimakkara", "leikkele", "leikkeleet", "kinkku", "meetvursti", "metvursti", "pekoni", "lihavalmiste", "lihavalmisteet"],
    hevi: ["hevi", "hedelmät", "hedelmat", "vihannekset", "kasvikset", "vihannes", "hedelmä", "hedelma"],
    pakasteet: ["pakasteet", "pakaste", "jäätelö", "jaatelo"],
    valmisruoka: ["valmisruoka", "valmisateria", "mikroateria", "ateria"],
    kuivatuotteet: ["kuivatuotteet", "pasta", "riisi", "jauhot", "hiutaleet", "murot", "mysli", "säilykkeet", "sailykkeet"],
    makeisetkeksit: ["makeisetkeksit", "makeiset ja keksit", "makeiset", "karkit", "karkki", "suklaa", "keksit", "keksi", "lakritsi", "salmiakki"],
    makeiset: ["makeiset", "makeisetkeksit", "makeiset ja keksit", "karkit", "karkki", "suklaa", "keksit", "keksi", "lakritsi", "salmiakki"],
    koti: [
      "koti",
      "kodin",
      "kotitalous",
      "kotijatalous",
      "kodintarvikkeet",
      "kodintuotteet",
      "kodinhoito",
      "talous",
      "taloustavara",
      "taloustavarat",
      "siivous",
      "puhdistus",
      "pesu",
      "pesuaine",
      "pesuaineet",
      "pyykki",
      "pyykinpesu",
      "astianpesu",
      "wc",
      "wcpaperi",
      "talouspaperi",
      "paperi",
      "servetti",
      "home",
      "household",
    ],
    lemmikit: ["lemmikit", "lemmikki", "koira", "kissa", "eläin", "elain", "lemmikkieläimet", "lemmikkielaimet"],
  };

  const getCategorySearchKeys = (category: string) => {
    const own = normalizeCategoryKey(category);
    return Array.from(new Set([own, ...(categoryAliases[own] || [])].map(normalizeCategoryKey).filter(Boolean)));
  };

  const getCategoryCountWithAliases = (category: string) => {
    if (!categoryOfferCounts) return undefined;

    // V32: page.tsx laskee categoryOfferCounts-mapin jo dedupatusta master-listasta.
    // Älä laske visible items -listasta, koska kategoriassa ollessa items sisältää vain
    // aktiivisen kategorian. Älä myöskään summaa aliasosumia useaan kertaan.
    const direct = getCategoryCount(category);
    if (typeof direct === "number") return direct;

    const keys = getCategorySearchKeys(category);
    const usedMapKeys = new Set<string>();
    let foundKnownCount = false;
    let total = 0;

    for (const [rawKey, rawCount] of Object.entries(categoryOfferCounts)) {
      if (typeof rawCount !== "number" || rawCount <= 0) continue;
      const normalizedMapKey = normalizeCategoryKey(rawKey);
      if (!normalizedMapKey || usedMapKeys.has(normalizedMapKey)) continue;

      if (keys.some((key) => normalizedMapKey === key)) {
        usedMapKeys.add(normalizedMapKey);
        foundKnownCount = true;
        total += rawCount;
      }
    }

    return foundKnownCount ? total : undefined;
  };

  const hasCurrentOfferForCategoryWithAliases = (category: string) => {
    const keys = getCategorySearchKeys(category);
    if (keys.length === 0) return false;

    return items.some((offer) => {
      const offerCategory = normalizeCategoryKey(String(offer.category || ""));

      return keys.some(
        (key) =>
          offerCategory === key ||
          offerCategory.includes(key) ||
          key.includes(offerCategory),
      );
    });
  };

  const hasPositiveCategoryCounts =
    !!categoryOfferCounts &&
    Object.values(categoryOfferCounts).some((count) => typeof count === "number" && count > 0);

  const categoryPool = Array.from(new Set(categorySuggestions));
  const categoryDisplayOrderV30 = [
    "Kahvi & tee",
    "Maitotuotteet",
    "Liha & makkarat",
    "Kala",
    "Leipomo",
    "Hevi",
    "Juomat",
    "Pakasteet",
    "Valmisruoka",
    "Kuivatuotteet",
    "Makeiset & keksit",
    "Lastenruoat",
    "Vitamiinit & ravinteet",
    "Lemmikit",
    "Hygienia & kosmetiikka",
    "Kodinhoito",
    "Koti & vapaa-aika",
    "Muut",
  ];
  const categoryDisplayOrderMapV30 = new Map(
    categoryDisplayOrderV30.map((category, index) => [normalizeCategoryKey(category), index]),
  );

  const getVisibleCategoryCountV32 = (category: string) => {
    const wanted = normalizeCategoryKey(category);

    // F: Landing-näkymässä määrä lasketaan aina samasta dedupatusta items-listasta,
    // josta käyttäjälle näytettävät tuotteet muodostuvat. Parentilta tuleva
    // categoryOfferCounts perustuu raakempaan listaan ja voi sisältää vielä
    // myöhemmin poistuvia duplikaatteja (erityisesti ensimmäinen Kahvi-kategoria).
    if (showLandingView && items.length > 0 && wanted) {
      return items.filter((item) =>
        normalizeCategoryKey(String(item.category || "")) === wanted
      ).length;
    }

    // Kategorian sisällä items voi sisältää vain aktiivisen kategorian.
    // Silloin muiden nappien määrät pidetään parentin master-count-mapista.
    const mappedCount = getCategoryCountWithAliases(category);
    if (typeof mappedCount === "number") return mappedCount;

    if (!wanted) return 0;
    return items.filter((item) =>
      normalizeCategoryKey(String(item.category || "")) === wanted
    ).length;
  };

  const getCategoryDisplayLabelV38 = (category: string) => {
    const key = normalizeCategoryKey(category);
    if (key === "leipomo") return "Leivät & leivonnaiset";
    if (key === "liha" || key === "liha & makkarat") return "Liha&makkara";
    return category;
  };

  const getCategoryButtonLabelV32 = (category: string) => {
    const count = getVisibleCategoryCountV32(category);
    const displayLabel = getCategoryDisplayLabelV38(category);
    return `${getCategoryIcon(category)} ${displayLabel}${count > 0 ? ` (${count})` : ""}`;
  };

  // V45: landing-painikkeessa ikoni erotetaan tekstistä, jotta tekstille jää
  // enemmän vaakasuuntaista tilaa. Count pysyy nimen yhteydessä.
  const getCategoryTextLabelV45 = (category: string) => {
    const count = getVisibleCategoryCountV32(category);
    const displayLabel = getCategoryDisplayLabelV38(category);
    return `${displayLabel}${count > 0 ? ` (${count})` : ""}`;
  };

  const isLastOpenedCategoryV27 = (category: string) =>
    normalizeCategoryKey(category) === normalizeCategoryKey(lastOpenedCategoryV27);

  const visibleCategorySuggestions = categoryPool
    .filter((category) => {
      const normalized = category.toLowerCase().trim();
      if (!normalized || normalized === "kaikki") return false;

      if (isTestedEmptyCategory(category)) return false;

      const visibleCount = getVisibleCategoryCountV32(category);
      if (visibleCount > 0) return true;

      const count = getCategoryCountWithAliases(category);

      // Landing-näkymässä items voi olla tyhjä ennen kuin master-data on renderöity.
      // Silloin saa käyttää parentin count-mappia apuna, mutta normaalissa listanäkymässä
      // määrä ja näkyvyys määräytyvät dedupatun items-listan mukaan.
      if (hasPositiveCategoryCounts && items.length === 0) {
        return typeof count === "number" && count > 0;
      }

      return false;
    })
    .sort((left, right) => {
      // V30: kategoriat eivät enää järjesty määrän mukaan.
      // Ruokakategoriat pidetään aina ensin ja Makeiset/Lemmikit/Koti/Muut aina lopussa.
      return (
        (categoryDisplayOrderMapV30.get(normalizeCategoryKey(left)) ?? 999) -
        (categoryDisplayOrderMapV30.get(normalizeCategoryKey(right)) ?? 999)
      );
    });

  // V48: page-tason valittu kauppa on ensisijainen, jotta nimi säilyy myös 0-tuloksella.
  // Tarjousrivin storeName jää yhteensopivuusfallbackiksi.
  const selectedStoreNameV41 = React.useMemo(() => {
    const explicitStoreName = String(selectedStoreName || "").trim();
    if (explicitStoreName) return explicitStoreName;

    for (const item of items) {
      const storeName = String(item?.storeName || "").trim();
      const itemName = String(item?.name || item?.title || "").trim();
      if (!storeName) continue;
      if (/debug/i.test(storeName) || /debug/i.test(itemName)) continue;
      return storeName;
    }
    return "";
  }, [items, selectedStoreName]);

  const selectedStoreDisplayNameV56 =
    selectedOfferChainV39 === "LIDL" &&
    selectedStoreNameV41 &&
    !/\blidl\b/i.test(selectedStoreNameV41)
      ? `Lidl ${selectedStoreNameV41}`
      : selectedStoreNameV41;

  const selectedStoreIsPrismaV41 = /\bprisma\b/i.test(selectedStoreNameV41);
  const selectedStoreOfferLineV41 = selectedStoreIsPrismaV41
    ? "Valitsemasi kauppahuoneen huojennetut hinnat ja tarjoukset"
    : "Valitsemasi lähipuodin huojennetut hinnat ja tarjoukset";

  const debugGeneratedAtV56 = new Date();
  const debugPayloadV52 = {
    revision: "V229-S-SOURCE-SPLIT",
    debugPropKeysV229: Object.keys(kruokaDebug || {}),
    debugPropPresentV229: kruokaDebug !== null && kruokaDebug !== undefined,
    sEvidenceRouteV228: (kruokaDebug as any)?.sEvidenceRouteV228 ?? null,
    sEvidenceAuditV227: selectedOfferChainV39 === "S" ? rawItems.map((item: any) => ({
      ean: item?.ean || item?.id || null,
      evidence: item?.__sourceOfferSearchResult?.debugOfferEvidenceV226 ?? null,
      sourceKeys: Object.keys(item?.__sourceOfferSearchResult || {}),
    })) : null,
    generatedAtIso: debugGeneratedAtV56.toISOString(),
    generatedAtLocal: debugGeneratedAtV56.toLocaleString("fi-FI", {
      timeZone: "Europe/Helsinki",
      hour12: false,
    }),
    generatedAtTimeZone: "Europe/Helsinki",
    activeDeploy: kruokaDebug?.deploy || null,
    selectedOfferChain: selectedOfferChainV39,
    loading,
    query: shownQuery,
    filter: shownFilter,
    showLandingView,
    selectedStoreName: selectedStoreNameV41,
    storeTraceV787,
    rawItemsCount: rawItems.length,
    dedupedItemsCount: items.length,
    visibleItemsCount: visibleItems.length,
    categoryOfferCounts: categoryOfferCounts || {},
    testedEmptyCategories: testedEmptyCategories || {},
    kruokaDebug: selectedOfferChainV39 === "K" ? kruokaDebug : null,
    rawItems,
  };

  const debugTextV52 = JSON.stringify(debugPayloadV52, null, 2);

  const copyDebugV52 = async () => {
    try {
      await navigator.clipboard.writeText(debugTextV52);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = debugTextV52;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const goToLandingView = () => {
    // V27: paluu tuoteryhmälistaan ei saa käynnistää uutta master-hakua eikä tyhjentää
    // jo ladattuja tarjousmääriä. Page säilyttää offerSearchResults-välimuistin.
    onFilterChange?.("");
  };

  const handleBack = () => {
    // Kun käyttäjä on S/K-tarjoushaun sisällä, ensimmäinen paluu vie
    // takaisin Tarjoushaku-kortin ketjuvalintaan. Vasta seuraava paluu
    // poistuu Göstan Tarjoushaku-kortilta pääikkunaan.
    if (selectedOfferChainV39 !== null) {
      setSelectedOfferChainV39(null);
      onFilterChange?.("");
      return;
    }

    if (!showLandingView) {
      goToLandingView();
      return;
    }

    onBack?.();
  };

  const submitSearch = () => onSearch?.(shownFilter);

  return (
    <div
      data-ziiply-mobile-offer-search-card-version="V53-MINI-DEBUG-BUTTON"
      className={`fixed inset-0 z-[94] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+4.95rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="ziiply-offer-pop relative flex h-full min-h-0 w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        {debugOpenV52 ? (
          <div className="absolute inset-2 z-[9999] flex flex-col overflow-hidden rounded-[1.25rem] border-[3px] border-[#2b1a0e] bg-[#fff8dc] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-[#9a7a3d] bg-[#f1d99a] px-3 py-2">
              <div className="text-[0.78rem] font-black text-[#2b1a0e]">GÖSTA DEBUG · {selectedOfferChainV39 || "-"}</div>
              <button type="button" onClick={() => setDebugOpenV52(false)} className="rounded border border-[#2b1a0e] bg-[#fff8dc] px-2 py-1 text-[0.68rem] font-black text-[#2b1a0e]">SULJE</button>
            </div>
            <div className="flex shrink-0 gap-2 border-b border-[#c6a96b] px-3 py-2">
              <button type="button" onClick={() => void copyDebugV52()} className="rounded-lg border-2 border-[#174c2c] bg-[#eaf4d3] px-3 py-1.5 text-[0.72rem] font-black text-[#174c2c]">KOPIOI DEBUG</button>
              <div className="self-center text-[0.62rem] font-bold text-[#6d5d3f]">raw {rawItems.length} · dedupe {items.length} · näkyvät {visibleItems.length}</div>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 text-left font-mono text-[0.60rem] leading-[1.28] text-[#1f1a12]">{debugTextV52}</pre>
          </div>
        ) : null}
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{ backgroundImage: "url('/ui/cart/vihkonen.webp')", backgroundSize: "142% 104%", backgroundPosition: "center top" }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.42),rgba(246,226,172,0.18)_34%,rgba(238,214,156,0.08))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />

        <LeatherBackButton onClick={handleBack} />

        <button
          type="button"
          onClick={() => setDebugOpenV52(true)}
          className="absolute left-[4.15rem] top-[1.08rem] z-[35] rounded border border-[#6d5d3f] bg-[#fff4d4]/90 px-1.5 py-0.5 font-mono text-[0.55rem] font-black text-[#5f5034] shadow-sm"
          aria-label="Avaa tarjoushaun debug"
          title="Avaa debug"
        >
          DBG
        </button>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-[1.18rem] top-[0.88rem] z-[35] grid h-[2.62rem] w-[2.86rem] place-items-center rounded-l-[0.8rem] rounded-r-[0.42rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[1.1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Sulje tarjoushaku"
            title="Sulje tarjoushaku"
          >
            <span className="grid h-[1.50rem] w-[1.50rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[0.92rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
              ×
            </span>
          </button>
        ) : null}

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[0.9rem] before:pointer-events-none before:absolute before:left-[4.05rem] before:right-[4.05rem] before:top-[0.75rem] before:h-[3.55rem] before:rounded-[0.6rem] before:bg-[#f4e4bb]/95 before:content-['']">
          <div className="relative z-10 min-h-[3.3rem] px-[3.15rem] flex flex-col justify-center">
            <div
              className="text-center text-[1.18rem] font-black italic leading-none text-[#28402a]"
              style={{ fontFamily: cooperFont }}
            >
              {title}
            </div>
            {subtitle ? (
              <div className="mt-[0.16rem] text-[0.74rem] font-extrabold text-[#5f5034]">
                {subtitle}
              </div>
            ) : null}

          </div>

          {selectedOfferChainV39 && selectedStoreNameV41 ? (
            <div className="relative z-10 -mt-[0.02rem] rounded-[1.05rem] border-[2px] border-[#9a7a3d] bg-[#fff4d4] px-2.5 py-1.5 text-center shadow-[0_3px_0_rgba(91,72,44,0.14),inset_0_0_0_1px_rgba(255,255,255,0.45)]">
              <div className="whitespace-nowrap text-[clamp(0.84rem,4vw,1.02rem)] font-black leading-tight text-[#28402a]" style={{ fontFamily: cooperFont }}>
                {selectedStoreDisplayNameV56}
              </div>
              <div className="mt-0.5 whitespace-nowrap text-[clamp(0.55rem,2.55vw,0.68rem)] font-extrabold italic leading-tight text-[#6d5d3f]" style={{ fontFamily: serifFont }}>
                {selectedStoreOfferLineV41}
              </div>

              {showLandingView ? (
                <div className="mt-2 rounded-[0.82rem] border-[2px] border-[#174c2c] bg-[#fff8d9]/92 px-1.5 py-1.5">
                  <div className={cx("grid items-center gap-1", !hasCampaigns ? "grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" : "grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]")}>
                    <button type="button" aria-pressed={contentTab === "offers"} onClick={() => onContentTabChange?.("offers")}
                      className={cx("min-w-0 rounded-[0.65rem] border-2 border-[#174c2c] px-1 py-2 text-[clamp(0.61rem,2.5vw,0.78rem)] font-black", contentTab === "offers" ? "bg-[#174c2c] text-[#fff8d9]" : "bg-[#fff8d9] text-[#174c2c]")}>
                      Tarjoukset
                    </button>
                    <div className="min-w-0 text-[clamp(0.78rem,3.3vw,1.02rem)] font-black italic leading-tight text-[#28402a]" style={{ fontFamily: cooperFont }}>
                      Mitä tänään etsitään?
                    </div>
                    {hasCampaigns ? (
                      <button type="button" aria-pressed={contentTab === "campaigns"} onClick={() => onContentTabChange?.("campaigns")}
                        className={cx("min-w-0 rounded-[0.65rem] border-2 border-[#174c2c] px-1 py-2 text-[clamp(0.61rem,2.5vw,0.78rem)] font-black", contentTab === "campaigns" ? "bg-[#174c2c] text-[#fff8d9]" : "bg-[#fff8d9] text-[#174c2c]")}>
                        Kampanjat
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {selectedOfferChainV39 && !showLandingView ? (
            <div className="mt-3 rounded-[1.05rem] border-[2px] border-[#9d8350] bg-[#fff4d3]/86 p-1.5 shadow-[0_3px_0_rgba(91,72,44,0.14),inset_0_0_0_1px_rgba(255,255,255,0.45)]">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={goToLandingView}
                  className="shrink-0 rounded-full border border-[#b8944f] bg-[#fff8d9] px-2.5 py-1 text-[0.64rem] font-black leading-none text-[#174c2c] shadow-[0_1px_0_rgba(91,72,44,0.12)] active:translate-y-[1px]"
                >
                  ← Tuoteryhmät
                </button>
                {visibleCategorySuggestions.map((category) => {
                  const active = normalizeCategoryKey(shownFilter) === normalizeCategoryKey(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        rememberGostaCategoryV27(category);
                        onFilterChange?.(category);
                      }}
                      className={cx(
                        "shrink-0 rounded-full border px-2.5 py-1 text-[0.64rem] font-black leading-none shadow-[0_1px_0_rgba(91,72,44,0.12)] active:translate-y-[1px]",
                        active ? "border-[#174c2c] bg-[#174c2c] text-[#fff4d3]" : "border-[#b8944f] bg-[#fff8d9] text-[#174c2c]",
                      )}
                    >
                      {getCategoryButtonLabelV32(category)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </header>

        <main className="relative z-10 min-h-0 flex flex-1 flex-col overflow-hidden px-5 pb-[0.75rem] pt-[0.18rem]">
          {!selectedOfferChainV39 ? (
            <div className="mt-1 rounded-[1.05rem] border-[2px] border-[#9a7a3d] bg-[#fff4d4] px-3.5 py-5 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-black italic text-[#28402a]" style={{ fontFamily: cooperFont }}>
                Valitse kaupparyhmä
              </div>
              <div className="mx-auto mt-1.5 max-w-[17rem] text-[0.72rem] font-extrabold leading-snug text-[#6d5d3f]">
                Mistä kaupparyhmästä haetaan tarjoukset?
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {showSChain ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOfferChainV39("S");
                      onSelectOfferChain?.("S");
                    }}
                    className="flex min-h-[7.4rem] flex-col items-center justify-center rounded-[1rem] border-[3px] border-[#174c2c] bg-[#fff8d9] px-3 py-3 shadow-[0_4px_0_rgba(91,72,44,0.18)] active:translate-y-[1px]"
                    aria-label="Hae S-ryhmän tarjoukset"
                  >
                    <span className="flex h-[4.4rem] w-[4.4rem] items-center justify-center"><img src="/storelogos/s-group.png" alt="S-ryhmä" className="block h-full w-full object-contain object-center" draggable={false} /></span>
                    <span className="mt-2 text-[0.78rem] font-black text-[#174c2c]">S-ryhmä</span>
                  </button>
                ) : null}
                {showKChain ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOfferChainV39("K");
                      onSelectOfferChain?.("K");
                    }}
                    className="flex min-h-[7.4rem] flex-col items-center justify-center rounded-[1rem] border-[3px] border-[#174c2c] bg-[#fff8d9] px-3 py-3 shadow-[0_4px_0_rgba(91,72,44,0.18)] active:translate-y-[1px]"
                    aria-label="Hae K-ryhmän tarjoukset"
                  >
                    <span className="flex h-[4.4rem] w-[4.4rem] items-center justify-center"><img src="/storelogos/k-group.png" alt="K-ryhmä" className="block h-full w-full object-contain object-center" draggable={false} /></span>
                    <span className="mt-2 text-[0.78rem] font-black text-[#174c2c]">K-ryhmä</span>
                  </button>
                ) : null}
                {showEurosparChain ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOfferChainV39("EUROSPAR");
                      onSelectOfferChain?.("EUROSPAR");
                    }}
                    className="flex min-h-[7.4rem] flex-col items-center justify-center rounded-[1rem] border-[3px] border-[#174c2c] bg-[#fff8d9] px-2 py-3 shadow-[0_4px_0_rgba(91,72,44,0.18)] active:translate-y-[1px]"
                    aria-label="Hae EUROSPARin tarjoukset"
                  >
                    <span className="flex h-[4.4rem] w-[4.4rem] items-center justify-center"><img src="/storelogos/spar.png" alt="EUROSPAR" className="block h-full w-full object-contain object-center" draggable={false} /></span>
                    <span className="mt-2 text-[0.78rem] font-black text-[#174c2c]">EUROSPAR</span>
                  </button>
                ) : null}
                {showTokmanniChain ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOfferChainV39("TOKMANNI");
                      onSelectOfferChain?.("TOKMANNI");
                    }}
                    aria-label="Hae Tokmannin tarjoukset"
                    className="flex min-h-[7.4rem] flex-col items-center justify-center rounded-[1rem] border-[3px] border-[#174c2c] bg-[#fff8d9] px-2 py-3 shadow-[0_4px_0_rgba(91,72,44,0.18)] active:translate-y-[1px]"
                  >
                    <span className="flex h-[4.4rem] w-[4.4rem] items-center justify-center rounded-full bg-[#e30613] text-[1.05rem] font-black text-white">TOK</span>
                    <span className="mt-2 text-[0.78rem] font-black text-[#174c2c]">Tokmanni</span>
                  </button>
                ) : null}
                {showLidlChain ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOfferChainV39("LIDL");
                      onSelectOfferChain?.("LIDL");
                    }}
                    aria-label="Hae Lidlin tarjoukset"
                    className="flex min-h-[7.4rem] flex-col items-center justify-center rounded-[1rem] border-[3px] border-[#174c2c] bg-[#fff8d9] px-2 py-3 shadow-[0_4px_0_rgba(91,72,44,0.18)] active:translate-y-[1px]"
                  >
                    <span className="flex h-[4.4rem] w-[4.4rem] items-center justify-center"><img src="/storelogos/lidl.png" alt="Lidl" className="block h-full w-full object-contain object-center" draggable={false} /></span>
                    <span className="mt-2 text-[0.78rem] font-black text-[#174c2c]">Lidl</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : loading ? (
            <div className="mt-2 rounded-[1.05rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/52 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-extrabold italic text-[#59401e]" style={{ fontFamily: serifFont }}>Gösta penkoo tarjouksia...</div>
              <div className="mx-auto mt-4 h-[0.36rem] w-[12rem] overflow-hidden rounded-full bg-[#dfc387]">
                <span className="block h-full w-[42%] animate-[ziiplyOfferSearchBar_1.1s_ease-in-out_infinite] rounded-full bg-[#1b7c3d]" />
              </div>
            </div>
          ) : showLandingView ? (
            <div className="mt-[0.18rem] min-h-0 flex-1 overflow-hidden rounded-[1.05rem] border-[2px] border-[#9a7a3d] bg-[#fff4d4] px-3 py-2.5 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              {visibleCategorySuggestions.length > 0 ? (
                <div className="min-h-0 h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="mt-2 grid grid-cols-2 gap-1.5 pb-2">
                  {visibleCategorySuggestions.map((category) => (
                    <button
                      key={`landing-${category}`}
                      type="button"
                      onClick={() => {
                        rememberGostaCategoryV27(category);
                        onFilterChange?.(category);
                      }}
                      className={cx(
                        "grid min-h-[2.55rem] grid-cols-[1.18rem_minmax(0,1fr)] items-center gap-1 rounded-[0.8rem] border-[2px] border-[#174c2c] bg-[#fff8d9] pl-1.5 pr-2 py-[0.34rem] text-[#174c2c] shadow-[0_2px_0_rgba(91,72,44,0.16)] active:translate-y-[1px]",
                        isLastOpenedCategoryV27(category) && "ring-2 ring-[#087237]/45 bg-[#f5ffd9]",
                      )}
                    >
                      <span aria-hidden="true" className="w-[1.18rem] shrink-0 text-left text-[0.92rem] leading-none">
                        {getCategoryIcon(category)}
                      </span>
                      <span className="min-w-0 text-center text-[clamp(0.62rem,2.85vw,0.72rem)] font-black leading-[1.08] [text-wrap:balance]">
                        {getCategoryTextLabelV45(category)}
                      </span>
                    </button>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-[0.8rem] border border-dashed border-[#9a7a3d] bg-[#fff8d9] px-3 py-3 text-center text-[#6d5d3f]">
                  <div className="text-[0.82rem] font-black italic text-[#59401e]" style={{ fontFamily: serifFont }}>
                    Gösta ei löytänyt tarjouksia 🔎
                  </div>
                  {selectedStoreNameV41 ? (
                    <div className="mt-1 text-[0.76rem] font-black text-[#174c2c]">
                      {selectedStoreNameV41}
                    </div>
                  ) : null}
                  <div className="mt-1.5 text-[0.70rem] font-extrabold leading-snug">
                    {selectedOfferChainV39 === "EUROSPAR"
                      ? "Valitulle EUROSPAR-myymälälle ei löytynyt tällä hetkellä aktiivisia tarjouksia."
                      : selectedOfferChainV39 === "TOKMANNI"
                        ? "Valitulle Tokmanni-myymälälle ei löytynyt tällä hetkellä aktiivisia tarjouksia."
                      : selectedOfferChainV39 === "K"
                        ? "Valitulle myymälälle ei löytynyt tällä hetkellä tarjoustietoja. Myymälällä ei välttämättä ole aktiivisia tarjouksia tai tarjoustietoja ei ole saatavilla."
                        : "Valitulle myymälälle ei löytynyt tarjoustietoja S-kaupat.fi-palvelusta. Myymälä ei välttämättä ole palvelussa tai sillä ei ole tällä hetkellä aktiivisia tarjouksia."}
                  </div>
                </div>
              )}
            </div>
          ) : !hasVisibleOffers ? (
            <div className="mt-2 rounded-[1.05rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/52 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-extrabold italic text-[#59401e]" style={{ fontFamily: serifFont }}>Ei tarjouslöytöjä</div>
              <div className="mt-2 text-[0.78rem] font-extrabold leading-snug text-[#8a7650]">{emptyText}</div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="space-y-3 pb-3">
              {visibleItems.map((offer, index) => {
                const name = getOfferName(offer);
                const { productName, embeddedComparisonPrice } = splitOfferNameComparisonPrice(name);
                const storeName = getStoreName(offer);
                const offerPrice = getOfferPrice(offer);
                const normalPrice = getNormalPrice(offer);
                const savingsText = getSavingsText(offer);
                const validityText = getOfferValidityTextV59(offer);
                const image = getOfferImage(offer);
                const ean = getOfferEan(offer);
                const comparisonPrice = getOfferComparisonPrice(offer);
                const category = String(offer.category || "");
                const sourceOffer = offer.__sourceOfferSearchResult || {};
                const isWeightedProduct = Boolean(offer.isWeightedProduct ?? sourceOffer.isWeightedProduct);

                return (
                  <article key={String(offer.id || offer.ean || `${name}-${index}`)} className="relative overflow-hidden rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]">
                    <div className="px-3 py-2.5">
                      <div className="flex items-start gap-3">
                        <div className="flex w-[5.8rem] min-w-0 shrink-0 flex-col items-center gap-1.5">
                          <button type="button" onClick={() => setExpandedOfferB(offer)} aria-label={`Suurenna tuote ${productName}`} className="grid h-[5.15rem] w-[5.15rem] place-items-center overflow-hidden rounded-[0.65rem] border-[1.5px] border-[#7b5c2a] bg-[#fffaf0] text-[1.5rem] shadow-[0_2px_3px_rgba(50,31,13,0.18)]">
                            <OfferImageBox src={image} category={category} />
                          </button>
                          <button type="button" onClick={() => onAddOffer?.(offer)} disabled={!onAddOffer}
                            aria-label={`Lisää koriin: ${productName}, ${offerPrice || "hinta puuttuu"}`}
                            className={cx("flex min-h-[3.8rem] min-w-0 w-full flex-col items-center justify-center rounded-[0.6rem] border-[2px] border-[#496443] bg-[linear-gradient(180deg,#edf4d9_0%,#dce8c3_100%)] px-1 py-1 text-[#087237] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.58)] active:translate-y-[1px]", !onAddOffer && "cursor-not-allowed opacity-45")}>
                            <span className="block w-full max-w-full break-words text-center text-[clamp(0.85rem,3.7vw,1.12rem)] font-black leading-tight tabular-nums" style={{ fontFamily: cooperFont }}>{splitOfferDisplayPrice(offerPrice).amount}</span>
                            {splitOfferDisplayPrice(offerPrice).basis && <span className="block w-full text-center text-[0.76rem] font-black leading-tight">{splitOfferDisplayPrice(offerPrice).basis}</span>}
                            <span className="whitespace-nowrap text-[0.57rem] font-black leading-tight text-[#244525]">🛒 Lisää koriin</span>
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-[0.92rem] font-black leading-tight text-[#233020]">{productName}</div>
                          {embeddedComparisonPrice ? (
                            <div className="clear-both mt-[0.18rem] text-[0.70rem] font-extrabold leading-tight text-[#74694f]">
                              {embeddedComparisonPrice}
                            </div>
                          ) : null}
                          <div className="clear-both mt-0.5 flex flex-wrap items-center gap-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#6e6d55]">
                            <span>{storeName}</span>
                            {category ? <span className="rounded-full bg-[#174c2c]/12 px-1.5 py-0.5 text-[#174c2c]">{category}</span> : null}
                            {isWeightedProduct ? (
                              <span className="rounded-full border border-[#9a7a3d] bg-[#f6dfaa] px-1.5 py-0.5 text-[#6b421f]">Vaakatuote</span>
                            ) : null}
                          </div>
                          <div className="mt-[0.18rem] min-h-[0.61rem] truncate text-[0.61rem] font-bold leading-none text-[#8a7a55]">
                            {ean ? `EAN ${ean}` : ""}
                          </div>
                          <div className="mt-[0.30rem] min-h-[0.68rem] truncate text-[0.68rem] font-black leading-none text-[#8a7a55]">
                            {comparisonPrice}
                          </div>
                          <div className="mt-1 truncate text-[0.68rem] font-extrabold italic text-[#6b6048]" style={{ fontFamily: serifFont }}>
                            {savingsText || (normalPrice ? `Norm. ${normalPrice}` : "Tarjous")}
                          </div>
                          {validityText ? (
                            <div className="mt-[0.24rem] truncate text-[0.66rem] font-black text-[#7a6846]">
                              {validityText}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
            </div>
          )}
        </main>

        {expandedOfferB && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[#1c251c]/60 p-3" role="dialog" aria-modal="true" aria-label="Suurennettu tarjousnäkymä">
            <div className="max-h-full w-full max-w-[26rem] overflow-y-auto rounded-[1.2rem] border-[3px] border-[#8c6934] bg-[#fff4d8] p-3 shadow-xl">
              <div className="mb-3 flex items-center justify-between gap-2">
                <strong className="text-[#123d32]">Tuotetiedot</strong>
                <button type="button" onClick={() => setExpandedOfferB(null)} aria-label="Sulje tuotenäkymä" className="rounded-lg border border-[#8c6934] px-3 py-1 font-black">✕</button>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex w-[7.5rem] shrink-0 flex-col gap-2">
                  <div className="grid h-[7.5rem] place-items-center overflow-hidden rounded-lg border border-[#e6dcc3] bg-[#fffaf0]">
                    <OfferImageBox src={getOfferImage(expandedOfferB)} category={String(expandedOfferB.category || "")} />
                  </div>
                  <button type="button" disabled={!onAddOffer} onClick={() => onAddOffer?.(expandedOfferB)} className="flex min-h-[3.4rem] flex-col items-center justify-center rounded-lg border-2 border-[#496443] bg-[#dce8c3] px-1 text-[#087237] disabled:opacity-45">
                    <strong className="text-lg">{getOfferPrice(expandedOfferB) || "—"}</strong>
                    <span className="text-xs font-black text-[#244525]">🛒 Lisää koriin</span>
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="break-words font-black leading-tight text-[#123d32]">{getOfferName(expandedOfferB)}</div>
                  <div className="mt-2 break-words text-sm text-[#78633a]">{getOfferComparisonPrice(expandedOfferB)}</div>
                  <div className="mt-2 break-words text-sm text-[#78633a]">{getOfferValidityTextV59(expandedOfferB)}</div>
                  {getOfferEan(expandedOfferB) && <div className="mt-2 break-all text-xs text-[#78633a]">EAN {getOfferEan(expandedOfferB)}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* V7: internal footer buttons removed. Browser/back controls and category buttons handle navigation. */}

        <div className="pointer-events-none absolute -bottom-[0.72rem] left-[1.1rem] right-[1.1rem] h-[1.3rem] rounded-[50%] bg-[#cfaa61] opacity-55 blur-[1px]" />

        <style jsx>{`
          @keyframes ziiplyOfferPop {
            0% { opacity: 0; transform: translateY(18px) scale(0.965) rotate(-0.4deg); }
            58% { opacity: 1; transform: translateY(-3px) scale(1.01) rotate(0.2deg); }
            100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
          }
          @keyframes ziiplyOfferSearchBar {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(260%); }
          }
          .ziiply-offer-pop { animation: ziiplyOfferPop 420ms cubic-bezier(0.2, 0.9, 0.25, 1.2); }
        `}</style>
      </section>
    </div>
  );
}

export { ZiiplyMobileOfferSearchCard };

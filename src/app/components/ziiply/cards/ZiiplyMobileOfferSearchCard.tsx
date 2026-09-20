// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V51_DEBUG_OVERLAY_RESTORED
// Revision: V51-DEBUG-OVERLAY-RESTORED
// Date: 2026-09-20
//
// Muutos V49:ään:
// - Palauttaa näkyvän DEBUG · AVAA TÄSTÄ -painikkeen S/K-valinnan jälkeen.
// - Palauttaa mobiilissa toimivan debug-overlayn ja KOPIOI DEBUG -painikkeen.
// - Näyttää Cardille saapuvan query/filter/loading/store/categoryCounts/rawItems-datan.
// - Ei muuta haku-, provider-, store-, category-, dedupe- tai S/K-logiikkaa.
// ============================================================================

// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V51_RESTORE_LAST_WORKING_V49
// Revision: V51-RESTORE-LAST-WORKING-V49
// Date: 2026-09-20
//
// Palautus:
// - Palauttaa viimeisen tunnetun toimivan V49-kortin täsmälleen pohjaksi.
// - Poistaa V50-debug-overlayn.
// - Ei muuta provider-, haku-, store-, category-, dedupe- tai S/K-logiikkaa.

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
  categorySuggestions?: string[];
  categoryOfferCounts?: Record<string, number | null | undefined>;
  testedEmptyCategories?: Record<string, boolean | undefined>;
  onFilterChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onSelectOfferChain?: (chain: "S" | "K") => void;
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

function getOfferPrice(offer: ZiiplyMobileOfferSearchItem) {
  return normalizePrice(offer.offerPrice ?? offer.price);
}

function getNormalPrice(offer: ZiiplyMobileOfferSearchItem) {
  return normalizePrice(offer.normalPrice ?? offer.originalPrice);
}

function getSavingsText(offer: ZiiplyMobileOfferSearchItem) {
  if (offer.discountText) return cleanRepeatedOfferTextV4(offer.discountText);

  const explicit = normalizePrice(offer.savings);
  if (explicit) return `Säästö ${explicit}`;

  const normal = getNumericPrice(offer.normalPrice ?? offer.originalPrice);
  const current = getNumericPrice(offer.offerPrice ?? offer.price);
  const diff = normal - current;

  if (normal > 0 && current > 0 && diff > 0.01) return cleanRepeatedOfferTextV4(`Säästö ${normalizePrice(diff)}`);
  return "";
}

function getOfferImage(offer: ZiiplyMobileOfferSearchItem) {
  return String(offer.imageUrl || offer.pictureUrl || offer.image || "").trim();
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
  const [imageFailed, setImageFailed] = React.useState(false);
  const cleanSrc = String(src || "").trim();
  const showImage = cleanSrc.length > 0 && !imageFailed;

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
      onError={() => setImageFailed(true)}
    />
  );
}

function LeatherBackButton({ onClick }: { onClick?: () => void }) {
  if (!onClick) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-[0.78rem] top-[0.88rem] z-[35] grid h-[2.62rem] w-[2.86rem] place-items-center rounded-l-[0.42rem] rounded-r-[0.8rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
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
  title = "Tarjoushaku",
  subtitle,
  query = "",
  filter = "",
  offers,
  results,
  loading = false,
  emptyText = "Gösta ei löytänyt tarjouksia vielä.",
  selectedStoreName = "",
  categorySuggestions = ["Kahvi & tee", "Maitotuotteet", "Liha & makkarat", "Kala", "Leipomo", "Hevi", "Juomat", "Pakasteet", "Valmisruoka", "Kuivatuotteet", "Makeiset & keksit", "Lastenruoat", "Vitamiinit & ravinteet", "Lemmikit", "Hygienia & kosmetiikka", "Kodinhoito", "Koti & vapaa-aika", "Muut"],
  categoryOfferCounts,
  testedEmptyCategories,
  onFilterChange,
  onSearch,
  onSelectOfferChain,
  onBack,
  onClose,
  onAddOffer,
  onAddAllOffers,
  className = "",
}: ZiiplyMobileOfferSearchCardProps) {
  const [lastOpenedCategoryV27, setLastOpenedCategoryV27] = React.useState("");
  const [selectedOfferChainV39, setSelectedOfferChainV39] = React.useState<"S" | "K" | null>(null);
  const [debugOpenV51, setDebugOpenV51] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setLastOpenedCategoryV27(
      window.localStorage.getItem("ziiply-gosta-last-category-v27") || "",
    );
  }, []);

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

  const selectedStoreIsPrismaV41 = /\bprisma\b/i.test(selectedStoreNameV41);
  const selectedStoreOfferLineV41 = selectedStoreIsPrismaV41
    ? "Valitsemasi kauppahuoneen huojennetut hinnat ja tarjoukset"
    : "Valitsemasi lähipuodin huojennetut hinnat ja tarjoukset";

  const debugPayloadV51 = {
    revision: "V51-DEBUG-OVERLAY-RESTORED",
    selectedOfferChain: selectedOfferChainV39,
    loading,
    query: shownQuery,
    filter: shownFilter,
    showLandingView,
    selectedStoreName: selectedStoreNameV41,
    rawItemsCount: rawItems.length,
    dedupedItemsCount: items.length,
    visibleItemsCount: visibleItems.length,
    categoryOfferCounts: categoryOfferCounts || {},
    testedEmptyCategories: testedEmptyCategories || {},
    rawItems,
  };

  const debugTextV51 = JSON.stringify(debugPayloadV51, null, 2);

  const copyDebugV51 = async () => {
    try {
      await navigator.clipboard.writeText(debugTextV51);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = debugTextV51;
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
    if (!showLandingView) {
      goToLandingView();
      return;
    }

    onBack?.();
  };

  const submitSearch = () => onSearch?.(shownFilter);

  return (
    <div
      data-ziiply-mobile-offer-search-card-version="V51-DEBUG-OVERLAY-RESTORED"
      className={`fixed inset-0 z-[94] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+1.05rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="ziiply-offer-pop relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-7.15rem)] max-h-[41.8rem] min-h-[29rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        {selectedOfferChainV39 ? (
          <button
            type="button"
            onClick={() => setDebugOpenV51(true)}
            className="absolute left-1/2 top-[4.05rem] z-[80] -translate-x-1/2 rounded-full border-2 border-[#8b1e1e] bg-[#fff3b0] px-3 py-1 text-[0.66rem] font-black text-[#8b1e1e] shadow-md"
          >
            DEBUG · AVAA TÄSTÄ
          </button>
        ) : null}

        {debugOpenV51 ? (
          <div className="absolute inset-2 z-[9999] flex flex-col overflow-hidden rounded-[1.25rem] border-[3px] border-[#2b1a0e] bg-[#fff8dc] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-[#9a7a3d] bg-[#f1d99a] px-3 py-2">
              <div className="text-[0.78rem] font-black text-[#2b1a0e]">GÖSTA DEBUG · {selectedOfferChainV39 || "-"}</div>
              <button type="button" onClick={() => setDebugOpenV51(false)} className="rounded border border-[#2b1a0e] bg-[#fff8dc] px-2 py-1 text-[0.68rem] font-black text-[#2b1a0e]">SULJE</button>
            </div>
            <div className="flex shrink-0 gap-2 border-b border-[#c6a96b] px-3 py-2">
              <button type="button" onClick={() => void copyDebugV51()} className="rounded-lg border-2 border-[#174c2c] bg-[#eaf4d3] px-3 py-1.5 text-[0.72rem] font-black text-[#174c2c]">KOPIOI DEBUG</button>
              <div className="self-center text-[0.62rem] font-bold text-[#6d5d3f]">raw {rawItems.length} · dedupe {items.length} · näkyvät {visibleItems.length}</div>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 text-left font-mono text-[0.60rem] leading-[1.28] text-[#1f1a12]">{debugTextV51}</pre>
          </div>
        ) : null}
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{ backgroundImage: "url('/ui/cart/vihkonen.webp')", backgroundSize: "142% 104%", backgroundPosition: "center top" }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.42),rgba(246,226,172,0.18)_34%,rgba(238,214,156,0.08))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />

        <LeatherBackButton onClick={handleBack} />

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-[0.78rem] top-[0.88rem] z-[35] grid h-[2.62rem] w-[2.86rem] place-items-center rounded-l-[0.8rem] rounded-r-[0.42rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[1.1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Sulje tarjoushaku"
            title="Sulje tarjoushaku"
          >
            <span className="grid h-[1.50rem] w-[1.50rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[0.92rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
              ×
            </span>
          </button>
        ) : null}

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[7.7rem]">
          <div className="pl-[3.15rem] pr-[2.20rem]">
            <div
              className="text-center text-[1.18rem] font-black italic leading-none text-[#28402a]"
              style={{ fontFamily: cooperFont }}
            >
              {title}
            </div>
            {subtitle || shownQuery ? (
              <div className="mt-[0.16rem] text-[0.74rem] font-extrabold text-[#5f5034]">
                {subtitle || `Gösta penkoi: ${shownQuery}`}
              </div>
            ) : null}

          </div>

          {selectedOfferChainV39 && showLandingView && selectedStoreNameV41 ? (
            <div className="mt-[0.28rem] rounded-[1.05rem] border-[2px] border-[#9a7a3d] bg-[#fff4d4]/96 px-2.5 py-1.5 text-center shadow-[0_3px_0_rgba(91,72,44,0.14),inset_0_0_0_1px_rgba(255,255,255,0.45)]">
              <div className="whitespace-nowrap text-[clamp(0.84rem,4vw,1.02rem)] font-black leading-tight text-[#28402a]" style={{ fontFamily: cooperFont }}>
                {selectedStoreNameV41}
              </div>
              <div className="mt-0.5 whitespace-nowrap text-[clamp(0.55rem,2.55vw,0.68rem)] font-extrabold italic leading-tight text-[#6d5d3f]" style={{ fontFamily: serifFont }}>
                {selectedStoreOfferLineV41}
              </div>
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

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-[7.85rem] pt-[0.18rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!selectedOfferChainV39 ? (
            <div className="mt-1 rounded-[1.05rem] border-[2px] border-[#9a7a3d] bg-[#fff4d4] px-3.5 py-5 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-black italic text-[#28402a]" style={{ fontFamily: cooperFont }}>
                Valitse kaupparyhmä
              </div>
              <div className="mx-auto mt-1.5 max-w-[17rem] text-[0.72rem] font-extrabold leading-snug text-[#6d5d3f]">
                Mistä kaupparyhmästä haetaan tarjoukset?
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOfferChainV39("S");
                    onSelectOfferChain?.("S");
                  }}
                  className="flex min-h-[7.4rem] flex-col items-center justify-center rounded-[1rem] border-[3px] border-[#174c2c] bg-[#fff8d9] px-3 py-3 shadow-[0_4px_0_rgba(91,72,44,0.18)] active:translate-y-[1px]"
                  aria-label="Hae S-ryhmän tarjoukset"
                >
                  <img src="/storelogos/s-group.png" alt="S-ryhmä" className="h-[4.4rem] w-full object-contain" draggable={false} />
                  <span className="mt-2 text-[0.78rem] font-black text-[#174c2c]">S-ryhmä</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOfferChainV39("K");
                    onSelectOfferChain?.("K");
                  }}
                  className="flex min-h-[7.4rem] flex-col items-center justify-center rounded-[1rem] border-[3px] border-[#174c2c] bg-[#fff8d9] px-3 py-3 shadow-[0_4px_0_rgba(91,72,44,0.18)] active:translate-y-[1px]"
                  aria-label="Hae K-ryhmän tarjoukset"
                >
                  <img src="/storelogos/k-group.png" alt="K-ryhmä" className="h-[4.4rem] w-full object-contain" draggable={false} />
                  <span className="mt-2 text-[0.78rem] font-black text-[#174c2c]">K-ryhmä</span>
                </button>
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
            <div className="mt-[0.18rem] rounded-[1.05rem] border-[2px] border-[#9a7a3d] bg-[#fff4d4] px-3 py-2.5 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-black italic leading-tight text-[#28402a]" style={{ fontFamily: cooperFont }}>
                Mitä etsitään tänään?
              </div>
              {visibleCategorySuggestions.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
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
                    Valitulle myymälälle ei löytynyt tarjoustietoja S-kaupat.fi-palvelusta. Myymälä ei välttämättä ole palvelussa tai sillä ei ole tällä hetkellä aktiivisia tarjouksia.
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
            <div className="space-y-3 pt-4">
              {visibleItems.map((offer, index) => {
                const name = getOfferName(offer);
                const storeName = getStoreName(offer);
                const offerPrice = getOfferPrice(offer);
                const normalPrice = getNormalPrice(offer);
                const savingsText = getSavingsText(offer);
                const image = getOfferImage(offer);
                const category = String(offer.category || "");

                return (
                  <article key={String(offer.id || offer.ean || `${name}-${index}`)} className="relative overflow-hidden rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]">
                    <div className="px-3 py-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-[0.1rem] grid h-[2.45rem] w-[2.45rem] shrink-0 place-items-center overflow-hidden rounded-[0.52rem] border-[1.5px] border-[#7b5c2a] bg-[linear-gradient(180deg,#f5dfac_0%,#d6ad66_100%)] text-[1.05rem] font-black text-[#604017] shadow-[0_2px_3px_rgba(50,31,13,0.18),inset_0_0_0_1px_rgba(255,250,224,0.42)]">
                          <OfferImageBox src={image} category={category} />
                        </div>

                        <div className="min-w-0 flex-1 pr-[4.6rem]">
                          <div className="line-clamp-2 text-[0.92rem] font-black leading-tight text-[#233020]">{name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#6e6d55]">
                            <span>{storeName}</span>
                            {category ? <span className="rounded-full bg-[#174c2c]/12 px-1.5 py-0.5 text-[#174c2c]">{category}</span> : null}
                          </div>
                          <div className="mt-1 truncate text-[0.68rem] font-extrabold italic text-[#6b6048]" style={{ fontFamily: serifFont }}>
                            {savingsText || (normalPrice ? `Norm. ${normalPrice}` : "Tarjous voimassa")}
                          </div>
                        </div>

                        <div className="absolute right-[0.72rem] top-[0.72rem] text-right text-[1.05rem] font-black italic leading-none text-[#087237]" style={{ fontFamily: cooperFont }}>
                          {offerPrice || "—"}
                        </div>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <button type="button" onClick={() => onAddOffer?.(offer)} disabled={!onAddOffer} className={cx("rounded-[0.56rem] border-[2px] border-[#496443] bg-[linear-gradient(180deg,#f3e8cc_0%,#dfcfaa_100%)] px-3 py-[0.34rem] text-[0.64rem] font-black italic text-[#244525] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.58)] active:translate-y-[1px]", !onAddOffer && "cursor-not-allowed opacity-45")} style={{ fontFamily: cooperFont }}>
                          Lisää koriin
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

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

"use client";

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V19_KOTI_CATEGORY_FUZZY_COUNTS
// Revision: V19
// Date: 2026-06-06
//
// Fix:
// - S-kaupat RemoteFilteredProducts returns prices already in euros.
// - Removed old >20 => /100 conversion from normalizePrice() and getNumericPrice().
// - Fixes false prices like 59,90 € becoming 0,60 €. Removes Kaikki chip, dedupes repeated campaign text, and keeps the improved layout.
// - Keeps V2 Gösta filter/category UI unchanged.
//
// V17 fix:
// - Offer cards are fully opaque so lower product texts cannot show through.
// - Category buttons are no longer forced. A category is shown only when its
//   categoryOfferCounts value is > 0, or when current offer data contains that
//   category. Empty/tested-empty categories are hidden completely.
// - V19: Koti category also recognizes longer backend names such as
//   "Koti ja talous", "Kodin tuotteet", "Kodintarvikkeet" and "Household".
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
  categorySuggestions?: string[];
  categoryOfferCounts?: Record<string, number | null | undefined>;
  testedEmptyCategories?: Record<string, boolean | undefined>;
  onFilterChange?: (value: string) => void;
  onSearch?: (value: string) => void;
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
  const ean = normalizeOfferCardKeyV13(offer.ean);

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
    const key = getOfferCardDedupeKeyV13(item);
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
  if (text.includes("lemmik")) return "🐾";
  if (text.includes("koti")) return "🧽";
  if (text.includes("pakaste")) return "❄️";
  return "%";
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
  categorySuggestions = ["Kahvi", "Maitotuotteet", "Liha", "Kala", "Leipomo", "Hevi", "Juomat", "Makeiset", "Lemmikit", "Koti", "Pakasteet"],
  categoryOfferCounts,
  testedEmptyCategories,
  onFilterChange,
  onSearch,
  onBack,
  onClose,
  onAddOffer,
  onAddAllOffers,
  className = "",
}: ZiiplyMobileOfferSearchCardProps) {
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

  const baseLandingCategories = ["Kahvi", "Liha", "Hevi", "Koti", "Lemmikit"];

  const categoryAliases: Record<string, string[]> = {
    kahvi: ["kahvi", "kahvit"],
    liha: ["liha", "lihapakkaukset", "makkara", "grilli", "grillimakkara"],
    hevi: ["hevi", "hedelmät", "hedelmat", "vihannekset", "kasvikset", "vihannes", "hedelmä", "hedelma"],
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

    const keys = getCategorySearchKeys(category);
    let foundKnownCount = false;
    let total = 0;
    const matchedCountKeys = new Set<string>();

    // First: exact/direct alias matches, e.g. Koti, koti, Kodinhoito.
    for (const key of keys) {
      const count = getCategoryCount(key);
      if (typeof count === "number") {
        foundKnownCount = true;
        total += count;
        matchedCountKeys.add(key);
      }
    }

    // Second: fuzzy count-key match, e.g. "Koti ja talous",
    // "Kodin tuotteet", "Kodintarvikkeet" or "Household".
    // This fixes Koti disappearing when the parent count map uses a longer
    // backend category name instead of the short UI label "Koti".
    for (const [rawKey, rawCount] of Object.entries(categoryOfferCounts)) {
      if (typeof rawCount !== "number" || rawCount <= 0) continue;

      const normalizedKey = normalizeCategoryKey(rawKey);
      if (!normalizedKey || matchedCountKeys.has(normalizedKey)) continue;

      const matchesAlias = keys.some(
        (key) => normalizedKey === key || normalizedKey.includes(key) || key.includes(normalizedKey),
      );

      if (matchesAlias) {
        foundKnownCount = true;
        total += rawCount;
        matchedCountKeys.add(normalizedKey);
      }
    }

    if (foundKnownCount) return total;
    return undefined;
  };

  const hasCurrentOfferForCategoryWithAliases = (category: string) => {
    const keys = getCategorySearchKeys(category);
    if (keys.length === 0) return false;

    return items.some((offer) => {
      const offerCategory = normalizeCategoryKey(String(offer.category || ""));
      const offerName = normalizeCategoryKey(getOfferName(offer));
      const offerStore = normalizeCategoryKey(getStoreName(offer));
      const offerText = normalizeCategoryKey(
        [offer.category, offer.name, offer.title, offer.productName, offer.brandName, offerStore]
          .filter(Boolean)
          .join(" "),
      );

      return keys.some(
        (key) =>
          offerCategory === key ||
          offerCategory.includes(key) ||
          key.includes(offerCategory) ||
          offerName.includes(key) ||
          offerText.includes(key),
      );
    });
  };

  const categoryPool = Array.from(new Set([...baseLandingCategories, ...categorySuggestions]));

  const visibleCategorySuggestions = categoryPool.filter((category) => {
    const normalized = category.toLowerCase().trim();
    if (!normalized || normalized === "kaikki") return false;

    const count = getCategoryCountWithAliases(category);
    if (typeof count === "number") return count > 0;

    if (isTestedEmptyCategory(category)) return false;

    // Fallback when the parent has not supplied counts: show only categories
    // that are visible in the current offer payload. Do not force empty buttons.
    return hasCurrentOfferForCategoryWithAliases(category);
  });

  const goToLandingView = () => {
    onFilterChange?.("");
    onSearch?.("");
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
      data-ziiply-mobile-offer-search-card-version="V19_KOTI_CATEGORY_FUZZY_COUNTS"
      className={`fixed inset-0 z-[94] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+1.05rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="ziiply-offer-pop relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-7.15rem)] max-h-[41.8rem] min-h-[29rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div className="pointer-events-none absolute left-[1.0rem] top-[0.72rem] z-[80] rounded-full border border-[#174c2c] bg-[#fff8d9] px-2 py-0.5 text-[0.62rem] font-black text-[#174c2c] shadow-[0_2px_0_rgba(91,72,44,0.16)]">
          GÖSTA V19
        </div>

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
            <div className="text-[1.42rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.62)]" style={{ fontFamily: cooperFont }}>
              {title}
            </div>
            <div className="mt-[0.16rem] text-[0.74rem] font-extrabold text-[#5f5034]">
              {subtitle || (shownQuery ? `Gösta penkoi: ${shownQuery}` : "Tarjoukset tuoteryhmittäin")}
            </div>
          </div>

          <div className="mt-3 rounded-[1.05rem] border-[2px] border-[#9d8350] bg-[#fff4d3]/86 p-1.5 shadow-[0_3px_0_rgba(91,72,44,0.14),inset_0_0_0_1px_rgba(255,255,255,0.45)]">
            <div className="flex gap-1.5">
              <input
                value={filter}
                onChange={(event) => onFilterChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitSearch();
                  }
                }}
                placeholder="Hae tarjousta: kahvi, lohi, leipä..."
                className="min-w-0 flex-1 rounded-[0.82rem] border-0 bg-[#fffaf0] px-3 py-2 text-center text-[0.88rem] font-black text-[#102216] outline-none placeholder:text-[#7d7461]"
                style={{ fontFamily: serifFont }}
              />
              <button
                type="button"
                onClick={submitSearch}
                className="rounded-[0.82rem] border-[2px] border-[#496443] bg-[linear-gradient(180deg,#f3e8cc_0%,#dfcfaa_100%)] px-3 text-[0.70rem] font-black italic text-[#244525] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.58)] active:translate-y-[1px]"
                style={{ fontFamily: cooperFont }}
              >
                Hae
              </button>
            </div>
            {!showLandingView ? (
              <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={goToLandingView}
                  className="shrink-0 rounded-full border border-[#b8944f] bg-[#fff8d9] px-2.5 py-1 text-[0.64rem] font-black leading-none text-[#174c2c] shadow-[0_1px_0_rgba(91,72,44,0.12)] active:translate-y-[1px]"
                >
                  ← Tuoteryhmät
                </button>
                {visibleCategorySuggestions.map((category) => {
                  const active = shownFilter.toLowerCase() === category.toLowerCase();
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        onFilterChange?.(category);
                        onSearch?.(category);
                      }}
                      className={cx(
                        "shrink-0 rounded-full border px-2.5 py-1 text-[0.64rem] font-black leading-none shadow-[0_1px_0_rgba(91,72,44,0.12)] active:translate-y-[1px]",
                        active ? "border-[#174c2c] bg-[#174c2c] text-[#fff4d3]" : "border-[#b8944f] bg-[#fff8d9] text-[#174c2c]",
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-[7.85rem] pt-[0.75rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="mt-2 rounded-[1.05rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/52 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-extrabold italic text-[#59401e]" style={{ fontFamily: serifFont }}>Gösta penkoo tarjouksia...</div>
              <div className="mx-auto mt-4 h-[0.36rem] w-[12rem] overflow-hidden rounded-full bg-[#dfc387]">
                <span className="block h-full w-[42%] animate-[ziiplyOfferSearchBar_1.1s_ease-in-out_infinite] rounded-full bg-[#1b7c3d]" />
              </div>
            </div>
          ) : showLandingView ? (
            <div className="mt-1 rounded-[1.05rem] border-[2px] border-[#9a7a3d] bg-[#fff4d4] px-3.5 py-4 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-black italic text-[#28402a]" style={{ fontFamily: cooperFont }}>
                Mitä etsitään tänään?
              </div>
              <div className="mx-auto mt-1.5 max-w-[16rem] text-[0.72rem] font-extrabold leading-snug text-[#6d5d3f]">
                Valitse tuoteryhmä alta tai kirjoita hakusana. Gösta näyttää vain löydetyt tarjoukset.
              </div>
              {visibleCategorySuggestions.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {visibleCategorySuggestions.slice(0, 8).map((category) => (
                    <button
                      key={`landing-${category}`}
                      type="button"
                      onClick={() => {
                        onFilterChange?.(category);
                        onSearch?.(category);
                      }}
                      className="rounded-[0.8rem] border-[2px] border-[#174c2c] bg-[#fff8d9] px-2.5 py-[0.42rem] text-[0.72rem] font-black text-[#174c2c] shadow-[0_2px_0_rgba(91,72,44,0.16)] active:translate-y-[1px]"
                    >
                      {getCategoryIcon(category)} {category}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-[0.8rem] border border-dashed border-[#9a7a3d] bg-[#fff8d9] px-3 py-3 text-[0.72rem] font-extrabold leading-snug text-[#6d5d3f]">
                  Ei näytettäviä tuoteryhmiä vielä. Kirjoita hakusana ja hae tarjoukset.
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
                          {image ? <img src={image} alt="" className="h-full w-full object-contain bg-[#fffaf0]" loading="lazy" /> : getCategoryIcon(category)}
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

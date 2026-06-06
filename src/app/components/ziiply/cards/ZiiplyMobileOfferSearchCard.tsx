"use client";

// ============================================================================
// ZIIPLY_MOBILE_OFFER_SEARCH_CARD_V14_AGGRESSIVE_RENDER_DEDUPE
// Revision: V14
// Date: 2026-06-05
//
// Fix:
// - S-kaupat RemoteFilteredProducts returns prices already in euros.
// - Removed old >20 => /100 conversion from normalizePrice() and getNumericPrice().
// - Fixes false prices like 59,90 € becoming 0,60 €. Removes Kaikki chip, dedupes repeated campaign text, and keeps the improved layout and always shows core Gösta categories on the landing page, including Koti and Lemmikit.
// - Keeps V2 Gösta filter/category UI unchanged.
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

  const root = getOfferCardTitleRootV13(offer);

  // V14: aggressive render-level dedupe.
  // If the visible title root is the same, treat it as the same offer.
  // This intentionally removes Maatiaispossu-style duplicates that come from
  // several seed/category searches with slightly different metadata.
  return root ? `root:${root}` : "";
}

function dedupeOfferCardsV13(items: ZiiplyMobileOfferSearchItem[]) {
  const seen = new Set<string>();
  const unique: ZiiplyMobileOfferSearchItem[] = [];

  for (const item of items) {
    const key = getOfferCardDedupeKeyV13(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
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
  const hasOffers = items.length > 0;
  const shownQuery = query.trim();
  const shownFilter = filter.trim();
  const showLandingView = !shownQuery && !shownFilter;
  const visibleItems = showLandingView ? [] : items;
  const hasVisibleOffers = visibleItems.length > 0;

  const preferredLandingCategories = [
    "Kahvi",
    "Liha",
    "Hevi",
    "Koti",
    "Lemmikit",
  ];

  const isPreferredLandingCategory = (category: string) =>
    preferredLandingCategories.some(
      (preferred) => preferred.toLowerCase() === category.toLowerCase(),
    );

  const visibleCategorySuggestions = categorySuggestions.filter((category) => {
    const normalized = category.toLowerCase();
    if (normalized === "kaikki") return false;

    // V13: do not use current result counts to hide category buttons.
    // The counts can be from another category search and therefore misleading.
    return isPreferredLandingCategory(category);
  });

  const goToLandingView = () => {
    onFilterChange?.("");
  };

  const submitSearch = () => onSearch?.(shownFilter);

  return (
    <div
      data-ziiply-mobile-offer-search-card-version="V14_AGGRESSIVE_RENDER_DEDUPE"
      className={`fixed inset-0 z-[94] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+1.05rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="ziiply-offer-pop relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-7.15rem)] max-h-[41.8rem] min-h-[29rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div className="pointer-events-none absolute left-[1.0rem] top-[0.72rem] z-[80] rounded-full border border-[#174c2c] bg-[#fff8d9] px-2 py-0.5 text-[0.62rem] font-black text-[#174c2c] shadow-[0_2px_0_rgba(91,72,44,0.16)]">
          GÖSTA V14
        </div>
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{ backgroundImage: "url('/ui/cart/vihkonen.webp')", backgroundSize: "142% 104%", backgroundPosition: "center top" }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.42),rgba(246,226,172,0.18)_34%,rgba(238,214,156,0.08))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />

        <LeatherBackButton onClick={onBack} />

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
                      onClick={() => onFilterChange?.(category)}
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

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-[7.85rem] pt-[0.75rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="mt-2 rounded-[1.05rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/52 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-extrabold italic text-[#59401e]" style={{ fontFamily: serifFont }}>Gösta penkoo tarjouksia...</div>
              <div className="mx-auto mt-4 h-[0.36rem] w-[12rem] overflow-hidden rounded-full bg-[#dfc387]">
                <span className="block h-full w-[42%] animate-[ziiplyOfferSearchBar_1.1s_ease-in-out_infinite] rounded-full bg-[#1b7c3d]" />
              </div>
            </div>
          ) : showLandingView ? (
            <div className="mt-1 rounded-[1.05rem] border-[2px] border-[#9a7a3d] bg-[#fff4d4]/64 px-3.5 py-4 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-black italic text-[#28402a]" style={{ fontFamily: cooperFont }}>
                Mitä etsitään tänään?
              </div>
              <div className="mx-auto mt-1.5 max-w-[16rem] text-[0.72rem] font-extrabold leading-snug text-[#6d5d3f]">
                Valitse tuoteryhmä alta tai kirjoita hakusana. Gösta näyttää vain löydetyt tarjoukset.
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {visibleCategorySuggestions
                  .filter((category) => isPreferredLandingCategory(category))
                  .slice(0, 8)
                  .map((category) => (
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
            </div>
          ) : !hasVisibleOffers ? (
            <div className="mt-2 rounded-[1.05rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/52 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-extrabold italic text-[#59401e]" style={{ fontFamily: serifFont }}>Ei tarjouslöytöjä</div>
              <div className="mt-2 text-[0.78rem] font-extrabold leading-snug text-[#8a7650]">{emptyText}</div>
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {visibleItems.map((offer, index) => {
                const name = getOfferName(offer);
                const storeName = getStoreName(offer);
                const offerPrice = getOfferPrice(offer);
                const normalPrice = getNormalPrice(offer);
                const savingsText = getSavingsText(offer);
                const image = getOfferImage(offer);
                const category = String(offer.category || "");

                return (
                  <article key={String(offer.id || offer.ean || `${name}-${index}`)} className="relative overflow-hidden rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8]/78 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]">
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

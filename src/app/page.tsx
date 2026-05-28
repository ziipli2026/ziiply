"use client";

// V428_ROUTE_OVERLAY_BUTTON: kompassi avaa kartta-overlayn ja Näytä reitti -napin.

// V427_TOPBAR_GRAPHICS_AND_HAKUTAPA_NOTICE: palautettu graafinen yläpalkki ja lisätty hakutapa-huomio.

// V425_RESTORE_TOPBAR_COMPONENT: palautettu KauppiasMobileTopBar build-virheen korjaamiseksi.

// V424_REMOVE_DANGLING_GPS_CONDITIONAL: poistettu overlayn jäljelle jäänyt gpsCoordsV320-ehdollinen fragmentti.

// V423_FINAL_REMOVE_MAP_OVERLAY_FRAGMENT: poistettu viimeinen keskeneräinen kartta-overlay fragmentti.

// V422_REMOVE_ALL_BROKEN_MAP_OVERLAY_REMNANTS: poistettu kaikki rikkinäisen kartta-overlayn JSX-jäänteet.

// V421_REMOVE_BROKEN_MAP_OVERLAY_JSX: poistettu rikkinäinen kartta-overlay JSX buildin korjaamiseksi.

// V420_MAP_OVERLAY_NO_ACTIVESTORES_EARLY_REF: kartta-overlay ei viittaa activeStoresiin ennen määrittelyä.

// V418_COMPASS_MAP_ROUTE_OVERLAY: kompassikuvake ja kartta-overlay reittilinkeillä.

// V402_MOBILE_SEARCH_CARD_CONNECTED: ZiiplyMobileSearchCard kytketty mobiilin hakutuloksiin.

// V401_SYNTAX_REPAIR_ONLY: fixed missing JSX closing div in mobile shops section.

// V397_FUNCTIONAL_ROLLBACK: palautettu P394:n oma toimiva mobiili-Kori/Vertailu/Hae-renderöinti.
// V401_REMOVE_OLD_MOBILE_SHOPS_RENDER: vanha Kaupat-paneelin JSX poistettu ja ohjattu ZiiplyMobileShopsView-komponenttiin.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  Offer,
  ZiiplyOffer,
  Product,
  KProduct,
  EanSearchResult,
  CartItem,
  Area,
  StoreSearchItem,
  Match,
  ChainResult,
  SingleProductCompareResult,
  StoreMode,
  QualityMode,
  StoreCompareScope,
  OptimizationSnapshot,
  PriceSnapshot,
  SavedShoppingList,
  SearchDebugEntry,
  SearchIntentCategory,
  SearchIntent,
  ScoredProduct,
  ScoredOfferResult,
} from "./components/ziiply/ziiplyCore";
import {
  MAX_ITEMS,
  ALTERNATIVES_AUTO_CLOSE_MS,
  PRICE_HISTORY_STORAGE_KEY,
  RECENT_CART_ITEMS_STORAGE_KEY,
  SAVED_SHOPPING_LISTS_STORAGE_KEY,
  MAX_RECENT_CART_ITEMS,
  MAX_SAVED_SHOPPING_LISTS,
  HTML5_QRCODE_SCRIPT_URL,
  EAN_SCANNER_REGION_ID,
  SAME_EAN_RESCAN_LOCK_MS,
  APP_VERSION,
  SHOW_SEARCH_DEBUG_PANEL,
  trackZiiplyEvent,
  AREAS,
  fixText,
  normalize,
  normalizeEan,
  isUsableEan,
  getEanSearchVariants,
  isSameEan,
  cleanExternalProductName,
  getOpenFoodFactsNames,
  splitProductTermsPreservingDecimalCommas,
  parseTerms,
  isLowSignalProductSearchTerm,
  SEARCH_ALIASES,
  getSearchQuery,
  getColaSpecificSearchQueries,
  uniqueNormalizedQueries,
  SEARCH_INTENTS,
  detectSearchIntent,
  isMilkSearchTerm,
  isColaSearchTerm,
  getPrimaryProductNounQuery,
  isVerySpecificSearch,
  normalizeLooseProductMatch,
  getMetricSizeKey,
  getNormalSearchQueries,
  isAliasSearch,
  formatEuro,
  formatComparisonPrice,
  getProductCategoryLabel,
  triggerHaptic,
  playScanSuccessFeedback,
  getScannerVideoElement,
  getScannerVideoTrack,
  applyBestEffortScannerCameraTuning,
  focusScannerCameraAtPoint,
  formatDate,
  getProductPrice,
  isManualShoppingItem,
  getPriceHistoryKeyFromProduct,
  getPriceHistoryKeyFromCartItem,
  getPriceChangeInfo,
  getSizeToken,
  hasWord,
  getNormalizedWords,
  hasExactNormalizedWord,
  parseMetricSize,
  getExactWordScore,
  getBrandMatchScore,
  getSizeMatchScore,
  isDifferentColaBrand,
  buildKSearchName,
  getKSearchTerms,
  hasAnyBrand,
  hasAnyToken,
  isEggSearchTerm,
  isClearlyEggProduct,
  isCoffeeSearchTerm,
  isCoffeeAccessory,
  hasStrongCoffeeSignal,
  hasCoffeePackSize,
  isClearlyColaProduct,
  isClearlyCoffeeProduct,
  isHardRejectedAlternative,
  isHardRejectedOptimizationAlternative,
  VALUE_BRANDS,
  K_OWN_BRANDS,
  S_OWN_BRANDS,
  PREMIUM_BRANDS,
  isValueBrandProduct,
  isKOwnBrandProduct,
  isPremiumBrandProduct,
  productGroupGate,
  isHardRejectedKMatch,
  scoreNameMatch,
  scoreDirectQueryNameMatch,
  getProductSearchText,
  getPreferredSizeScore,
  looksLikeNonFoodProduct,
  getGroceryNonFoodPenalty,
  isWrongMilkSearchProduct,
  hasStrongMilkSignal,
  getCategoryConfidence,
  getImportantQueryWordsForStrictMatch,
  getStrictMultiWordMatchScore,
  scoreBaseNormalResult,
  scoreMilkProduct,
  scoreCoffeeProduct,
  scoreColaProduct,
  scoreButtermilkProduct,
  scoreCookingOilProduct,
  scoreCategorySpecificResult,
  scoreNormalSResult,
  rankNormalSearchResults,
  isNonFoodOffer,
  isBadNormalResult,
  findArea,
  storeText,
  isPrisma,
  isKCitymarket,
  isSLocalStore,
  isKLocalStore,
  pickStore,
  offerToProduct,
  scoreOfferForTerm,
  rankOfferSearchResults,
  convertKProductToProduct,
  getPrimaryBrand,
  isAllowedByQualityMode,
  scoreQualityMode,
  pickBestSProduct,
  pickBestKProduct,
} from "./components/ziiply/ziiplyCore";
import {
  ZiiplyLaunchScreen,
  ZiiplyBottomNav,
} from "./components/ziiply/ziiplyComponents";
import * as TopbarResponsiveCardModule from "./components/ziiply/cards/TopbarResponsiveCard";
import * as ZiiplyCartCardModule from "./components/ziiply/cards/ZiiplyCartCard";
import ZiiplySearchCard from "./components/ziiply/cards/ZiiplySearchCard";
import ZiiplyMobileSearchCard from "./components/ziiply/cards/ZiiplyMobileSearchCard";
import ZiiplyStoreLocaCard from "./components/ziiply/cards/ZiiplyStoreLocaCard";
import * as ZiiplyCompareCardModule from "./components/ziiply/cards/ZiiplyCompareCard";
import ZiiplyMobileHomeView from "./components/ziiply/mobile/ZiiplyMobileHomeView";
import ZiiplyMobileAssistantPanel from "./components/ziiply/mobile/ZiiplyMobileAssistantPanel";
import ZiiplyMobileShopsView from "./components/ziiply/mobile/ZiiplyMobileShopsView";
import ZiiplyMobileLocationBar from "./components/ziiply/mobile/ZiiplyMobileLocationBar";
import type { ZiiplyAssistantKey } from "./components/ziiply/mobile/ZiiplyMobileAssistantButton";

type KauppiasTopBarKind = "weather" | "electricity" | "fuel" | "calendar";

function kauppiasTopBarPanelClass(kind: KauppiasTopBarKind) {
  const base =
    "relative h-[56px] min-w-0 overflow-hidden rounded-[0.42rem] border-[1.5px] px-[5px] py-[4px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_1px_0_rgba(0,0,0,0.08)] active:scale-[0.985]";

  if (kind === "weather") {
    return `${base} border-[#b9d0ba] bg-[linear-gradient(180deg,#fff9e4_0%,#fff2c5_100%)] text-[#083c32]`;
  }

  if (kind === "electricity") {
    return `${base} border-[#d6b667] bg-[linear-gradient(180deg,#fff4c8_0%,#ffe499_100%)] text-[#593300]`;
  }

  if (kind === "fuel") {
    return `${base} border-[#c98d65] bg-[linear-gradient(180deg,#fff0d7_0%,#ffd3af_100%)] text-[#5a1f00]`;
  }

  return `${base} border-[#caa66d] bg-[linear-gradient(180deg,#fff9de_0%,#ffe9a8_100%)] text-[#3f2b00]`;
}



function KauppiasWeatherGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="h-[24px] w-[24px] drop-shadow-sm" aria-hidden="true">
      <circle cx="24" cy="23" r="11" fill="#ffd84d" stroke="#e2a400" strokeWidth="3" />
      <path d="M24 4v8M24 34v8M5 23h8M35 23h8M10 9l6 6M38 9l-6 6" stroke="#f5b400" strokeWidth="4" strokeLinecap="round" />
      <path d="M25 47h25a10 10 0 0 0 0-20 14 14 0 0 0-26-3 12 12 0 0 0 1 23Z" fill="#f4fbff" stroke="#b6d5ea" strokeWidth="3" />
    </svg>
  );
}

function KauppiasElectricityGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <path d="M37 3 14 36h18L25 61l25-36H32L37 3Z" fill="#ffc226" stroke="#e58b00" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function KauppiasFuelGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <rect x="14" y="9" width="28" height="45" rx="5" fill="#d71920" stroke="#9b1117" strokeWidth="4" />
      <rect x="19" y="15" width="18" height="12" rx="2" fill="#fff4e8" />
      <path d="M42 18h6l6 8v24a5 5 0 0 1-10 0V32" fill="none" stroke="#9b1117" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 18v12h7" fill="none" stroke="#9b1117" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function KauppiasCalendarGraphic({ day }: { day: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <rect x="10" y="12" width="44" height="42" rx="6" fill="#fff9e8" stroke="#8a5b1d" strokeWidth="4" />
      <path d="M10 22h44" stroke="#c83927" strokeWidth="8" />
      <path d="M22 8v10M42 8v10" stroke="#8a5b1d" strokeWidth="5" strokeLinecap="round" />
      <text x="32" y="46" textAnchor="middle" fontSize="22" fontWeight="900" fill="#17322a">
        {day}
      </text>
    </svg>
  );
}

function kauppiasWeatherTextFromCode(code?: number) {
  if (code == null) return "Sää";
  if (code === 0) return "Selkeää";
  if ([1, 2, 3].includes(code)) return "Puolipilvistä";
  if ([45, 48].includes(code)) return "Sumua";
  if ([51, 53, 55, 56, 57].includes(code)) return "Tihkua";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Sadetta";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Lunta";
  if ([95, 96, 99].includes(code)) return "Ukkosta";
  return "Sää";
}

const KAUPPIAS_FI_MONTH_SHORT = [
  "TAM",
  "HEL",
  "MAA",
  "HUI",
  "TOU",
  "KES",
  "HEI",
  "ELO",
  "SYY",
  "LOK",
  "MAR",
  "JOU",
];

function KauppiasMobileTopBar({
  hidden = false,
  areaLabel = "Hyvinkää",
  onOpenCalendar,
}: {
  hidden?: boolean;
  areaLabel?: string;
  onOpenCalendar?: () => void;
}) {
  const [weatherValue, setWeatherValue] = useState("+12°");
  const [weatherText, setWeatherText] = useState(areaLabel);
  const [electricityValue, setElectricityValue] = useState("4,2");
  const [electricityText, setElectricityText] = useState("c/kWh");
  const [electricityTrend, setElectricityTrend] = useState<"up" | "down" | "flat">("flat");

  useEffect(() => {
    if (hidden || typeof window === "undefined" || !navigator.geolocation) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code&timezone=auto`,
            { cache: "no-store" },
          );

          if (!response.ok || cancelled) return;

          const data = await response.json();
          const temp = Number(data?.current?.temperature_2m);
          const code = Number(data?.current?.weather_code);

          if (Number.isFinite(temp)) {
            setWeatherValue(`${temp >= 0 ? "+" : ""}${Math.round(temp)}°`);
          }

          setWeatherText(kauppiasWeatherTextFromCode(Number.isFinite(code) ? code : undefined));
        } catch {
          if (!cancelled) setWeatherText(areaLabel);
        }
      },
      () => {
        if (!cancelled) setWeatherText(areaLabel);
      },
      { enableHighAccuracy: false, timeout: 5500, maximumAge: 300000 },
    );

    return () => {
      cancelled = true;
    };
  }, [areaLabel, hidden]);

  useEffect(() => {
    if (hidden || typeof window === "undefined") return;

    let cancelled = false;

    async function loadElectricity() {
      try {
        const response = await fetch("https://api.porssisahko.net/v1/latest-prices.json", {
          cache: "no-store",
        });

        if (!response.ok || cancelled) return;

        const data = await response.json();
        const prices = Array.isArray(data?.prices) ? data.prices : [];
        const now = Date.now();

        const enrichedPrices = prices
          .map((item: any) => ({
            ...item,
            priceNumber: Number(item.price),
            startMs: new Date(item.startDate).getTime(),
            endMs: new Date(item.endDate).getTime(),
          }))
          .filter(
            (item: any) =>
              Number.isFinite(item.priceNumber) &&
              Number.isFinite(item.startMs) &&
              Number.isFinite(item.endMs),
          )
          .sort((a: any, b: any) => a.startMs - b.startMs);

        const currentIndex = enrichedPrices.findIndex(
          (item: any) => item.startMs <= now && now < item.endMs,
        );

        const current = currentIndex >= 0 ? enrichedPrices[currentIndex] : null;
        const nextWindow =
          currentIndex >= 0 ? enrichedPrices.slice(currentIndex + 1, currentIndex + 4) : [];

        const price = Number(current?.priceNumber);
        if (Number.isFinite(price)) {
          setElectricityValue(
            price.toLocaleString("fi-FI", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }),
          );
          setElectricityText("c/kWh");

          const nextAverage =
            nextWindow.length > 0
              ? nextWindow.reduce((sum: number, item: any) => sum + item.priceNumber, 0) /
                nextWindow.length
              : price;

          const diff = nextAverage - price;
          if (diff > 0.4) setElectricityTrend("up");
          else if (diff < -0.4) setElectricityTrend("down");
          else setElectricityTrend("flat");
        }
      } catch {
        // pidetään nykyinen arvo
      }
    }

    loadElectricity();
    const interval = window.setInterval(loadElectricity, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hidden]);

  const calendarDisplay = useMemo(() => {
    const now = new Date();
    return {
      day: String(now.getDate()),
      month: KAUPPIAS_FI_MONTH_SHORT[now.getMonth()] || "",
    };
  }, []);

  const electricityTrendArrow =
    electricityTrend === "up" ? "↗" : electricityTrend === "down" ? "↘" : "→";
  const electricityTrendClass =
    electricityTrend === "up"
      ? "text-[#bc1f1f]"
      : electricityTrend === "down"
        ? "text-[#087a3a]"
        : "text-[#68727c]";

  const panels = [
    {
      id: "weather" as const,
      title: "SÄÄ",
      value: weatherValue,
      unit: "",
      detail: weatherText,
      graphic: <KauppiasWeatherGraphic />,
    },
    {
      id: "electricity" as const,
      title: "SÄHKÖ",
      value: electricityValue,
      unit: "c/kWh",
      detail: electricityText,
      graphic: <KauppiasElectricityGraphic />,
    },
    {
      id: "fuel" as const,
      title: "AJOAINE",
      value: "—",
      unit: "",
      detail: "Ei hintaa",
      graphic: <KauppiasFuelGraphic />,
    },
    {
      id: "calendar" as const,
      title: calendarDisplay.month,
      value: calendarDisplay.day,
      unit: "",
      detail: "Kalenteri",
      graphic: <KauppiasCalendarGraphic day={calendarDisplay.day} />,
      onClick: onOpenCalendar,
    },
  ];

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-[90] mx-auto block w-full translate-y-0 transform-gpu px-[6px] pt-[4px] sm:hidden">
      <div className="mx-auto flex h-[78px] w-[calc(100vw-12px)] max-w-none items-center overflow-hidden rounded-[1.65rem] border-[4px] border-[#073d32] bg-[#fff5d9] px-[7px] shadow-[0_10px_28px_rgba(8,42,35,0.18),inset_0_0_0_2px_rgba(255,255,255,0.7)]">
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_1fr_1.24fr_0.86fr] gap-[6px]">
          {panels.map((panel) => {
            const inner = (
              <>
                <span className="absolute left-[4px] top-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
                <span className="absolute right-[4px] top-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
                <span className="absolute bottom-[4px] left-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
                <span className="absolute bottom-[4px] right-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.70),transparent_55%)]" />

                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center leading-none">
                  <div className="flex items-center justify-center gap-[2px]">
                    {panel.graphic}
                    <div className="text-[10px] font-black uppercase tracking-[0.04em]">
                      {panel.title}
                    </div>
                  </div>

                  <div className="mt-[1px] flex items-end justify-center gap-[2px]">
                    <span className="text-[18px] font-black leading-none tracking-[-0.04em] text-[#041b19]">
                      {panel.value}
                    </span>
                    {panel.id === "electricity" && (
                      <span className={`pb-[1px] text-[14px] font-black leading-none ${electricityTrendClass}`}>
                        {electricityTrendArrow}
                      </span>
                    )}
                    {panel.unit && (
                      <span className="pb-[1px] text-[8px] font-black leading-none opacity-80">
                        {panel.unit}
                      </span>
                    )}
                  </div>

                  <div className="mt-[2px] max-w-full truncate px-1 text-[8px] font-black leading-none opacity-75">
                    {panel.detail}
                  </div>
                </div>
              </>
            );

            const className = kauppiasTopBarPanelClass(panel.id);

            if (panel.onClick) {
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={panel.onClick}
                  className={className}
                  aria-label={panel.title}
                >
                  {inner}
                </button>
              );
            }

            return (
              <div key={panel.id} className={className}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


export default function Page() {
  const TopbarResponsiveCard = ((TopbarResponsiveCardModule as any).default ||
    (TopbarResponsiveCardModule as any).TopbarResponsiveCard ||
    (TopbarResponsiveCardModule as any).ZiiplyTopBar ||
    (TopbarResponsiveCardModule as any).ZiiplyTopbarResponsiveCard) as any;
  const ZiiplyCartCard = ((ZiiplyCartCardModule as any).default ||
    (ZiiplyCartCardModule as any).ZiiplyCartCard ||
    (ZiiplyCartCardModule as any).CartResponsiveCard ||
    (ZiiplyCartCardModule as any).ZiiplyCartResponsiveCard) as any;
  const ZiiplyCompareCard = ((ZiiplyCompareCardModule as any).default ||
    (ZiiplyCompareCardModule as any).ZiiplyCompareCard ||
    (ZiiplyCompareCardModule as any).CompareResponsiveCard ||
    (ZiiplyCompareCardModule as any).ZiiplyCompareResponsiveCard) as any;
  const ZiiplyMobileShopsViewAny = ZiiplyMobileShopsView as any;

  const [input, setInput] = useState("");
  const [searchCompareMode, setSearchCompareMode] = useState<"cart" | "single">(
    "cart",
  );
  const [locationInput, setLocationInput] = useState("");
  const [activeArea, setActiveArea] = useState<Area>(AREAS[0]);
  const [storeMode, setStoreMode] = useState<StoreMode>("hyper");
  const [storeModeChosenV299, setStoreModeChosenV299] = useState(false);
  const selectedStoreModeRefV302 = useRef<StoreMode>("hyper");
  const storeSelectionHydratedRefV343 = useRef(false);
  const storeSelectionPersistenceReadyRefV343 = useRef(false);
  const STORE_SELECTION_STORAGE_KEY_V343 = "ziiply-store-selection-v343";
  const [storeCompareScope, setStoreCompareScope] =
    useState<StoreCompareScope>("none");
  const [withinChain, setWithinChain] = useState<"S" | "K" | null>(null);
  const [openStorePicker, setOpenStorePicker] = useState<string | null>(null);
  const [storeDrillViewV320, setStoreDrillViewV320] = useState<
    "main" | "selection"
  >("main");
  const [locationMessage, setLocationMessage] = useState(
    "Kirjoita alue tai postinumero.",
  );
  const [locationMessageVisible, setLocationMessageVisible] = useState(true);
  const [usingOwnLocation, setUsingOwnLocation] = useState(true);
  const [storeSearchLoading, setStoreSearchLoading] = useState(false);
  const [foundStores, setFoundStores] = useState<StoreSearchItem[]>([]);
  const [gpsCoordsV320, setGpsCoordsV320] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [storeDistanceFallbacksV320, setStoreDistanceFallbacksV320] = useState<
    Record<string, number>
  >({});
  const [keyboardOpenV320, setKeyboardOpenV320] = useState(false);
  const [gpsStorePickerBlockedV382, setGpsStorePickerBlockedV382] = useState(false);
  const gpsInitialVisiblePhaseRefV391 = useRef(true);
  const gpsWatchIdRefV391 = useRef<number | null>(null);
  const gpsLastSilentCoordsRefV391 = useRef<{ latitude: number; longitude: number } | null>(null);
  const gpsLastSilentAreaRefV391 = useRef("");
  const gpsFailTimerRefV391 = useRef<number | null>(null);
  const [storePickerViewportStyle, setStorePickerViewportStyle] = useState<{
    top: number;
    width: number;
  }>({ top: 286, width: 286 });

  const gpsStoreLocationPendingV366 =
    usingOwnLocation && !gpsCoordsV320 && foundStores.length === 0;
  const storePickerCanOpenV366 =
    foundStores.length > 0 &&
    !storeSearchLoading &&
    !gpsStoreLocationPendingV366 &&
    !gpsStorePickerBlockedV382;


  useEffect(() => {
    if (!openStorePicker || typeof document === "undefined") return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;

    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
    };
  }, [openStorePicker]);

  useEffect(() => {
    if (!openStorePicker || typeof window === "undefined") return;

    const updateStorePickerViewportStyle = () => {
      const visualViewport = window.visualViewport;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const viewportTop = visualViewport?.offsetTop ?? 0;

      const pickerWidth = Math.min(286, Math.max(270, viewportWidth - 118));

      // iPhone Safarin ala-toolbar + oma bottom nav:
      // pidetään valintaikkuna alempana. Narrow-versiossa tämä ei saa hypätä
      // ylös, kun Safari/visualViewport antaa reloadin jälkeen väliaikaisen korkeuden.
      // v374_MOBILE_STORE_PICKER_ALIGN:
      // Valintaikkuna avataan samalle pystylinjalle kauppakorttirivin kanssa,
      // ei enää liian alas korttien päälle.
      const top =
        viewportTop +
        Math.max(
          230,
          Math.min(300, Math.round(viewportHeight * 0.36)),
        );

      setStorePickerViewportStyle({
        // v376: nostetaan valintaikkunan yläreuna samaan pystykorkoon S/K-kauppakorttirivin kanssa.
        top: top + 16,
        width: pickerWidth,
      });
    };

    updateStorePickerViewportStyle();

    window.visualViewport?.addEventListener("resize", updateStorePickerViewportStyle);
    window.visualViewport?.addEventListener("scroll", updateStorePickerViewportStyle);
    window.addEventListener("resize", updateStorePickerViewportStyle);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateStorePickerViewportStyle);
      window.visualViewport?.removeEventListener("scroll", updateStorePickerViewportStyle);
      window.removeEventListener("resize", updateStorePickerViewportStyle);
    };
  }, [openStorePicker]);

  useEffect(() => {
    if (!openStorePicker) return;
    if (storePickerCanOpenV366) return;

    setOpenStorePicker(null);
  }, [openStorePicker, storePickerCanOpenV366]);

  // v384_GPS_KEEP_SHOPS_VISIBLE:
  // Kauppanäkymää ei enää piiloteta GPS-haun ajaksi; vain store picker suljetaan/estetään.

  // v382_GPS_PICKER_RACE_FIX:
  // GPS:n päälle/pois-vaihto ei saa jättää kaupan valintaikkunaa auki eikä avata sitä
  // välirenderissä ennen kuin sijainti ja kauppalista ovat taas vakaat.
  useEffect(() => {
    if (!openStorePicker) return;
    if (!storeSearchLoading && !gpsStoreLocationPendingV366 && !gpsStorePickerBlockedV382) return;

    setOpenStorePicker(null);
  }, [openStorePicker, storeSearchLoading, gpsStoreLocationPendingV366, gpsStorePickerBlockedV382]);


  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateKeyboardState = () => {
      const activeElement = document.activeElement;
      const isTextInputFocused =
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement ||
        (activeElement instanceof HTMLElement &&
          activeElement.isContentEditable);

      const visualViewport = window.visualViewport;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const keyboardLikelyOpen =
        isTextInputFocused && viewportHeight < window.innerHeight - 110;

      setKeyboardOpenV320(Boolean(keyboardLikelyOpen));
    };

    updateKeyboardState();

    window.visualViewport?.addEventListener("resize", updateKeyboardState);
    window.visualViewport?.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);
    window.addEventListener("focusin", updateKeyboardState);
    window.addEventListener("focusout", updateKeyboardState);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardState);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
      window.removeEventListener("focusin", updateKeyboardState);
      window.removeEventListener("focusout", updateKeyboardState);
    };
  }, []);

  // STORE_MODE_PERSIST_V302
  // Pitää käyttäjän valitseman Tavaratalot/Lähikaupat-tilan vakaana myös kaupan vaihdon
  // ja kauppalistan päivityksen jälkeen.
  useEffect(() => {
    // v304_STORE_MODE_LOCK:
    // Ref on käyttäjän valitseman moodin lähde. Älä anna satunnaisen storeMode-resetin
    // ylikirjoittaa sitä sen jälkeen, kun käyttäjä on valinnut Tavaratalot/Lähikaupat.
    if (!storeModeChosenV299) {
      selectedStoreModeRefV302.current = storeMode;
    }
  }, [storeMode, storeModeChosenV299]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // v305_EMPTY_REFRESH_GPS_TOGGLE:
    // Uusi selainikkuna / refresh ei saa palauttaa Tavaratalot/Lähikaupat-valintaa.
    // Kauppatyyppi valitaan joka sessiossa käsin, jotta vanha localStorage ei lukitse UI:ta.
    try {
      localStorage.removeItem("ziiply-store-mode-v302");
      localStorage.removeItem("ziiply-store-mode");
      localStorage.removeItem("storeMode");
      localStorage.removeItem("ziiply-use-own-location");
    } catch {}

    selectedStoreModeRefV302.current = "hyper";
    setStoreMode("hyper");
    setStoreModeChosenV299(false);
    setStoreCompareScope("none");
    setWithinChain(null);
    // v315_INITIAL_NAV_PROMPT: refresh/ensimmäinen avaus ei avaa mitään korttia.
    // Vain Kaupat-nappi on käytettävissä, mutta se ei ole vielä aktiivinen ennen käyttäjän painallusta.
    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setEanModalOpen(false);
    setActiveResult("none");
    setShopsPanelOpen(false);
    setInitialStoreNavPrompt(true);
    // v310_STEP1_2_GPS_REFRESH_FIX: refreshissä valinnat nollaan, GPS päälle.
    gpsUserDisabledRefV306.current = false;
    setUsingOwnLocation(true);
  }, []);

  useEffect(() => {
    setLocationMessageVisible(true);

    const lower = locationMessage.toLowerCase();

    // v360_LOCATION_STATUS_AUTO_HIDE:
    // GPS-/kauppainfo näkyy hetken aikaa Kaupat ja sijainti -paneelissa
    // ja katoaa automaattisesti, kun tila on vakaa.
    const shouldAutoHide =
      !storeSearchLoading &&
      (
        lower.includes("käytössä") ||
        lower.includes("löytyi") ||
        lower.includes("valittu") ||
        lower.includes("gps")
      );

    if (!shouldAutoHide) return;

    const timer = window.setTimeout(() => {
      setLocationMessageVisible(false);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [locationMessage, storeSearchLoading]);

  useEffect(() => {
    if (!gpsCoordsV320 || foundStores.length === 0) {
      setStoreDistanceFallbacksV320({});
      return;
    }

    const gpsCoordsForFallbackV320 = gpsCoordsV320;
    let cancelled = false;
    const controller = new AbortController();

    async function geocodeStoreDistanceFallbacksV320() {
      const candidates = uniqueStoresByIdAndName(
        foundStores.map(normalizeStoreForPickerV320),
      )
        .filter((store) => !getStoreDistanceLabelWithoutFallbackV320(store))
        .slice(0, 24);

      if (candidates.length === 0) return;

      const nextDistances: Record<string, number> = {};

      for (const store of candidates) {
        if (cancelled) return;

        const queryParts = [
          store.name,
          store.city || activeArea.label,
          store.postalCode,
          "Suomi",
        ].filter(Boolean);
        const query = queryParts.join(", ");

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fi&q=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          );
          if (!response.ok) continue;

          const results = await response.json();
          const first = Array.isArray(results) ? results[0] : null;
          const latitude = readStoreNumberV320(first?.lat);
          const longitude = readStoreNumberV320(first?.lon ?? first?.lng);
          if (latitude == null || longitude == null) continue;

          nextDistances[getStoreDistanceKeyV320(store)] =
            calculateDistanceKmV320(gpsCoordsForFallbackV320, {
              latitude,
              longitude,
            });
        } catch (error) {
          if (!cancelled)
            console.debug("Etäisyyden varalaskenta epäonnistui", error);
        }
      }

      if (cancelled || Object.keys(nextDistances).length === 0) return;

      setStoreDistanceFallbacksV320((current) => {
        const merged = { ...current, ...nextDistances };
        return JSON.stringify(merged) === JSON.stringify(current)
          ? current
          : merged;
      });
    }

    geocodeStoreDistanceFallbacksV320();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [gpsCoordsV320, foundStores, activeArea.label]);

  const [offers, setOffers] = useState<ZiiplyOffer[]>([]);
  const [hasSearchedOffers, setHasSearchedOffers] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offerSearchQuerySnapshot, setOfferSearchQuerySnapshot] = useState("");
  const [offerSearchDoneForQuery, setOfferSearchDoneForQuery] = useState("");
  const [chainFilter, setChainFilter] = useState<"all" | "S" | "K">("all");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const [activeResult, setActiveResult] = useState<
    "none" | "offers" | "compare" | "singleCompare"
  >("none");
  const [activeAssistant, setActiveAssistant] =
    useState<ZiiplyAssistantKey | null>(null);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartSavePanelOpen, setCartSavePanelOpen] = useState(false);
  const [shopsPanelOpen, setShopsPanelOpen] = useState(false);
  const [mapRouteOverlayOpenV428, setMapRouteOverlayOpenV428] = useState(false);  const [initialStoreNavPrompt, setInitialStoreNavPrompt] = useState(true);
  const [gpsErrorMessage, setGpsErrorMessage] = useState("");
  const [gpsAutoActivatedV287, setGpsAutoActivatedV287] = useState(false);
  const gpsUserDisabledRefV306 = useRef(false);
  const lastAutoAppliedLocationRefV361 = useRef("");

  
  function getDistanceMetersV391(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ) {
    const radius = 6371000;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getNearestAreaFromGpsV391(coords: { latitude: number; longitude: number }) {
    const areasWithCoords = AREAS
      .map((area) => {
        const latitude = Number((area as any).latitude ?? (area as any).lat);
        const longitude = Number((area as any).longitude ?? (area as any).lng ?? (area as any).lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

        return {
          area,
          distance: getDistanceMetersV391(coords, { latitude, longitude }),
        };
      })
      .filter(Boolean) as Array<{ area: Area; distance: number }>;

    if (areasWithCoords.length === 0) return activeArea;

    return areasWithCoords.sort((a, b) => a.distance - b.distance)[0]?.area || activeArea;
  }

  function setGpsVisibleMessageV391(areaLabel: string) {
    setGpsErrorMessage("");
    setLocationMessage(`Käytetään GPS ${areaLabel}`);
    setLocationMessageVisible(true);
  }

  function setGpsSilentLocationV391(coords: { latitude: number; longitude: number }) {
    gpsLastSilentCoordsRefV391.current = coords;

    const nearestArea = getNearestAreaFromGpsV391(coords);
    const nextAreaLabel = nearestArea?.label || activeArea.label;

    setGpsCoordsV320(coords);

    if (nearestArea && nearestArea.label !== activeArea.label) {
      setActiveArea(nearestArea);
    }

    if (gpsLastSilentAreaRefV391.current !== nextAreaLabel) {
      gpsLastSilentAreaRefV391.current = nextAreaLabel;
      setGpsVisibleMessageV391(nextAreaLabel);
    }
  }

  function startSilentGpsWatchV391() {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (gpsWatchIdRefV391.current != null) return;

    gpsWatchIdRefV391.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const previous = gpsLastSilentCoordsRefV391.current;
        const movedEnough =
          !previous || getDistanceMetersV391(previous, coords) >= 1000;

        if (!movedEnough) return;

        setGpsSilentLocationV391(coords);
      },
      () => {
        // Hiljaisessa seurannassa virhettä ei näytetä käyttäjälle.
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 15000,
      },
    );
  }

  function stopSilentGpsWatchV391() {
    if (
      typeof navigator !== "undefined" &&
      navigator.geolocation &&
      gpsWatchIdRefV391.current != null
    ) {
      navigator.geolocation.clearWatch(gpsWatchIdRefV391.current);
      gpsWatchIdRefV391.current = null;
    }
  }

function stopOwnLocationV306(message = "Kirjoita alue tai postinumero.") {
    gpsUserDisabledRefV306.current = true;
    stopSilentGpsWatchV391();
    if (gpsFailTimerRefV391.current) {
      window.clearTimeout(gpsFailTimerRefV391.current);
      gpsFailTimerRefV391.current = null;
    }
    setOpenStorePicker(null);
    setGpsStorePickerBlockedV382(false);
    setUsingOwnLocation(false);
    setGpsCoordsV320(null);
    setStoreSearchLoading(false);
    setGpsErrorMessage("");
    setLocationInput("");
    setLocationMessage(message);
    setLocationMessageVisible(true);
    try {
      localStorage.removeItem("ziiply-use-own-location");
    } catch {}
  }
  // Mobile comparison view uses the same activeResult state as desktop, but renders as its own overlay.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restoredCartPromptV320, setRestoredCartPromptV320] = useState<{
    open: boolean;
    count: number;
    savedAt?: number;
  }>({ open: false, count: 0 });
  const cartIsEmpty = cart.length === 0;

  const [normalResults, setNormalResults] = useState<Product[]>([]);
  const [normalSearchAttempted, setNormalSearchAttempted] = useState(false);
  const [searchDebug, setSearchDebug] = useState<SearchDebugEntry[]>([]);
  const [loadingNormal, setLoadingNormal] = useState(false);
  const [singleProductCompareResults, setSingleProductCompareResults] =
    useState<SingleProductCompareResult[]>([]);
  const [singleProductCompareLoading, setSingleProductCompareLoading] =
    useState(false);
  const [singleProductCompareTerm, setSingleProductCompareTerm] = useState("");
  const searchNavigationLocked =
    loadingOffers || loadingNormal || singleProductCompareLoading;
  const withinChainStoresReadyV320 = Boolean(
    storeCompareScope === "within_chain" &&
    withinChain &&
    (withinChain === "S"
      ? (activeArea.sStoreId || activeArea.sStoreName) &&
        (activeArea.sLocalStoreId || activeArea.sLocalStoreName)
      : (activeArea.kStoreId || activeArea.kStoreName) &&
        (activeArea.kLocalStoreId || activeArea.kLocalStoreName)),
  );
  const storesReadyForSearch = Boolean(
    (storeCompareScope === "between_chains" && storeModeChosenV299) ||
    withinChainStoresReadyV320,
  );
  const initialStoreSelectionLocked =
    !storesReadyForSearch && cart.length === 0;
  const searchBottomNavDisabled =
    searchNavigationLocked || initialStoreSelectionLocked;
  const [searchReadyBounceKeyV320, setSearchReadyBounceKeyV320] = useState(0);
  const previousSearchReadySignatureV320 = useRef("");

  const searchReadySignatureV320 = storesReadyForSearch
    ? [
        storeCompareScope,
        storeMode,
        withinChain || "",
        activeArea.sStoreId || "",
        activeArea.sStoreName || "",
        activeArea.kStoreId || "",
        activeArea.kStoreName || "",
        activeArea.sLocalStoreId || "",
        activeArea.sLocalStoreName || "",
        activeArea.kLocalStoreId || "",
        activeArea.kLocalStoreName || "",
      ].join("|")
    : "";

  useEffect(() => {
    if (!storesReadyForSearch) {
      previousSearchReadySignatureV320.current = "";
      return;
    }

    if (previousSearchReadySignatureV320.current !== searchReadySignatureV320) {
      previousSearchReadySignatureV320.current = searchReadySignatureV320;
      setSearchReadyBounceKeyV320((value) => value + 1);
    }
  }, [storesReadyForSearch, searchReadySignatureV320]);
  const [visibleNormalCount, setVisibleNormalCount] = useState(8);
  const [activeNormalSearchTerm, setActiveNormalSearchTerm] = useState("");
  const [notFoundSearchTerms, setNotFoundSearchTerms] = useState<string[]>([]);
  const [eanModalOpen, setEanModalOpen] = useState(false);
  const [eanInput, setEanInput] = useState("");
  const [eanLoading, setEanLoading] = useState(false);
  const [eanResults, setEanResults] = useState<EanSearchResult[]>([]);
  const [eanMessage, setEanMessage] = useState("");
  const [eanCache, setEanCache] = useState<Record<string, string>>({});
  const [lastAutoEanSearch, setLastAutoEanSearch] = useState("");
  const [eanSearchStartedAutomatically, setEanSearchStartedAutomatically] =
    useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceOpenSearchPanelAfterResultRef = useRef(false);
  const cartSectionRef = useRef<HTMLElement | null>(null);
  const comparisonSectionRef = useRef<HTMLElement | null>(null);
  const compareOverlayScrollRef = useRef<HTMLDivElement | null>(null);
  const cartOverlayScrollRef = useRef<HTMLDivElement | null>(null);
  const normalResultsSectionRef = useRef<HTMLElement | null>(null);
  const savingsSummaryRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLTextAreaElement | null>(null);
  const alternativesTimeoutsRef = useRef<Record<string, number>>({});
  const eanAutoSearchTimeoutRef = useRef<number | null>(null);
  const eanAutoSearchActiveRef = useRef(false);
  const eanInputRef = useRef<HTMLInputElement | null>(null);
  const eanResultsRef = useRef<HTMLDivElement | null>(null);
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
  const shoppingItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [checkedCartItems, setCheckedCartItems] = useState<
    Record<string, boolean>
  >({});
  const [priceHistoryBaseline, setPriceHistoryBaseline] = useState<
    Record<string, PriceSnapshot>
  >({});
  const [recentCartItems, setRecentCartItems] = useState<CartItem[]>([]);
  const [savedShoppingLists, setSavedShoppingLists] = useState<
    SavedShoppingList[]
  >([]);
  const [savedListName, setSavedListName] = useState("");
  const [lastSavingsToast, setLastSavingsToast] = useState<string | null>(null);
  const [lastCartToast, setLastCartToast] = useState<string | null>(null);

  const [qualityModesByCart, setQualityModesByCart] = useState<
    Record<string, QualityMode>
  >({});
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [sMatches, setSMatches] = useState<Record<string, Match>>({});
  const [kMatches, setKMatches] = useState<Record<string, Match>>({});
  const [expandedAlternatives, setExpandedAlternatives] = useState<
    Record<string, boolean>
  >({});
  const [alternativeResults, setAlternativeResults] = useState<
    Record<string, Product[]>
  >({});
  const [loadingAlternatives, setLoadingAlternatives] = useState<
    Record<string, boolean>
  >({});
  const [optimizingChains, setOptimizingChains] = useState<
    Record<string, boolean>
  >({});
  const [lastOptimizationSnapshot, setLastOptimizationSnapshot] =
    useState<OptimizationSnapshot | null>(null);

  const [selectedChains, setSelectedChains] = useState<
    Record<ChainResult["key"], boolean>
  >({
    s: true,
    k: true,
    lidl: false,
    tokmanni: false,
  });

  const [isOnline, setIsOnline] = useState(true);
  const [showLaunchScreen, setShowLaunchScreen] = useState(false);
  const [suppressUiForEanClose, setSuppressUiForEanClose] = useState(false);
  const [eanModalClosing, setEanModalClosing] = useState(false);
  const PANEL_FADE_MS = 260;
  const [closingPanels, setClosingPanels] = useState<Record<string, boolean>>(
    {},
  );
  const [eanScannerOpen, setEanScannerOpen] = useState(false);
  const [desktopKeyboardScannerOpen, setDesktopKeyboardScannerOpen] = useState(false);
  const [eanScannerMessage, setEanScannerMessage] = useState("");
  const [scannerTorchOn, setScannerTorchOn] = useState(false);
  const [eanManualInputOpen, setEanManualInputOpen] = useState(false);
  const [scanSuccessFlash, setScanSuccessFlash] = useState(false);
  const [scanMissFlash, setScanMissFlash] = useState(false);
  const eanHtml5ScannerRef = useRef<any | null>(null);
  const eanScannerStoppingRef = useRef(false);
  const lastContinuousScanRef = useRef<{ code: string; at: number } | null>(
    null,
  );
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
    // Launch/splash overlay disabled: keep initial reload/startup view visible immediately.
    setShowLaunchScreen(false);
  }, []);

  // v391_GPS_VISIBLE_ONLY_ON_START:
  // Start/reload näyttää GPS-tilan käyttäjälle. Sen jälkeen GPS päivittyy taustalla.
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (!usingOwnLocation) return;

    if (gpsInitialVisiblePhaseRefV391.current) {
      setLocationMessage("Paikannetaan GPS…");
      setLocationMessageVisible(true);

      if (gpsFailTimerRefV391.current) {
        window.clearTimeout(gpsFailTimerRefV391.current);
      }

      gpsFailTimerRefV391.current = window.setTimeout(() => {
        if (!gpsCoordsV320 && gpsInitialVisiblePhaseRefV391.current) {
          setLocationMessage("GPS ei löydy");
          setLocationMessageVisible(true);
        }
      }, 15000);
    }

    return () => {
      if (gpsFailTimerRefV391.current) {
        window.clearTimeout(gpsFailTimerRefV391.current);
        gpsFailTimerRefV391.current = null;
      }
    };
  }, [usingOwnLocation, gpsCoordsV320]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (!usingOwnLocation) {
      stopSilentGpsWatchV391();
      return;
    }

    const timer = window.setTimeout(() => {
      gpsInitialVisiblePhaseRefV391.current = false;
      startSilentGpsWatchV391();
    }, 15000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [usingOwnLocation]);

  useEffect(() => {
    return () => stopSilentGpsWatchV391();
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
    if (!eanModalOpen || typeof document === "undefined") return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [eanModalOpen]);

  useEffect(() => {
    const emptyStartViewOpen =
      !showLaunchScreen &&
      !searchPanelOpen &&
      !cartModalOpen &&
      !shopsPanelOpen &&
      !eanModalOpen &&
      activeResult === "none";

    const overlayOpen =
      showLaunchScreen ||
      emptyStartViewOpen ||
      searchPanelOpen ||
      cartModalOpen ||
      shopsPanelOpen ||
      activeResult === "compare" ||
      activeResult === "offers";

    if (!overlayOpen || openStorePicker || typeof document === "undefined") return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [
    showLaunchScreen,
    searchPanelOpen,
    cartModalOpen,
    shopsPanelOpen,
    eanModalOpen,
    activeResult,
    openStorePicker,
  ]);

  useEffect(() => {
    if (!eanModalOpen) stopEanCameraScanner();

    return () => {
      stopEanCameraScanner();
    };
  }, [eanModalOpen]);

  useEffect(() => {
    if (!eanModalOpen || eanResults.length <= 1) return;

    const timeout = window.setTimeout(() => {
      eanResultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [eanModalOpen, eanResults.length]);

  // =========================
  // DERIVED VIEW STATE
  // =========================
  // Raskaimmat listat ja summat pidetään useMemo-pohjaisina.
  // Tämä vähentää mobiilin turhia renderöintejä ilman että käyttölogiikka muuttuu.
  // Varsinainen komponenttijako kannattaa tehdä myöhemmin omiin tiedostoihin.

  const terms = useMemo(() => parseTerms(input), [input]);
  const currentSearchQueryKey = useMemo(() => terms.join(", ").trim() || input.trim(), [terms, input]);
  const gostaSearchDisabled = !currentSearchQueryKey || loadingOffers;
  const hasSearchInput = terms.length > 0;

  useEffect(() => {
    if (!hasSearchInput) return;
    const frame = window.requestAnimationFrame(() => {
      const inputElement = searchInputRef.current;
      if (!inputElement) return;
      const cursor = inputElement.value.length;
      inputElement.focus();
      try {
        inputElement.setSelectionRange(cursor, cursor);
      } catch {}
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasSearchInput]);

  useEffect(() => {
    if (!hasSearchInput) return;
    const frame = window.requestAnimationFrame(() => {
      const inputElement = searchInputRef.current;
      if (!inputElement) return;
      const selectionEnd = inputElement.value.length;
      inputElement.focus();
      try {
        inputElement.setSelectionRange(selectionEnd, selectionEnd);
      } catch {}
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasSearchInput]);

  function getSingleSearchTerm(
    value: string,
    options: { preserveTypingSpace?: boolean } = {},
  ) {
    // v260:
    // Yksi tuote -tilassa sallitaan yksi moniosainen tuote, myös desimaalipilkulla:
    // "Coca Cola zero 1,5L". iOS/Safari antaa välivaiheen "1," ennen seuraavaa
    // numeroa, joten myös numeron jälkeinen keskeneräinen pilkku pitää suojata.
    // Rivinvaihto katkaisee aina ylimääräiset tuotteet pois. Listapilkku katkaisee
    // vain silloin, kun se ei ole numerokoon/desimaalin osa.
    const decimalCommaPlaceholder = "__ZIIPLY_DECIMAL_COMMA__";
    const rawFirstLine = fixText(String(value || "")).split(/[\n]+/)[0] || "";
    const protectedDecimalCommas = rawFirstLine.replace(
      /(\d)\s*,\s*(?=\d|$)/g,
      `$1${decimalCommaPlaceholder}`,
    );
    const rawFirstTerm = protectedDecimalCommas.split(/,+/)[0] || "";

    const restored = rawFirstTerm
      .replaceAll(decimalCommaPlaceholder, ",")
      .replace(/\s+/g, " ")
      .slice(0, 180);

    if (options.preserveTypingSpace) {
      return restored.replace(/^\s+/, "");
    }

    return restored.trim();
  }

  function setSearchInputForMode(value: string) {
    if (searchCompareMode === "single") {
      setInput(getSingleSearchTerm(value, { preserveTypingSpace: true }));
      return;
    }

    setInput(value);
  }

  function clearSingleSearchState() {
    setInput("");
    setNormalResults([]);
    setNormalSearchAttempted(false);
    setVisibleNormalCount(8);
    setActiveNormalSearchTerm("");
    setSingleProductCompareResults([]);
    setSingleProductCompareTerm("");
    setSingleProductCompareLoading(false);
  }

  function getCompactSuggestionLabel(label: string) {
    const clean = fixText(label).replace(/\s+/g, " ").trim();
    const text = normalize(clean);

    if (hasAnyToken(text, ["coca-cola", "coca cola", "cola", "pepsi"])) {
      const size = clean.match(/\b\d+(?:[,\.]\d+)?\s?(?:l|ml)\b/i)?.[0] || "";
      const isZero = hasAnyToken(text, ["zero", "max"]);
      const brand = hasAnyToken(text, ["pepsi"])
        ? "pepsi"
        : hasAnyToken(text, ["coca-cola", "coca cola"])
          ? "coca cola"
          : "cola";
      return [brand, isZero ? (brand === "pepsi" ? "max" : "zero") : "", size]
        .filter(Boolean)
        .join(" ");
    }

    if (hasAnyToken(text, ["kananmuna", "kananmunat", "kananmunia", "munat"]))
      return "kananmuna";

    if (hasAnyToken(text, ["broilerin jauheliha", "kanan jauheliha"]))
      return "broilerin jauheliha";
    if (hasAnyToken(text, ["naudan jauheliha"])) return "naudan jauheliha";
    if (hasAnyToken(text, ["sika-nauta jauheliha", "sikanauta jauheliha"]))
      return "sika-nauta jauheliha";
    if (hasAnyToken(text, ["jauheliha"])) return "jauheliha";

    return clean.length > 42 ? clean.slice(0, 42).trim() : clean;
  }

  const searchSuggestionSeed = useMemo(() => {
    const splitTerms = splitProductTermsPreservingDecimalCommas(input);
    const currentText = splitTerms[splitTerms.length - 1] || input.trim();
    return currentText;
  }, [input]);

  const instantSearchSuggestions = useMemo(() => {
    const query = normalize(searchSuggestionSeed);
    if (query.length < 2) return [];

    const candidates = new Map<
      string,
      { label: string; hint: string; score: number }
    >();

    const addCandidate = (label: string, hint: string, score: number) => {
      const cleanLabel = fixText(label).replace(/\s+/g, " ").trim();
      const key = normalize(cleanLabel);
      if (!key || key.length < 2) return;
      if (
        !key.includes(query) &&
        !key.startsWith(query) &&
        !query.includes(key)
      )
        return;

      const existing = candidates.get(key);
      if (!existing || existing.score < score)
        candidates.set(key, { label: cleanLabel, hint, score });
    };

    for (const item of cart)
      addCandidate(getCompactSuggestionLabel(item.name), "Korista", 115);
    for (const item of recentCartItems)
      addCandidate(
        getCompactSuggestionLabel(item.name),
        "Viimeksi lisätty",
        105,
      );

    for (const intent of SEARCH_INTENTS) {
      const intentMatchesQuery =
        normalize(intent.label).includes(query) ||
        intent.variants.some((variant) => normalize(variant).includes(query));
      for (const variant of intent.variants)
        addCandidate(variant, intent.label, intentMatchesQuery ? 92 : 78);
    }

    Object.values(SEARCH_ALIASES).forEach((alias) =>
      addCandidate(alias, "Nopea haku", 70),
    );

    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "fi"))
      .slice(0, 5);
  }, [cart, recentCartItems, searchSuggestionSeed]);

  function applyInstantSearchSuggestion(label: string) {
    const cleanLabel = fixText(label).replace(/\s+/g, " ").trim();
    if (!cleanLabel) return;

    // v244:
    // Yksi tuote -tilassa smart suggestion on aina yksi kokonainen hakutermi.
    // Esim. "coca cola zero" ei saa hajota sanoiksi eikä jäädä vanhan pilkkujonon perään.
    if (searchCompareMode === "single") {
      setInput(getSingleSearchTerm(cleanLabel));
      setVisibleNormalCount(8);
      triggerHaptic();
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
      return;
    }

    const parts = input.split(/([\n,]+)/);
    let replaced = false;

    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (!/[\n,]+/.test(parts[index]) && parts[index].trim().length > 0) {
        const leadingSpace = parts[index].match(/^\s*/)?.[0] || "";
        parts[index] = `${leadingSpace}${cleanLabel}`;
        replaced = true;
        break;
      }
    }

    const nextInput = replaced ? parts.join("") : cleanLabel;
    setInput(nextInput);
    setVisibleNormalCount(8);
    triggerHaptic();

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  const activeStores = useMemo(() => {
    if (storeCompareScope !== "within_chain" && !storeModeChosenV299) {
      return {
        sStoreId: 0,
        sStoreName: "Valitse ensin Tavaratalot tai Lähikaupat",
        kStoreId: 0,
        kStoreName: "Valitse ensin Tavaratalot tai Lähikaupat",
      };
    }

    if (storeMode === "local") {
      return {
        sStoreId: activeArea.sLocalStoreId ?? 0,
        sStoreName: activeArea.sLocalStoreName ?? "S-lähikauppa ei valittu",
        kStoreId: activeArea.kLocalStoreId ?? 0,
        kStoreName: activeArea.kLocalStoreName ?? "K-lähikauppa ei valittu",
      };
    }

    return {
      sStoreId: activeArea.sStoreId ?? 0,
      sStoreName: activeArea.sStoreName ?? "S-tavaratalo ei valittu",
      kStoreId: activeArea.kStoreId ?? 0,
      kStoreName: activeArea.kStoreName ?? "K-tavaratalo ei valittu",
    };
  }, [activeArea, storeMode, storeModeChosenV299, storeCompareScope]);

  const hasActiveStores =
    activeStores.sStoreId > 0 && activeStores.kStoreId > 0;

  const selectedRouteStoreV428 = useMemo(() => {
    const targetName =
      activeStores.sStoreName &&
      !activeStores.sStoreName.includes("Valitse ensin") &&
      !activeStores.sStoreName.includes("ei valittu")
        ? activeStores.sStoreName
        : activeStores.kStoreName;

    const candidates = foundStores.map((store: any, index: number) => {
      const latitude = Number(
        store.latitude ??
          store.lat ??
          store.location?.lat ??
          store.coordinates?.latitude,
      );
      const longitude = Number(
        store.longitude ??
          store.lng ??
          store.lon ??
          store.location?.lng ??
          store.location?.lon ??
          store.coordinates?.longitude,
      );

      return {
        key: String(store.id ?? store.storeId ?? store.name ?? index),
        name: String(store.name ?? store.storeName ?? `Kauppa ${index + 1}`),
        address: String(store.address ?? store.streetAddress ?? ""),
        city: String(store.city ?? activeArea.label ?? "Suomi"),
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
      };
    });

    const normalizedTarget = normalize(String(targetName || ""));
    const exact =
      normalizedTarget &&
      candidates.find((store) => normalize(store.name).includes(normalizedTarget) || normalizedTarget.includes(normalize(store.name)));

    return (
      exact ||
      candidates[0] || {
        key: "area",
        name: targetName || activeArea.label || "Valittu kauppa",
        address: "",
        city: activeArea.label || "Suomi",
        latitude: null,
        longitude: null,
      }
    );
  }, [activeStores.sStoreName, activeStores.kStoreName, foundStores, activeArea.label]);

  function getRouteDestinationV428() {
    if (
      selectedRouteStoreV428.latitude != null &&
      selectedRouteStoreV428.longitude != null
    ) {
      return `${selectedRouteStoreV428.latitude},${selectedRouteStoreV428.longitude}`;
    }

    return [
      selectedRouteStoreV428.name,
      selectedRouteStoreV428.address,
      selectedRouteStoreV428.city,
      "Suomi",
    ]
      .filter(Boolean)
      .join(", ");
  }

  function getRouteUrlV428() {
    const destination = encodeURIComponent(getRouteDestinationV428());
    const origin =
      gpsCoordsV320?.latitude != null && gpsCoordsV320?.longitude != null
        ? encodeURIComponent(`${gpsCoordsV320.latitude},${gpsCoordsV320.longitude}`)
        : "";

    return origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${destination}`;
  }

  function openRouteInMapsV428() {
    const url = getRouteUrlV428();
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const mapRouteIframeSrcV428 = `https://maps.google.com/maps?q=${encodeURIComponent(getRouteDestinationV428())}&z=14&output=embed`;

  const storePairMissingNoticeVisibleV427 =
    storeModeChosenV299 &&
    storeCompareScope === "between_chains" &&
    (
      (storeMode === "hyper" && (!activeArea.sStoreId || !activeArea.kStoreId)) ||
      (storeMode === "local" && (!activeArea.sLocalStoreId || !activeArea.kLocalStoreId))
    );

  const hyperStorePairMissingV391 =
    storeMode === "hyper" &&
    storeModeChosenV299 &&
    storeCompareScope === "between_chains" &&
    (!activeArea.sStoreId || !activeArea.kStoreId);

  useEffect(() => {
    if (!hyperStorePairMissingV391) return;

    setLocationMessage("Alueelta ei löytynyt kahta vertailtavaa tavarataloa. Kokeile lähikauppoja.");
    setLocationMessageVisible(true);
  }, [hyperStorePairMissingV391]);

  function shouldUseLocalFallback(chain: "S" | "K") {
    if (storeMode !== "local") return false;

    if (chain === "S") {
      return (
        Boolean(activeArea.sStoreId) &&
        activeStores.sStoreId !== activeArea.sStoreId
      );
    }

    return (
      Boolean(activeArea.kStoreId) &&
      activeStores.kStoreId !== activeArea.kStoreId
    );
  }

  function normalizeSProduct(raw: any): Product | null {
    const idValue =
      raw?.id ??
      raw?.item?.id ??
      raw?.productId ??
      raw?.ean ??
      `${raw?.name || "s-product"}-${Math.random()}`;
    const price =
      raw?.price ??
      raw?.storeItems?.[0]?.price ??
      raw?.storeItem?.price ??
      raw?.pricing?.price ??
      raw?.currentPrice ??
      0;

    const name = fixText(
      String(raw?.name ?? raw?.item?.name ?? raw?.productName ?? ""),
    );
    if (!name) return null;

    return {
      id:
        Number(String(idValue).replace(/\D/g, "").slice(0, 9)) ||
        Math.abs(
          String(idValue)
            .split("")
            .reduce((sum, char) => sum + char.charCodeAt(0), 0),
        ),
      name,
      ean: raw?.ean ?? raw?.item?.ean ?? raw?.gtin ?? raw?.barcode ?? "",
      brandName: raw?.brandName ?? raw?.brand ?? raw?.item?.brandName ?? "",
      pictureUrl:
        raw?.pictureUrl ?? raw?.imageUrl ?? raw?.item?.pictureUrl ?? "",
      category: raw?.category ?? raw?.item?.category ?? "",
      price,
      comparisonPrice:
        raw?.comparisonPrice ??
        raw?.storeItems?.[0]?.comparisonPrice ??
        raw?.storeItem?.comparisonPrice,
      comparisonPriceUnit:
        raw?.comparisonPriceUnit ??
        raw?.storeItems?.[0]?.comparisonPriceUnit ??
        raw?.storeItem?.comparisonPriceUnit,
      storeItems: [{ price }],
    };
  }

  async function fetchSProducts(
    search: string,
    storeId: number,
  ): Promise<Product[]> {
    const response = await fetch(
      `/api/s-products?search=${encodeURIComponent(search)}&store=${encodeURIComponent(String(storeId))}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      console.error("S-products route failed", response.status);
      return [];
    }

    const data = await response.json();

    const rawItems = Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];

    return rawItems
      .map((item: any) => normalizeSProduct(item))
      .filter((item: Product | null): item is Product =>
        Boolean(item && item.name && getProductPrice(item) > 0),
      );
  }

  async function fetchKProducts(
    search: string,
    storeId: number,
  ): Promise<KProduct[]> {
    const response = await fetch(
      `/api/k-products?search=${encodeURIComponent(search)}&store=${encodeURIComponent(String(storeId))}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return (data.items || []) as KProduct[];
  }

  async function fetchOpenFoodFactsNames(ean: string) {
    const normalizedEan = normalizeEan(ean);
    if (!isUsableEan(normalizedEan)) return [];

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedEan)}.json?fields=product_name,product_name_fi,generic_name,generic_name_fi,brands,code`,
      { cache: "no-store" },
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
    if (
      lastEanToastRef.current?.message === message &&
      now - lastEanToastRef.current.at < 2500
    ) {
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
      const unique = next
        .filter((item) => {
          const key = getCartItemMemoryKey(item);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, MAX_RECENT_CART_ITEMS);

      try {
        window.localStorage.setItem(
          RECENT_CART_ITEMS_STORAGE_KEY,
          JSON.stringify({ version: 1, savedAt: Date.now(), items: unique }),
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
      const existingIndex = nextCart.findIndex(
        (cartItem) => getCartItemMemoryKey(cartItem) === key,
      );

      if (existingIndex >= 0) {
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity:
            Math.max(1, nextCart[existingIndex].quantity || 1) +
            Math.max(1, item.quantity || 1),
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
        const restoredItems = Array.isArray(parsed)
          ? parsed.slice(0, MAX_ITEMS)
          : Array.isArray(parsed?.items)
            ? parsed.items.slice(0, MAX_ITEMS)
            : [];

        if (restoredItems.length > 0) {
          setCart(restoredItems);

          // v343_RESTORE_STORE_SELECTION_WITH_CART:
          // Kun ostoskori palautetaan reloadin jälkeen, kauppa- ja vertailuvalintoja ei saa nollata.
          // Palautetaan viimeisin valinta vain tässä tilanteessa.
          try {
            const savedStoreSelection = window.localStorage.getItem(
              STORE_SELECTION_STORAGE_KEY_V343,
            );
            const parsedStoreSelection = savedStoreSelection
              ? JSON.parse(savedStoreSelection)
              : null;

            if (
              parsedStoreSelection &&
              typeof parsedStoreSelection === "object"
            ) {
              if (parsedStoreSelection.activeArea) {
                setActiveArea(parsedStoreSelection.activeArea as Area);
              }

              if (
                parsedStoreSelection.storeMode === "hyper" ||
                parsedStoreSelection.storeMode === "local"
              ) {
                selectedStoreModeRefV302.current =
                  parsedStoreSelection.storeMode as StoreMode;
                setStoreMode(parsedStoreSelection.storeMode as StoreMode);
              }

              setStoreModeChosenV299(
                Boolean(parsedStoreSelection.storeModeChosenV299),
              );

              if (
                parsedStoreSelection.storeCompareScope === "none" ||
                parsedStoreSelection.storeCompareScope === "between_chains" ||
                parsedStoreSelection.storeCompareScope === "within_chain"
              ) {
                setStoreCompareScope(
                  parsedStoreSelection.storeCompareScope as StoreCompareScope,
                );
              }

              if (
                parsedStoreSelection.withinChain === "S" ||
                parsedStoreSelection.withinChain === "K"
              ) {
                setWithinChain(parsedStoreSelection.withinChain);
              } else {
                setWithinChain(null);
              }
            }
          } catch {
            // Ignore broken saved store selection data.
          }

          setRestoredCartPromptV320({
            open: true,
            count: restoredItems.length,
            savedAt:
              typeof parsed?.savedAt === "number" ? parsed.savedAt : undefined,
          });
        }
      }
    } catch {
      // Ignore broken saved cart data.
    } finally {
      cartHasLoadedRef.current = true;
      storeSelectionHydratedRefV343.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!storeSelectionHydratedRefV343.current) return;

    // Ensimmäinen renderöinti reloadin jälkeen voi vielä sisältää oletusarvot.
    // Odotetaan yksi state-kierros, jotta palautettu kauppavalinta ei ylikirjoitu tyhjällä.
    if (!storeSelectionPersistenceReadyRefV343.current) {
      storeSelectionPersistenceReadyRefV343.current = true;
      return;
    }

    try {
      window.localStorage.setItem(
        STORE_SELECTION_STORAGE_KEY_V343,
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          activeArea,
          storeMode,
          storeModeChosenV299,
          storeCompareScope,
          withinChain,
        }),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    activeArea,
    storeMode,
    storeModeChosenV299,
    storeCompareScope,
    withinChain,
  ]);

  function persistCartImmediately(nextCart: CartItem[]) {
    try {
      window.localStorage.setItem(
        "ziiply-cart-v1",
        JSON.stringify({
          version: 2,
          savedAt: Date.now(),
          items: nextCart.slice(0, MAX_ITEMS),
        }),
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
        setRecentCartItems(
          items.map(sanitizeCartItemForStorage).slice(0, MAX_RECENT_CART_ITEMS),
        );
      }
    } catch {
      // Ignore broken recent-item data.
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        SAVED_SHOPPING_LISTS_STORAGE_KEY,
      );
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const lists = Array.isArray(parsed) ? parsed : parsed?.lists;

      if (Array.isArray(lists)) {
        setSavedShoppingLists(
          lists
            .filter((list) => list?.name && Array.isArray(list.items))
            .map((list) => ({
              id: String(
                list.id ||
                  `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              ),
              name: String(list.name),
              items: list.items
                .map(sanitizeCartItemForStorage)
                .slice(0, MAX_ITEMS),
              createdAt: Number(list.createdAt || Date.now()),
              updatedAt: Number(list.updatedAt || Date.now()),
            }))
            .slice(0, MAX_SAVED_SHOPPING_LISTS),
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
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          lists: savedShoppingLists,
        }),
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
      const items =
        parsed?.items && typeof parsed.items === "object"
          ? parsed.items
          : parsed;

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
        const next: Record<string, PriceSnapshot> = {
          ...priceHistoryBaselineRef.current,
        };
        const remember = (
          key: string,
          price: number,
          name: string,
          storeName?: string,
          chain?: string,
        ) => {
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
          if (item.price)
            remember(
              getPriceHistoryKeyFromCartItem(item),
              item.price,
              item.name,
              item.storeName,
              item.chain,
            );
        }

        for (const product of normalResults) {
          const storeName =
            (product as Product & { fallbackStoreName?: string })
              .fallbackStoreName || activeStores.sStoreName;
          remember(
            getPriceHistoryKeyFromProduct(product, storeName),
            getProductPrice(product),
            product.name,
            storeName,
          );
        }

        for (const item of offers) {
          const product = offerToProduct(item);
          remember(
            getPriceHistoryKeyFromProduct(product, item.storeName, item.chain),
            getProductPrice(product),
            product.name,
            item.storeName,
            item.chain,
          );
        }

        for (const result of eanResults) {
          remember(
            getPriceHistoryKeyFromProduct(
              result.product,
              result.storeName,
              result.chain,
            ),
            getProductPrice(result.product),
            result.product.name,
            result.storeName,
            result.chain,
          );
        }

        window.localStorage.setItem(
          PRICE_HISTORY_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            savedAt: Date.now(),
            items: next,
          }),
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
      window.localStorage.setItem(
        "ziiply-ean-cache-v1",
        JSON.stringify(eanCache),
      );
    } catch {}
  }, [eanCache]);

  useEffect(() => {
    // v305: Älä palauta vanhoja kauppavalintoja refreshin jälkeen.
    // Tämä estää tilanteen, jossa selain avaa suoraan vanhan Lähikaupat/Tavaratalot-tilan.
    try {
      window.localStorage.removeItem("ziiply-default-stores-v2");
    } catch {
      // Ignore storage errors in private browsing.
    }
  }, []);

  useEffect(() => {
    // v305: ei tallenneta kauppatyyppiä/kauppavalintoja pysyvästi.
    // Refreshin pitää palata tyhjään hakutapaan.
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

  function markPanelClosing(panelKey: string) {
    setClosingPanels((current) => ({ ...current, [panelKey]: true }));
    window.setTimeout(() => {
      setClosingPanels((current) => {
        const next = { ...current };
        delete next[panelKey];
        return next;
      });
    }, PANEL_FADE_MS + 40);
  }

  function getOpenMobilePanelKey() {
    if (shopsPanelOpen) return "shops";
    if (searchPanelOpen) return "search";
    if (cartModalOpen) return "cart";
    if (eanModalOpen) return "ean";
    if (activeResult === "compare") return "compare";
    if (activeResult === "offers") return "offers";
    if (activeResult === "singleCompare") return "singleCompare";
    return "none";
  }

  function transitionMobilePanel(
    nextPanel:
      | "none"
      | "shops"
      | "search"
      | "cart"
      | "compare"
      | "offers"
      | "singleCompare",
    applyNext: () => void,
  ) {
    const currentPanel = getOpenMobilePanelKey();
    if (currentPanel !== "none" && currentPanel !== nextPanel) {
      markPanelClosing(currentPanel);
      window.setTimeout(applyNext, PANEL_FADE_MS);
      return;
    }
    applyNext();
  }

  function closePanelWithFade(panelKey: string, applyClose: () => void) {
    markPanelClosing(panelKey);
    window.setTimeout(applyClose, PANEL_FADE_MS);
  }

  function openSearchPanel() {
    if (searchNavigationLocked) return;

    // v342_RESTORE_CART_SEARCH_NAV_FIX:
    // Reloadin jälkeen ostoskori voi olla palautettu, vaikka kauppavalintoja ei ole vielä tehty.
    // Hae-napin pitää silloin avata Hae-paneeli normaalisti eikä ohjata Kaupat-paneeliin.
    // Kaupat-paneeliin ohjataan vain täysin tyhjässä aloitustilassa, kun ei ole kauppavalintoja eikä korissa tuotteita.
    if (!storesReadyForSearch && cart.length === 0) {
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setEanModalOpen(false);
      closeProductSelectionOverlay();
      setSearchPanelOpen(false);
      setShopsPanelOpen(true);
      return;
    }

    // v236: Aloitussivu pysyy tyhjänä v234-tyyliin. Hae avataan kiinteänä yhtenä näkymänä, ei skrollattavana sivuna.
    // Hae-paneeli toimii mobiilissa erillisenä näkymänä: se sulkee korin/EANin/vertailun ja näkyy aina viewportissa.
    const openedFromSingleCompare = activeResult === "singleCompare";

    transitionMobilePanel("search", () => {
      setRestoredCartPromptV320({ open: false, count: 0 });
      setCartModalOpen(false);
      setShopsPanelOpen(false);
      setEanModalOpen(false);

      setInput((current) => current);
      setLoadingNormal(false);
      setNormalResults([]);
      setNormalSearchAttempted(false);
      setVisibleNormalCount(8);
      setActiveNormalSearchTerm("");
      setSearchDebug([]);

      if (openedFromSingleCompare) {
        setInput("");
      }

      setActiveResult("none");
      setSearchPanelOpen(true);

      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    });
  }

  function toggleSearchPanel() {
    if (searchNavigationLocked) return;

    // v342_RESTORE_CART_SEARCH_NAV_FIX:
    // Älä hyppää Kaupat-paneeliin, jos korissa on palautettuja tuotteita.
    // Tällöin käyttäjä saa avata Hae-paneelin ja bottom navin aktiivinen tila pysyy oikein vihreänä.
    if (!storesReadyForSearch && cart.length === 0) {
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setEanModalOpen(false);
      setActiveResult("none");
      setSearchPanelOpen(false);
      setShopsPanelOpen(true);
      return;
    }

    // Toinen painallus sulkee Hae-näkymän. Jos Kori on auki, vaihdetaan suoraan Hae-näkymään.
    if (searchPanelOpen) {
      closePanelWithFade("search", () => {
        setSearchPanelOpen(false);
        closeProductSelectionOverlay();
      });
      return;
    }

    openSearchPanel();
  }

  function closeSearchPanel() {
    closePanelWithFade("search", () => setSearchPanelOpen(false));
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
      alert(
        "Puhesanelu ei ole käytettävissä tässä selaimessa tai tässä osoitteessa. Kokeile puhelimella HTTPS-osoitteessa, esimerkiksi Vercel-testilinkissä.",
      );
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
    const chainFilteredOffers = offers.filter(
      (item) => chainFilter === "all" || item.chain === chainFilter,
    );
    const offerTerms = parseTerms(offerSearchQuerySnapshot || currentSearchQueryKey);
    return rankOfferSearchResults(chainFilteredOffers, offerTerms);
  }, [offers, offerSearchQuerySnapshot, currentSearchQueryKey, chainFilter]);

  const offerSearchLabel = useMemo(() => {
    const label = offerSearchQuerySnapshot || currentSearchQueryKey;
    return label || "haku";
  }, [offerSearchQuerySnapshot, currentSearchQueryKey]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + (item.price || 0) * item.quantity,
      0,
    );
  }, [cart]);

  const cartNameSet = useMemo(() => {
    return new Set(cart.map((item) => normalize(item.name)));
  }, [cart]);

  const visibleNormalResults = useMemo(() => {
    if (searchCompareMode === "single") return normalResults;
    return normalResults.filter(
      (product) => !cartNameSet.has(normalize(product.name)),
    );
  }, [normalResults, cartNameSet, searchCompareMode]);

  // Hakutulosten valintatila on eri käyttömoodi kuin korivertailu.
  // Kun käyttäjä valitsee seuraavaa tuotetta koriin, vertailukortteja ei näytetä
  // taustalla, vaikka vertailudataa päivitettäisiin samaan aikaan.
  const searchSelectionMode = loadingNormal || visibleNormalResults.length > 0;

  const comparableCart = useMemo(() => {
    // Muistilistarivit ovat keräilyä varten, eivät hintavertailua varten.
    // Näin pelkkä "maito,kala,cola"-muistilista ei riko huokeinta koria tai ketjuvertailua.
    return cart.filter((item) => !isManualShoppingItem(item));
  }, [cart]);

  const chainResults = useMemo<ChainResult[]>(() => {
    if (cart.length === 0) return [];
    const sList = comparableCart
      .map((item) => sMatches[item.id])
      .filter(Boolean);
    const kList = comparableCart
      .map((item) => kMatches[item.id])
      .filter(Boolean);
    const sTotal = sList.reduce(
      (sum, match) => sum + match.price * match.quantity,
      0,
    );
    const kTotal = kList.reduce(
      (sum, match) => sum + match.price * match.quantity,
      0,
    );

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
  }, [
    cart.length,
    comparableCart,
    sMatches,
    kMatches,
    activeStores,
    selectedChains,
  ]);

  const { completeResults, cheapest, secondCheapest, savings, savingsPercent } =
    useMemo(() => {
      const complete = chainResults.filter(
        (result) =>
          !result.comingSoon &&
          result.totalPrice > 0 &&
          result.missingItems === 0,
      );
      const best = complete[0];
      const runnerUp = complete[1];
      const difference =
        best && runnerUp ? runnerUp.totalPrice - best.totalPrice : 0;
      const percent =
        best && runnerUp && runnerUp.totalPrice > 0
          ? (difference / runnerUp.totalPrice) * 100
          : 0;

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
      return `Huokein täysi kori: ${cheapest.storeName} · ${savingsPercent.toFixed(1).replace(".", ",")} % huokeampi kuin seuraava`;
    }

    return cheapest ? `Huokein täysi kori: ${cheapest.storeName}` : "";
  }, [cheapest, secondCheapest, savings, savingsPercent]);

  const showCheapestSticky = useMemo(() => {
    // v319: Vertailu avautuu aina yleisnäkymään. Näytä iso huokein kori -kortti heti,
    // vaikka vertailussa olisi vain yksi valmis kauppa tai säästöä ei vielä synny.
    return cart.length > 0 && Boolean(cheapest);
  }, [cart.length, cheapest]);

  function getShoppingListItemKey(match: Match, index?: number) {
    // Stable key that survives refresh and grouping changes.
    // Do not depend on category-local index, because category rendering resets index per group.
    return (
      match.cartItemId ||
      match.product.ean ||
      `${match.product.id}-${normalize(match.product.name)}`
    );
  }

  const shoppingListItems = useMemo(() => {
    const matchedCartIds = new Set(
      (cheapest?.matches || [])
        .map((match) => match.cartItemId)
        .filter(Boolean),
    );

    const manualMatches = cart
      .filter(
        (item) => isManualShoppingItem(item) || !matchedCartIds.has(item.id),
      )
      .map(
        (item) =>
          ({
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
          }) as Match,
      );

    return cheapest?.matches?.length
      ? [...cheapest.matches, ...manualMatches]
      : manualMatches;
  }, [cheapest, cart]);

  const shoppingListKeys = useMemo(() => {
    return shoppingListItems.map((match, index) =>
      getShoppingListItemKey(match, index),
    );
  }, [shoppingListItems]);

  const bestShoppingListGroups = useMemo(() => {
    return shoppingListItems.reduce(
      (groups, match) => {
        const category = getProductCategoryLabel(
          match.product.name,
          match.product.category,
        );
        if (!groups[category]) groups[category] = [];
        groups[category].push(match);
        return groups;
      },
      {} as Record<string, Match[]>,
    );
  }, [shoppingListItems]);

  const { checkedCount, shoppingListCount, shoppingProgressPercent } =
    useMemo(() => {
      const checked = shoppingListKeys.filter(
        (key) => checkedCartItems[key],
      ).length;
      const total = shoppingListKeys.length;

      return {
        checkedCount: checked,
        shoppingListCount: total,
        shoppingProgressPercent: Math.round(
          (checked / Math.max(1, total)) * 100,
        ),
      };
    }, [shoppingListKeys, checkedCartItems]);

  useEffect(() => {
    try {
      const savedChecks = window.localStorage.getItem(
        "ziiply-shopping-checks-v1",
      );
      if (savedChecks) {
        const parsed = JSON.parse(savedChecks);
        if (parsed && typeof parsed === "object") {
          setCheckedCartItems(
            parsed.items && typeof parsed.items === "object"
              ? parsed.items
              : parsed,
          );
        }
      }
    } catch {
      // Ignore broken checklist data.
    } finally {
      shoppingChecksHaveLoadedRef.current = true;
    }
  }, []);

  function persistShoppingChecksImmediately(
    nextChecks: Record<string, boolean>,
  ) {
    try {
      window.localStorage.setItem(
        "ziiply-shopping-checks-v1",
        JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          items: nextChecks,
        }),
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
    // v318: Vertailu-kortin taustalle ei näytetä erillistä säästötoastia.
    setLastSavingsToast(null);
  }, [activeResult, cheapest?.key, cheapest?.totalPrice, savings]);

  useEffect(() => {
    // v319: Vertailu-kortti avautuu aina yleisnäkymän alkuun, ei edelliseen skrollipaikkaan
    // eikä suoraan kauppakohtaiseen tuotelistaan.
    if (activeResult !== "compare") return;
    requestAnimationFrame(() => {
      compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      comparisonSectionRef.current?.scrollIntoView?.({
        block: "start",
        behavior: "auto",
      });
    });
  }, [activeResult, cheapest?.key, cart.length]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToNextUncheckedShoppingItem(
    nextChecks: Record<string, boolean>,
    currentKey: string,
  ) {
    const currentIndex = shoppingListKeys.findIndex(
      (itemKey) => itemKey === currentKey,
    );
    if (currentIndex < 0) return;

    const orderedKeys = [
      ...shoppingListKeys.slice(currentIndex + 1),
      ...shoppingListKeys.slice(0, currentIndex),
    ];
    const nextKey = orderedKeys.find((itemKey) => !nextChecks[itemKey]);
    if (!nextKey) return;

    window.setTimeout(() => {
      shoppingItemRefs.current[nextKey]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 80);
  }

  function toggleShoppingListItem(match: Match, index: number) {
    const key = getShoppingListItemKey(match, index);

    setCheckedCartItems((current) => {
      const willBeChecked = !current[key];
      const next = {
        ...current,
        [key]: willBeChecked,
      };
      persistShoppingChecksImmediately(next);

      if (willBeChecked) {
        scrollToNextUncheckedShoppingItem(next, key);
      }

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

    const checkedCount = shoppingListKeys.filter(
      (key) => checkedCartItems[key],
    ).length;
    const ok = window.confirm(
      `Nollataanko keräilymerkinnät (${checkedCount}/${shoppingListKeys.length} kerätty)? Ostoskoriin jäävät tuotteet säilyvät.`,
    );
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

  function closeProductSelectionOverlay() {
    setLoadingNormal(false);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setNormalSearchAttempted(false);
    setActiveNormalSearchTerm("");
    if (activeResult !== "compare" && activeResult !== "singleCompare") {
      setActiveResult("none");
    }
  }

  function inferStoreModeForStoreV306(
    store: StoreSearchItem,
    fallbackMode: StoreMode = storeMode,
  ): StoreMode {
    const name = normalize(store.name || "");
    if (store.type === "S") {
      if (
        isSLocalStore(store) ||
        hasAnyToken(name, ["s-market", "s market", "alepa", "sale", "market"])
      )
        return "local";
      if (isPrisma(store)) return "hyper";
    }
    if (store.type === "K") {
      if (
        isKLocalStore(store) ||
        hasAnyToken(name, [
          "k-market",
          "k market",
          "k-supermarket",
          "k supermarket",
          "market",
        ])
      )
        return "local";
      if (isKCitymarket(store)) return "hyper";
    }
    return fallbackMode;
  }

  function handleStoreModeChange(nextMode: StoreMode) {
    if (storeCompareScope === "within_chain") return;

    selectedStoreModeRefV302.current = nextMode;
    // v308_STEP4C:
    // Tavaratalot/Lähikaupat-valinta ei saa automaattisesti aktivoida
    // Ketjujen väliltä -vertailutapaa. Vertailutapa muuttuu vain, kun
    // käyttäjä painaa itse Ketjujen väliltä tai Ketjun sisältä -nappia.
    setWithinChain(null);
    setStoreModeChosenV299(true);
    setOpenStorePicker(null);

    trackZiiplyEvent("store_mode_changed", {
      previousMode: storeMode,
      nextMode,
    });

    setStoreMode(nextMode);
    if (storeCompareScope === "between_chains") {
      setSelectedChains((current) => ({
        ...current,
        s: true,
        k: true,
        lidl: false,
        tokmanni: false,
      }));
    }
    clearSearchAndComparisonState();
  }

  function selectStoreForCurrentMode(
    store: StoreSearchItem,
    forcedMode?: StoreMode,
  ) {
    if (!store.id || !store.name) return;

    // v304_STORE_MODE_LOCK:
    // Kauppavalinta tehdään aina sen valintalaatikon moodiin, josta klikkaus tuli.
    // Älä päättele moodia uudelleen refistä/stateista, koska async-effectit voivat olla
    // ehtineet palauttaa storeMode-arvon hyperiksi juuri ennen kaupan klikkausta.
    const effectiveStoreMode =
      forcedMode || selectedStoreModeRefV302.current || storeMode;

    trackZiiplyEvent("store_selected", {
      storeId: store.id,
      storeName: store.name,
      chain: store.type || store.chain || "unknown",
      storeMode: effectiveStoreMode,
      city: store.city,
      postalCode: store.postalCode,
    });

    setActiveArea((current) => {
      if (effectiveStoreMode === "local") {
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

    // v306_STORE_PICKER_GPS_HARD_LOCK:
    // Kaupan valitseminen EI saa koskaan itsestään aktivoida Tavaratalot/Lähikaupat-nappia.
    // Moodin saa valita vain Hakutapa-napeista. Jos moodi on jo valittu, pidetään se vakaana.
    if (storeCompareScope === "between_chains") {
      // Vain käyttäjän lukitsema between_chains-hakutapa saa pysyä aktiivisena.
      // Ketjun sisällä -valinnat eivät saa muuttaa Tavaratalot/Lähikaupat-lukkoa.
      selectedStoreModeRefV302.current = effectiveStoreMode;
      setStoreMode(effectiveStoreMode);
    }

    setOpenStorePicker(null);

    clearSearchAndComparisonState();
    setLocationMessage(
      storeModeChosenV299
        ? `${store.name} valittu ${store.type === "S" ? "S-ryhmän" : "K-ryhmän"} ${effectiveStoreMode === "local" ? "lähikaupaksi" : "tavarataloksi"}.`
        : `${store.name} valittu. Valitse vielä Tavaratalot tai Lähikaupat.`,
    );
  }

  function clearStoreBackedSearchState() {
    setOffers([]);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setSMatches({});
    setKMatches({});
    setHasSearchedOffers(false);
    setActiveResult("none");
    setLastOptimizationSnapshot(null);
  }

  function rankStoresForMode(stores: StoreSearchItem[], mode: StoreMode) {
    const sStores = stores.filter((store) => store.type === "S");
    const kStores = stores.filter((store) => store.type === "K");

    const sHyper = pickStore(sStores, isPrisma);
    const kHyper = pickStore(kStores, isKCitymarket);
    const sLocal = pickStore(sStores, isSLocalStore);
    const kLocal = pickStore(kStores, isKLocalStore);

    return {
      sHyper,
      kHyper,
      sLocal,
      kLocal,
      selectedS: mode === "local" ? sLocal : sHyper,
      selectedK: mode === "local" ? kLocal : kHyper,
    };
  }

  function buildDynamicArea(
    query: string,
    stores: StoreSearchItem[],
    mode: StoreMode,
  ): Area {
    const matchedArea = findArea(query);
    const ranked = rankStoresForMode(stores, mode);

    const detectedCity =
      ranked.selectedS?.city ||
      ranked.selectedK?.city ||
      stores.find((store) => store.city)?.city ||
      matchedArea?.label ||
      query;

    return {
      label: detectedCity,
      aliases: Array.from(
        new Set(
          [...(matchedArea?.aliases || []), query, detectedCity].filter(
            Boolean,
          ),
        ),
      ),
      sStoreId: ranked.sHyper?.id,
      sStoreName: ranked.sHyper?.name,
      kStoreId: ranked.kHyper?.id,
      kStoreName: ranked.kHyper?.name,
      sLocalStoreId: ranked.sLocal?.id,
      sLocalStoreName: ranked.sLocal?.name,
      kLocalStoreId: ranked.kLocal?.id,
      kLocalStoreName: ranked.kLocal?.name,
    };
  }

  async function fetchStoresForLocationQuery(
    query: string,
    coords?: { latitude: number; longitude: number } | null,
  ) {
    const params = new URLSearchParams({ search: query });
    if (coords) {
      params.set("lat", String(coords.latitude));
      params.set("lon", String(coords.longitude));
      params.set("lng", String(coords.longitude));
      params.set("latitude", String(coords.latitude));
      params.set("longitude", String(coords.longitude));
    }
    const response = await fetch(`/api/store-search?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await response.json();
    const stores = ((data.items || []) as StoreSearchItem[]).filter(
      (store) => store.id && store.name,
    );

    // v320store-11:
    // Varmistetaan etäisyydet myös silloin, kun API ei palauta distance-kenttää.
    // Jos GPS-koordinaatti on käytössä ja kaupalla on koordinaatit, lasketaan distanceKm mukaan listadataan.
    if (!coords) return stores;

    return stores.map((store) => {
      const explicitDistanceKm = readExplicitDistanceKmV320(store);
      if (explicitDistanceKm != null) {
        return {
          ...store,
          distanceKm: explicitDistanceKm,
        };
      }

      const latitude = getStoreCoordinateV320(store, ["latitude", "lat", "y"]);
      const longitude = getStoreCoordinateV320(store, [
        "longitude",
        "lng",
        "lon",
        "x",
      ]);

      if (latitude == null || longitude == null) return store;

      return {
        ...store,
        distanceKm: calculateDistanceKmV320(coords, { latitude, longitude }),
      };
    });
  }

  function getCityFromGeocodeAddress(address: any) {
    return String(
      address?.city ||
        address?.town ||
        address?.municipality ||
        address?.village ||
        address?.suburb ||
        address?.county ||
        "",
    ).trim();
  }

  function isFinnishPostalCode(value: string) {
    return /^\d{5}$/.test(value.trim());
  }

  async function reverseGeocodeCity(latitude: number, longitude: number) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=fi`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return getCityFromGeocodeAddress(data?.address || {});
  }

  async function resolvePostalCodeToCity(postalCode: string) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=fi&postalcode=${encodeURIComponent(postalCode)}&addressdetails=1&limit=1&accept-language=fi`,
      { cache: "no-store" },
    );
    const data = await response.json();
    const firstMatch = Array.isArray(data) ? data[0] : null;
    return getCityFromGeocodeAddress(firstMatch?.address || {});
  }

  function getCurrentPosition() {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }


  function getMapSearchNameV393(value?: string | number | null) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function openSelectedStoresMapV393() {
    if (typeof window === "undefined") return;

    const sName = getMapSearchNameV393(activeStores.sStoreName || activeArea.sStoreName);
    const kName = getMapSearchNameV393(activeStores.kStoreName || activeArea.kStoreName);
    const area = getMapSearchNameV393(activeArea.label || locationInput || "");

    const hasBothStores =
      sName &&
      kName &&
      !sName.toLowerCase().includes("ei valittu") &&
      !kName.toLowerCase().includes("ei valittu") &&
      !sName.toLowerCase().includes("valitse ensin") &&
      !kName.toLowerCase().includes("valitse ensin");

    if (hasBothStores) {
      const origin = encodeURIComponent(`${sName} ${area} Suomi`);
      const destination = encodeURIComponent(`${kName} ${area} Suomi`);
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    const fallback = encodeURIComponent(`${area || "kauppa"} ruokakauppa Suomi`);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${fallback}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function applyLocation(
    queryOverride?: string,
    source: "manual" | "gps" = "manual",
    coordsOverride?: { latitude: number; longitude: number } | null,
  ) {
    const rawQuery = (queryOverride || locationInput).trim();

    if (!rawQuery) {
      setLocationMessage("Kirjoita ensin kaupunki, alue tai postinumero.");
      return;
    }

    if (source === "manual") {
      setUsingOwnLocation(false);
      setGpsCoordsV320(null);
    }

    setStoreSearchLoading(true);
    setLocationMessage(
      source === "gps"
        ? `Haetaan kauppoja alueelle ${rawQuery}...`
        : "Haetaan kauppoja...",
    );

    try {
      let query = rawQuery;

      if (isFinnishPostalCode(rawQuery)) {
        setLocationMessage(`Haetaan aluetta postinumerolle ${rawQuery}...`);
        const cityFromPostalCode = await resolvePostalCodeToCity(rawQuery);

        if (!cityFromPostalCode) {
          setFoundStores([]);
          setLocationMessage(
            `Postinumeroa "${rawQuery}" ei tunnistettu. Valitse alue käsin.`,
          );
          return;
        }

        query = cityFromPostalCode;
      }

      trackZiiplyEvent("store_search_used", {
        query,
        rawQuery,
        storeMode,
        source,
      });

      setLocationMessage(
        source === "gps"
          ? `Haetaan kauppoja alueelle ${query}...`
          : "Haetaan kauppoja...",
      );
      const stores = await fetchStoresForLocationQuery(
        query,
        source === "gps" ? coordsOverride || gpsCoordsV320 : null,
      );
      setFoundStores(stores);

      if (stores.length === 0) {
        setLocationMessage(
          `Alueelle "${query}" ei löytynyt kauppoja. Valitse alue käsin.`,
        );
        return;
      }

      const ranked = rankStoresForMode(
        stores,
        storeModeChosenV299 ? selectedStoreModeRefV302.current : storeMode,
      );
      const nextArea = buildDynamicArea(
        query,
        stores,
        storeModeChosenV299 ? selectedStoreModeRefV302.current : storeMode,
      );
      setActiveArea(nextArea);

      // v272: Nuppineula kertoo yksiselitteisesti käytetäänkö omaa sijaintia.
      // - GPS / oma sijainti: vihreä nuppineula, hakukenttä tyhjä ja placeholder näkyy.
      // - Käsin haettu sijainti: punainen nuppineula, löydetty sijainti näkyy kentässä.
      if (source === "gps") {
        setUsingOwnLocation(true);
        setLocationInput("");
      } else {
        setUsingOwnLocation(false);
        setLocationInput(nextArea.label || query);
      }

      clearStoreBackedSearchState();

      // v352_DESKTOP_GPS_DEFAULT_STORE_SELECTION:
      // GPS-löydön jälkeen oletuksena Tavaratalot + Ketjujen väliltä.
      if (source === "gps") {
        selectedStoreModeRefV302.current = "hyper";
        setStoreMode("hyper");
        setStoreModeChosenV299(true);
        setStoreCompareScope("between_chains");
        setWithinChain(null);
        setSelectedChains((current) => ({
          ...current,
          s: true,
          k: true,
          lidl: false,
          tokmanni: false,
        }));
      }

      if (typeof document !== "undefined") {
        const activeElement = document.activeElement as HTMLElement | null;
        activeElement?.blur?.();
      }

      const effectiveStoreModeForLocationMessage = source === "gps" ? "hyper" : storeMode;
      const modeMissing =
        effectiveStoreModeForLocationMessage === "local"
          ? !ranked.sLocal || !ranked.kLocal
          : !ranked.sHyper || !ranked.kHyper;

      if (modeMissing) {
        setLocationMessage(
          `${nextArea.label || query} löytyi, mutta kaikkia ${effectiveStoreModeForLocationMessage === "local" ? "lähikauppoja" : "tavarataloja"} ei löytynyt. Voit valita kaupat listasta.`,
        );
      } else {
        setLocationMessage(`${nextArea.label || query} käytössä.`);
      }
    } catch (error) {
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setLocationMessage(
        source === "gps"
          ? "Sijainti löytyi, mutta kauppahaku epäonnistui. Valitse alue käsin."
          : "Kauppahaku epäonnistui. Valitse alue käsin.",
      );
    } finally {
      setStoreSearchLoading(false);
    }
  }


  useEffect(() => {
    const query = locationInput.trim();

    if (!query || usingOwnLocation || storeSearchLoading) return;
    if (lastAutoAppliedLocationRefV361.current === query) return;

    const timer = window.setTimeout(() => {
      const nextQuery = locationInput.trim();
      if (!nextQuery || usingOwnLocation) return;
      if (lastAutoAppliedLocationRefV361.current === nextQuery) return;

      lastAutoAppliedLocationRefV361.current = nextQuery;
      void applyLocation(nextQuery, "manual");
    }, 800);

    return () => window.clearTimeout(timer);
  }, [locationInput, usingOwnLocation, storeSearchLoading]);

  async function useOwnLocation() {
    if (storeSearchLoading) return;

    setOpenStorePicker(null);
    setGpsStorePickerBlockedV382(true);
    gpsUserDisabledRefV306.current = false;
    setGpsErrorMessage("");
    setUsingOwnLocation(true);
    setLocationInput("");
    setStoreSearchLoading(true);
    setLocationMessage("Paikannetaan GPS…");

    try {
      const position = await getCurrentPosition();
      setGpsCoordsV320({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const city = await reverseGeocodeCity(
        position.coords.latitude,
        position.coords.longitude,
      );

      if (!city) {
        setGpsErrorMessage("GPS ei löydy");
        setLocationMessage("GPS ei löydy");
        setLocationMessageVisible(true);
        gpsUserDisabledRefV306.current = true;
        setUsingOwnLocation(false);
        setGpsCoordsV320(null);
        return;
      }

      setGpsErrorMessage("");
      setLocationMessage(`Käytetään GPS ${city}`);
      setLocationMessageVisible(true);
      setLocationInput("");
      setStoreSearchLoading(false);
      await applyLocation(city, "gps", {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setLocationMessage("GPS ei löydy");
      setLocationMessageVisible(true);
      gpsUserDisabledRefV306.current = true;
      setUsingOwnLocation(false);
      setStoreSearchLoading(false);
    } finally {
      window.setTimeout(() => {
        setGpsStorePickerBlockedV382(false);
      }, 180);
    }
  }

  // GPS_REFRESH_DEFAULT_ON_V310
  // Refreshissä GPS on aina päällä riippumatta siitä, oliko käyttäjä sammuttanut sen ennen refreshiä.
  // Käynnistetään sijaintihaku kerran, jotta kauppalistat löytyvät ilman GPS-togglea.
  useEffect(() => {
    gpsUserDisabledRefV306.current = false;
    setUsingOwnLocation(true);
    window.setTimeout(() => {
      if (!gpsUserDisabledRefV306.current) {
        useOwnLocation();
      }
    }, 0);
  }, []);

  async function searchOffers(termOverride?: string) {
    const useTerms = termOverride ? parseTerms(termOverride) : terms;

    if (useTerms.length === 0) {
      setHasSearchedOffers(false);
      setOffers([]);
      setActiveResult("none");
      return;
    }

    if (!hasActiveStores) {
      setLocationMessage(
        "Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.",
      );
      setHasSearchedOffers(false);
      setOffers([]);
      setActiveResult("none");
      return;
    }

    const isMainOfferSearch = !termOverride;
    const offerQuerySnapshot = useTerms.join(", ").trim() || String(termOverride || input).trim();
    setOfferSearchQuerySnapshot(offerQuerySnapshot);

    trackZiiplyEvent("offers_search_used", {
      query: useTerms.join(", "),
      termCount: useTerms.length,
      isMainSearch: isMainOfferSearch,
      cartItemsCount: cart.length,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    if (termOverride) setInput(termOverride);

    // Uusi hinnanhuojennushaku ei enää tyhjennä ostoskoria. Käyttäjä voi lisätä tuotteita nykyiseen koriin.
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
        fetch(`/api/offers?storeId=${activeStores.sStoreId}`, {
          cache: "no-store",
        }),
        fetch(`/api/offers?storeId=${activeStores.kStoreId}`, {
          cache: "no-store",
        }),
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
      setOfferSearchDoneForQuery(offerQuerySnapshot);
    } catch (error) {
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }

  async function searchNormalPrices(termOverride?: string, forceEan = false) {
    const useTerms = termOverride
      ? searchCompareMode === "single"
        ? [getSingleSearchTerm(termOverride)].filter(Boolean)
        : parseTerms(termOverride)
      : searchCompareMode === "single"
        ? [getSingleSearchTerm(input)].filter(Boolean)
        : terms;
    if (useTerms.length === 0) {
      setActiveNormalSearchTerm("");
      setNormalSearchAttempted(false);
      return;
    }

    if (!hasActiveStores) {
      setLocationMessage(
        "Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.",
      );
      setActiveNormalSearchTerm("");
      setNormalResults([]);
      setNormalSearchAttempted(false);
      return;
    }

    const isMainSearch = !termOverride;
    const focusedSearchTerms = useTerms.length > 1 ? [useTerms[0]] : useTerms;

    if (focusedSearchTerms.every(isLowSignalProductSearchTerm)) {
      if (termOverride) setInput(termOverride);
      setLoadingNormal(false);
      setNormalSearchAttempted(true);
      setSearchDebug([]);
      setVisibleNormalCount(8);
      setActiveNormalSearchTerm(focusedSearchTerms[0] || "");
      setNormalResults([]);
      setActiveResult("none");
      setSearchPanelOpen(true);
      return;
    }

    trackZiiplyEvent("search_used", {
      query: useTerms.join(", "),
      termCount: useTerms.length,
      focusedTerm: focusedSearchTerms[0] || "",
      queuedTermCount: Math.max(0, useTerms.length - focusedSearchTerms.length),
      isMainSearch,
      forceEan,
      cartItemsCount: cart.length,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    if (termOverride) setInput(termOverride);

    if (isMainSearch) {
      // Uusi Hae-haku ei enää tyhjennä ostoskoria. Vain vanhat vertailuosumat nollataan,
      // jotta seuraava vertailu rakennetaan nykyisen korin ja uusien hakutulosten pohjalta.
      setSMatches({});
      setKMatches({});
      setLastOptimizationSnapshot(null);
    }

    setLoadingNormal(true);
    setNormalSearchAttempted(true);
    setSearchDebug([]);
    setVisibleNormalCount(8);
    if (isMainSearch) setNotFoundSearchTerms([]);
    setActiveNormalSearchTerm(focusedSearchTerms[0] || "");
    // Normaali haku avaa hakutulosten valintanäkymän, ei korivertailua.
    // Korivertailu avataan vain Vertailu-tabista tai ostoslistatoiminnoista.
    setActiveResult("none");

    const debugEntries: SearchDebugEntry[] = [];

    try {
      const all: Product[] = [];

      for (const term of focusedSearchTerms) {
        // Normaali haku on S-first: haetaan S-tuote ensin /api/s-products-routesta.
        // Monen tuotteen haussa näytetään vain seuraavan jonossa olevan tuotteen kandidaatit.
        // Näin "maito, kahvi, cola" käyttää samaa relevance-logiikkaa kuin yksittäinen haku:
        // valitse maito -> valitse kahvi -> valitse cola.
        // K-vastine haetaan vasta ostoskori-/vertailuvaiheessa.
        const searchQueries = getNormalSearchQueries(term).slice(0, 8);

        for (const searchQuery of searchQueries) {
          let rawItems: Product[] = await fetchSProducts(
            searchQuery,
            activeStores.sStoreId,
          );
          let usedStoreName = activeStores.sStoreName;
          let fallbackStoreName = "";

          if (rawItems.length === 0 && shouldUseLocalFallback("S")) {
            if (activeArea.sStoreId)
              rawItems = await fetchSProducts(searchQuery, activeArea.sStoreId);
            fallbackStoreName = activeArea.sStoreName || "S-tavaratalo";
            usedStoreName = activeArea.sStoreName || "S-tavaratalo";
          }

          const pricedItems = rawItems.filter(
            (product: Product) => getProductPrice(product) > 0,
          );
          const eggLockedSearch =
            detectSearchIntent(term).category === "egg" ||
            isEggSearchTerm(term) ||
            isEggSearchTerm(searchQuery);
          const normalFiltered = pricedItems
            .filter(
              (product: Product) => !isBadNormalResult(product, searchQuery),
            )
            .filter(
              (product: Product) =>
                !eggLockedSearch || isClearlyEggProduct(product.name),
            );

          // Fail-open pidetään vain yleisissä hauissa. Kananmunahaussa se aiheutti sen,
          // että "kananmunaton pasta" palasi tuloksiin, jos kaikki aidot osumat putosivat.
          const safeItems = eggLockedSearch
            ? normalFiltered
            : normalFiltered.length > 0
              ? normalFiltered
              : pricedItems;

          const finalItems = rankNormalSearchResults(searchQuery, safeItems)
            .slice(0, 40)
            .map((product) => {
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

          debugEntries.push({
            term,
            query: searchQuery,
            storeName: usedStoreName,
            rawCount: rawItems.length,
            pricedCount: pricedItems.length,
            badFilterCount: normalFiltered.length,
            safeCount: safeItems.length,
            finalCount: finalItems.length,
            rejectedByPrice: rawItems.length - pricedItems.length,
            rejectedByBadFilter: pricedItems.length - normalFiltered.length,
            fallbackStoreName: fallbackStoreName || undefined,
          });

          all.push(...finalItems);
        }
      }

      const unique = Array.from(
        new Map(all.map((item) => [item.id, item])).values(),
      )
        .filter((item) => {
          const originalQuery =
            (item as Product & { originalSearchTerm?: string })
              .originalSearchTerm ||
            useTerms[0] ||
            "";
          if (
            detectSearchIntent(originalQuery).category === "egg" ||
            isEggSearchTerm(originalQuery)
          ) {
            return isClearlyEggProduct(item.name);
          }
          if (!normalize(originalQuery).includes("jauheliha")) return true;
          return normalize(`${item.name} ${item.category || ""}`).includes(
            "jauheliha",
          );
        })
        .sort((a, b) => {
          const aOriginalQuery =
            (a as Product & { originalSearchTerm?: string })
              .originalSearchTerm ||
            useTerms[0] ||
            "";
          const bOriginalQuery =
            (b as Product & { originalSearchTerm?: string })
              .originalSearchTerm ||
            useTerms[0] ||
            "";
          const directNameDifference =
            scoreDirectQueryNameMatch(bOriginalQuery, b.name) -
            scoreDirectQueryNameMatch(aOriginalQuery, a.name);

          if (Math.abs(directNameDifference) > 12) return directNameDifference;

          return (
            scoreNormalSResult(bOriginalQuery, b) -
            scoreNormalSResult(aOriginalQuery, a)
          );
        });

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

      setSearchDebug(debugEntries);
      setNormalResults(unique);

      if (unique.length === 0) {
        const missingTerm = focusedSearchTerms[0] || useTerms[0] || "";
        if (missingTerm) {
          setNotFoundSearchTerms((current) =>
            current.includes(missingTerm) ? current : [...current, missingTerm],
          );
        }

        const remainingTerms = useTerms.slice(focusedSearchTerms.length);
        if (remainingTerms.length > 0) {
          const remainingInput = remainingTerms.join(", ");
          setInput(remainingInput);
          window.setTimeout(() => {
            void searchNormalPrices(remainingInput);
          }, 80);
          return;
        }
      }

      if (unique.length === 0 && isMainSearch) {
        setSearchPanelOpen(true);
      }
    } catch (error) {
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setSearchDebug(debugEntries);
      setNormalResults([]);
      if (isMainSearch) {
        setSearchPanelOpen(true);
      }
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

  async function findBestKMatchForStore(
    query: string,
    storeId: number,
    ean?: string,
  ) {
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

  async function updateChainComparison(
    nextCart = cart,
    options: { openCompare?: boolean } = {},
  ) {
    const shouldOpenCompare = options.openCompare !== false;

    trackZiiplyEvent("comparison_opened", {
      cartItemsCount: nextCart.length,
      totalQuantity: nextCart.reduce((sum, item) => sum + item.quantity, 0),
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    setComparisonLoading(true);
    if (shouldOpenCompare) setActiveResult("compare");

    try {
      const nextSMatches: Record<string, Match> = {};
      const nextKMatches: Record<string, Match> = {};

      await Promise.all(
        nextCart.map(async (item) => {
          if (item.chain === "S" && item.price && item.product) {
            nextSMatches[item.id] = {
              product: item.product,
              price: item.price,
              quantity: item.quantity,
              matchType: "ean",
              cartItemId: item.id,
            };
          } else {
            try {
              let items = await fetchSProducts(
                item.name,
                activeStores.sStoreId,
              );
              let best = pickBestSProduct(items, item.name, item.ean);
              let fallbackStoreName = "";

              if (!best && shouldUseLocalFallback("S")) {
                if (activeArea.sStoreId)
                  items = await fetchSProducts(item.name, activeArea.sStoreId);
                best = pickBestSProduct(items, item.name, item.ean);
                fallbackStoreName =
                  activeArea.sStoreName ||
                  activeStores.sStoreName ||
                  "S-kauppa";
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
            nextKMatches[item.id] = {
              product: item.product,
              price: item.price,
              quantity: item.quantity,
              matchType: "ean",
              cartItemId: item.id,
            };
          } else {
            try {
              let best: KProduct | undefined;
              let fallbackStoreName = "";

              best = await findBestKMatchForStore(
                item.name,
                activeStores.kStoreId,
                item.ean,
              );

              if (!best && shouldUseLocalFallback("K")) {
                if (activeArea.kStoreId)
                  best = await findBestKMatchForStore(
                    item.name,
                    activeArea.kStoreId,
                    item.ean,
                  );

                if (best) {
                  fallbackStoreName =
                    activeArea.kStoreName ||
                    activeStores.kStoreName ||
                    "K-kauppa";
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
        }),
      );

      setSMatches(nextSMatches);
      setKMatches(nextKMatches);
    } finally {
      setComparisonLoading(false);
    }
  }

  useEffect(() => {
    if (cart.length === 0 || !hasActiveStores) {
      if (cart.length === 0) {
        setSMatches({});
        setKMatches({});
      }
      return;
    }

    const timer = window.setTimeout(() => {
      void updateChainComparison(cart, { openCompare: false });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    cart,
    hasActiveStores,
    activeStores.sStoreId,
    activeStores.kStoreId,
    activeStores.sStoreName,
    activeStores.kStoreName,
    storeMode,
    storeCompareScope,
    withinChain,
  ]);

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

    const nextCart = [...cart, newItem];
    setCart(nextCart);
    persistCartImmediately(nextCart);
    showCartToast(`Lisätty ostoskoriin: ${name}`);
    void updateChainComparison(nextCart, { openCompare: false });
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

      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${HTML5_QRCODE_SCRIPT_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve((window as any).Html5Qrcode),
          { once: true },
        );
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
    if (
      previous?.code === normalizedCode &&
      now - previous.at < SAME_EAN_RESCAN_LOCK_MS
    ) {
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
    setEanScannerMessage(
      `Luettu ${normalizedCode}. Kamera pysyy päällä seuraavaa tuotetta varten.`,
    );
    setEanMessage(`Skannattu EAN: ${normalizedCode}. Haetaan...`);
    void searchByEan(normalizedCode);
  }

  async function toggleScannerTorch() {
    try {
      const track = getScannerVideoTrack();
      if (!track) {
        setEanScannerMessage(
          "Valoa voi kokeilla vasta, kun kamera on käynnissä.",
        );
        return;
      }

      const capabilities =
        typeof track.getCapabilities === "function"
          ? (track.getCapabilities() as any)
          : {};
      if (!capabilities.torch) {
        setEanScannerMessage(
          "Tämä selain tai kamera ei tue taskuvaloa. Hyvä yleisvalo toimii yleensä paremmin.",
        );
        return;
      }

      const nextTorchState = !scannerTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorchState }],
      } as any);
      setScannerTorchOn(nextTorchState);
      setEanScannerMessage(
        nextTorchState
          ? "Valo päällä kokeiluna. Jos pakkaus heijastaa, sammuta valo."
          : "Valo pois päältä.",
      );
    } catch {
      setEanScannerMessage("Taskuvaloa ei saatu vaihdettua tässä selaimessa.");
    }
  }

  async function stopEanCameraScanner(
    options: { keepScannerOpenState?: boolean } = {},
  ) {
    const scanner = eanHtml5ScannerRef.current;
    eanHtml5ScannerRef.current = null;
    lastContinuousScanRef.current = null;
    setScannerTorchOn(false);

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

    if (!options.keepScannerOpenState) {
      setEanScannerOpen(false);
    }
  }

  async function startEanCameraScanner() {
    if (typeof window === "undefined" || typeof navigator === "undefined")
      return;

    if (!window.isSecureContext) {
      setEanScannerMessage(
        "Kamera toimii vain HTTPS-osoitteessa. Avaa Ziiply Vercelin live-osoitteesta.",
      );
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

      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      );

      const scannerElement = document.getElementById(EAN_SCANNER_REGION_ID);

      if (!scannerElement) {
        setEanScannerMessage(
          "Kameranäkymää ei saatu avattua. Sulje EAN-ikkuna ja yritä uudelleen.",
        );
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

      const scanner = new Html5Qrcode(
        EAN_SCANNER_REGION_ID,
        formatsToSupport ? { formatsToSupport } : undefined,
      );
      eanHtml5ScannerRef.current = scanner;

      setEanScannerMessage(
        "Aseta viivakoodi kehykseen. Napauta kuvaa tarkennusta varten.",
      );

      await scanner.start(
        {
          facingMode: { exact: "environment" },
        },
        {
          fps: 12,
          aspectRatio: 4 / 3,
          disableFlip: false,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1440 },
            focusMode: "continuous",
            exposureMode: "continuous",
            whiteBalanceMode: "continuous",
            advanced: [
              { focusMode: "continuous" },
              { exposureMode: "continuous" },
              { whiteBalanceMode: "continuous" },
              { zoom: 1 },
            ],
          },
        },
        (decodedText: string) => {
          const code = normalizeEan(decodedText);
          if (isUsableEan(code)) finishScannedEan(code);
        },
        () => undefined,
      );

      window.requestAnimationFrame(() => {
        void applyBestEffortScannerCameraTuning();
      });
    } catch (error) {
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      await stopEanCameraScanner();
      setEanScannerMessage(
        "Kameraa ei saatu avattua tai skanneri ei käynnistynyt. Tarkista kameran lupa ja yritä uudelleen.",
      );
    }
  }

  async function closeEanModal() {
    // v310: skanneri sulkeutuu pehmeällä haihtumisella.
    // Taustalle palautetaan Hae-kortti ensin, jonka jälkeen kamera-overlay
    // häivytetään pois riittävän hitaasti ilman layout-hyppyä.
    if (eanModalClosing) return;

    setSuppressUiForEanClose(true);
    setEanModalClosing(true);

    if (eanAutoSearchTimeoutRef.current) {
      window.clearTimeout(eanAutoSearchTimeoutRef.current);
      eanAutoSearchTimeoutRef.current = null;
    }

    setActiveResult("none");
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(!storesReadyForSearch);
    setSearchPanelOpen(storesReadyForSearch);

    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve()),
    );
    await new Promise<void>((resolve) => window.setTimeout(resolve, 720));

    await stopEanCameraScanner({ keepScannerOpenState: true });

    setEanManualInputOpen(false);
    setEanInput("");
    setEanResults([]);
    setEanMessage("");
    setEanScannerMessage("");
    setEanLoading(false);
    eanSearchInFlightRef.current = null;
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;

    setEanScannerOpen(false);
    setDesktopKeyboardScannerOpen(false);
    setEanModalOpen(false);
    setEanModalClosing(false);
    setSuppressUiForEanClose(false);
  }

  function openEanModal() {
    trackZiiplyEvent("barcode_scanner_opened", {
      cartItemsCount: cart.length,
    });

    if (eanModalOpen) {
      void closeEanModal();
      return;
    }

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setActiveResult("none");
    setEanModalClosing(false);
    setEanModalOpen(true);
    setDesktopKeyboardScannerOpen(false);
    setEanManualInputOpen(false);
    setEanMessage("");
    setEanResults([]);
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;

    // EAN / viivakoodi -napista avataan kamera suoraan.
    window.setTimeout(() => {
      void startEanCameraScanner();
    }, 120);
  }

  function openDesktopScanner() {
    // Desktopissa Skanneri-nappi avaa ensin valinnan:
    // 1) nykyinen kameraskanneri
    // 2) erillinen USB/Bluetooth-viivakoodinlukija, joka toimii näppäimistönä.
    // Mobiilin kameraskanneriflow'hun ei kosketa tässä.
    if (eanModalOpen) {
      void closeEanModal();
      return;
    }

    trackZiiplyEvent("desktop_scanner_selector_opened", {
      cartItemsCount: cart.length,
    });

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setActiveResult("none");
    setEanModalClosing(false);
    setSuppressUiForEanClose(false);
    setEanModalOpen(true);
    setDesktopKeyboardScannerOpen(false);
    setEanScannerOpen(false);
    setEanManualInputOpen(false);
    setEanInput("");
    setEanMessage("");
    setEanResults([]);
    setEanScannerMessage("");
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
  }

  function openDesktopCameraScanner() {
    trackZiiplyEvent("desktop_camera_scanner_opened", {
      cartItemsCount: cart.length,
    });

    setDesktopKeyboardScannerOpen(false);
    setEanManualInputOpen(false);
    setEanInput("");
    setEanMessage("");
    setEanResults([]);
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setEanScannerMessage("Suuntaa tuotteen viivakoodi kameralle.");
    setEanScannerOpen(true);

    window.setTimeout(() => {
      void startEanCameraScanner();
    }, 120);
  }

  function openDesktopKeyboardScanner() {
    trackZiiplyEvent("desktop_barcode_reader_opened", {
      cartItemsCount: cart.length,
    });

    setDesktopKeyboardScannerOpen(true);
    setEanScannerOpen(false);
    setEanManualInputOpen(true);
    setEanInput("");
    setEanMessage("");
    setEanResults([]);
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setEanScannerMessage(
      "Skannaa viivakoodi USB- tai Bluetooth-lukijalla. Lukija kirjoittaa EAN-koodin tähän kenttään ja lähettää yleensä Enterin lopuksi.",
    );

    window.setTimeout(() => {
      eanInputRef.current?.focus();
    }, 80);
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

    trackZiiplyEvent("barcode_search_used", {
      ean,
      cartItemsCount: cart.length,
    });

    eanSearchInFlightRef.current = ean;
    setEanLoading(true);
    setEanMessage("");
    setEanResults([]);

    try {
      const variants = getEanSearchVariants(ean);

      const cachedName =
        variants.map((variant) => eanCache[variant]).find(Boolean) ||
        eanCache[ean];

      const externalNames = cachedName
        ? []
        : await fetchOpenFoodFactsNames(ean);
      const nameCandidates = Array.from(
        new Set([cachedName, ...externalNames].filter(Boolean) as string[]),
      );

      const exactResultsByKey = new Map<string, EanSearchResult>();

      // EAN-modalissa näytetään vain tarkat EAN-osumat.
      // Open Food Factsia ja cachea käytetään vain nimen löytämiseen,
      // jotta ruoanhinta.fi:n nimihaku palauttaa tuotteita, joiden EAN tarkistetaan vielä erikseen.
      for (const nameCandidate of nameCandidates) {
        const [sProducts, kProducts] = await Promise.all([
          fetchSProducts(nameCandidate, activeStores.sStoreId).catch(
            () => [] as Product[],
          ),
          fetchKProducts(nameCandidate, activeStores.kStoreId).catch(
            () => [] as KProduct[],
          ),
        ]);

        for (const product of sProducts) {
          if (getProductPrice(product) <= 0) continue;
          if (!isSameEan(product.ean, variants)) continue;

          exactResultsByKey.set(
            `S-${normalizeEan(product.ean)}-${product.id}`,
            {
              key: `S-ean-exact-${product.id}`,
              chain: "S" as const,
              storeName: activeStores.sStoreName,
              product,
              eanMatch: true,
            },
          );
        }

        for (const product of kProducts) {
          if (product.price <= 0) continue;
          if (!isSameEan(product.ean, variants)) continue;

          const converted = convertKProductToProduct(product);

          exactResultsByKey.set(
            `K-${normalizeEan(product.ean)}-${product.id}`,
            {
              key: `K-ean-exact-${product.id}`,
              chain: "K" as const,
              storeName: activeStores.kStoreName,
              product: {
                ...converted,
                ean: product.ean,
              },
              eanMatch: true,
            },
          );
        }
      }

      // Debug-varmistus: kokeillaan myös suoraa EAN-hakua, mutta hyväksytään vain tarkat EAN-osumat.
      const [sDirectGroups, kDirectGroups] = await Promise.all([
        Promise.all(
          variants.map((variant) =>
            fetchSProducts(variant, activeStores.sStoreId).catch(
              () => [] as Product[],
            ),
          ),
        ),
        Promise.all(
          variants.map((variant) =>
            fetchKProducts(variant, activeStores.kStoreId).catch(
              () => [] as KProduct[],
            ),
          ),
        ),
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
        (a, b) => getProductPrice(a.product) - getProductPrice(b.product),
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
          // Yksi tuote -tilassa skannaus toimii kuten tekstihaku: avaa vertailu,
          // ei lisää tuotetta suoraan ostoskoriin. Koko kori -tilassa säilyy vanha pikalisäys.
          if (searchCompareMode === "single") {
            await stopEanCameraScanner();
            await compareEanResultAsSingle(exactResults[0]);
          } else {
            // Automaattisen EAN-haun yhden täsmäosuman polku pidetään hiljaisena:
            // ei renderöidä välissä tuloskorttia, jotta EAN-ikkuna ei hypi.
            addEanResultToCart(exactResults[0]);
          }
        } else if (exactResults.length === 1) {
          if (eanScannerOpen || eanHtml5ScannerRef.current)
            showScanSuccessFlash();
          setEanResults(exactResults.slice(0, 8));
          setEanMessage("Löytyi 1 tarkka EAN-osuma.");
        } else {
          // Kamera löysi oikean EANin, vaikka käyttäjän pitää valita useasta osumasta.
          // Näytetään vihreä palaute myös tässä tilanteessa, ei punaista virhettä.
          if (eanScannerOpen || eanHtml5ScannerRef.current)
            showScanSuccessFlash();
          setEanResults(exactResults.slice(0, 8));
          setEanMessage(
            `Löytyi ${exactResults.length} tarkkaa EAN-osumaa. Valitse lisättävä tuote.`,
          );
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
        setEanMessage(
          "Tuote tunnistettiin osittain, mutta valituista kaupoista ei löytynyt tarkkaa EAN-osumaa.",
        );
      } else {
        setEanMessage(
          "EAN-koodilla ei löytynyt tarkkaa tuotetta valituista kaupoista.",
        );
      }
    } catch (error) {
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      setEanResults([]);
      setEanSearchStartedAutomatically(false);
      eanAutoSearchActiveRef.current = false;
      setEanMessage(
        "EAN-haku epäonnistui. Kokeile uudelleen tai käytä normaalia hakua.",
      );
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

  async function compareEanResultAsSingle(result: EanSearchResult) {
    const selectedName = fixText(result.product.name);
    const selectedPrice = getProductPrice(result.product);

    if (!selectedName || selectedPrice <= 0 || singleProductCompareLoading)
      return;

    trackZiiplyEvent("single_product_selected_for_compare", {
      productName: selectedName,
      ean: result.product.ean,
      source: "barcode_scanner",
      chain: result.chain,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setEanManualInputOpen(false);
    setEanResults([]);
    setEanInput("");
    setEanMessage("");
    setEanScannerMessage("");
    setLastAutoEanSearch("");
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setNormalResults([]);
    setVisibleNormalCount(8);
    setActiveNormalSearchTerm("");
    setSingleProductCompareTerm(selectedName);
    setSingleProductCompareResults([]);
    setSingleProductCompareLoading(true);
    setActiveResult("singleCompare");

    try {
      const nextResults: SingleProductCompareResult[] = [
        {
          key: result.chain.toLowerCase() as "s" | "k",
          chain: result.chain === "S" ? "S-ryhmä" : "K-ryhmä",
          storeName: result.storeName,
          productName: selectedName,
          price: selectedPrice,
          ean: result.product.ean,
          image: result.product.pictureUrl,
          comparisonPrice: formatComparisonPrice(result.product),
        },
      ];

      try {
        if (result.chain === "S") {
          let kBest: KProduct | undefined;
          const selectedEan = normalizeEan(result.product.ean);

          for (const kSearchTerm of getKSearchTerms(selectedName)) {
            const kItems = await fetchKProducts(
              kSearchTerm,
              activeStores.kStoreId,
            );
            kBest = pickBestKProduct(kItems, selectedName, selectedEan);
            if (kBest && !shouldKeepSearchingKOwnBrand(selectedName, kBest))
              break;
          }

          if (kBest && kBest.price > 0) {
            nextResults.push({
              key: "k",
              chain: "K-ryhmä",
              storeName: activeStores.kStoreName,
              productName: fixText(kBest.name),
              price: kBest.price,
              ean: kBest.ean,
              image: kBest.pictureUrl,
              comparisonPrice: null,
            });
          }
        } else {
          let sBest: Product | undefined;
          const selectedEan = normalizeEan(result.product.ean);

          for (const sSearchTerm of getNormalSearchQueries(selectedName).slice(
            0,
            6,
          )) {
            const sItems = await fetchSProducts(
              sSearchTerm,
              activeStores.sStoreId,
            );
            sBest = pickBestSProduct(sItems, selectedName, selectedEan);
            if (sBest && getProductPrice(sBest) > 0) break;
          }

          if (sBest && getProductPrice(sBest) > 0) {
            nextResults.push({
              key: "s",
              chain: "S-ryhmä",
              storeName: activeStores.sStoreName,
              productName: fixText(sBest.name),
              price: getProductPrice(sBest),
              ean: sBest.ean,
              image: sBest.pictureUrl,
              comparisonPrice: formatComparisonPrice(sBest),
            });
          }
        }
      } catch {}

      setSingleProductCompareResults(
        nextResults.sort((a, b) => a.price - b.price),
      );
    } finally {
      setSingleProductCompareLoading(false);
      window.requestAnimationFrame(() => {
        compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  function addEanResultToCart(result: EanSearchResult) {
    const ean = normalizeEan(result.product.ean || eanInput);
    if (isUsableEan(ean)) {
      lastContinuousScanRef.current = { code: ean, at: Date.now() };
    }

    const productName = fixText(result.product.name);
    const addKey = `${result.chain}-${ean || normalize(productName)}-${result.product.id}`;
    const now = Date.now();

    // Estää saman EAN-osuman tupla-ajon, jos automaattihaku ja käyttäjän toiminto
    // ehtivät kutsua lisäystä lähes samaan aikaan.
    if (
      lastEanCartAddRef.current?.key === addKey &&
      now - lastEanCartAddRef.current.at < 2500
    ) {
      return;
    }

    lastEanCartAddRef.current = { key: addKey, at: now };

    trackZiiplyEvent("product_added_to_cart", {
      source: eanScannerOpen ? "barcode_scanner" : "ean_search",
      productName,
      ean: ean || result.product.ean,
      chain: result.chain,
      storeName: result.storeName,
      price: getProductPrice(result.product),
    });

    triggerHaptic();
    playScanSuccessFeedback();
    showScanSuccessFlash();

    let cartLimitReached = false;

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => {
        const itemEan = normalizeEan(item.ean || item.product?.ean);
        if (isUsableEan(ean) && itemEan === ean) return true;
        return normalize(item.name) === normalize(productName);
      });

      if (existingItem) {
        const nextCart = currentCart.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );

        persistCartImmediately(nextCart);
        void updateChainComparison(nextCart, { openCompare: false });
        showCartToast(`Määrä +1: ${existingItem.name}`);
        return nextCart;
      }

      if (currentCart.length >= MAX_ITEMS) {
        cartLimitReached = true;
        return currentCart;
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

      const nextCart = [...currentCart, newItem];
      persistCartImmediately(nextCart);
      void updateChainComparison(nextCart, { openCompare: false });
      showCartToast(`Lisätty: ${newItem.name}`);

      const normalizedEan = normalizeEan(newItem.ean);
      if (isUsableEan(normalizedEan)) {
        setEanCache((prev) => ({
          ...prev,
          [normalizedEan]: newItem.name,
        }));
      }

      return nextCart;
    });

    if (cartLimitReached) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    // EAN/skannerilisäys ei saa siirtää käyttäjää automaattisesti Vertailu-kortille.
    // Vertailu päivittyy taustalla ja avataan vain käyttäjän omasta Vertailu-napista.

    // Jätä EAN-ikkuna auki seuraavaa koodia/kameraskannausta varten.
    setEanInput("");
    setEanResults([]);
    setEanLoading(false);
    setEanSearchStartedAutomatically(false);
    eanAutoSearchActiveRef.current = false;
    setEanMessage("");
    if (eanHtml5ScannerRef.current) {
      setEanScannerOpen(true);
      setEanScannerMessage(
        "Lisätty koriin. Kamera pysyy päällä seuraavaa tuotetta varten.",
      );
    }
    setLastAutoEanSearch("");

    window.setTimeout(() => {
      eanInputRef.current?.focus();
    }, 0);
  }

  function removeMatchingSearchTerm(product: Product) {
    const currentTerms = parseTerms(input);
    const productName = normalize(product.name);
    const looseProductName = normalizeLooseProductMatch(product.name);
    const originalSearchTerm = normalizeLooseProductMatch(
      (product as Product & { originalSearchTerm?: string })
        .originalSearchTerm || "",
    );

    const matchedTerm = currentTerms.find((term) => {
      const normalizedTerm = normalize(term);
      const looseTerm = normalizeLooseProductMatch(term);
      const normalizedSearchQuery = normalize(getSearchQuery(term));
      const looseSearchQuery = normalizeLooseProductMatch(getSearchQuery(term));

      // Jos hakutulos on tuotettu tietylle jonotermille, se termi poistetaan varmasti.
      // Tämä estää viimeisen moniosaisen haun kuten "tuore kala" jäämisen Hae-kortille.
      if (originalSearchTerm && looseTerm === originalSearchTerm) return true;

      // Jauheliha-haussa hakukysely voi tietoisesti hakea ydintermillä "jauheliha".
      const termIsGroundMeat = normalizedTerm.includes("jauheliha");
      const productIsGroundMeat = productName.includes("jauheliha");

      // Cola/limsa: koko voi olla muodossa "1,5L" tai "1,5 l".
      // Normalisoidaan koko ennen vertailua, jotta Coca Cola zero 1,5L poistuu jonosta.
      const termIsCola = isColaSearchTerm(term);
      const productIsCola = isClearlyColaProduct(product.name);
      const termSize = getMetricSizeKey(term);
      const productSize = getMetricSizeKey(product.name);
      const colaSizeMatches =
        !termSize || !productSize || termSize === productSize;

      return (
        normalizedTerm.length > 0 &&
        (productName.includes(normalizedTerm) ||
          productName.includes(normalizedSearchQuery) ||
          looseProductName.includes(looseTerm) ||
          looseProductName.includes(looseSearchQuery) ||
          (termIsGroundMeat && productIsGroundMeat) ||
          (termIsCola && productIsCola && colaSizeMatches))
      );
    });

    if (!matchedTerm) return currentTerms;

    return currentTerms.filter((term) => term !== matchedTerm);
  }

  function addProductToCart(product: Product) {
    const remainingTerms = removeMatchingSearchTerm(product);
    const matchedTerms = parseTerms(input).filter(
      (term) => !remainingTerms.includes(term),
    );
    const normalizedProductName = normalize(product.name);

    const cartWithoutMatchingManualRows = cart.filter((item) => {
      if (item.source !== "manual") return true;

      const normalizedItemName = normalize(item.name);

      const matchedBySearchTerm = matchedTerms.some((term) => {
        const normalizedTerm = normalize(term);
        return (
          normalizedTerm.length > 0 && normalizedItemName === normalizedTerm
        );
      });

      const matchedByProductName =
        normalizedItemName.length > 0 &&
        normalizedProductName.includes(normalizedItemName);

      return !matchedBySearchTerm && !matchedByProductName;
    });

    if (
      cartWithoutMatchingManualRows.some(
        (x) => normalize(x.name) === normalize(product.name),
      )
    ) {
      const nextInputForDuplicate = remainingTerms.join(",");
      setInput(nextInputForDuplicate);
      setNormalResults([]);
      setVisibleNormalCount(8);
      setActiveNormalSearchTerm("");

      if (remainingTerms.length > 0) {
        void searchNormalPrices(nextInputForDuplicate);
      } else {
        setNormalSearchAttempted(false);
        setSearchPanelOpen(true);
        setActiveResult("none");
      }

      return;
    }

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

    trackZiiplyEvent("product_added_to_cart", {
      source: "normal_search",
      productName: newItem.name,
      ean: newItem.ean,
      chain: newItem.chain,
      storeName: newItem.storeName,
      price: newItem.price,
      cartItemsCount: nextCart.length,
    });

    setCart(nextCart);
    showCartToast(`Lisätty ostoskoriin: ${newItem.name}`);
    void updateChainComparison(nextCart);

    const nextInput = remainingTerms.join(",");

    setInput(nextInput);

    if (remainingTerms.length > 0) {
      void searchNormalPrices(nextInput);
    } else {
      // Fast add flow: lisää tuote koriin ja pidä käyttäjä hakutilassa seuraavaa tuotetta varten.
      // Ei hypätä vertailuun eikä näytetä vertailukortteja tuotteen lisäämisen jälkeen.
      setInput("");
      setNormalResults([]);
      setNormalSearchAttempted(false);
      setVisibleNormalCount(8);
      setActiveNormalSearchTerm("");
      setSearchPanelOpen(true);
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setEanModalOpen(false);
      setActiveResult("none");

      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }

  function addSingleCompareResultToCart(result: SingleProductCompareResult) {
    if (!result.productName || !result.price || result.price <= 0) return;

    const normalizedResultName = normalize(result.productName);
    const resultEan = normalizeEan(result.ean);
    const alreadyInCart = cart.some((item) => {
      const itemEan = normalizeEan(item.ean || item.product?.ean);
      if (resultEan && itemEan && resultEan === itemEan) return true;
      return (
        normalize(item.name) === normalizedResultName &&
        item.chain === result.key.toUpperCase()
      );
    });

    if (alreadyInCart) {
      showCartToast("Tuote on jo ostoskorissa.");
      return;
    }

    if (cart.length >= MAX_ITEMS) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    const product: Product = {
      id: resultEan ? Number(resultEan.slice(-8)) || Date.now() : Date.now(),
      name: fixText(result.productName),
      ean: result.ean,
      pictureUrl: result.image,
      price: result.price,
      comparisonPriceUnit: result.comparisonPrice || undefined,
      storeItems: [{ price: result.price }],
    };

    const newItem: CartItem = {
      id: `single-compare-${result.key}-${resultEan || normalize(result.productName)}-${Date.now()}`,
      name: fixText(result.productName),
      price: result.price,
      image: result.image,
      chain: result.key.toUpperCase() as "S" | "K",
      storeName: result.storeName,
      quantity: 1,
      source: "search",
      product,
      ean: result.ean,
    };

    const nextCart = [...cart, newItem];

    trackZiiplyEvent("product_added_to_cart", {
      source: "single_product_compare",
      productName: newItem.name,
      ean: newItem.ean,
      chain: newItem.chain,
      storeName: newItem.storeName,
      price: newItem.price,
      cartItemsCount: nextCart.length,
    });

    setCart(nextCart);
    showCartToast(`Lisätty ostoskoriin: ${newItem.name}`);
    triggerHaptic();
    void updateChainComparison(nextCart, { openCompare: false });

    // Single-vertailusta koriin lisätty tuote ei saa jättää hakutermiä elämään taustalle.
    clearSingleSearchState();
    setSearchPanelOpen(true);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setEanModalOpen(false);
    setActiveResult("none");
  }

  function addInputToCart() {
    triggerHaptic();
    const rows = parseTerms(input);
    const uniqueRows = Array.from(
      new Map(rows.map((row) => [normalize(row), row])).values(),
    ).slice(0, MAX_ITEMS);

    if (uniqueRows.length === 0) {
      alert("Kirjoita ensin tuotteita hakukenttään.");
      return;
    }

    const existingNames = new Set(cart.map((item) => normalize(item.name)));
    const rowsToAdd = uniqueRows.filter(
      (row) => !existingNames.has(normalize(row)),
    );

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

    trackZiiplyEvent("manual_items_added_to_cart", {
      addedCount: newItems.length,
      cartItemsCount: nextCart.length,
      itemNames: newItems.map((item) => item.name),
    });

    setCart(nextCart);
    persistCartImmediately(nextCart);

    const addedNames = new Set(addedRows.map((row) => normalize(row)));
    const remainingRows = rows.filter((row) => !addedNames.has(normalize(row)));
    setInput(remainingRows.join(","));

    showCartToast(
      `Lisätty muistilistaan: ${newItems.length} ${newItems.length === 1 ? "rivi" : "riviä"}`,
    );
    setActiveResult("compare");
    void updateChainComparison(nextCart);
    setSearchPanelOpen(false);
    setCartModalOpen(true);
  }

  function addRecentItemToCart(item: CartItem) {
    triggerHaptic();
    const nextCart = mergeItemsIntoCart(cart, [item]);

    if (
      nextCart.length === cart.length &&
      !cart.some(
        (cartItem) =>
          getCartItemMemoryKey(cartItem) === getCartItemMemoryKey(item),
      )
    ) {
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

    trackZiiplyEvent("shopping_list_saved", {
      listName,
      cartItemsCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    });

    setSavedShoppingLists((current) => {
      const existingIndex = current.findIndex(
        (list) => normalize(list.name) === normalize(listName),
      );
      const nextList: SavedShoppingList = {
        id:
          existingIndex >= 0
            ? current[existingIndex].id
            : `list-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: listName,
        items,
        createdAt: existingIndex >= 0 ? current[existingIndex].createdAt : now,
        updatedAt: now,
      };

      const withoutExisting = current.filter(
        (_, index) => index !== existingIndex,
      );
      return [nextList, ...withoutExisting].slice(0, MAX_SAVED_SHOPPING_LISTS);
    });

    setSavedListName("");
    setCartSavePanelOpen(false);
    cartOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    showCartToast(`Tallennettu lista: ${listName}`);
  }

  function addSavedListToCart(list: SavedShoppingList) {
    triggerHaptic();

    if (!list.items.length) return;

    const nextCart = mergeItemsIntoCart(cart, list.items);

    if (
      nextCart.length === cart.length &&
      list.items.every(
        (item) =>
          !cart.some(
            (cartItem) =>
              getCartItemMemoryKey(cartItem) === getCartItemMemoryKey(item),
          ),
      )
    ) {
      alert(`Demossa ostoskori on rajattu ${MAX_ITEMS} tuotteeseen.`);
      return;
    }

    setCart(nextCart);
    persistCartImmediately(nextCart);
    setCartSavePanelOpen(false);
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

    const ok = window.confirm(
      `Poistetaanko tallennettu lista ${label}${itemCount ? ` (${itemCount} tuotetta)` : ""}? Tätä ei voi perua.`,
    );
    if (!ok) return;

    setSavedShoppingLists((current) =>
      current.filter((list) => list.id !== id),
    );
    showCartToast("Tallennettu lista poistettu");
  }

  function showCart() {
    if (cart.length === 0) {
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    // Kori-paneeli toimii erillisenä näkymänä: se sulkee Haen/EANin/vertailun ja avautuu heti näkyville.
    transitionMobilePanel("cart", () => {
      setSearchPanelOpen(false);
      setShopsPanelOpen(false);
      setEanModalOpen(false);
      closeProductSelectionOverlay();
      setCartSavePanelOpen(false);
      setActiveResult("none");
      setCartModalOpen(true);
      window.requestAnimationFrame(() => {
        cartOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
      void updateChainComparison(cart);
    });
  }

  function toggleCartModal() {
    if (cart.length === 0) {
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    // Toinen painallus sulkee Korin. Jos Hae on auki, vaihdetaan suoraan Koriin.
    if (cartModalOpen) {
      closePanelWithFade("cart", () => {
        setCartModalOpen(false);
        setCartSavePanelOpen(false);
        setActiveResult("none");
      });
      return;
    }

    showCart();
  }

  function closeCartModal() {
    closePanelWithFade("cart", () => {
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setActiveResult("none");
    });
  }

  function openComparisonView() {
    if (cart.length === 0) {
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    // Vertailu avautuu aina puhtaana vakionäkymänä:
    // ei hakutuloksia, ei valintamodaalia, ei vanhaa overlay-statea.
    transitionMobilePanel("compare", () => {
      setRestoredCartPromptV320({ open: false, count: 0 });
      setSearchPanelOpen(false);
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setShopsPanelOpen(false);
      setEanModalOpen(false);
      setLoadingNormal(false);
      setNormalResults([]);
      setVisibleNormalCount(8);
      setActiveResult("compare");

      window.requestAnimationFrame(() => {
        compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });

      if (storesReadyForSearch) {
        void updateChainComparison(cart);
      } else {
        setComparisonLoading(false);
        showCartToast("Valitse kaupat, niin vertailu hakee hinnat.");
      }
    });
  }

  function toggleComparisonView() {
    if (cart.length === 0) {
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    if (
      activeResult === "compare" &&
      !searchPanelOpen &&
      !cartModalOpen &&
      !eanModalOpen
    ) {
      closePanelWithFade("compare", () => setActiveResult("none"));
      return;
    }

    openComparisonView();
  }

  function openShopsPanel() {
    // v367_MOBILE_GPS_PENDING_NO_OLD_SHOPS_RENDER:
    // Jos Kaupat-nappia painetaan heti käynnistyksen jälkeen ennen kuin GPS on
    // ehtinyt antaa koordinaatit/kaupat, älä avaa vanhaa Kaupat-paneelin renderiä.
    // Se oli mobiilissa vain välivaiheen fallback ja näkyi välähdyksenä.
    if (gpsStoreLocationPendingV366 || storeSearchLoading) {
      setSearchPanelOpen(false);
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setEanModalOpen(false);
      closeProductSelectionOverlay();
      setActiveResult("none");
      setInitialStoreNavPrompt(false);
      setShopsPanelOpen(true);
      setOpenStorePicker(null);
      setLocationMessage(
        storeSearchLoading
          ? "Haetaan kauppoja sijainnin perusteella..."
          : "Haetaan nykyistä sijaintia...",
      );
      if (!storeSearchLoading) void useOwnLocation();
      return;
    }

    trackZiiplyEvent("shops_panel_opened", {
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    transitionMobilePanel("shops", () => {
      setSearchPanelOpen(false);
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setEanModalOpen(false);
      closeProductSelectionOverlay();
      setActiveResult("none");
      setInitialStoreNavPrompt(false);
      setShopsPanelOpen(true);
    });
  }

  function toggleShopsPanel() {
    // v316: Kaupat on alussa ainoa käytettävissä oleva nappi, mutta sekin toimii toggle-na.
    // Eli Kaupat-kortin voi avata ja sulkea myös ennen kauppavalintojen valmistumista.
    if (shopsPanelOpen) {
      closePanelWithFade("shops", () => setShopsPanelOpen(false));
      return;
    }

    openShopsPanel();
  }

  function closeShopsPanel() {
    closePanelWithFade("shops", () => setShopsPanelOpen(false));
  }

  function scrollToNormalResults() {
    window.setTimeout(() => {
      const target = normalResultsSectionRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }

  async function pasteFromClipboardToSearch() {
    triggerHaptic();

    try {
      const clipboardText = await navigator.clipboard?.readText?.();
      const cleanText = String(clipboardText || "").trim();

      if (!cleanText) {
        showCartToast("Leikepöytä on tyhjä.");
        return;
      }

      // v240: Liitä-painike tekee vain yhden asian: leikepöydän sisältö siirtyy
      // suoraan hakutekstiruutuun. Ei selaimen erillistä "Sijoita/Liitä"-valikkoa,
      // ei vahvistusmodalia, ei toista vaihetta eikä tekstikentän automaattifokusta.
      setSearchInputForMode(cleanText.slice(0, 1200));
      setNormalResults([]);
      setNormalSearchAttempted(false);
      setSingleProductCompareResults([]);
      setSingleProductCompareTerm("");
      setVisibleNormalCount(8);

      trackZiiplyEvent("clipboard_pasted_to_search", {
        pastedLength: cleanText.length,
        mode: searchCompareMode,
      });

      // Ei fokusoida tekstikenttää Liitä-painalluksen jälkeen, koska iOS Safari
      // näyttää muuten oman "Sijoita / Puhu" -valikon.
    } catch {
      showCartToast(
        "Liittäminen ei onnistunut suoraan. Tarkista selaimen leikepöytäoikeus.",
      );
      // Ei fallback-fokusta: käyttäjä ei halua selaimen omaa Sijoita-valikkoa tähän.
    }
  }

  async function compareSelectedSingleProduct(product: Product) {
    const selectedName = fixText(product.name);
    const selectedPrice = getProductPrice(product);

    if (!selectedName || selectedPrice <= 0 || singleProductCompareLoading)
      return;

    if (!hasActiveStores) {
      setLocationMessage(
        "Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.",
      );
      showCartToast("Valitse ensin kaupat.");
      return;
    }

    trackZiiplyEvent("single_product_selected_for_compare", {
      productName: selectedName,
      ean: product.ean,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setActiveNormalSearchTerm("");
    setSingleProductCompareTerm(selectedName);
    setSingleProductCompareResults([]);
    setSingleProductCompareLoading(true);
    setActiveResult("singleCompare");

    try {
      const sourceStoreName =
        (
          product as Product & {
            sourceStoreName?: string;
            fallbackStoreName?: string;
          }
        ).sourceStoreName ||
        (product as Product & { fallbackStoreName?: string })
          .fallbackStoreName ||
        activeStores.sStoreName;

      const nextResults: SingleProductCompareResult[] = [
        {
          key: "s",
          chain: "S-ryhmä",
          storeName: sourceStoreName,
          productName: selectedName,
          price: selectedPrice,
          ean: product.ean,
          image: product.pictureUrl,
          comparisonPrice: formatComparisonPrice(product),
        },
      ];

      try {
        let kBest: KProduct | undefined;
        const selectedEan = normalizeEan(product.ean);

        for (const kSearchTerm of getKSearchTerms(selectedName)) {
          const kItems = await fetchKProducts(
            kSearchTerm,
            activeStores.kStoreId,
          );
          kBest = pickBestKProduct(kItems, selectedName, selectedEan);
          if (kBest && !shouldKeepSearchingKOwnBrand(selectedName, kBest))
            break;
        }

        if (kBest && kBest.price > 0) {
          nextResults.push({
            key: "k",
            chain: "K-ryhmä",
            storeName: activeStores.kStoreName,
            productName: fixText(kBest.name),
            price: kBest.price,
            ean: kBest.ean,
            image: kBest.pictureUrl,
            comparisonPrice: null,
          });
        }
      } catch {}

      setSingleProductCompareResults(
        nextResults.sort((a, b) => a.price - b.price),
      );
    } finally {
      setSingleProductCompareLoading(false);
      window.requestAnimationFrame(() => {
        compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  async function compareSingleProduct() {
    const term = parseTerms(input)[0] || input.trim();

    if (!term || singleProductCompareLoading) return;

    if (!hasActiveStores) {
      setLocationMessage(
        "Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.",
      );
      showCartToast("Valitse ensin kaupat.");
      return;
    }

    trackZiiplyEvent("single_product_compare_clicked", {
      query: term,
      storeMode,
      sStoreName: activeStores.sStoreName,
      kStoreName: activeStores.kStoreName,
    });

    setSearchPanelOpen(false);
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setNormalResults([]);
    setVisibleNormalCount(8);
    setSingleProductCompareTerm(term);
    setSingleProductCompareResults([]);
    setSingleProductCompareLoading(true);
    setActiveResult("singleCompare");

    try {
      const nextResults: SingleProductCompareResult[] = [];

      try {
        let sBest: Product | undefined;

        for (const sSearchTerm of getNormalSearchQueries(term).slice(0, 6)) {
          const sItems = await fetchSProducts(
            sSearchTerm,
            activeStores.sStoreId,
          );
          sBest = pickBestSProduct(sItems, term);
          if (sBest && getProductPrice(sBest) > 0) break;
        }

        if (sBest && getProductPrice(sBest) > 0) {
          nextResults.push({
            key: "s",
            chain: "S-ryhmä",
            storeName: activeStores.sStoreName,
            productName: fixText(sBest.name),
            price: getProductPrice(sBest),
            ean: sBest.ean,
            image: sBest.pictureUrl,
            comparisonPrice: formatComparisonPrice(sBest),
          });
        }
      } catch {}

      try {
        let kBest: KProduct | undefined;
        for (const kSearchTerm of getKSearchTerms(term)) {
          const kItems = await fetchKProducts(
            kSearchTerm,
            activeStores.kStoreId,
          );
          kBest = pickBestKProduct(kItems, term);
          if (kBest) break;
        }

        if (kBest && kBest.price > 0) {
          nextResults.push({
            key: "k",
            chain: "K-ryhmä",
            storeName: activeStores.kStoreName,
            productName: fixText(kBest.name),
            price: kBest.price,
            ean: kBest.ean,
            image: kBest.pictureUrl,
            comparisonPrice: null,
          });
        }
      } catch {}

      setSingleProductCompareResults(
        nextResults.sort((a, b) => a.price - b.price),
      );
    } finally {
      setSingleProductCompareLoading(false);
      window.requestAnimationFrame(() => {
        compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  function handleMainNormalSearch() {
    if (!hasSearchInput || loadingNormal || singleProductCompareLoading) return;

    const singleModeTerm = getSingleSearchTerm(input);
    const searchQueryForMode =
      searchCompareMode === "single" ? singleModeTerm : terms.join(", ");

    trackZiiplyEvent("main_search_clicked", {
      query: searchQueryForMode,
      searchType:
        searchCompareMode === "single"
          ? "single_product_compare"
          : "normal_prices",
      cartItemsCount: cart.length,
    });

    // v244:
    // Yksi tuote -tila hakee vain yhden kokonaisen termin. Jos kentässä on pilkuilla
    // useampi tuote, niitä ei ajeta jonona eikä näytetä single-product flowssa.
    // Useamman tuotteen jono kuuluu vain Koko kori -tilaan.
    setSearchPanelOpen(false);
    if (searchCompareMode === "single") {
      setInput(singleModeTerm);
      void searchNormalPrices(singleModeTerm);
    } else {
      void searchNormalPrices();
    }
    scrollToNormalResults();
  }

  function handleJustiinaProductSearch() {
    setOfferSearchDoneForQuery("");
    setOfferSearchQuerySnapshot("");
    if (!hasSearchInput || loadingNormal || singleProductCompareLoading) return;

    const searchQueryForMode = terms.join(", ") || input.trim();

    trackZiiplyEvent("justiina_product_search_clicked", {
      query: searchQueryForMode,
      searchType: "normal_prices",
      cartItemsCount: cart.length,
    });

    setSearchCompareMode("cart");
    setSearchPanelOpen(false);
    void searchNormalPrices();
    scrollToNormalResults();
  }

  function handleGostaOfferSearch() {
    if (gostaSearchDisabled) return;

    trackZiiplyEvent("gosta_offer_search_clicked", {
      query: currentSearchQueryKey,
      searchType: "offers",
      cartItemsCount: cart.length,
    });

    setSearchPanelOpen(false);
    void searchOffers();
  }

  function handleMainOfferSearch() {
    if (!hasSearchInput || loadingOffers) return;

    trackZiiplyEvent("main_search_clicked", {
      query: terms.join(", "),
      searchType: "offers",
      cartItemsCount: cart.length,
    });

    setSearchPanelOpen(false);
    void searchOffers();
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
    trackZiiplyEvent("shopping_list_shared", {
      chain: chain.chain,
      storeName: chain.storeName,
      cartItemsCount: chain.matches.length,
      totalPrice: chain.totalPrice,
    });

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
    trackZiiplyEvent("buy_clicked", {
      chain: chain.chain,
      storeName: chain.storeName,
      cartItemsCount: chain.matches.length,
      totalPrice: chain.totalPrice,
    });

    const textToShare = buildShoppingListText(chain);
    await copyTextToClipboard(textToShare);
    alert(
      "Osta-toiminto on MVP:ssä ostoskorin kopiointi. Myöhemmin tämä voi avata valitun kaupan verkkokaupan.",
    );
  }

  function syncCartDependentState(
    nextCart: CartItem[],
    changedId?: string,
    removedId?: string,
  ) {
    const quantityById = nextCart.reduce(
      (map, item) => {
        map[item.id] = item.quantity;
        return map;
      },
      {} as Record<string, number>,
    );

    setLastOptimizationSnapshot(null);

    setSMatches((current) => {
      const next = { ...current };

      if (removedId) delete next[removedId];
      if (changedId && next[changedId] && quantityById[changedId]) {
        next[changedId] = {
          ...next[changedId],
          quantity: quantityById[changedId],
        };
      }

      return next;
    });

    setKMatches((current) => {
      const next = { ...current };

      if (removedId) delete next[removedId];
      if (changedId && next[changedId] && quantityById[changedId]) {
        next[changedId] = {
          ...next[changedId],
          quantity: quantityById[changedId],
        };
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
      .map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item,
      )
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

    if (nextCart.length === 0) {
      setActiveResult("none");
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setShopsPanelOpen(false);
      setEanModalOpen(false);
      setLoadingNormal(false);
      setNormalResults([]);
      setVisibleNormalCount(8);
      setNormalSearchAttempted(false);
      setActiveNormalSearchTerm("");
      if (activeResult !== "compare" && activeResult !== "singleCompare") {
        setActiveResult("none");
      }
      setSearchPanelOpen(true);
    }

    triggerHaptic();
    void updateChainComparison(nextCart);
  }

  function removeCartItem(id: string) {
    const removedItem = cart.find((item) => item.id === id);
    const nextCart = cart.filter((item) => item.id !== id);

    if (!removedItem) return;

    setCart(nextCart);

    // Jos poistettava tuote oli lisätty single-vertailun kautta, älä palauta sen vanhaa hakutermiä Hae-kortille.
    if (removedItem.source === "search") {
      clearSingleSearchState();
    }

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
    if (nextCart.length === 0) {
      setActiveResult("none");
      setCartModalOpen(false);
      setCartSavePanelOpen(false);
      setShopsPanelOpen(false);
      setEanModalOpen(false);
      setSearchPanelOpen(true);
    }

    showCartToast(`Poistettu: ${removedItem.name}`);
    void updateChainComparison(nextCart);
  }

  function clearCart() {
    if (cart.length === 0) return false;

    const ok = window.confirm(
      `Tyhjennetäänkö koko ostoskori (${cart.length} tuotetta)?`,
    );
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
    setCartModalOpen(false);
    setCartSavePanelOpen(false);
    setShopsPanelOpen(false);
    setEanModalOpen(false);
    setSearchPanelOpen(true);
    showCartToast("Ostoskori tyhjennetty");
    return true;
  }

  function clearCartAndCloseModal() {
    const cleared = clearCart();
    if (cleared) setCartModalOpen(false);
  }

  function clearRestoredCartPromptV320() {
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
    setSingleProductCompareResults([]);
    setSingleProductCompareTerm("");
    setVisibleNormalCount(8);
    setActiveResult("none");
    setRestoredCartPromptV320({ open: false, count: 0 });
    try {
      window.localStorage.setItem(
        "ziiply-cart-v1",
        JSON.stringify({ version: 2, savedAt: Date.now(), items: [] }),
      );
    } catch {}
    showCartToast("Ostoskori tyhjennetty");
  }

  function getAlternativeKey(
    chainKey: ChainResult["key"],
    match: Match,
    index: number,
  ) {
    return `${chainKey}-${match.cartItemId || match.product.id}-${index}`;
  }

  function getAlternativeSearchTerm(productName: string) {
    const normalized = normalize(productName);

    if (
      hasAnyToken(normalized, [
        "maito",
        "kevytmaito",
        "rasvaton maito",
        "täysmaito",
        "taysmaito",
      ])
    ) {
      return "maito 1l";
    }

    return (
      buildKSearchName(productName) ||
      getSearchQuery(productName) ||
      productName
    );
  }

  function getAlternativeSearchTerms(
    productName: string,
    chainKey: ChainResult["key"],
  ) {
    const normalized = normalize(productName);
    const terms: string[] = [];

    const addTerm = (term: string) => {
      const clean = normalize(term);
      if (clean && !terms.includes(clean)) terms.push(clean);
    };

    if (
      hasAnyToken(normalized, [
        "maito",
        "kevytmaito",
        "rasvaton maito",
        "täysmaito",
        "taysmaito",
      ])
    ) {
      if (chainKey === "k") {
        addTerm("pirkka maito 1l");
        addTerm("k-menu maito 1l");
      }
      addTerm("maito 1l");
      addTerm("maito");
      return terms;
    }

    if (
      hasAnyToken(normalized, [
        "ranskanperuna",
        "ranskanperunat",
        "fries",
        "peruna",
        "perunat",
        "poimutettu",
      ])
    ) {
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
    if (mode === "cheapest") return "Huokein";
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
    chainKey?: ChainResult["key"],
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
    forcedQualityMode?: QualityMode,
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

      const uniqueSItems = Array.from(
        new Map(allSItems.map((item) => [item.id, item])).values(),
      );

      alternatives = uniqueSItems
        .filter((product) => getProductPrice(product) > 0)
        .filter((product) => product.id !== match.product.id)
        .filter(
          (product) =>
            !isHardRejectedOptimizationAlternative(
              match.product.name,
              product.name,
            ),
        )
        .filter((product) => productGroupGate(match.product.name, product.name))
        .filter((product) =>
          isAllowedByQualityMode(
            match.product.name,
            product.name,
            matchQualityMode,
          ),
        )
        .filter(
          (product) =>
            scoreNameMatch(match.product.name, product.name) +
              scoreQualityMode(
                match.product.name,
                product.name,
                matchQualityMode,
              ) >
            -100,
        )
        .sort((a, b) => {
          const aScore =
            scoreNameMatch(match.product.name, a.name) +
            scoreQualityMode(match.product.name, a.name, matchQualityMode);
          const bScore =
            scoreNameMatch(match.product.name, b.name) +
            scoreQualityMode(match.product.name, b.name, matchQualityMode);

          if (
            matchQualityMode !== "cheapest" &&
            Math.abs(bScore - aScore) > 20
          ) {
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

      const uniqueKItems = Array.from(
        new Map(allKItems.map((item) => [item.id, item])).values(),
      );

      alternatives = uniqueKItems
        .filter((product) => product.price > 0)
        .filter((product) => product.id !== String(match.product.id))
        .filter(
          (product) =>
            !isHardRejectedOptimizationAlternative(
              match.product.name,
              product.name,
            ),
        )
        .filter(
          (product) => !isHardRejectedKMatch(match.product.name, product.name),
        )
        .filter((product) => productGroupGate(match.product.name, product.name))
        .filter((product) =>
          isAllowedByQualityMode(
            match.product.name,
            product.name,
            matchQualityMode,
          ),
        )
        .filter(
          (product) =>
            scoreNameMatch(match.product.name, product.name) +
              scoreQualityMode(
                match.product.name,
                product.name,
                matchQualityMode,
              ) >
            -100,
        )
        .map(convertKProductToProduct)
        .sort((a, b) => {
          const aScore =
            scoreNameMatch(match.product.name, a.name) +
            scoreQualityMode(match.product.name, a.name, matchQualityMode);
          const bScore =
            scoreNameMatch(match.product.name, b.name) +
            scoreQualityMode(match.product.name, b.name, matchQualityMode);

          if (
            matchQualityMode !== "cheapest" &&
            Math.abs(bScore - aScore) > 20
          ) {
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
    forceReload = false,
  ) {
    if (
      !forceReload &&
      (alternativeResults[key]?.length || loadingAlternatives[key])
    )
      return;

    setLoadingAlternatives((prev) => ({ ...prev, [key]: true }));

    if (forceReload) {
      setAlternativeResults((prev) => ({
        ...prev,
        [key]: [],
      }));
    }

    try {
      const alternatives = await fetchAlternativesForMatch(
        chainKey,
        match,
        forcedQualityMode,
      );

      setAlternativeResults((prev) => ({
        ...prev,
        [key]: alternatives,
      }));
    } catch (error) {
      console.error(error);
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
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

  function toggleAlternatives(
    key: string,
    chainKey: ChainResult["key"],
    match: Match,
  ) {
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

  function getCheaperAlternatives(
    chainKey: ChainResult["key"],
    match: Match,
    index: number,
  ) {
    const key = getAlternativeKey(chainKey, match, index);
    return (alternativeResults[key] || [])
      .filter((alternative) => getProductPrice(alternative) < match.price)
      .sort((a, b) => getProductPrice(a) - getProductPrice(b));
  }

  function hasKnownCheaperAlternatives(chain: ChainResult) {
    return chain.matches.some(
      (match, index) =>
        getCheaperAlternatives(chain.key, match, index).length > 0,
    );
  }

  function hasUncheckedOptimizationCandidates(chain: ChainResult) {
    return chain.matches.some((match, index) => {
      const key = getAlternativeKey(chain.key, match, index);
      return !(key in alternativeResults);
    });
  }

  function canOptimizeChain(chain: ChainResult) {
    return (
      !chain.comingSoon &&
      chain.matches.length > 0 &&
      (hasKnownCheaperAlternatives(chain) ||
        hasUncheckedOptimizationCandidates(chain))
    );
  }

  function getKnownOptimizationSavings(chain: ChainResult) {
    return chain.matches.reduce((sum, match, index) => {
      const cheapestAlternative = getCheaperAlternatives(
        chain.key,
        match,
        index,
      )[0];
      if (!cheapestAlternative) return sum;

      return (
        sum +
        Math.max(0, match.price - getProductPrice(cheapestAlternative)) *
          match.quantity
      );
    }, 0);
  }

  function getOptimizeCartLabel(chain: ChainResult) {
    if (optimizingChains[chain.key]) return "Haetaan huokeimmat...";

    const savings = getKnownOptimizationSavings(chain);

    if (savings > 0) {
      return `Viilaa · säästä ${formatEuro(savings)}`;
    }

    if (hasUncheckedOptimizationCandidates(chain)) {
      return "Viilaa";
    }

    return "Ei optimoitavaa";
  }

  function replaceMatchProduct(
    chainKey: ChainResult["key"],
    match: Match,
    alternative: Product,
    alternativeKey?: string,
  ) {
    if (!match.cartItemId) return;

    setLastOptimizationSnapshot({
      cart: [...cart],
      sMatches: { ...sMatches },
      kMatches: { ...kMatches },
      alternativeResults: { ...alternativeResults },
      expandedAlternatives: { ...expandedAlternatives },
      chainKey,
      chainName:
        chainKey === "s"
          ? "S-ryhmä"
          : chainKey === "k"
            ? "K-ryhmä"
            : "Valittu ketju",
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

    trackZiiplyEvent("optimize_cart_clicked", {
      chain: chain.chain,
      storeName: chain.storeName,
      cartItemsCount: chain.matches.length,
      totalPrice: chain.totalPrice,
    });

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
            .filter(
              (alternative) =>
                !isHardRejectedOptimizationAlternative(
                  match.product.name,
                  alternative.name,
                ),
            )
            .filter((alternative) =>
              productGroupGate(match.product.name, alternative.name),
            )
            .filter((alternative) => getProductPrice(alternative) < match.price)
            .sort((a, b) => getProductPrice(a) - getProductPrice(b))[0];

          if (!cheapestAlternative) return;

          nextMatches[match.cartItemId] = {
            ...match,
            product: cheapestAlternative,
            price: getProductPrice(cheapestAlternative),
            matchType:
              cheapestAlternative.ean &&
              cheapestAlternative.ean === match.product.ean
                ? "ean"
                : "name",
            fallbackStoreName: undefined,
          };

          keysToClose[key] = false;
          replacedCount += 1;
        }),
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
      const gpsErrorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: number }).code)
          : 0;
      if (gpsErrorCode === 1) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 2) {
        setGpsErrorMessage("GPS ei löydy");
      } else if (gpsErrorCode === 3) {
        setGpsErrorMessage("GPS ei löydy");
      } else {
        setGpsErrorMessage("GPS ei löydy");
      }
      alert(
        "Korivaihtoehtojen haku epäonnistui. Kokeile hetken päästä uudelleen.",
      );
    } finally {
      setOptimizingChains((prev) => ({
        ...prev,
        [chain.key]: false,
      }));
    }
  }

  function getBarWidth(chain: ChainResult) {
    if (!cheapest || chain.totalPrice <= 0 || chain.comingSoon) return 0;
    return Math.max(
      15,
      Math.min(100, (cheapest.totalPrice / chain.totalPrice) * 100),
    );
  }

  const comparedStoreCards: Array<{
    key: ChainResult["key"];
    logo: string;
    title: string;
    name: string;
    tone: string;
    selectedTone: string;
    comingSoon?: boolean;
  }> = [
    {
      key: "s",
      logo: "S",
      title: "S-ryhmä",
      name: activeStores.sStoreName || "Valitse S",
      tone: "bg-green-700 shadow-md ring-1 ring-black/10 text-white ring-green-100",
      selectedTone: "border-green-600 bg-green-50 text-green-900",
    },
    {
      key: "k",
      logo: "K",
      title: "K-ryhmä",
      name: activeStores.kStoreName || "Valitse K",
      tone: "bg-red-700 shadow-md ring-1 ring-black/10 text-white ring-red-100",
      selectedTone: "border-red-600 bg-red-50 text-red-900",
    },
    {
      key: "lidl",
      logo: "L",
      title: "Lidl",
      name: "Tulossa",
      tone: "bg-blue-600 text-white ring-blue-100",
      selectedTone: "border-blue-600 bg-blue-50 text-blue-900",
      comingSoon: true,
    },
    {
      key: "tokmanni",
      logo: "T",
      title: "Tokmanni",
      name: "Tulossa",
      tone: "bg-yellow-400 text-slate-950 ring-yellow-100",
      selectedTone: "border-yellow-500 bg-yellow-50 text-yellow-950",
      comingSoon: true,
    },
  ];

  // CLEAR_STALE_STORE_PICKER_V295
  useEffect(() => {
    setOpenStorePicker(null);
  }, [storeMode, storeCompareScope, withinChain, activeArea.label]);

  function handleStoreCompareScopeChange(nextScope: StoreCompareScope) {
    setOpenStorePicker(null);

    if (nextScope === "between_chains") {
      // v316: Ketjujen väliltä ei saa nollata jo valittua Tavaratalot/Lähikaupat-valintaa.
      // Jos käyttäjä valitsi ensin Tavaratalot tai Lähikaupat, se pysyy vihreänä ja kauppakortit aktivoituvat.
      const hadStoreModeChoice = storeModeChosenV299;
      setStoreCompareScope("between_chains");
      setWithinChain(null);
      setStoreModeChosenV299(hadStoreModeChoice);
      if (!hadStoreModeChoice) {
        selectedStoreModeRefV302.current = "hyper";
        setStoreMode("hyper");
      }
      setSelectedChains((current) => ({
        ...current,
        s: hadStoreModeChoice,
        k: hadStoreModeChoice,
        lidl: false,
        tokmanni: false,
      }));
      clearSearchAndComparisonState();
      setLocationMessage(
        hadStoreModeChoice
          ? `${activeArea.label || "Alue"} käytössä.`
          : `${activeArea.label || "Alue"} käytössä. Valitse hakutapa: Tavaratalot tai Lähikaupat.`,
      );
      return;
    }

    // Ketjun sisällä näyttää sekä tavaratalo- että lähikauppavalinnan vihreänä,
    // mutta ei tallenna kumpaakaan varsinaiseksi between_chains-hakutavaksi.
    setStoreCompareScope("within_chain");
    setWithinChain(null);
    setStoreModeChosenV299(false);
    selectedStoreModeRefV302.current = "hyper";
    setStoreMode("hyper");
    setSelectedChains((current) => ({
      ...current,
      s: false,
      k: false,
      lidl: false,
      tokmanni: false,
    }));
    clearSearchAndComparisonState();
    setLocationMessage(
      "Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.",
    );
  }

  function isLocalStoreForModeV295(store: StoreSearchItem) {
    const text = storeText(store);
    return (
      text.includes("k-market") ||
      text.includes("k market") ||
      text.includes("k-supermarket") ||
      text.includes("k supermarket") ||
      text.includes("s-market") ||
      text.includes("s market") ||
      text.includes("alepa") ||
      text.includes("sale")
    );
  }

  function isHyperStoreForModeV295(store: StoreSearchItem) {
    return isPrisma(store) || isKCitymarket(store);
  }

  function getStoreChainV320(store: StoreSearchItem): "S" | "K" | null {
    const raw = String(store.type || store.chain || "").toUpperCase();
    if (raw === "S" || raw.includes("S-RYHM") || raw.includes("SOK"))
      return "S";
    if (raw === "K" || raw.includes("K-RYHM") || raw.includes("KESKO"))
      return "K";

    const text = storeText(store);
    if (
      text.includes("prisma") ||
      text.includes("s-market") ||
      text.includes("smarket") ||
      text.includes("alepa") ||
      text.includes("sale")
    )
      return "S";
    if (
      text.includes("k-citymarket") ||
      text.includes("kcitymarket") ||
      text.includes("k-supermarket") ||
      text.includes("ksupermarket") ||
      text.includes("k-market") ||
      text.includes("kmarket")
    )
      return "K";

    return null;
  }

  function normalizeStoreForPickerV320(
    store: StoreSearchItem,
  ): StoreSearchItem {
    const chain = getStoreChainV320(store);
    return {
      ...store,
      type: chain || store.type,
    };
  }

  function getStoreModeRankV320(store: StoreSearchItem, mode: StoreMode) {
    const text = storeText(store);
    const isHyper = isHyperStoreForModeV295(store);
    const isStrictLocal = isLocalStoreForModeV295(store);
    const isLocalLike =
      isStrictLocal ||
      (!isHyper &&
        (text.includes("market") ||
          text.includes("alepa") ||
          text.includes("sale")));

    if (mode === "hyper") {
      if (isHyper) return 0;
      if (isLocalLike) return 3;
      return 5;
    }

    if (isStrictLocal) return 0;
    if (isLocalLike) return 1;
    if (isHyper) return 5;
    return 3;
  }

  function sortStoresForPickerV320(
    stores: StoreSearchItem[],
    mode: StoreMode,
    selectedId?: number,
    selectedName?: string,
  ) {
    return uniqueStoresByIdAndName(
      stores.map(normalizeStoreForPickerV320),
    ).sort((a, b) => {
      const aSelected = Boolean(
        (selectedId && a.id === selectedId) ||
        (selectedName && a.name === selectedName),
      );
      const bSelected = Boolean(
        (selectedId && b.id === selectedId) ||
        (selectedName && b.name === selectedName),
      );
      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      const modeDiff =
        getStoreModeRankV320(a, mode) - getStoreModeRankV320(b, mode);
      if (modeDiff !== 0) return modeDiff;

      const cityA = normalize(a.city || "");
      const cityB = normalize(b.city || "");
      const area = normalize(activeArea.label || "");
      const aSameCity = area && cityA.includes(area);
      const bSameCity = area && cityB.includes(area);
      if (aSameCity !== bSameCity) return aSameCity ? -1 : 1;

      return normalize(a.name || "").localeCompare(
        normalize(b.name || ""),
        "fi",
      );
    });
  }

  function getStoresForPickerOptionsV295(chain: "S" | "K", mode: StoreMode) {
    const chainStores = foundStores
      .map(normalizeStoreForPickerV320)
      .filter((store) => getStoreChainV320(store) === chain);

    const selectedId = getSelectedStoreIdFor(chain, mode);
    const selectedName = getSelectedStoreNameFor(chain, mode);

    // Tavaratalot = vain Prisma / K-Citymarket jos niitä löytyy.
    // Lähikaupat = vain ketjun ei-tavaratalot jos niitä löytyy.
    // Jos API palauttaa suppean datan, fallback näyttää silti koko ketjun eikä tyhjää/virheellistä ikkunaa.
    const hyperStores = chainStores.filter(isHyperStoreForModeV295);
    const localStores = chainStores.filter(
      (store) => !isHyperStoreForModeV295(store),
    );

    const scoped =
      mode === "hyper"
        ? hyperStores.length > 0
          ? hyperStores
          : chainStores
        : localStores.length > 0
          ? localStores
          : chainStores;

    return sortStoresForPickerV320(scoped, mode, selectedId, selectedName);
  }

  function getStoresForPicker(chain: "S" | "K", mode: StoreMode) {
    const list = getStoresForPickerOptionsV295(chain, mode);
    if (list.length > 0) return list;

    // Fallback vain valittuun ketjuun ja nykyiseen modeen.
    const fallbackId =
      chain === "S"
        ? mode === "local"
          ? activeArea.sLocalStoreId
          : activeArea.sStoreId
        : mode === "local"
          ? activeArea.kLocalStoreId
          : activeArea.kStoreId;

    const fallbackName =
      chain === "S"
        ? mode === "local"
          ? activeArea.sLocalStoreName
          : activeArea.sStoreName
        : mode === "local"
          ? activeArea.kLocalStoreName
          : activeArea.kStoreName;

    if (fallbackId && fallbackName) {
      return [
        {
          id: fallbackId,
          name: fallbackName,
          type: chain,
          city: activeArea.label,
        } as StoreSearchItem,
      ];
    }

    return [];
  }

  function getSelectedStoreNameFor(chain: "S" | "K", mode: StoreMode) {
    if (chain === "S")
      return mode === "local"
        ? activeArea.sLocalStoreName
        : activeArea.sStoreName;
    return mode === "local"
      ? activeArea.kLocalStoreName
      : activeArea.kStoreName;
  }

  function getSelectedStoreIdFor(chain: "S" | "K", mode: StoreMode) {
    if (chain === "S")
      return mode === "local" ? activeArea.sLocalStoreId : activeArea.sStoreId;
    return mode === "local" ? activeArea.kLocalStoreId : activeArea.kStoreId;
  }

  function readStoreNumberV320(value: unknown) {
    if (value == null || value === "") return null;
    if (typeof value === "string") {
      const normalizedValue = value.replace(",", ".").replace(/[^0-9.\-]/g, "");
      if (!normalizedValue) return null;
      const numberValue = Number(normalizedValue);
      return Number.isFinite(numberValue) ? numberValue : null;
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  function readNestedNumberByKeysV320(
    source: unknown,
    keys: string[],
    maxDepth = 5,
  ): number | null {
    if (!source || maxDepth < 0) return null;

    if (Array.isArray(source)) {
      for (const item of source) {
        const nested = readNestedNumberByKeysV320(item, keys, maxDepth - 1);
        if (nested != null) return nested;
      }
      return null;
    }

    if (typeof source !== "object") return null;

    const record = source as Record<string, unknown>;
    const lowerKeyMap = new Map(
      Object.keys(record).map((key) => [key.toLowerCase(), key]),
    );

    for (const key of keys) {
      const directKey = lowerKeyMap.get(key.toLowerCase());
      if (directKey) {
        const value = readStoreNumberV320(record[directKey]);
        if (value != null) return value;
      }
    }

    for (const value of Object.values(record)) {
      if (!value || typeof value !== "object") continue;
      const nested = readNestedNumberByKeysV320(value, keys, maxDepth - 1);
      if (nested != null) return nested;
    }

    return null;
  }

  function getStoreCoordinateV320(store: StoreSearchItem, keys: string[]) {
    const direct = readNestedNumberByKeysV320(store, keys, 4);
    if (direct != null) return direct;

    const wantsLatitude = keys.some((key) =>
      ["latitude", "lat", "y"].includes(key),
    );
    const coordinateContainers = [
      (store as any).coordinates,
      (store as any).location?.coordinates,
      (store as any).geometry?.coordinates,
      (store as any).geo?.coordinates,
      (store as any).position?.coordinates,
      (store as any).raw?.coordinates,
      (store as any).raw?.location?.coordinates,
      (store as any).raw?.geometry?.coordinates,
    ].filter(Array.isArray) as unknown[][];

    for (const coordinates of coordinateContainers) {
      if (coordinates.length < 2) continue;

      const first = readStoreNumberV320(coordinates[0]);
      const second = readStoreNumberV320(coordinates[1]);
      if (first == null || second == null) continue;

      // Tuetaan sekä GeoJSON-muotoa [lon, lat] että tavallista [lat, lon].
      const firstLooksLat = Math.abs(first) <= 90 && Math.abs(second) <= 180;
      const secondLooksLat = Math.abs(second) <= 90 && Math.abs(first) <= 180;

      if (wantsLatitude) {
        if (secondLooksLat && Math.abs(first) > 90) return second;
        if (firstLooksLat && Math.abs(second) > 90) return first;
        return secondLooksLat ? second : first;
      }

      if (secondLooksLat && Math.abs(first) > 90) return first;
      if (firstLooksLat && Math.abs(second) > 90) return second;
      return first;
    }

    return null;
  }

  function calculateDistanceKmV320(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ) {
    const earthRadiusKm = 6371;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistanceKmV320(km: number) {
    if (!Number.isFinite(km) || km < 0) return "";
    if (km < 1) return `${Math.max(0.1, km).toFixed(1).replace(".", ",")} km`;
    return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
  }

  function readExplicitDistanceKmV320(store: StoreSearchItem) {
    const km = readNestedNumberByKeysV320(
      store,
      [
        "distanceKm",
        "distance_km",
        "distanceKilometers",
        "distance_kilometers",
        "distanceInKm",
        "distance_in_km",
        "kilometers",
        "kilometres",
        "km",
      ],
      5,
    );

    if (km != null) return km;

    const meters = readNestedNumberByKeysV320(
      store,
      [
        "distanceMeters",
        "distance_m",
        "distance_meters",
        "distanceInMeters",
        "distance_in_meters",
        "meters",
        "metres",
        "m",
      ],
      5,
    );

    if (meters != null) return meters / 1000;

    const genericDistance = readNestedNumberByKeysV320(
      store,
      [
        "distance",
        "distanceText",
        "distance_text",
        "distanceLabel",
        "distance_label",
      ],
      5,
    );

    if (genericDistance == null) return null;
    return genericDistance > 100 ? genericDistance / 1000 : genericDistance;
  }

  function getStoreDistanceKeyV320(store?: StoreSearchItem | null) {
    if (!store) return "";
    return `${store.type || store.chain || ""}:${store.id || ""}:${normalize(store.name || "")}:${normalize(store.city || "")}:${store.postalCode || ""}`;
  }

  function getStoreDistanceLabelWithoutFallbackV320(
    store?: StoreSearchItem | null,
  ) {
    if (!store) return "";

    const explicitKm = readExplicitDistanceKmV320(store);
    if (explicitKm != null && Number.isFinite(explicitKm)) {
      return formatDistanceKmV320(explicitKm);
    }

    const latitude = getStoreCoordinateV320(store, ["latitude", "lat", "y"]);
    const longitude = getStoreCoordinateV320(store, [
      "longitude",
      "lng",
      "lon",
      "x",
    ]);
    if (gpsCoordsV320 && latitude != null && longitude != null) {
      return formatDistanceKmV320(
        calculateDistanceKmV320(gpsCoordsV320, { latitude, longitude }),
      );
    }

    return "";
  }

  function getStoreDistanceLabelV320(store?: StoreSearchItem | null) {
    const directLabel = getStoreDistanceLabelWithoutFallbackV320(store);
    if (directLabel) return directLabel;

    const fallbackKm =
      storeDistanceFallbacksV320[getStoreDistanceKeyV320(store)];
    if (fallbackKm != null && Number.isFinite(fallbackKm)) {
      return formatDistanceKmV320(fallbackKm);
    }

    return "";
  }

  function findStoreForSelectionV320(chain: "S" | "K", mode: StoreMode) {
    const selectedId = getSelectedStoreIdFor(chain, mode);
    const selectedName = getSelectedStoreNameFor(chain, mode);

    return foundStores
      .map(normalizeStoreForPickerV320)
      .find(
        (store) =>
          getStoreChainV320(store) === chain &&
          Boolean(
            (selectedId && store.id === selectedId) ||
            (selectedName && store.name === selectedName),
          ),
      );
  }

  function uniqueStoresByIdAndName(stores: StoreSearchItem[]) {
    const seen = new Set<string>();
    const result: StoreSearchItem[] = [];

    for (const store of stores) {
      const key = store.id
        ? `${store.type || store.chain || ""}:${store.id}`
        : `${store.type || store.chain || ""}:${normalize(store.name || "")}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(store);
    }

    return result;
  }

  function getStoresForWithinChainPicker(
    chain: "S" | "K",
    slotMode: StoreMode,
  ) {
    // Ketjun sisällä: molemmat valintaikkunat näyttävät saman ketjun kaikki löydetyt kaupat.
    // Ainoa suodatus: toisessa slotissa jo valittu kauppa poistetaan, jotta vertailuun tulee kaksi eri kauppaa.
    const allChainStores = foundStores
      .map(normalizeStoreForPickerV320)
      .filter((store) => getStoreChainV320(store) === chain);

    const selectedId = getSelectedStoreIdFor(chain, slotMode);
    const selectedName = getSelectedStoreNameFor(chain, slotMode);
    const otherMode: StoreMode = slotMode === "hyper" ? "local" : "hyper";
    const otherSelectedId = getSelectedStoreIdFor(chain, otherMode);
    const otherSelectedName = getSelectedStoreNameFor(chain, otherMode);

    const fallbackStores = [
      ...getStoresForPicker(chain, "hyper"),
      ...getStoresForPicker(chain, "local"),
    ];

    return sortStoresForPickerV320(
      [...allChainStores, ...fallbackStores],
      slotMode,
      selectedId,
      selectedName,
    ).filter((store) => {
      if (otherSelectedId && store.id === otherSelectedId) return false;
      if (otherSelectedName && store.name === otherSelectedName) return false;
      return true;
    });
  }

  function getStoresForPickerContext(chain: "S" | "K", mode: StoreMode) {
    if (storeCompareScope === "within_chain")
      return getStoresForWithinChainPicker(chain, mode);
    return getStoresForPicker(chain, mode);
  }

  function renderStorePickerMenu(
    chain: "S" | "K",
    mode: StoreMode,
    pickerKey: string,
    compact: boolean,
  ) {
    if (openStorePicker !== pickerKey) return null;
    if (!storePickerCanOpenV366) return null;

    const options = getStoresForPickerContext(chain, mode);
    const selectedName = getSelectedStoreNameFor(chain, mode);
    const selectedId = getSelectedStoreIdFor(chain, mode);

    const menuTitle =
      storeCompareScope === "within_chain"
        ? `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} kauppa`
        : mode === "local"
          ? `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} lähikauppa`
          : `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} tavaratalo`;

    const selectFromPicker = (
      event:
        | React.MouseEvent<HTMLButtonElement>
        | React.PointerEvent<HTMLButtonElement>,
      store: StoreSearchItem,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const normalizedStore = normalizeStoreForPickerV320(store);
      if (getStoreChainV320(normalizedStore) !== chain) return;

      triggerHaptic();
      selectStoreForCurrentMode(normalizedStore, mode);
      window.setTimeout(() => setOpenStorePicker(null), 0);
    };

    const menuBody = (
      <>
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <p className="min-w-0 truncate text-[11px] font-black uppercase tracking-wide text-slate-500">
            {menuTitle}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpenStorePicker(null);
            }}
            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1.5 text-[10px] font-black text-slate-600 active:scale-[0.98]"
          >
            Sulje
          </button>
        </div>

        <div
          className="max-h-[38dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-y"
          onTouchMove={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {options.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-3 font-bold text-slate-400">
              Ei kauppoja valittavana. Hae alue uudelleen.
            </p>
          ) : (
            options.map((store, index) => {
              const selected = Boolean(
                (selectedId && store.id === selectedId) ||
                (selectedName && store.name === selectedName),
              );
              const distanceLabel = getStoreDistanceLabelV320(store);

              return (
                <button
                  key={`${pickerKey}-${store.type || chain}-${store.id || index}-${normalize(store.name || "")}`}
                  type="button"
                  onClick={(event) => selectFromPicker(event, store)}
                  className={`mb-2 flex w-full touch-manipulation items-center justify-between gap-1 rounded-xl px-2 py-2.5 text-left font-extrabold transition last:mb-0 active:scale-[0.99] ${
                    selected
                      ? chain === "S"
                        ? "bg-green-700 text-white"
                        : "bg-red-700 text-white"
                      : "bg-slate-50 text-slate-700 active:bg-slate-100"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-normal break-words text-[13px] leading-tight">
                      {store.name}
                    </span>
                    <span
                      className={`mt-1 block text-[11px] leading-tight ${selected ? "text-white/80" : "text-slate-400"}`}
                    >
                      {[
                        store.city || activeArea.label || "",
                        store.postalCode || "",
                        distanceLabel,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {(selected || distanceLabel) && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${selected ? "bg-white/20 text-white" : "bg-white text-slate-400"}`}
                    >
                      {selected ? "Valittu" : distanceLabel}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </>
    );

    if (typeof document === "undefined") return null;

    const portalContent = (
      <div
        className="fixed inset-0 z-[2147483647] bg-transparent ziiply-store-picker-fade"
        onClick={() => setOpenStorePicker(null)}
        onTouchMove={(event) => {
          event.preventDefault();
        }}
      >
        <div
          className="fixed left-1/2 overflow-hidden rounded-[1.35rem] bg-white p-1.5 text-left text-xs shadow-[0_18px_55px_rgba(15,23,42,0.28)] ring-1 ring-slate-200 ziiply-store-picker-panel-fade"
          style={{
            top: `${storePickerViewportStyle.top}px`,
            width: `${storePickerViewportStyle.width}px`,
            transform: "translateX(-50%)",
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {menuBody}
        </div>
      </div>
    );

    return createPortal(portalContent, document.body);
  }

  function renderStoreChoiceButton(
    chain: "S" | "K",
    mode: StoreMode,
    pickerKey: string,
    compact: boolean,
  ) {
    const options =
      storeCompareScope !== "within_chain" && !storeModeChosenV299
        ? []
        : getStoresForPickerContext(chain, mode);
    const hasMany = options.length > 1;

    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!storePickerCanOpenV366) {
            setOpenStorePicker(null);
            setLocationMessage(
              storeSearchLoading || gpsStoreLocationPendingV366 || gpsStorePickerBlockedV382
                ? "Haetaan vielä sijaintia ja kauppoja..."
                : "Hae alue tai käytä omaa sijaintia ensin.",
            );
            return;
          }
          if (!hasMany) {
            setOpenStorePicker(null);
            return;
          }
          setOpenStorePicker((current) =>
            current === pickerKey ? null : pickerKey,
          );
        }}
        className={`mt-1 rounded-full px-2 py-1 font-black ring-1 ${compact ? "text-[9px]" : "text-[10px]"} ${
          hasMany
            ? "bg-white/90 text-slate-700 ring-slate-200"
            : "bg-slate-100 text-slate-400 ring-slate-200"
        }`}
      >
        {hasMany ? "Vaihda" : "Valittu"}
      </button>
    );
  }

  const selectedRealChainCount =
    Number(Boolean(selectedChains.s)) + Number(Boolean(selectedChains.k));
  function renderComparedStoreCards(compact = false) {
    if (
      storeCompareScope === "none" ||
      (storeCompareScope === "between_chains" && !storeModeChosenV299)
    ) {
      return (
        <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-extrabold text-amber-800 ring-1 ring-amber-200">
          
        </div>
      );
    }

    if (storeCompareScope === "within_chain") {
      const chainCards = comparedStoreCards.filter(
        (store) => store.key === "s" || store.key === "k",
      );
      const selectedChainKey =
        withinChain === "S" ? "s" : withinChain === "K" ? "k" : null;

      return (
        <div className={compact ? "mt-0" : "mt-3"}>
          <div
            className={
              compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3"
            }
          >
            {chainCards.map((store) => {
              const selected = selectedChainKey === store.key;
              const chain = store.key === "s" ? "S" : "K";
              const modeA: StoreMode = "hyper";
              const modeB: StoreMode = "local";
              const storeNameA =
                getSelectedStoreNameFor(chain, modeA) ||
                (chain === "S" ? "S-kauppa 1" : "K-kauppa 1");
              const storeNameB =
                getSelectedStoreNameFor(chain, modeB) ||
                (chain === "S" ? "S-kauppa 2" : "K-kauppa 2");
              const selectedStoreA = findStoreForSelectionV320(chain, modeA);
              const selectedStoreB = findStoreForSelectionV320(chain, modeB);
              const distanceA = getStoreDistanceLabelV320(selectedStoreA);
              const distanceB = getStoreDistanceLabelV320(selectedStoreB);

              return (
                <div
                  key={store.key}
                  className={`${compact ? "min-h-[7.8rem] rounded-xl p-2" : "rounded-2xl p-3"} relative border shadow-sm ring-1 transition ${
                    selected
                      ? `${store.selectedTone} ring-current/20`
                      : "border-slate-200 bg-white text-slate-600 ring-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const nextChain = chain;
                      setWithinChain(nextChain);
                      setSelectedChains((current) => ({
                        ...current,
                        s: nextChain === "S",
                        k: nextChain === "K",
                        lidl: false,
                        tokmanni: false,
                      }));
                      setOpenStorePicker(null);
                      setLocationMessage(
                        `${store.title} valittu ketjun sisäiseen vertailuun. Valitse kaksi vertailtavaa kauppaa.`,
                      );
                    }}
                    className="w-full text-center"
                  >
                    <span
                      className={`absolute ${compact ? "right-2 top-2 h-5 w-5 text-[10px]" : "right-3 top-3 h-6 w-6 text-xs"} flex items-center justify-center rounded-full font-black ${
                        selected
                          ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                          : "bg-slate-100 text-slate-300"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <div
                      className={`absolute left-2 top-2 z-30 flex items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 ring-slate-200 ${compact ? "h-8 w-8" : "h-9 w-9"}`}
                    >
                      <img
                        src={store.key === "s" ? "/storelogos/s-group.png" : "/storelogos/k-group.png"}
                        alt={store.title}
                        draggable={false}
                        className="h-full w-full object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    <div className={compact ? "h-9" : "h-10"} aria-hidden="true" />
                    <p
                      className={
                        compact
                          ? "mt-0 text-[9px] font-black uppercase tracking-tight text-slate-500"
                          : "mt-0 text-[10px] font-black uppercase tracking-wide text-slate-500"
                      }
                    >
                      {store.title}
                    </p>
                  </button>

                  {selected && (
                    <div
                      className={
                        compact
                          ? "mt-1.5 grid grid-cols-2 gap-1.5"
                          : "mt-2 grid grid-cols-2 gap-1.5"
                      }
                    >
                      <div
                        className={
                          compact
                            ? "relative rounded-lg bg-white/90 px-1.5 py-1 text-center ring-1 ring-slate-200"
                            : "relative rounded-xl bg-white/80 p-1.5 text-center ring-1 ring-slate-200"
                        }
                      >
                        <p className="text-[9px] font-black uppercase text-slate-400">
                          Kauppa 1
                        </p>
                        <p
                          className={
                            compact
                              ? "min-h-[2.1rem] whitespace-normal break-words text-[9px] font-extrabold leading-tight text-slate-800"
                              : "min-h-[2.7rem] whitespace-normal break-words text-[11px] font-extrabold leading-tight text-slate-800"
                          }
                        >
                          {storeNameA}
                        </p>
                        {distanceA && (
                          <p className="mt-0 text-[9px] font-black text-slate-400">
                            {distanceA}
                          </p>
                        )}
                        {renderStoreChoiceButton(
                          chain,
                          modeA,
                          `${store.key}-within-hyper`,
                          compact,
                        )}
                        {renderStorePickerMenu(
                          chain,
                          modeA,
                          `${store.key}-within-hyper`,
                          compact,
                        )}
                      </div>
                      <div
                        className={
                          compact
                            ? "relative rounded-lg bg-white/90 px-1.5 py-1 text-center ring-1 ring-slate-200"
                            : "relative rounded-xl bg-white/80 p-1.5 text-center ring-1 ring-slate-200"
                        }
                      >
                        <p className="text-[9px] font-black uppercase text-slate-400">
                          Kauppa 2
                        </p>
                        <p
                          className={
                            compact
                              ? "min-h-[2.1rem] whitespace-normal break-words text-[9px] font-extrabold leading-tight text-slate-800"
                              : "min-h-[2.7rem] whitespace-normal break-words text-[11px] font-extrabold leading-tight text-slate-800"
                          }
                        >
                          {storeNameB}
                        </p>
                        {distanceB && (
                          <p className="mt-0 text-[9px] font-black text-slate-400">
                            {distanceB}
                          </p>
                        )}
                        {renderStoreChoiceButton(
                          chain,
                          modeB,
                          `${store.key}-within-local`,
                          compact,
                        )}
                        {renderStorePickerMenu(
                          chain,
                          modeB,
                          `${store.key}-within-local`,
                          compact,
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (compact) {
      const topStores = comparedStoreCards.filter(
        (store) => store.key === "s" || store.key === "k",
      );
      const bottomStores = comparedStoreCards.filter(
        (store) => store.key !== "s" && store.key !== "k",
      );


      const renderBetweenChainCard = (
        store: (typeof comparedStoreCards)[number],
        isTopRow: boolean,
      ) => {
        const isRealChain = store.key === "s" || store.key === "k";
        const chain = store.key === "s" ? "S" : store.key === "k" ? "K" : null;
        const selected = Boolean(selectedChains[store.key]);
        const selectedStoreForCard = chain
          ? findStoreForSelectionV320(chain, storeMode)
          : null;
        const distanceForCard = chain
          ? getStoreDistanceLabelV320(selectedStoreForCard)
          : "";
        const pickerKey = chain
          ? `${store.key}-${storeMode}-between`
          : `${store.key}-coming-soon`;
        const isComingSoon = Boolean(store.comingSoon);

        const cardTone =
          store.key === "s"
            ? selected
              ? "border-[#08A343] bg-[#EEF9F2] text-[#1F2B42] shadow-[0_4px_12px_rgba(8,163,67,0.12)]"
              : "border-slate-200 bg-white text-slate-500"
            : store.key === "k"
              ? selected
                ? "border-[#E3000F] bg-[#FFF1F1] text-[#1F2B42] shadow-[0_4px_12px_rgba(227,0,15,0.10)]"
                : "border-slate-200 bg-white text-slate-500"
              : selected
                ? "border-slate-300 bg-slate-50 text-slate-500 opacity-90 shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
                : "border-slate-200 bg-white text-slate-400 opacity-75";

        const logoTone =
          store.key === "s"
            ? "bg-[#009A36] text-white ring-[#DFF5E7]"
            : store.key === "k"
              ? "bg-[#E3000F] text-white ring-[#FFE0E0]"
              : store.key === "lidl"
                ? "bg-[#6D95F8] text-white ring-[#E9F0FF]"
                : "bg-[#F5D75C] text-[#344054] ring-[#FFF4BF]";

        const cardLabel =
          store.key === "s"
            ? "S-RYHMÄ"
            : store.key === "k"
              ? "K-RYHMÄ"
              : store.key === "lidl"
                ? "LIDL"
                : "TOKMANNI";

        const storeLogoSrc =
          store.key === "s"
            ? "/storelogos/s-group.png"
            : store.key === "k"
              ? "/storelogos/k-group.png"
              : store.key === "lidl"
                ? "/storelogos/lidl.png"
                : "/storelogos/spar.png";

        const displayName = isComingSoon ? "Tulossa" : store.name;

        return (
          <div
            key={store.key}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onClick={() => {
              setSelectedChains((current) => ({
                ...current,
                [store.key]: !current[store.key],
              }));
              setOpenStorePicker(null);
              triggerHaptic();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setSelectedChains((current) => ({
                ...current,
                [store.key]: !current[store.key],
              }));
              setOpenStorePicker(null);
              triggerHaptic();
            }}
            className={`relative cursor-pointer overflow-hidden rounded-[1.35rem] border-2 px-2.5 pb-1.5 pt-1.5 text-center transition active:scale-[0.985] h-[122px] min-h-[122px] max-h-[122px] ${cardTone}`}
          >
            <span
              className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-black shadow-[0_4px_10px_rgba(15,23,42,0.18)] ${selected ? "bg-[#008C35] text-white" : "bg-slate-50 text-transparent"}`}
            >
              ✓
            </span>

            <div
              className="absolute left-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 ring-slate-200"
            >
              <img
                src={storeLogoSrc}
                alt={cardLabel}
                draggable={false}
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div className="h-9" aria-hidden="true" />

            {store.key !== "s" && store.key !== "k" && (
              <p
                className="mx-auto mt-0 max-w-[70%] font-black uppercase tracking-wide text-slate-400 text-[9px]"
              >
                {cardLabel}
              </p>
            )}

            <>
              <p
                className={`absolute left-3 right-3 top-[50px] mx-auto h-[1.65rem] max-w-[7.8rem] overflow-hidden text-center text-[10.5px] font-black leading-tight ${
                  isComingSoon ? "text-slate-500" : "text-slate-900"
                }`}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {displayName}
              </p>

              {isTopRow && distanceForCard && (
                <p className="absolute left-0 right-0 top-[70px] text-[9px] font-black leading-none text-slate-400">
                  {distanceForCard}
                </p>
              )}

              <div
                className="absolute bottom-[9px] left-0 right-0 z-20 flex justify-center"
                onClick={(event) => event.stopPropagation()}
              >
                {chain ? (
                  isTopRow ? (
                    <>
                      {renderStoreChoiceButton(
                        chain,
                        storeMode,
                        pickerKey,
                        true,
                      )}
                      {renderStorePickerMenu(chain, storeMode, pickerKey, true)}
                    </>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-black text-slate-400 ring-1 ring-slate-200">
                      Tulossa
                    </span>
                  )
                ) : (
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-black text-slate-400 ring-1 ring-slate-200">
                    Tulossa
                  </span>
                )}
              </div>
            </>
          </div>
        );
      };

      return (
        <div className="mt-3 pb-1 overflow-visible">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 overflow-visible">
            {topStores.map((store) => renderBetweenChainCard(store, true))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            {bottomStores.map((store) => renderBetweenChainCard(store, false))}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {comparedStoreCards.map((store) => {
          const isRealChain = store.key === "s" || store.key === "k";
          const selected = Boolean(selectedChains[store.key]);
          const chain =
            store.key === "s" ? "S" : store.key === "k" ? "K" : null;
          const pickerKey = `${store.key}-${storeMode}`;
          const selectedStoreForCard = chain
            ? findStoreForSelectionV320(chain, storeMode)
            : null;
          const distanceForCard =
            getStoreDistanceLabelV320(selectedStoreForCard);
          const isComingSoon = Boolean(store.comingSoon);

          const cardTone =
            store.key === "s"
              ? selected
                ? "border-[#08A343] bg-[#EEF9F2] text-[#1F2B42] shadow-[0_5px_16px_rgba(8,163,67,0.16)]"
                : "border-[#d9c79a] bg-[#fff9ea] text-[#6f6b59] opacity-70"
              : store.key === "k"
                ? selected
                  ? "border-[#E3000F] bg-[#FFF1F1] text-[#1F2B42] shadow-[0_5px_16px_rgba(227,0,15,0.13)]"
                  : "border-[#d9c79a] bg-[#fff9ea] text-[#6f6b59] opacity-70"
                : selected
                  ? "border-[#d9c79a] bg-[#f5ead0] text-[#6f6b59] opacity-90"
                  : "border-[#d9c79a] bg-[#fff9ea] text-[#6f6b59] opacity-60";

          const logoTone =
            store.key === "s"
              ? "bg-[#009A36] text-white ring-[#DFF5E7]"
              : store.key === "k"
                ? "bg-[#E3000F] text-white ring-[#FFE0E0]"
                : store.key === "lidl"
                  ? "bg-[#6D95F8] text-white ring-[#E9F0FF]"
                  : "bg-[#F5D75C] text-[#344054] ring-[#FFF4BF]";

          const cardLabel =
            store.key === "s"
              ? "S-RYHMÄ"
              : store.key === "k"
                ? "K-RYHMÄ"
                : store.key === "lidl"
                  ? "LIDL"
                  : "TOKMANNI";

          const storeLogoSrc =
            store.key === "s"
              ? "/storelogos/s-group.png"
              : store.key === "k"
                ? "/storelogos/k-group.png"
                : store.key === "lidl"
                  ? "/storelogos/lidl.png"
                  : "/storelogos/spar.png";

          return (
            <div
              key={store.key}
              className={`relative flex h-[152px] min-h-0 flex-col items-center justify-start rounded-[1.55rem] border-[3px] px-2 pb-1.5 pt-1.5 text-center shadow-[0_4px_0_rgba(89,65,27,0.12),inset_0_0_0_1px_rgba(255,255,255,0.5)] transition active:scale-[0.985] ${cardTone}`}
            >
              <button
                type="button"
                aria-pressed={selected}
                disabled={false}
                onClick={() => {
                  setSelectedChains((current) => ({
                    ...current,
                    [store.key]: !current[store.key],
                  }));
                  setOpenStorePicker(null);
                }}
                className="flex w-full flex-1 flex-col items-center justify-start text-center"
              >
                <span
                  className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-base font-black shadow-[0_4px_10px_rgba(15,23,42,0.18)] ${
                    selected
                      ? "bg-[#008C35] text-white"
                      : "bg-slate-50 text-transparent"
                  }`}
                >
                  ✓
                </span>

                <div className="absolute left-2.5 top-2.5 z-30 flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 ring-slate-200">
                  <img
                    src={storeLogoSrc}
                    alt={cardLabel}
                    draggable={false}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div className="h-8" aria-hidden="true" />

                {store.key !== "s" && store.key !== "k" && (
                  <p className="mt-0 text-[11px] font-black uppercase tracking-wide text-slate-400">
                    {cardLabel}
                  </p>
                )}

                <p
                  className={`absolute left-4 right-4 top-[54px] mx-auto max-w-[8.8rem] whitespace-normal break-words text-center text-[11px] font-black leading-tight ${
                    isComingSoon ? "text-slate-500" : "text-slate-900"
                  }`}
                >
                  {isComingSoon ? "Tulossa" : store.name}
                </p>

                {isRealChain && distanceForCard && (
                  <p className="absolute left-0 right-0 top-[88px] text-[10px] font-black text-slate-400">
                    {distanceForCard}
                  </p>
                )}
              </button>

              {!compact && isRealChain && chain && selected && (
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="absolute bottom-[10px] left-0 right-0 z-20 block"
                >
                  {renderStoreChoiceButton(
                    chain,
                    storeMode,
                    pickerKey,
                    compact,
                  )}
                  {renderStorePickerMenu(chain, storeMode, pickerKey, compact)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <section
        className={`hidden xl:block h-[100dvh] overflow-hidden bg-[#efe5cf] px-2 py-2 text-[#1f2619] ${suppressUiForEanClose ? "pointer-events-none" : ""}`}
      >
        <style>{`
          html, body, #__next { background: #efe5cf !important; }
        `}</style>

        {showLaunchScreen && <ZiiplyLaunchScreen appVersion={APP_VERSION} />}

        {!showLaunchScreen && (
          <div className="mx-auto grid h-full max-w-[1540px] grid-rows-[auto_minmax(0,1fr)] gap-2">
            <header className="h-[6.2rem] rounded-[1.6rem] border-[5px] border-[#073b2d] bg-[#fff4d8] p-2 shadow-[0_5px_0_#073b2d]">
              <div className="grid grid-cols-[150px_minmax(0,1fr)_320px] items-stretch gap-2">
                <div className="flex items-center justify-center overflow-hidden rounded-[1.4rem] border border-[#d7bd87] bg-[#fffaf0] px-4">
                  <img
                    src="/ziiplylogo_mobile.png"
                    alt="Ziiply"
                    className="h-14 w-auto object-contain"
                  />
                </div>

                <div className="grid grid-cols-4 overflow-hidden rounded-[1.4rem] border border-[#d7bd87] bg-[#fffaf0]">
                  {[
                    { id: "weather", label: "SÄÄ", value: "+18°", emoji: "🌤️" },
                    {
                      id: "electricity",
                      label: "SÄHKÖ",
                      value: "4,2",
                      emoji: "⚡",
                    },
                    { id: "fuel", label: "BENSA", value: "1,65", emoji: "⛽" },
                    { id: "calendar", label: "KAL", value: "3", emoji: "📅" },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-center gap-3 border-r border-[#d7bd87] px-4 last:border-r-0"
                    >
                      <span className="text-4xl">{item.emoji}</span>
                      <div>
                        <p className="text-sm font-black text-[#003B2E]">
                          {item.label}
                        </p>
                        <p className="text-3xl font-black text-[#003B2E]">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchPanelOpen(false);
                    setCartModalOpen(false);
                    setCartSavePanelOpen(false);
                    setEanModalOpen(false);
                    setActiveResult("none");
                    setShopsPanelOpen(true);
                  }}
                  className="flex min-w-0 items-center gap-4 rounded-[1.4rem] border border-[#d7bd87] bg-[#fffaf0] px-5 text-left text-[#003B2E]"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ring-1 ${usingOwnLocation ? "bg-green-50 ring-green-200" : "bg-red-50 ring-red-200"}`}>
                    📍
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xl font-black leading-tight">
                      {activeArea.label}
                    </span>

                  </span>
                </button>
              </div>
            </header>

            <div className="grid min-h-0 grid-cols-[0.62fr_1.72fr_1.28fr] gap-2 overflow-hidden">
              <aside className="min-h-0 space-y-2 overflow-y-auto pr-1">
                <section className="h-[6.2rem] rounded-[1.6rem] border border-[#d6bf8f] bg-[#fff8e8] px-5 py-6 text-center shadow-[0_3px_0_rgba(7,59,45,0.16)] ring-1 ring-white/60">
                  <p
                    className="text-[2.05rem] font-black italic leading-[0.95] tracking-[-0.055em] text-[#28492e]"
                    style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
                  >
                    Viilaa ruokakorisi
                    <br />
                    huokeammaksi.
                  </p>
                  <div className="mx-auto my-4 h-[3px] w-20 rounded-full bg-[#d6bf8f]" />
                  <p
                    className="text-[1rem] font-bold leading-snug text-[#6f6b59]"
                    style={{ fontFamily: 'Trebuchet MS, Arial, sans-serif' }}
                  >
                    Gösta ja Justiina auttavat
                    <br />
                    arjen valinnoissa.
                  </p>
                </section>

                <section className="relative overflow-hidden rounded-[2.1rem] border-[3px] border-[#b99d62] bg-gradient-to-b from-[#f7e9c3] via-[#f0d9a4] to-[#dfbf7e] p-4 shadow-[0_0_0_2px_#fff3cf_inset,0_7px_0_rgba(80,58,25,0.28),0_18px_28px_rgba(45,31,12,0.12)] ring-1 ring-[#fff7df]/80">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#b59c67_1.15px,transparent_1.15px)] [background-size:15px_15px]" />
                  <p className="relative font-black uppercase tracking-[0.34em] text-[#746742] text-[13px] drop-shadow-[0_1px_0_#fff7df]" style={{ fontFamily: '"Copperplate", "Baskerville", Georgia, serif' }}>
                    Kauppavalinta
                  </p>

                  <div className="relative mt-3">
                    {renderComparedStoreCards(true)}
                  </div>

                  <div className="relative mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStoreModeChange("hyper")}
                      className={`rounded-[1.2rem] border-2 px-3 py-3 text-sm font-black shadow-[0_3px_0_rgba(89,65,27,0.16)] ring-1 ${storeMode === "hyper" && storeModeChosenV299 ? "border-[#0b5f32] bg-[#0c7c38] text-white ring-green-800" : "border-[#c8ab70] bg-[#fff9ea] text-[#3b3a30] ring-[#d6bf8f]"}`}
                    >
                      🏬 Tavaratalot
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStoreModeChange("local")}
                      className={`rounded-[1.2rem] border-2 px-3 py-3 text-sm font-black shadow-[0_3px_0_rgba(89,65,27,0.16)] ring-1 ${storeMode === "local" && storeModeChosenV299 ? "border-[#0b5f32] bg-[#0c7c38] text-white ring-green-800" : "border-[#c8ab70] bg-[#fff9ea] text-[#3b3a30] ring-[#d6bf8f]"}`}
                    >
                      🏪 Lähikaupat
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleStoreCompareScopeChange("between_chains")
                      }
                      className={`rounded-[1.2rem] border-2 px-3 py-3 text-sm font-black shadow-[0_3px_0_rgba(89,65,27,0.16)] ring-1 ${storeCompareScope === "between_chains" ? "border-[#0b5f32] bg-[#0c7c38] text-white ring-green-800" : "border-[#c8ab70] bg-[#fff9ea] text-[#3b3a30] ring-[#d6bf8f]"}`}
                    >
                      Ketjujen väliltä
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleStoreCompareScopeChange("within_chain")
                      }
                      className={`rounded-[1.2rem] border-2 px-3 py-3 text-sm font-black shadow-[0_3px_0_rgba(89,65,27,0.16)] ring-1 ${storeCompareScope === "within_chain" ? "border-[#0b5f32] bg-[#0c7c38] text-white ring-green-800" : "border-[#c8ab70] bg-[#fff9ea] text-[#3b3a30] ring-[#d6bf8f]"}`}
                    >
                      Ketjun sisältä
                    </button>
                  </div>
                </section>
              </aside>

              <main className="min-h-0 space-y-2 overflow-y-auto pr-1">
                <div className="relative z-10 overflow-hidden rounded-[36px]">
                  <ZiiplyStoreLocaCard
                    locationInput={locationInput}
                    onLocationInputChange={(nextValue) => {
                      setLocationInput(nextValue);
                      if (nextValue.trim()) {
                        gpsUserDisabledRefV306.current = true;
                        setUsingOwnLocation(false);
                      }
                      setLocationMessage("Kirjoita alue tai postinumero.");
                    }}
                    
                    onUseOwnLocation={() => void useOwnLocation()}
                    onDisableOwnLocation={() =>
                      stopOwnLocationV306(
                        "GPS pois päältä. Kirjoita alue tai postinumero.",
                      )
                    }
                    onOpenShops={() => {
                      setCartModalOpen(false);
                      setCartSavePanelOpen(false);
                      setEanModalOpen(false);
                      closeProductSelectionOverlay();
                      setSearchPanelOpen(false);
                      setShopsPanelOpen(true);
                    }}
                    usingOwnLocation={usingOwnLocation}
                    locationMessage={locationMessage}
                    locationMessageVisible={locationMessageVisible}
                    storeSearchLoading={storeSearchLoading}
                    placeholder="05510 tai Hyvinkää"
                  />
                </div>

                <ZiiplySearchCard
                  className="z-20"
                  value={input}
                  onChange={setSearchInputForMode}
                  mode={searchCompareMode}
                  onModeChange={setSearchCompareMode}
                  onAddFromNotebook={() => void pasteFromClipboardToSearch()}
                  onScan={() => openDesktopScanner()}
                  onGostaSearch={handleGostaOfferSearch}
                  onJustiinaSearch={handleJustiinaProductSearch}
                  chips={instantSearchSuggestions.map((suggestion) => ({
                    id: suggestion.label,
                    label: suggestion.label,
                    onClick: () => applyInstantSearchSuggestion(suggestion.label),
                  }))}
                  instructionText="Justiina ehdottaa sopivia hakusanoja kirjoituksen mukaan."
                  notFoundTerms={notFoundSearchTerms}
                  gostaLoading={loadingOffers}
                  justiinaLoading={loadingNormal || singleProductCompareLoading}
                  activePanel={
                    activeResult === "compare"
                      ? "compare"
                      : filteredOffers.length > 0 ||
                          visibleNormalResults.length > 0 ||
                          singleProductCompareResults.length > 0
                        ? "results"
                        : "none"
                  }
                  onOpenResults={() => setActiveResult((current) => current === "offers" ? "none" : "offers")}
                  onOpenCompare={() => {
                    if (activeResult === "compare") {
                      setActiveResult("none");
                      return;
                    }
                    if (cart.length > 0 && !comparisonLoading) {
                      void updateChainComparison(cart, { openCompare: true });
                      return;
                    }
                    setActiveResult("compare");
                  }}
                  resultsPanel={
                    <div className="space-y-3">
                      {loadingOffers ? null : activeResult === "offers" && filteredOffers.length > 0 ? (
                        filteredOffers.slice(0, 12).map((item) => {
                          const product = offerToProduct(item);
                          return (
                            <div
                              key={`desktop-offer-card-${item.id}`}
                              className="rounded-[1.2rem] border-2 border-[#d5bd82] bg-[#fff3d5] p-3 shadow-[0_3px_0_rgba(113,82,31,0.16),inset_0_0_0_1px_rgba(255,255,255,0.55)]"
                            >
                              <div className="flex items-center gap-3">
                                {product.pictureUrl && (
                                  <img
                                    src={product.pictureUrl}
                                    alt=""
                                    className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-base font-black leading-tight text-[#1f2619]">
                                    {fixText(product.name)}
                                  </p>
                                  <p className="text-xs font-bold text-[#6f6b59]">
                                    {item.storeName} · {formatEuro(getProductPrice(product))}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addOfferToCart(item)}
                                  className={`rounded-xl px-3 py-2 text-xs font-black text-white transition ${justAdded === item.id ? "bg-emerald-700" : "bg-green-600 hover:bg-green-700"}`}
                                >
                                  {justAdded === item.id ? "✓ Lisätty" : "Lisää"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : loadingNormal || singleProductCompareLoading ? null : visibleNormalResults.length > 0 ? (
                        visibleNormalResults.slice(0, 12).map((product) => (
                          <div
                            key={`desktop-product-card-${product.id}-${product.ean || product.name}`}
                            className="flex items-center gap-3 rounded-[1.2rem] border-2 border-[#d5bd82] bg-[#fff3d5] p-3 shadow-[0_3px_0_rgba(113,82,31,0.16),inset_0_0_0_1px_rgba(255,255,255,0.55)]"
                          >
                            {product.pictureUrl && (
                              <img
                                src={product.pictureUrl}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-base font-black leading-tight text-[#1f2619]">
                                {fixText(product.name)}
                              </p>
                              <p className="text-xs font-bold text-[#6f6b59]">
                                {formatEuro(getProductPrice(product))}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addProductToCart(product)}
                              className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white"
                            >
                              Lisää
                            </button>
                          </div>
                        ))
                      ) : singleProductCompareResults.length > 0 ? (
                        singleProductCompareResults.slice(0, 12).map((result, index) => (
                          <div
                            key={`desktop-single-card-${index}-${result.chain}-${result.storeName}-${result.productName}`}
                            className="rounded-[1.2rem] border-2 border-[#d5bd82] bg-[#fff3d5] p-3 shadow-[0_3px_0_rgba(113,82,31,0.16),inset_0_0_0_1px_rgba(255,255,255,0.55)]"
                          >
                            <p className="truncate text-sm font-black text-[#1f2619]">
                              {fixText(result.productName)}
                            </p>
                            <p className="text-xs font-bold text-[#6f6b59]">
                              {result.storeName} · {formatEuro(result.price)}
                            </p>
                          </div>
                        ))
                      ) : hasSearchedOffers ? null : null}
                    </div>
                  }
                  comparePanel={
                    <ZiiplyCompareCard
                      stores={chainResults
                        .filter((result) => !result.comingSoon)
                        .map((result) => ({
                          id: result.key,
                          name: result.storeName || result.chain,
                          chain: result.key === "s" ? "S" : result.key === "k" ? "K" : undefined,
                          totalPrice: Math.round((result.totalPrice || 0) * 100),
                          itemCount: result.foundItems,
                          isBest: cheapest?.key === result.key,
                          badge: result.missingItems > 0 ? `${result.missingItems} puuttuu` : "Täysi kori",
                        }))}
                      title="Vertailu"
                      subtitle={cart.length > 0 ? `${cart.length} tuotetta korissa` : "Lisää tuotteita koriin ja vertaile kauppoja"}
                      loading={comparisonLoading}
                    />
                  }
                />


              </main>

              <aside className="min-h-0">
                <div className="ziiply-cart-retro-fix h-full min-h-0 space-y-2 overflow-y-auto pr-1">
                  <ZiiplyCartCard
                    cart={cart}
                    shoppingListItems={shoppingListItems}
                    checkedCartItems={checkedCartItems}
                    checkedCount={checkedCount}
                    shoppingListCount={shoppingListCount}
                    shoppingProgressPercent={shoppingProgressPercent}
                    cheapest={cheapest}
                    secondCheapest={secondCheapest}
                    savings={savings}
                    savingsPercent={savingsPercent}
                    bestShoppingListGroups={bestShoppingListGroups}
                    getShoppingListItemKey={getShoppingListItemKey}
                    toggleShoppingListItem={toggleShoppingListItem}
                    onToggleShoppingListItem={toggleShoppingListItem}
                    onToggleCollected={toggleShoppingListItem}
                    markAllShoppingListItemsChecked={markAllShoppingListItemsChecked}
                    clearShoppingListChecks={clearShoppingListChecks}
                    formatEuro={formatEuro}
                    fixText={fixText}
                    setCheckedCartItems={setCheckedCartItems}
                    shoppingItemRefs={shoppingItemRefs}
                    onIncreaseQuantity={(itemId: string) => changeQuantity(itemId, 1)}
                    onDecreaseQuantity={(itemId: string) => changeQuantity(itemId, -1)}
                    onRemoveItem={removeCartItem}
                    onAddMore={openSearchPanel}
                    onClearCart={clearCart}
                    onCompare={() => {
                      if (!cart.length || comparisonLoading) return;
                      void updateChainComparison(cart, { openCompare: true });
                    }}
                    cartSavePanelOpen={cartSavePanelOpen}
                    onToggleSavePanel={() => setCartSavePanelOpen((value) => !value)}
                    savedListName={savedListName}
                    setSavedListName={setSavedListName}
                    onSaveCurrentCartAsList={saveCurrentCartAsList}
                    savedShoppingLists={savedShoppingLists}
                    onAddSavedListToCart={addSavedListToCart}
                    onDeleteSavedShoppingList={deleteSavedShoppingList}
                  />
                </div>
              </aside>
            </div>
          </div>
        )}

        {eanModalOpen && (
          <div
            className={`fixed inset-0 z-[120] hidden items-center justify-center overflow-y-auto bg-[#13251b]/78 px-4 py-5 backdrop-blur-sm xl:flex ${eanModalClosing ? "ziiply-soft-close" : "ziiply-soft-open"}`}
          >
            <div className="relative w-full max-w-[58rem] overflow-hidden rounded-[2.25rem] border-4 border-[#d5b982] bg-[#f7ead0] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-4 ring-[#263b24]/50">
              <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#6f5a31_1px,transparent_1px)] [background-size:14px_14px]" />
              <div className="relative rounded-[1.7rem] border border-[#b99e67] bg-[#fbf2dc]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="grid grid-cols-[14rem_1fr] gap-4">
                  <aside className="space-y-4">
                    <div>
                      <p className="font-serif text-[3.25rem] font-black italic leading-[0.88] text-[#31402c] drop-shadow-sm">
                        Skanneri
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border-2 border-[#7b5f32] bg-[#efe0bf] p-4 text-[#2e2b21] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35)]">
                      <p className="font-serif text-2xl font-black italic text-[#2f3d28]">
                        Näin se toimii:
                      </p>
                      <div className="mt-4 space-y-4 text-sm font-bold leading-tight">
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465638] text-white">1</span>
                          <span>Ota kuva kuitista tai tuotteesta</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465638] text-white">2</span>
                          <span>Skanneri etsii hinnat ja hinnanhuojennukset</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465638] text-white">3</span>
                          <span>Säästöt näkyviin heti</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border-2 border-[#7b5f32] bg-[#efe0bf] p-4 text-center shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35)]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4c4633]">
                        Tänään skannattu
                      </p>
                      <div className="mt-3 grid grid-cols-2 divide-x divide-[#b99e67]">
                        <div>
                          <p className="text-4xl font-black text-[#3f4935]">
                            {Math.max(0, eanResults.length)}
                          </p>
                          <p className="text-xs font-bold text-[#5d5845]">osumaa</p>
                        </div>
                        <div>
                          <p className="text-4xl font-black text-[#3f4935]">
                            {cart.length}
                          </p>
                          <p className="text-xs font-bold text-[#5d5845]">korissa</p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-[#4c4633]">
                        Säästöpotentiaali
                      </p>
                      <p className="text-4xl font-black text-[#5f7a45]">
                        {formatEuro(savings > 0 ? savings : 0)}
                      </p>
                    </div>
                  </aside>

                  <main className="min-w-0">
                    <div className="mb-3 grid grid-cols-[1fr] gap-3">
                      <div>
                        <p className="flex min-h-[4.25rem] items-center rounded-2xl bg-[#efe0bf] px-5 py-3 font-serif text-[1.45rem] italic leading-tight text-[#31402c] shadow-sm">
                          {desktopKeyboardScannerOpen
                            ? "Piippaa tuote lukijalla. Ziiply lukee koodin kuin näppäimistösyötön."
                            : eanScannerOpen
                              ? "Kuva otetaan, hinnanhuojennukset talteen. Säästöt esiin!"
                              : "Valitse skannaustapa: kamera tai erillinen viivakoodinlukija."}
                        </p>
                      </div>
                    </div>

                    {eanScannerMessage && (
                      <div className="mb-3 rounded-2xl bg-[#f2e3c4] px-4 py-3 text-sm font-black leading-snug text-[#4f4733] ring-1 ring-[#d8bd86]">
                        {eanScannerMessage}
                      </div>
                    )}

                    {!eanScannerOpen && !desktopKeyboardScannerOpen && (
                      <div className="grid min-h-[26rem] grid-cols-2 gap-4 rounded-[2rem] border-[6px] border-[#7b5f32] bg-[#efe0bf] p-5 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35),0_10px_20px_rgba(0,0,0,0.16)]">
                        <button
                          type="button"
                          onClick={() => void openDesktopCameraScanner()}
                          className="group flex flex-col justify-between h-[6.2rem] rounded-[1.6rem] border-[4px] border-[#1f211a] bg-[#10140f] p-4 text-left shadow-[inset_0_0_0_2px_rgba(255,255,255,0.14),0_8px_0_rgba(61,42,18,0.30)] transition hover:brightness-110 active:translate-y-[1px]"
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.25rem] border-4 border-[#5d5037] bg-slate-950">
                            <div className="absolute left-1/2 top-1/2 h-1 w-[72%] -translate-x-1/2 -translate-y-1/2 bg-[#9fbe66]/75 shadow-[0_0_18px_4px_rgba(159,190,102,0.45)]" />
                            <div className="absolute inset-[14%] rounded-2xl border-4 border-[#f7ead0]/80">
                              <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-[#f7ead0]" />
                              <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-[#f7ead0]" />
                              <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-[#f7ead0]" />
                              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-[#f7ead0]" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center text-6xl">📷</div>
                          </div>
                          <div className="mt-4 rounded-2xl bg-[#fbf2dc] px-4 py-3 text-[#2f3d28] shadow-sm">
                            <p className="font-serif text-[1.8rem] font-black italic leading-none">Käytä kameraa</p>
                            <p className="mt-2 text-sm font-black leading-tight text-[#4f4733]">Nykyinen kameraskanneri. Sopii erilliselle webkameralle tai hyvälle laitekameralle.</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => openDesktopKeyboardScanner()}
                          className="group flex flex-col justify-between h-[6.2rem] rounded-[1.6rem] border-[4px] border-[#7b5f32] bg-[#f6e7c4] p-4 text-left shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35),0_8px_0_rgba(61,42,18,0.25)] transition hover:brightness-105 active:translate-y-[1px]"
                        >
                          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[1.25rem] border-4 border-[#b99e67] bg-[#fff8e7]">
                            <div className="absolute inset-x-8 top-1/2 h-3 -translate-y-1/2 rounded-full bg-[#9fbe66]/70 shadow-[0_0_18px_4px_rgba(159,190,102,0.28)]" />
                            <div className="flex items-end gap-2 text-[#23351f]">
                              {[8, 18, 11, 28, 14, 22, 9, 30, 16, 24, 10, 20].map((height, index) => (
                                <span
                                  key={index}
                                  className="w-2 rounded-sm bg-[#23351f]"
                                  style={{ height }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 rounded-2xl bg-[#fbf2dc] px-4 py-3 text-[#2f3d28] shadow-sm">
                            <p className="font-serif text-[1.8rem] font-black italic leading-none">Käytä viivakoodinlukijaa</p>
                            <p className="mt-2 text-sm font-black leading-tight text-[#4f4733]">USB- tai Bluetooth-lukija syöttää EAN-koodin automaattisesti.</p>
                          </div>
                        </button>
                      </div>
                    )}

                    {eanScannerOpen && (
                      <>
                        <div className="relative overflow-hidden rounded-[2rem] border-[10px] border-[#1f211a] bg-[#10140f] p-4 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.16),0_10px_20px_rgba(0,0,0,0.25)]">
                          <div className="absolute left-1/2 top-3 z-10 h-9 w-28 -translate-x-1/2 rounded-xl border-2 border-[#cfc1a0] bg-transparent/70 shadow-inner" />
                          <div className="absolute right-5 top-4 z-10 h-11 w-11 rounded-full border-4 border-[#cfc1a0] bg-[#0c0d0b] shadow-inner" />
                          <div
                            className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] border-4 border-[#5d5037] bg-slate-950"
                            onPointerDown={(event) => void focusScannerCameraAtPoint(event)}
                          >
                            <div
                              id={EAN_SCANNER_REGION_ID}
                              className="ziiply-desktop-scanner-region absolute inset-0 h-full w-full overflow-hidden rounded-[1.2rem] bg-slate-950 [&_*]:!box-border [&_canvas]:!hidden [&_div]:!border-0 [&_div]:!shadow-none [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:rounded-[1.2rem] [&_video]:!object-cover"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-[1.2rem] bg-[radial-gradient(circle_at_center,transparent_0%,transparent_58%,rgba(0,0,0,0.38)_84%)]" />
                            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-[#9fbe66]/70 shadow-[0_0_18px_4px_rgba(159,190,102,0.45)]" />
                            <div className="pointer-events-none absolute inset-[13%] rounded-2xl border-4 border-[#f7ead0]/80">
                              <div className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-[#f7ead0]" />
                              <div className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-[#f7ead0]" />
                              <div className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-[#f7ead0]" />
                              <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-[#f7ead0]" />
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEanManualInputOpen((open) => !open)}
                              className="rounded-xl border border-[#8b744b] bg-[#d7c196] px-4 py-3 text-sm font-black text-[#3a3325] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] active:scale-[0.98]"
                            >
                              EAN käsin
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleScannerTorch()}
                              className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#d6bf8f] text-2xl shadow-lg active:scale-[0.98] ${scannerTorchOn ? "bg-yellow-100 text-yellow-900" : "bg-[#789155] text-[#f7ead0]"}`}
                              aria-label="Valo"
                            >
                              📷
                            </button>
                            <button
                              type="button"
                              onClick={() => void closeEanModal()}
                              className="rounded-xl bg-[#3d5a2f] px-4 py-3 text-sm font-black text-[#f7ead0] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] active:scale-[0.98]"
                            >
                              Sulje kamera
                            </button>
                          </div>
                        </div>

                        <div
                          className={`mt-3 flex min-h-[4.25rem] gap-2 rounded-2xl border border-[#d6bf8f] bg-[#efe0bf] p-2 transition-opacity duration-150 ${eanManualInputOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
                          aria-hidden={!eanManualInputOpen}
                        >
                          <input
                            ref={eanInputRef}
                            value={eanInput}
                            onChange={(event) =>
                              setEanInput(event.target.value.replace(/\D/g, ""))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void searchByEan();
                            }}
                            inputMode="numeric"
                            placeholder="Syötä EAN, esim. 641..."
                            className="min-w-0 flex-1 rounded-xl border border-[#d6bf8f] bg-white px-4 py-3 text-base font-bold tracking-wide text-[#172016] outline-none focus:border-green-700"
                          />
                          <button
                            type="button"
                            onClick={() => void searchByEan()}
                            className="rounded-xl bg-[#0c7c38] px-5 py-3 text-sm font-black text-white"
                          >
                            Hae
                          </button>
                        </div>
                      </>
                    )}

                    {desktopKeyboardScannerOpen && !eanScannerOpen && (
                      <div className="rounded-[2rem] border-[6px] border-[#7b5f32] bg-[#efe0bf] p-5 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.35),0_10px_20px_rgba(0,0,0,0.16)]">
                        <div className="rounded-[1.5rem] border-[4px] border-[#b99e67] bg-[#fff8e7] p-5 text-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.65)]">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#2f7c3f] bg-[#dff2c4] text-3xl shadow-[0_0_0_4px_rgba(47,124,63,0.12)]">
                            ▌▌▌
                          </div>
                          <p className="mt-4 font-serif text-[2.35rem] font-black italic leading-none text-[#31402c]">
                            Valmis lukemaan
                          </p>
                          <p className="mx-auto mt-2 max-w-[30rem] text-sm font-black leading-snug text-[#4f4733]">
                            Klikkaa kenttään ja piippaa tuote lukijalla. Lukija kirjoittaa koodin ja lähettää yleensä Enterin lopuksi.
                          </p>

                          <div className="mt-5 flex gap-3">
                            <input
                              ref={eanInputRef}
                              value={eanInput}
                              onChange={(event) =>
                                setEanInput(event.target.value.replace(/\D/g, ""))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") void searchByEan();
                              }}
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="Skannaa EAN-koodi"
                              className="min-w-0 flex-1 rounded-[1.25rem] border-[3px] border-[#b99e67] bg-white px-5 py-5 text-center text-2xl font-black tracking-[0.22em] text-[#172016] shadow-[inset_0_2px_8px_rgba(91,65,28,0.10)] outline-none placeholder:tracking-normal placeholder:text-[#8b846f] focus:border-[#2f7c3f] focus:ring-4 focus:ring-[#c4dfbd]"
                              onPaste={(event) => {
                                const pastedText = event.clipboardData.getData("text");
                                const code = normalizeEan(pastedText);
                                if (!code) return;
                                event.preventDefault();
                                setEanInput(code);
                                window.setTimeout(() => void searchByEan(code), 30);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void searchByEan()}
                              className="rounded-[1.25rem] border-[3px] border-[#0b6330] bg-gradient-to-b from-[#159b46] to-[#087a35] px-8 py-4 text-base font-black text-[#fff0d5] shadow-[0_5px_0_#064a26] active:translate-y-1 active:shadow-[0_2px_0_#064a26]"
                            >
                              Hae
                            </button>
                          </div>

                          {eanMessage && (
                            <div className="mt-4 rounded-2xl bg-[#f2e3c4] px-4 py-3 text-sm font-black text-[#4f4733] ring-1 ring-[#d8bd86]">
                              {eanMessage}
                            </div>
                          )}

                          <div className="mt-5 flex justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setDesktopKeyboardScannerOpen(false);
                                setEanScannerMessage("");
                                setEanInput("");
                                setEanMessage("");
                              }}
                              className="rounded-xl border border-[#8b744b] bg-[#d7c196] px-5 py-3 text-sm font-black text-[#3a3325] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] active:scale-[0.98]"
                            >
                              Takaisin
                            </button>
                            <button
                              type="button"
                              onClick={() => void closeEanModal()}
                              className="rounded-xl bg-[#3d5a2f] px-5 py-3 text-sm font-black text-[#f7ead0] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] active:scale-[0.98]"
                            >
                              Sulje
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {eanResults.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-[#d6bf8f] bg-[#fbf2dc] p-3 text-sm font-bold text-[#3a3325]">
                        Löysin {eanResults.length} tulosta. Lisää tuotteet koriin normaalista EAN-tuloslistasta.
                      </div>
                    )}
                  </main>
                </div>
              </div>
            </div>
          </div>
        )}

      </section>

      <main
        className={`xl:hidden min-h-screen overflow-x-hidden bg-[#EAF4F1] px-2 pb-44 pt-0 text-slate-950 sm:bg-[radial-gradient(circle_at_top,#ecfdf3_0%,#f8fafc_42%,#f1f5f9_100%)] sm:px-4 sm:pb-32 sm:py-3 sm:py-4 md:pb-4 ${suppressUiForEanClose ? "pointer-events-none" : ""}`}
      >
        <style>{`
        html,
        body {
          background: #EAF4F1 !important;
        }

        #__next {
          background: #EAF4F1 !important;
          min-height: 100dvh;
        }

        @media (min-width: 640px) {
          .ziiply-desktop-debug-compact {
            max-width: 1180px;
          }

          .ziiply-desktop-debug-compact img[src="/ziiplylogo_mobile.png"] {
            max-height: 96px !important;
          }

          .ziiply-desktop-debug-compact input,
          .ziiply-desktop-debug-compact button {
            min-height: 0;
          }
        }


        @keyframes ziiply-store-picker-fade {
          from { opacity: 0; filter: blur(3px); }
          to { opacity: 1; filter: blur(0); }
        }
        .ziiply-store-picker-fade {
          animation: ziiply-store-picker-fade 440ms ease-out both;
        }
        .ziiply-store-picker-panel-fade {
          animation: ziiply-store-picker-fade 520ms ease-out both;
        }

        @keyframes ziiply-soft-open {
          from { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .ziiply-soft-open {
          animation: ziiply-soft-open 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: top center;
        }
        .ziiply-soft-open-fast {
          animation: ziiply-soft-open 190ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: top center;
        }
        @keyframes ziiply-soft-close {
          from { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          to { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(2px); }
        }
        .ziiply-soft-close {
          animation: ziiply-soft-close 260ms cubic-bezier(0.7, 0, 0.84, 0) both;
          pointer-events: none;
          transform-origin: top center;
        }
        @keyframes ziiply-search-ready-bounce {
          0% { transform: translateY(0) scale(1); }
          24% { transform: translateY(-9px) scale(1.08); }
          48% { transform: translateY(0) scale(1); }
          68% { transform: translateY(-4px) scale(1.03); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes ziiply-search-ready-attention {
          0%, 100% { background-color: transparent; box-shadow: none; filter: none; }
          18%, 58% { background-color: rgba(250, 204, 21, 0.95); box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.22), 0 8px 18px rgba(202, 138, 4, 0.28); filter: saturate(1.18); }
        }
        .ziiply-search-ready-bounce {
          animation: ziiply-search-ready-bounce 1.15s cubic-bezier(0.22, 1, 0.36, 1) both, ziiply-search-ready-attention 1.15s ease-in-out both;
          transform-origin: center bottom;
          will-change: transform, background-color, box-shadow, filter;
          display: inline-flex;
          min-width: 1.75rem;
          min-height: 1.75rem;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
        }

        #ziiply-ean-scanner-region,
        #ziiply-ean-scanner-region > div,
        #ziiply-ean-scanner-region video {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          overflow: hidden !important;
          border-radius: 1rem !important;
        }
        #ziiply-ean-scanner-region video {
          object-fit: cover !important;
        }

        /* Desktop scanner preview mirror: fixes left/right direction in camera view only. */
        @media (min-width: 1280px) {
          .ziiply-desktop-scanner-region video {
            transform: scaleX(-1) !important;
            transform-origin: center center !important;
          }
        }
        #ziiply-ean-scanner-region canvas,
        #ziiply-ean-scanner-region svg {
          display: none !important;
        }

        .ziiply-mobile-home-layer-lock {
          position: relative;
          z-index: 1;
          transform: translate3d(0, 0, 0);
          contain: layout paint;
          isolation: isolate;
          min-height: 0;
        }

        @media (max-width: 639px) {
          .ziiply-mobile-home-layer-lock {
            margin-top: 0 !important;
          }
        }
      `}</style>
        {showLaunchScreen && <ZiiplyLaunchScreen appVersion={APP_VERSION} />}

        <div
          className={`relative z-[80] m-0 p-0 mt-1 mb-0 ziiply-desktop-debug-compact sm:mx-auto sm:max-w-[1180px] sm:px-4 ${showLaunchScreen ? "hidden" : ""}`}
        >
          {/* v388_TOPBAR_BACKGROUND_LOCK: keeps Safari from pulling the hero/background upward after idle/reload. */}
        <KauppiasMobileTopBar
            hidden={showLaunchScreen}
            areaLabel={activeArea.label}
            onOpenCalendar={() => {
              try {
                window.location.href = "calshow://";
              } catch {
                window.location.href = "webcal://";
              }
            }}
          />
        </div>
        {/* v389_MOBILE_HOME_LAYER_ANCHOR:
            KauppiasMobileTopBar is fixed, so it must reserve a permanent
            non-render-dependent background slot. This prevents iOS Safari from
            pulling the mobile home artwork upward after idle/reload/viewport restore. */}
        <div
          aria-hidden="true"
          className="block h-[104px] shrink-0 select-none sm:hidden"
        />
<div className="mx-auto max-w-6xl space-y-2 sm:space-y-3">
          <section
            className={`-mx-2 bg-transparent px-2 pb-1 pt-1 sm:-mx-4 sm:px-4 sm:pb-2 sm:pt-2 ${
              showLaunchScreen ? "hidden" : "hidden sm:block"
            }`}
          >
            <div className="mx-auto max-w-6xl">
              <div className="overflow-hidden rounded-[1.25rem] bg-white/95 px-4 py-2 shadow-sm ring-1 ring-slate-100 sm:rounded-[1.5rem] sm:px-5 sm:py-2">
                <img
                  src="/ziiply.png"
                  alt="Ziiply"
                  className="mx-auto max-h-[90px] w-auto object-contain py-1 sm:max-h-[108px] sm:py-1"
                />
                <div className="mx-auto mt-1 max-w-3xl text-center">
                  <p className="text-base font-black leading-tight tracking-[-0.04em] text-slate-950">
                    Viilaa ruokakorisi huokeammaks.
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-slate-500">
                    Gösta ja Justiina auttavat arjen valinnoissa.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {!showLaunchScreen &&
            !searchPanelOpen &&
            !cartModalOpen &&
            !shopsPanelOpen &&
            !eanModalOpen &&
            activeResult === "none" && (
              <>
                <div className="ziiply-mobile-home-layer-lock -translate-y-[24px] transform-gpu">
                  <ZiiplyMobileHomeView
                    activeAssistant={activeAssistant}
                    onSelectAssistant={setActiveAssistant}
                  />
                </div>

                <ZiiplyMobileAssistantPanel
                  activeAssistant={activeAssistant}
                  onClose={() => setActiveAssistant(null)}
                />
              </>
            )}

          {!showLaunchScreen && (
            <div
              className={`${shopsPanelOpen ? "fixed inset-0 z-50 overflow-hidden bg-[#edf8f4] px-3 pb-[calc(env(safe-area-inset-bottom)+5.6rem)] pt-[calc(env(safe-area-inset-top)+5.2rem)] sm:static sm:contents sm:overflow-visible sm:bg-transparent sm:p-0" : "hidden sm:contents"} ${closingPanels.shops ? "ziiply-soft-close" : shopsPanelOpen ? "ziiply-soft-open" : ""}`}
            >
          <div className="mb-2">
            <ZiiplyMobileLocationBar
              locationInput={locationInput}
              usingOwnLocation={usingOwnLocation}
              storeSearchLoading={storeSearchLoading}
              gpsErrorMessage={gpsErrorMessage}
              gpsStatusText={locationMessageVisible ? locationMessage : ""}
              onApplyLocation={() => setMapRouteOverlayOpenV428(true)}
              onOpenMap={() => setMapRouteOverlayOpenV428(true)}
              onLocationInputChange={(nextValue: string) => {
                setLocationInput(nextValue);
                if (nextValue.trim()) {
                  gpsUserDisabledRefV306.current = true;
                  setUsingOwnLocation(false);
                  setGpsErrorMessage("");
                }
                setLocationMessage("Kirjoita alue tai postinumero.");
                setLocationMessageVisible(true);
              }}
              onGpsClick={() => {
                if (usingOwnLocation) {
                  stopOwnLocationV306(
                    "GPS pois päältä. Kirjoita alue tai postinumero.",
                  );
                  setLocationMessageVisible(true);
                  return;
                }
                gpsUserDisabledRefV306.current = false;
                setGpsErrorMessage("");
                setLocationInput("");
                setLocationMessage("Paikannetaan GPS…");
                setLocationMessageVisible(true);
                void useOwnLocation();
              }}
              
              
            />
          </div>

          <section className="rounded-[2rem] bg-white px-5 pb-2 pt-2 shadow-sm">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 overflow-visible">
              <button
                type="button"
                disabled={storeCompareScope === "within_chain"}
                onClick={() => handleStoreModeChange("hyper")}
                className={`rounded-2xl px-4 py-[0.325rem] text-base font-extrabold leading-tight transition disabled:cursor-not-allowed ${
                  storeCompareScope === "within_chain" ||
                  (storeModeChosenV299 && storeMode === "hyper")
                    ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                🏬 Tavaratalot
              </button>
              <button
                type="button"
                disabled={storeCompareScope === "within_chain"}
                onClick={() => handleStoreModeChange("local")}
                className={`rounded-2xl px-4 py-[0.325rem] text-base font-extrabold leading-tight transition disabled:cursor-not-allowed ${
                  storeCompareScope === "within_chain" ||
                  (storeModeChosenV299 && storeMode === "local")
                    ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                🏪 Lähikaupat
              </button>

              <div className="col-span-2 flex h-5 items-center justify-center">
                <span className="rounded-full bg-white px-3 text-center text-[11px] font-black uppercase leading-none tracking-wide text-slate-500">
                  Hakutapa
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStoreCompareScopeChange("between_chains")}
                className={`rounded-2xl px-4 py-[0.325rem] text-sm font-extrabold leading-tight transition ${
                  storeCompareScope === "between_chains"
                    ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                Ketjujen väliltä
              </button>
              <button
                type="button"
                onClick={() => handleStoreCompareScopeChange("within_chain")}
                className={`rounded-2xl px-4 py-[0.325rem] text-sm font-extrabold leading-tight transition ${
                  storeCompareScope === "within_chain"
                    ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                Ketjun sisältä
              </button>
            </div>
            <div className="mt-1 rounded-2xl bg-slate-50 p-2 text-sm text-slate-600 ring-1 ring-slate-200 empty:hidden">
              {storeCompareScope === "between_chains" &&
                selectedRealChainCount < 2 && (
                  <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 font-black text-amber-800 ring-1 ring-amber-100">
                    Valitse kaksi ketjua vertailuun.
                  </p>
                )}
              {storeCompareScope === "within_chain" && !withinChain && (
                <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 font-black text-amber-800 ring-1 ring-amber-100">
                  Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.
                </p>
              )}

              {((storeMode === "local" &&
                (!activeArea.sLocalStoreId || !activeArea.kLocalStoreId)) ||
                (storeMode === "hyper" &&
                  (!activeArea.sStoreId || !activeArea.kStoreId))) &&
                foundStores.length === 0 && (
                  <p className="mt-2 text-amber-700">
                    Hae alue tai käytä omaa sijaintia, niin Ziiply hakee kaupat
                    dynaamisesti.
                  </p>
                )}
            </div>

            {renderComparedStoreCards(true)}

            {false && foundStores.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-700">
                    Valitse kaupat ({foundStores.length})
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700">
                      S-ryhmä
                    </p>
                    <div className="max-h-44 space-y-2 overflow-auto pr-1">
                      {foundStores
                        .filter((store) => {
                          if (store.type !== "S") return false;
                          if (storeCompareScope === "within_chain") return true;
                          if (!storeModeChosenV299) return true;
                          const storeNameForMode = normalize(store.name || "");
                          const isLocalStoreForMode = hasAnyToken(
                            storeNameForMode,
                            ["market", "alepa", "sale", "s-market", "s market"],
                          );
                          return storeMode === "local"
                            ? isLocalStoreForMode
                            : !isLocalStoreForMode;
                        })
                        .map((store) => {
                          const selected =
                            storeMode === "local"
                              ? activeArea.sLocalStoreId === store.id
                              : activeArea.sStoreId === store.id;

                          return (
                            <button
                              key={store.id}
                              type="button"
                              onClick={() =>
                                selectStoreForCurrentMode(store, storeMode)
                              }
                              className={`w-full min-w-[min(86vw,360px)] rounded-xl px-4 py-3 text-left transition ${
                                selected
                                  ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                                  : "bg-slate-50 text-slate-700 hover:bg-green-50"
                              }`}
                            >
                              <span className="block font-bold break-words">
                                {store.name}
                              </span>
                              <span
                                className={`block text-xs ${selected ? "text-green-50" : "text-slate-400"}`}
                              >
                                ID {store.id} · {store.city || ""}{" "}
                                {store.postalCode || ""}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-700">
                      K-ryhmä
                    </p>
                    <div className="max-h-44 space-y-2 overflow-auto pr-1">
                      {foundStores
                        .filter((store) => {
                          if (store.type !== "K") return false;
                          if (storeCompareScope === "within_chain") return true;
                          if (!storeModeChosenV299) return true;
                          const storeNameForMode = normalize(store.name || "");
                          const isLocalStoreForMode = hasAnyToken(
                            storeNameForMode,
                            [
                              "market",
                              "k-market",
                              "k market",
                              "k-supermarket",
                              "k supermarket",
                            ],
                          );
                          return storeMode === "local"
                            ? isLocalStoreForMode
                            : !isLocalStoreForMode;
                        })
                        .map((store) => {
                          const selected =
                            storeMode === "local"
                              ? activeArea.kLocalStoreId === store.id
                              : activeArea.kStoreId === store.id;

                          // AUTO_GPS_DEFAULT_DISABLED_V305
                          // Ei automaattista GPS-kyselyä latauksessa. GPS käynnistyy vain käyttäjän napista.

                          // DEFAULT_STORE_MODE_DISABLED_V305
                          // Ei automaattista Tavaratalot-oletusta refreshissä.
                          useEffect(() => {
                            setStoreModeChosenV299(false);
                            setStoreCompareScope("none");
                            setOpenStorePicker(null);
                            setStoreDrillViewV320("main");
                          }, []);

                          // GPS_STICKY_STATE_DISABLED_V305
                          // Ei palauteta GPS-tilaa localStoragesta.

                          // GPS_DEFAULT_VISUAL_ON_V307
                          // GPS-nuppineula pidetään oletuksena vihreänä kaupat-näkymässä.

                          // STORE_SELECTION_DOES_NOT_PICK_MODE_V307
                          // Kaupan valinta ei saa itsessään valita Tavaratalot/Lähikaupat-hakutapaa.

                          return (
                            <button
                              key={store.id}
                              type="button"
                              onClick={() =>
                                selectStoreForCurrentMode(store, storeMode)
                              }
                              className={`w-full min-w-[min(86vw,360px)] rounded-xl px-4 py-3 text-left transition ${
                                selected
                                  ? "bg-red-700 shadow-md ring-1 ring-black/10 text-white"
                                  : "bg-slate-50 text-slate-700 hover:bg-red-50"
                              }`}
                            >
                              <span className="block whitespace-normal break-words font-bold leading-tight">
                                {store.name}
                              </span>
                              <span
                                className={`block text-xs ${selected ? "text-red-50" : "text-slate-400"}`}
                              >
                                ID {store.id} · {store.city || ""}{" "}
                                {store.postalCode || ""}
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

            </div>
          )}

          {/* v358_DESKTOP_DEBUG_ALL_FLOWS:
            Desktop-only debug board. Mobile CSS/classes below 640px are not touched.
            Purpose: keep the existing mobile app flow intact, but expose the main states and actions
            side-by-side on desktop so debugging does not require opening one mobile bottom-sheet at a time. */}
          {!showLaunchScreen && (
            <section className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 rounded-[2rem] bg-white/95 p-4 shadow-sm ring-1 ring-slate-100">
              <div className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                      Debug
                    </p>
                    <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                      Haku
                    </h2>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800 ring-1 ring-green-200">
                    {searchCompareMode === "single"
                      ? "Yksi tuote"
                      : "Koko kori"}
                  </span>
                </div>

                <textarea
                  value={input}
                  onChange={(event) =>
                    setSearchInputForMode(event.target.value)
                  }
                  placeholder={
                    searchCompareMode === "single"
                      ? "Kirjoita yksi tuote"
                      : "maito, kahvi, jauheliha"
                  }
                  className="h-28 w-full resize-none rounded-[1.15rem] border border-slate-300 bg-white px-3 py-3 text-[15px] font-semibold text-slate-950 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchCompareMode("cart")}
                    className={`rounded-[1rem] px-3 py-2 text-sm font-black ring-1 transition ${searchCompareMode === "cart" ? "bg-green-700 text-white ring-green-800" : "bg-white text-slate-700 ring-slate-200"}`}
                  >
                    Koko kori
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchCompareMode("single");
                      setInput((currentInput) =>
                        getSingleSearchTerm(currentInput),
                      );
                    }}
                    className={`rounded-[1rem] px-3 py-2 text-sm font-black ring-1 transition ${searchCompareMode === "single" ? "bg-green-700 text-white ring-green-800" : "bg-white text-slate-700 ring-slate-200"}`}
                  >
                    Yksi tuote
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleMainNormalSearch}
                    disabled={
                      !hasSearchInput ||
                      loadingNormal ||
                      singleProductCompareLoading
                    }
                    className="rounded-[1rem] bg-slate-900 px-3 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {loadingNormal || singleProductCompareLoading
                      ? "Haetaan..."
                      : "Hae"}
                  </button>
                  <button
                    type="button"
                    onClick={openEanModal}
                    className="rounded-[1rem] bg-green-700 px-3 py-3 text-sm font-black text-white"
                  >
                    EAN / Skannaa
                  </button>
                </div>

                <div className="mt-3 max-h-64 overflow-auto rounded-[1.15rem] bg-white p-2 ring-1 ring-slate-200">
                  <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-slate-400">
                    Hakutulokset
                  </p>
                  {visibleNormalResults.length === 0 &&
                  singleProductCompareResults.length === 0 ? (
                    <p className="px-1 py-6 text-center text-sm font-bold text-slate-400">
                      Ei hakutuloksia vielä.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {visibleNormalResults.slice(0, 6).map((product) => (
                        <div
                          key={`desktop-normal-${product.id}-${product.ean || product.name}`}
                          className="flex items-center gap-2 rounded-xl bg-slate-50 p-2"
                        >
                          {product.pictureUrl && (
                            <img
                              src={product.pictureUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-contain bg-white"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-900">
                              {fixText(product.name)}
                            </p>
                            <p className="text-xs font-bold text-green-700">
                              {formatEuro(getProductPrice(product))}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addProductToCart(product)}
                            className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white"
                          >
                            Lisää
                          </button>
                        </div>
                      ))}
                      {singleProductCompareResults.slice(0, 4).map((result) => (
                        <div
                          key={`desktop-single-${result.key}-${result.storeName}-${result.productName}`}
                          className="rounded-xl bg-slate-50 p-2"
                        >
                          <p className="truncate text-sm font-black text-slate-900">
                            {fixText(result.productName)}
                          </p>
                          <p className="text-xs font-bold text-slate-500">
                            {result.storeName} · {formatEuro(result.price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                      Debug
                    </p>
                    <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                      Kori
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                    {cart.length} tuotetta
                  </span>
                </div>
                <div className="max-h-[27rem] overflow-auto rounded-[1.15rem] bg-white p-2 ring-1 ring-slate-200">
                  {cart.length === 0 ? (
                    <p className="px-1 py-10 text-center text-sm font-bold text-slate-400">
                      Kori on tyhjä.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item, cartIndex) => (
                    <div
                      key={item.id}
                      className="relative min-w-0 overflow-hidden rounded-[1.65rem] border-[3px] border-[#c2a05e] bg-gradient-to-b from-[#fff8e8] via-[#f6e8c5] to-[#ead19a] p-3 text-[#20301f] shadow-[0_5px_0_rgba(80,58,25,0.22),inset_0_0_0_2px_rgba(255,255,255,0.55)]"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:radial-gradient(#b59c67_1px,transparent_1px)] [background-size:13px_13px]" />
                      <div className="relative grid min-w-0 grid-cols-[42px_82px_minmax(0,1fr)_auto] items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-[#b99d62] bg-[#fff7df] text-lg font-black text-[#7a6842] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.65)]">
                          {cartIndex + 1}
                        </span>

                        <span className="flex h-[74px] w-[82px] shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border-2 border-[#d6bf8f] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-2xl">🛒</span>
                          )}
                        </span>

                        <div className="min-w-0 overflow-hidden">
                          <p className="line-clamp-2 break-words text-[17px] font-black leading-[1.05] text-[#20301f]">
                            {item.name}
                          </p>
                          <p className="mt-1 truncate text-[12px] font-bold text-[#6f6b59]">
                            {item.storeName
                              ? `${item.storeName} · ${item.chain}`
                              : "Muistilistarivi"}
                          </p>
                          <p className="mt-1 text-[13px] font-black text-[#6f6b59]">
                            {item.quantity} kpl
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="whitespace-nowrap text-[18px] font-black text-[#20301f]">
                            {item.price ? formatEuro(item.price * item.quantity) : "—"}
                          </p>
                          {item.price ? (
                            <p className="mt-1 whitespace-nowrap text-[11px] font-bold text-[#6f6b59]">
                              {formatEuro(item.price)} / kpl
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="relative mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <button
                            type="button"
                            disabled
                            className="min-w-0 rounded-full border-2 border-[#d6bf8f] bg-[#fff4cf] px-3 py-2 text-[11px] font-black leading-none text-[#8a3f16] opacity-75 shadow-[0_2px_0_rgba(91,72,44,0.14)]"
                            title="Tuotekohtainen hinnanhuojennushaku rakennetaan myöhemmin"
                            aria-label="Hinnanhuojennukset tulossa"
                          >
                            🔥 Hinnanhuojennukset
                          </button>
                          {item.price
                            ? renderPriceHistoryBadge(
                                getPriceHistoryKeyFromCartItem(item),
                                item.price,
                              )
                            : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex items-center rounded-full border-2 border-[#d6bf8f] bg-[#fff7df] p-1 shadow-[0_2px_0_rgba(91,72,44,0.14)]">
                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7ecd0] text-xl font-black text-[#8a7a52] transition active:scale-[0.94]"
                              aria-label={
                                item.quantity <= 1
                                  ? `Poista ${item.name} ostoskorista`
                                  : `Vähennä tuotteen ${item.name} määrää`
                              }
                              title={item.quantity <= 1 ? "Poista korista" : "Vähennä määrää"}
                            >
                              −
                            </button>
                            <span
                              className="min-w-[30px] px-1 text-center text-base font-black text-[#20301f]"
                              aria-label={`Määrä ${item.quantity}`}
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07a445] text-xl font-black text-white shadow-sm transition active:scale-[0.94]"
                              aria-label={`Lisää tuotteen ${item.name} määrää`}
                              title="Lisää määrää"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                            className="flex h-10 min-w-[68px] shrink-0 items-center justify-center rounded-full border-2 border-[#8a3f16] bg-[#a4471c] px-3 text-[13px] font-black leading-none text-[#fff7df] shadow-[0_2px_0_rgba(91,72,44,0.22)] transition active:scale-[0.98]"
                            aria-label={`Poista ${item.name} ostoskorista`}
                          >
                            Pois
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}                </div>
              )}
            </div>
          </div>
        </section>
        )}
        </div>

        {restoredCartPromptV320.open &&
          cart.length > 0 &&
          !showLaunchScreen && (
            <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+10.5rem)] z-[70] mx-auto max-w-[34rem] ziiply-soft-open sm:top-5">
              <div className="rounded-[1.35rem] border border-green-100 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-2xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-xl ring-1 ring-green-100">
                    🛒
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-950">
                      Säilytetäänkö ostoskori?
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {restoredCartPromptV320.count} tuotetta valmiina
                      jatkamista varten.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRestoredCartPromptV320({ open: false, count: 0 });
                          setSearchPanelOpen(false);
                          setShopsPanelOpen(false);
                          setEanModalOpen(false);
                          setActiveResult("none");
                          setCartModalOpen(true);
                        }}
                        className="rounded-full bg-green-700 px-4 py-2 text-sm font-black text-white shadow-sm active:scale-[0.98]"
                      >
                        Jatka
                      </button>
                      <button
                        type="button"
                        onClick={clearRestoredCartPromptV320}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200 active:scale-[0.98]"
                      >
                        Tyhjennä kori
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {searchPanelOpen && (
          <div
            className={`fixed inset-0 z-40 flex items-end justify-center overflow-hidden overscroll-none bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.45rem)] pt-[calc(env(safe-area-inset-top)+5.0rem)] sm:items-center sm:p-6 ${closingPanels.search ? "ziiply-soft-close" : "ziiply-soft-open"}`}
          >
            <div className="h-[min(70dvh,650px)] w-full max-w-[28rem] overflow-visible overscroll-none rounded-[1.65rem] bg-white/90 p-2.5 shadow-2xl ring-1 ring-white/70 backdrop-blur-2xl">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] ring-1 ring-slate-100 sm:rounded-[2rem] sm:p-4">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="shrink-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-green-50 text-xl shadow-sm ring-1 ring-green-100">
                        🔎
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-green-700">
                          Haku
                        </p>
                        <h1 className="mt-0.5 text-[1.14rem] font-black leading-[1.05] tracking-tight text-slate-950 sm:text-[1.42rem]">
                          Mitä haluat ostaa?
                        </h1>
                        <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-500">
                          Kirjoita tuotteet ja valitse toiminto alta.
                        </p>
                      </div>
                    </div>

                    <div className="mt-1 rounded-[1.05rem] bg-slate-50/90 p-1 ring-1 ring-slate-100">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchCompareMode("cart");
                            setNormalResults([]);
                            setSingleProductCompareResults([]);
                            setSingleProductCompareTerm("");
                            setVisibleNormalCount(8);
                          }}
                          className={`min-h-[2.35rem] rounded-[0.9rem] px-3 py-1 text-sm font-black transition active:scale-[0.98] ${
                            searchCompareMode === "cart"
                              ? "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10"
                              : "bg-white text-slate-700 ring-1 ring-slate-200"
                          }`}
                        >
                          <span className="flex h-full w-full items-center justify-center gap-2 whitespace-nowrap leading-none">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="block h-[18px] w-[18px] shrink-0"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 5h2.3l1.7 9.2a2 2 0 0 0 2 1.6h6.8a2 2 0 0 0 1.9-1.45L20 8H7.2" />
                              <circle
                                cx="10"
                                cy="20"
                                r="1.55"
                                fill="currentColor"
                                stroke="none"
                              />
                              <circle
                                cx="17"
                                cy="20"
                                r="1.55"
                                fill="currentColor"
                                stroke="none"
                              />
                            </svg>
                            <span className="block leading-none">
                              Koko kori
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchCompareMode("single");
                            setInput((currentInput) =>
                              getSingleSearchTerm(currentInput),
                            );
                            setNormalResults([]);
                            setSingleProductCompareResults([]);
                            setSingleProductCompareTerm("");
                            setVisibleNormalCount(8);
                          }}
                          className={`min-h-[2.35rem] rounded-[0.9rem] px-3 py-1 text-sm font-black transition active:scale-[0.98] ${
                            searchCompareMode === "single"
                              ? "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10"
                              : "bg-white text-slate-700 ring-1 ring-slate-200"
                          }`}
                        >
                          🔎 Yksi tuote
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 shrink-0 rounded-[1.25rem] border border-green-100 bg-white p-2 shadow-inner shadow-green-50/60">
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Tuotteet
                      </p>
                      <button
                        type="button"
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => void pasteFromClipboardToSearch()}
                        className="rounded-full bg-green-50 px-4 py-1.5 text-xs font-black text-green-700 ring-1 ring-green-200 active:scale-[0.98]"
                      >
                        Liitä
                      </button>
                    </div>
                    <textarea
                      ref={searchInputRef}
                      value={input}
                      onChange={(event) =>
                        setSearchInputForMode(event.target.value)
                      }
                      placeholder={
                        searchCompareMode === "single"
                          ? "Kirjoita yksi tuote, esim. maito"
                          : "Kirjoita tuotteet riveittäin tai pilkulla, esim. maito, kahvi, jauheliha"
                      }
                      className="h-[4.1rem] min-h-[4.1rem] max-h-[4.1rem] w-full resize-none rounded-[1.25rem] border-2 border-green-500/70 bg-white px-3.5 py-3 text-[16px] font-semibold leading-snug text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-4 focus:ring-green-100 sm:h-[5.2rem] sm:min-h-[5.2rem] sm:max-h-[5.2rem]"
                    />
                    {instantSearchSuggestions.length > 0 && (
                      <div
                        className="mt-1 flex h-8 w-full items-center gap-1.5 overflow-x-auto overflow-y-hidden px-1 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        aria-label="Hakuehdotukset"
                      >
                        <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400 ring-1 ring-slate-100">
                          Ehdotukset
                        </span>
                        {instantSearchSuggestions.map((suggestion) => (
                          <button
                            key={`${suggestion.hint}-${suggestion.label}`}
                            type="button"
                            onPointerDown={(event) => event.preventDefault()}
                            onClick={() =>
                              applyInstantSearchSuggestion(suggestion.label)
                            }
                            className="shrink-0 whitespace-nowrap rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-800 ring-1 ring-green-100 active:scale-[0.98]"
                            title={suggestion.label}
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 flex h-7 items-center justify-between gap-2 px-1">
                      <p className="truncate text-[11px] font-bold text-slate-400">
                        {searchCompareMode === "single"
                          ? "Valitse tarkka tuote listasta ennen vertailua."
                          : "Max 8 tuotetta. Liitä muistilistasta."}
                      </p>
                      {hasSearchInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setInput("");
                            setNormalResults([]);
                            setSingleProductCompareResults([]);
                            setSingleProductCompareTerm("");
                            setVisibleNormalCount(8);
                            setActiveNormalSearchTerm("");
                            setNormalSearchAttempted(false);
                            setHasSearchedOffers(false);
                            setOffers([]);
                            triggerHaptic();
                            window.setTimeout(
                              () => searchInputRef.current?.focus(),
                              0,
                            );
                          }}
                          className="shrink-0 rounded-full bg-slate-700 px-3 py-1.5 text-xs font-black text-white shadow-sm ring-1 ring-slate-600 active:scale-[0.98]"
                        >
                          Tyhjennä
                        </button>
                      )}
                    </div>

                    {!loadingNormal &&
                      normalSearchAttempted &&
                      activeNormalSearchTerm &&
                      normalResults.length === 0 && (
                        <div className="mt-2 shrink-0 rounded-[1.35rem] bg-slate-50 p-4 text-center shadow-sm ring-1 ring-slate-200 ziiply-soft-open-fast">
                          <div className="text-3xl">🔎</div>
                          <p className="mt-2 text-base font-black text-slate-900">
                            Tuotteita ei löytynyt
                          </p>
                          <p className="mt-1 text-sm font-bold leading-snug text-slate-500">
                            Haulle “{activeNormalSearchTerm}” ei löytynyt
                            tuotteita. Kokeile tarkempaa hakusanaa tai lisää
                            tuote käsin.
                          </p>
                        </div>
                      )}

                    {keyboardOpenV320 && (
                      <div className="mt-2 rounded-[1.1rem] bg-white/95 p-1.5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onPointerDown={(event) => event.preventDefault()}
                            onClick={handleMainNormalSearch}
                            disabled={
                              !hasSearchInput ||
                              loadingNormal ||
                              singleProductCompareLoading
                            }
                            aria-disabled={
                              !hasSearchInput ||
                              loadingNormal ||
                              singleProductCompareLoading
                            }
                            className={`min-h-[2.65rem] touch-manipulation rounded-[1rem] px-3 text-sm font-black transition ${
                              !hasSearchInput ||
                              loadingNormal ||
                              singleProductCompareLoading
                                ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                                : "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 active:scale-[0.98]"
                            }`}
                          >
                            {loadingNormal || singleProductCompareLoading ? (
                              "Haetaan..."
                            ) : (
                              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                                🔎<span>Vertailu</span>
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) => event.preventDefault()}
                            onClick={openEanModal}
                            className="flex min-h-[2.65rem] touch-manipulation items-center justify-center rounded-[1rem] bg-green-700 px-3 text-sm font-black text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 transition active:scale-[0.98]"
                          >
                            <span className="inline-flex h-full w-full items-center justify-center gap-2 whitespace-nowrap leading-none">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="block h-5 w-5 shrink-0 text-white"
                                fill="currentColor"
                              >
                                <rect
                                  x="3"
                                  y="5"
                                  width="2"
                                  height="14"
                                  rx=".4"
                                />
                                <rect
                                  x="7"
                                  y="5"
                                  width="1.2"
                                  height="14"
                                  rx=".35"
                                />
                                <rect
                                  x="10"
                                  y="5"
                                  width="2.6"
                                  height="14"
                                  rx=".4"
                                />
                                <rect
                                  x="15"
                                  y="5"
                                  width="1.2"
                                  height="14"
                                  rx=".35"
                                />
                                <rect
                                  x="18.5"
                                  y="5"
                                  width="2.5"
                                  height="14"
                                  rx=".4"
                                />
                              </svg>
                              <span className="block leading-none">
                                EAN / SKANNAA
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    className={`${keyboardOpenV320 ? "hidden" : ""} mt-1 shrink-0 rounded-[1.35rem] bg-white/95 p-2 shadow-[0_-8px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-100`}
                  >
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => startVoiceInput()}
                        className={`min-h-[2.35rem] touch-manipulation rounded-[0.85rem] px-2 text-xs font-black leading-tight shadow-sm transition active:scale-[0.98] ${
                          isListening
                            ? "bg-red-600 text-white"
                            : speechSupported
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-700/10"
                              : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                        }`}
                      >
                        {isListening ? "🎙️ Kuuntelee" : "🎤 Sanele"}
                      </button>
                      <button
                        type="button"
                        onClick={handleMainOfferSearch}
                        disabled={!hasSearchInput || loadingOffers}
                        aria-disabled={!hasSearchInput || loadingOffers}
                        className={`min-h-[2.35rem] touch-manipulation rounded-[0.85rem] px-2 text-xs font-black leading-tight transition ${
                          !hasSearchInput || loadingOffers
                            ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                            : "bg-rose-100 text-rose-700 shadow-sm ring-1 ring-rose-200 active:scale-[0.98]"
                        }`}
                      >
                        {loadingOffers ? "Haetaan..." : "🔥 Hinnanhuojennukset"}
                      </button>
                      <button
                        type="button"
                        onClick={addInputToCart}
                        disabled={!hasSearchInput}
                        aria-disabled={!hasSearchInput}
                        className={`min-h-[2.35rem] touch-manipulation rounded-[0.85rem] px-2 text-xs font-black leading-tight transition ${
                          !hasSearchInput
                            ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                            : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 active:scale-[0.98]"
                        }`}
                      >
                        Lisää koriin
                      </button>
                    </div>

                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleMainNormalSearch}
                        disabled={
                          !hasSearchInput ||
                          loadingNormal ||
                          singleProductCompareLoading
                        }
                        aria-disabled={
                          !hasSearchInput ||
                          loadingNormal ||
                          singleProductCompareLoading
                        }
                        className={`min-h-[2.65rem] touch-manipulation rounded-[1rem] px-3 text-sm font-black transition ${
                          !hasSearchInput ||
                          loadingNormal ||
                          singleProductCompareLoading
                            ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                            : "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 active:scale-[0.98]"
                        }`}
                      >
                        {loadingNormal || singleProductCompareLoading ? (
                          "Haetaan..."
                        ) : (
                          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                            🔎<span>Vertailu</span>
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={openEanModal}
                        className="flex min-h-[2.65rem] touch-manipulation items-center justify-center rounded-[1rem] bg-green-700 px-3 text-sm font-black text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 transition active:scale-[0.98]"
                      >
                        <span className="inline-flex h-full w-full items-center justify-center gap-2 whitespace-nowrap leading-none">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="block h-5 w-5 shrink-0 text-white"
                            fill="currentColor"
                          >
                            <rect x="3" y="5" width="2" height="14" rx=".4" />
                            <rect
                              x="7"
                              y="5"
                              width="1.2"
                              height="14"
                              rx=".35"
                            />
                            <rect
                              x="10"
                              y="5"
                              width="2.6"
                              height="14"
                              rx=".4"
                            />
                            <rect
                              x="15"
                              y="5"
                              width="1.2"
                              height="14"
                              rx=".35"
                            />
                            <rect
                              x="18.5"
                              y="5"
                              width="2.5"
                              height="14"
                              rx=".4"
                            />
                          </svg>
                          <span className="block leading-none">
                            EAN / SKANNAA
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>{" "}
                </div>
              </div>
            </div>
          </div>
        )}

        {eanModalOpen && (
          <div
            className={`fixed inset-0 z-[80] flex items-end justify-center overflow-hidden overscroll-none bg-slate-950/35 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+5.25rem)] transition-opacity duration-700 ease-out sm:items-center sm:p-4 ${eanModalClosing ? "ziiply-soft-close" : "ziiply-soft-open"}`}
          >
            <div
              className={`max-h-[calc(100dvh-7rem)] w-full max-w-[42rem] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur transition-all duration-700 ease-out [WebkitOverflowScrolling:touch] sm:max-h-[calc(100dvh-2rem)] sm:p-5 ${eanModalClosing ? "translate-y-3 scale-[0.98] opacity-0" : "translate-y-0 scale-100 opacity-100"}`}
            >
              <div className="flex items-center justify-center px-1">
                <p className="min-w-0 text-center text-lg font-black text-slate-950">
                  EAN-skanneri
                </p>
              </div>

              {eanScannerMessage && !eanScannerOpen && (
                <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700 ziiply-soft-open-fast">
                  {eanScannerMessage}
                </div>
              )}

              {desktopKeyboardScannerOpen && !eanScannerOpen && (
                <div className="mt-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm ziiply-soft-open">
                  <div className="rounded-2xl bg-green-50 px-3 py-2 text-center text-sm font-black leading-snug text-green-900 ring-1 ring-green-100">
                    USB/Bluetooth-lukija toimii kuten näppäimistö. Klikkaa kenttään ja skannaa viivakoodi.
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      ref={eanInputRef}
                      value={eanInput}
                      onChange={(event) =>
                        setEanInput(event.target.value.replace(/\D/g, ""))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void searchByEan();
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Skannaa tai syötä EAN-koodi"
                      className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-4 text-lg font-black tracking-[0.18em] text-slate-950 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-green-600 focus:ring-4 focus:ring-green-100"
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
                        setEanMessage(`Luettu koodi: ${code}. Haetaan...`);
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

                  {eanMessage && (
                    <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
                      {eanMessage}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={closeEanModal}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm transition active:scale-[0.98]"
                    >
                      Sulje
                    </button>
                  </div>
                </div>
              )}

              {eanScannerOpen && (
                <div className="mt-3 rounded-2xl bg-white ziiply-soft-open">
                  <div
                    className="relative mx-auto aspect-[3/4] max-h-[calc(100dvh-21rem)] min-h-[20rem] w-full overflow-hidden rounded-[1.5rem] bg-slate-950 ring-1 ring-slate-200 sm:aspect-square sm:max-w-[430px]"
                    onPointerDown={(event) =>
                      void focusScannerCameraAtPoint(event)
                    }
                  >
                    <div
                      id={EAN_SCANNER_REGION_ID}
                      className="absolute inset-0 h-full w-full overflow-hidden rounded-2xl bg-slate-950 [&_*]:!box-border [&_canvas]:!hidden [&_div]:!border-0 [&_div]:!shadow-none [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:rounded-2xl [&_video]:!object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border-[3px] border-green-400 shadow-[inset_0_0_0_999px_rgba(2,6,23,0.04)]">
                      <div className="absolute -left-1 -top-1 h-7 w-7 rounded-tl-2xl border-l-4 border-t-4 border-white/95" />
                      <div className="absolute -right-1 -top-1 h-7 w-7 rounded-tr-2xl border-r-4 border-t-4 border-white/95" />
                      <div className="absolute -bottom-1 -left-1 h-7 w-7 rounded-bl-2xl border-b-4 border-l-4 border-white/95" />
                      <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-br-2xl border-b-4 border-r-4 border-white/95" />
                    </div>

                    {eanLoading && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-slate-700/45 backdrop-blur-[1px]">
                        <div className="flex flex-col items-center gap-3 rounded-3xl bg-slate-900/80 px-6 py-3 sm:py-5 text-white shadow-2xl ring-2 ring-white/20">
                          <div className="flex h-12 sm:h-16 w-16 items-center justify-center rounded-full bg-white/15 text-4xl font-black animate-pulse">
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
                  <div className="mt-4 min-h-[3.75rem]">
                    {eanManualInputOpen && (
                      <div className="flex gap-2 ziiply-soft-open-fast">
                        <input
                          ref={eanInputRef}
                          value={eanInput}
                          onChange={(event) =>
                            setEanInput(event.target.value.replace(/\D/g, ""))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void searchByEan();
                          }}
                          inputMode="numeric"
                          placeholder="Syötä EAN, esim. 641..."
                          className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-base font-bold tracking-wide outline-none transition focus:border-green-600"
                          onPaste={(event) => {
                            const pastedText =
                              event.clipboardData.getData("text");
                            const code = normalizeEan(pastedText);

                            if (!isUsableEan(code)) return;

                            event.preventDefault();

                            if (eanAutoSearchTimeoutRef.current) {
                              window.clearTimeout(
                                eanAutoSearchTimeoutRef.current,
                              );
                              eanAutoSearchTimeoutRef.current = null;
                            }

                            setEanInput(code);
                            setLastAutoEanSearch(code);
                            setEanSearchStartedAutomatically(true);
                            eanAutoSearchActiveRef.current = true;
                            setEanMessage(
                              `Liitetty koodi: ${code}. Haetaan...`,
                            );
                            void searchByEan(code);
                          }}
                        />
                        <button
                          type="button"
                          onClick={clearEanSearch}
                          disabled={
                            !eanInput && eanResults.length === 0 && !eanMessage
                          }
                          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700 transition active:scale-[0.98] disabled:opacity-40"
                        >
                          Tyhjennä
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-center text-xs font-black leading-snug text-slate-700 shadow-sm">
                    Aseta viivakoodi kehykseen. Napauta kuvaa tarkennusta
                    varten.
                  </div>
                  <div className="sticky bottom-0 z-10 mt-3 grid grid-cols-4 gap-2 rounded-[1.35rem] border border-slate-200 bg-white/95 p-2 shadow-[0_-12px_35px_rgba(15,23,42,0.08)] backdrop-blur">
                    <button
                      type="button"
                      onClick={() => {
                        setEanManualInputOpen((open) => {
                          const nextOpen = !open;
                          if (nextOpen) {
                            window.setTimeout(
                              () => eanInputRef.current?.focus(),
                              0,
                            );
                          }
                          return nextOpen;
                        });
                      }}
                      className={`min-h-[3rem] touch-manipulation rounded-[1rem] px-2 text-sm font-black ring-1 transition active:scale-[0.98] ${eanManualInputOpen ? "bg-green-100 text-green-900 ring-green-200" : "bg-slate-100 text-slate-800 ring-slate-200"}`}
                      aria-pressed={eanManualInputOpen}
                    >
                      ✍️ EAN
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          const code = normalizeEan(text);
                          if (!isUsableEan(code)) {
                            setEanMessage(
                              "Leikepöydältä ei löytynyt kelvollista EAN-koodia.",
                            );
                            return;
                          }
                          setEanManualInputOpen(true);
                          setEanInput(code);
                          setLastAutoEanSearch(code);
                          setEanSearchStartedAutomatically(true);
                          eanAutoSearchActiveRef.current = true;
                          setEanMessage(`Liitetty koodi: ${code}. Haetaan...`);
                          void searchByEan(code);
                        } catch {
                          setEanManualInputOpen(true);
                          window.setTimeout(
                            () => eanInputRef.current?.focus(),
                            0,
                          );
                        }
                      }}
                      className="min-h-[3rem] touch-manipulation rounded-[1rem] bg-slate-100 px-2 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition active:scale-[0.98]"
                    >
                      Liitä
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleScannerTorch()}
                      className={`min-h-[3rem] touch-manipulation rounded-[1rem] px-2 text-sm font-black ring-1 transition active:scale-[0.98] ${scannerTorchOn ? "bg-yellow-100 text-yellow-900 ring-yellow-200" : "bg-slate-100 text-slate-800 ring-slate-200"}`}
                      aria-label="Taskulamppu"
                    >
                      🔦
                    </button>
                    <button
                      type="button"
                      onClick={closeEanModal}
                      className="min-h-[3rem] touch-manipulation rounded-[1rem] bg-slate-900 px-2 text-sm font-black text-white shadow-sm transition active:scale-[0.98]"
                    >
                      Sulje
                    </button>
                  </div>
                </div>
              )}

              {eanMessage && !eanSearchStartedAutomatically && (
                <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
                  {eanMessage}
                </div>
              )}

              {eanResults.length > 0 && !eanSearchStartedAutomatically && (
                <div
                  ref={eanResultsRef}
                  className="mt-4 grid gap-2 scroll-mt-4"
                >
                  {eanResults.map((result) => (
                    <div
                      key={result.key}
                      className="rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {result.product.pictureUrl && (
                          <img
                            src={result.product.pictureUrl}
                            alt={result.product.name}
                            className="h-14 w-14 shrink-0 rounded-xl object-contain"
                          />
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
                            {renderPriceHistoryBadge(
                              getPriceHistoryKeyFromProduct(
                                result.product,
                                result.storeName,
                                result.chain,
                              ),
                              getProductPrice(result.product),
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addEanResultToCart(result)}
                          className="min-h-[2.75rem] shrink-0 touch-manipulation rounded-[1rem] bg-green-600 px-3 text-sm font-black text-white shadow-sm shadow-green-600/20 transition active:scale-[0.98]"
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

        {false &&
          cheapest &&
          !cartModalOpen &&
          !searchPanelOpen &&
          !shopsPanelOpen &&
          !eanModalOpen &&
          activeResult !== "compare" &&
          !(loadingNormal || normalResults.length > 0) && (
            <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-3 right-3 z-40 mx-auto max-w-md rounded-[1.35rem] border border-white/10 bg-slate-950/92 p-3 text-white shadow-[0_18px_55px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-green-300">
                    Huokein täysi kori
                  </p>
                  <p className="truncate text-sm font-black">
                    {cheapest.storeName}
                  </p>
                  {secondCheapest && savings > 0 && (
                    <p className="text-[11px] font-bold text-green-200">
                      Säästö {formatEuro(savings)}
                    </p>
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

        {/* V399_MOBILE_CART_COMPARE_RENDER_FIX:
            Bottom nav already toggles cartModalOpen / activeResult="compare".
            The rollback file was missing the actual mobile render blocks for Kori and Vertailu,
            which made the app fall back to the home layer even though state had changed. */}
        {!showLaunchScreen && cartModalOpen && (
          <div
            className={`fixed inset-0 z-[52] overflow-y-auto bg-[#edf8f4] px-3 pb-[calc(env(safe-area-inset-bottom)+5.9rem)] pt-[calc(env(safe-area-inset-top)+5.35rem)] sm:hidden ${
              closingPanels.cart ? "ziiply-soft-close" : "ziiply-soft-open"
            }`}
          >
            <div
              ref={cartOverlayScrollRef}
              className="ziiply-cart-retro-fix mx-auto max-w-md space-y-2"
            >
              <ZiiplyCartCard
                cart={cart}
                shoppingListItems={shoppingListItems}
                checkedCartItems={checkedCartItems}
                checkedCount={checkedCount}
                shoppingListCount={shoppingListCount}
                shoppingProgressPercent={shoppingProgressPercent}
                cheapest={cheapest}
                secondCheapest={secondCheapest}
                savings={savings}
                savingsPercent={savingsPercent}
                bestShoppingListGroups={bestShoppingListGroups}
                getShoppingListItemKey={getShoppingListItemKey}
                toggleShoppingListItem={toggleShoppingListItem}
                onToggleShoppingListItem={toggleShoppingListItem}
                onToggleCollected={toggleShoppingListItem}
                markAllShoppingListItemsChecked={markAllShoppingListItemsChecked}
                clearShoppingListChecks={clearShoppingListChecks}
                formatEuro={formatEuro}
                fixText={fixText}
                setCheckedCartItems={setCheckedCartItems}
                shoppingItemRefs={shoppingItemRefs}
                onIncreaseQuantity={(itemId: string) => changeQuantity(itemId, 1)}
                onDecreaseQuantity={(itemId: string) => changeQuantity(itemId, -1)}
                onRemoveItem={removeCartItem}
                onAddMore={openSearchPanel}
                onClearCart={clearCart}
                onCompare={openComparisonView}
                cartSavePanelOpen={cartSavePanelOpen}
                onToggleSavePanel={() => setCartSavePanelOpen((current) => !current)}
                savedListName={savedListName}
                setSavedListName={setSavedListName}
                onSaveCurrentCartAsList={saveCurrentCartAsList}
                savedShoppingLists={savedShoppingLists}
                onAddSavedListToCart={addSavedListToCart}
                onDeleteSavedShoppingList={deleteSavedShoppingList}
              />
            </div>
          </div>
        )}

        {!showLaunchScreen && activeResult === "compare" && !searchPanelOpen && !cartModalOpen && !shopsPanelOpen && !eanModalOpen && (
          <div
            className={`fixed inset-0 z-[53] overflow-y-auto bg-[#edf8f4] px-3 pb-[calc(env(safe-area-inset-bottom)+5.9rem)] pt-[calc(env(safe-area-inset-top)+5.35rem)] sm:hidden ${
              closingPanels.compare ? "ziiply-soft-close" : "ziiply-soft-open"
            }`}
          >
            <div
              ref={compareOverlayScrollRef}
              className="mx-auto max-w-md space-y-3"
            >
              <ZiiplyCompareCard
                stores={chainResults
                  .filter((result) => !result.comingSoon)
                  .map((result) => ({
                    id: result.key,
                    name: result.storeName || result.chain,
                    chain: result.key === "s" ? "S" : result.key === "k" ? "K" : undefined,
                    totalPrice: Math.round((result.totalPrice || 0) * 100),
                    itemCount: result.foundItems,
                    isBest: cheapest?.key === result.key,
                    badge: result.missingItems > 0 ? `${result.missingItems} puuttuu` : "Täysi kori",
                  }))}
                title="Vertailu"
                subtitle={cart.length > 0 ? `${cart.length} tuotetta korissa` : "Lisää tuotteita koriin ja vertaile kauppoja"}
                loading={comparisonLoading}
              />

              <div className="rounded-[1.5rem] bg-white/95 p-3 shadow-sm ring-1 ring-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openSearchPanel}
                    className="rounded-[1rem] bg-green-700 px-3 py-3 text-sm font-black text-white shadow-sm active:scale-[0.98]"
                  >
                    Lisää tuote
                  </button>
                  <button
                    type="button"
                    onClick={showCart}
                    className="rounded-[1rem] bg-slate-900 px-3 py-3 text-sm font-black text-white shadow-sm active:scale-[0.98]"
                  >
                    Avaa kori
                  </button>
                </div>

                {!storesReadyForSearch && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-800 ring-1 ring-amber-100">
                    Valitse kaupat, niin vertailu hakee hinnat.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* V402_MOBILE_SEARCH_CARD_RENDER:
            Vanha Hae-paneeli säilyttää hakukentän ja hakumoottorin.
            Tämä uusi mobiilikortti näyttää varsinaisen tuotteen valintaikkunan tulosvaiheessa. */}
        {searchPanelOpen &&
          !keyboardOpenV320 &&
          (loadingNormal || normalSearchAttempted || normalResults.length > 0) && (
            <ZiiplyMobileSearchCard
              open={true}
              title="HAKUTULOKSET"
              subtitle={activeNormalSearchTerm || undefined}
              loading={loadingNormal}
              products={normalResults}
              emptyText={
                activeNormalSearchTerm
                  ? `Haulle “${activeNormalSearchTerm}” ei löytynyt tuotteita.`
                  : "Ei hakutuloksia."
              }
              onClose={() => {
                setNormalResults([]);
                setNormalSearchAttempted(false);
                setVisibleNormalCount(8);
                setActiveNormalSearchTerm("");
              }}
              onAddProduct={(product: any) => {
                addProductToCart(product as Product);
                setNormalResults([]);
                setNormalSearchAttempted(false);
                setVisibleNormalCount(8);
                setActiveNormalSearchTerm("");
              }}
            />
          )}

        {lastCartToast && (
          <div className="fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] mx-auto max-w-md animate-[ziiplyFade_2.6s_ease-in-out] rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white shadow-2xl sm:hidden">
            ✓ {lastCartToast}
          </div>
        )}

        <ZiiplyBottomNav
          shopsPanelOpen={shopsPanelOpen}
          initialStoreNavPrompt={initialStoreNavPrompt}
          searchBottomNavDisabled={searchBottomNavDisabled}
          initialStoreSelectionLocked={initialStoreSelectionLocked}
          searchPanelOpen={searchPanelOpen}
          searchReadyBounceKeyV320={searchReadyBounceKeyV320}
          storesReadyForSearch={storesReadyForSearch}
          cartLength={cart.length}
          cartModalOpen={cartModalOpen}
          activeResult={activeResult}
          onShopsClick={toggleShopsPanel}
          onSearchClick={toggleSearchPanel}
          onCartClick={toggleCartModal}
          onCompareClick={toggleComparisonView}
        />

        <style>{`

          .ziiply-cart-retro-fix * { min-width: 0; }
          .ziiply-cart-retro-fix button { white-space: nowrap; }
          .ziiply-cart-retro-fix img { object-fit: contain; }
          .ziiply-cart-retro-fix [class*="rounded"] { box-sizing: border-box; }
          .ziiply-cart-retro-fix [class*="Pois"] { flex-shrink: 0; }
        @keyframes ziiplyHintPop {
          0%, 100% { opacity: 0; transform: translateY(4px) scale(0.96); }
          18%, 78% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ziiplyFade {
          0% { opacity: 0; transform: translateY(10px); }
          12% { opacity: 1; transform: translateY(0); }
          82% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(8px); }
        }
      `}</style>

        


        {mapRouteOverlayOpenV428 && (
          <div className="fixed inset-0 z-[120] bg-[#062f29]/45 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm sm:hidden">
            <div className="mx-auto flex h-full max-w-[430px] flex-col overflow-hidden rounded-[2rem] border-[3px] border-[#c9a85c] bg-[#fff8dc] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between border-b border-[#d6bd76] bg-[#073d32] px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#fff7dc] shadow-inner ring-1 ring-[#d6bd76]">
                    <img
                      src="/icons/ziiply-compass.png"
                      alt=""
                      className="h-10 w-10 object-contain"
                      draggable={false}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-[#f6d77b]">
                      Reitti
                    </div>
                    <div className="max-w-[220px] truncate text-lg font-black leading-tight">
                      {selectedRouteStoreV428.name}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMapRouteOverlayOpenV428(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-2xl font-black active:scale-95"
                  aria-label="Sulje kartta"
                >
                  ×
                </button>
              </div>

              <div className="relative min-h-0 flex-1 bg-white">
                <iframe
                  title="Ziiply kartta"
                  src={mapRouteIframeSrcV428}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="space-y-2 border-t border-[#d6bd76] bg-[#fff8dc] p-3">
                {gpsCoordsV320 ? (
                  <div className="rounded-2xl bg-[#e7f6ee] px-3 py-2 text-sm font-black text-[#087a3a]">
                    Oma sijainti mukana reittiohjeessa.
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#fff1c7] px-3 py-2 text-sm font-black text-[#7b5a14]">
                    GPS ei ole päällä. Reitti avautuu ilman lähtöpistettä.
                  </div>
                )}

                <button
                  type="button"
                  onClick={openRouteInMapsV428}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#073d32] px-4 py-4 text-lg font-black text-[#fff7dc] shadow-[0_8px_18px_rgba(7,61,50,0.24)] active:scale-[0.99]"
                >
                  <span>Näytä reitti</span>
                  <span className="text-2xl">↗</span>
                </button>
              </div>
            </div>
          </div>
        )}


      </main>
    </>
  );
}

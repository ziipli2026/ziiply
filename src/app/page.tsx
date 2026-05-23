"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  Offer, ZiiplyOffer, Product, KProduct, EanSearchResult, CartItem,
  Area, StoreSearchItem, Match, ChainResult, SingleProductCompareResult, StoreMode,
  QualityMode, StoreCompareScope, OptimizationSnapshot, PriceSnapshot, SavedShoppingList, SearchDebugEntry,
  SearchIntentCategory, SearchIntent, ScoredProduct, ScoredOfferResult,
} from "./components/ziiply/ziiplyCore";
import {
  MAX_ITEMS, ALTERNATIVES_AUTO_CLOSE_MS, PRICE_HISTORY_STORAGE_KEY, RECENT_CART_ITEMS_STORAGE_KEY, SAVED_SHOPPING_LISTS_STORAGE_KEY, MAX_RECENT_CART_ITEMS,
  MAX_SAVED_SHOPPING_LISTS, HTML5_QRCODE_SCRIPT_URL, EAN_SCANNER_REGION_ID, SAME_EAN_RESCAN_LOCK_MS, APP_VERSION, SHOW_SEARCH_DEBUG_PANEL,
  trackZiiplyEvent, AREAS, fixText, normalize, normalizeEan, isUsableEan,
  getEanSearchVariants, isSameEan, cleanExternalProductName, getOpenFoodFactsNames, splitProductTermsPreservingDecimalCommas, parseTerms,
  isLowSignalProductSearchTerm, SEARCH_ALIASES, getSearchQuery, getColaSpecificSearchQueries, uniqueNormalizedQueries, SEARCH_INTENTS,
  detectSearchIntent, isMilkSearchTerm, isColaSearchTerm, getPrimaryProductNounQuery, isVerySpecificSearch, normalizeLooseProductMatch,
  getMetricSizeKey, getNormalSearchQueries, isAliasSearch, formatEuro, formatComparisonPrice, getProductCategoryLabel,
  triggerHaptic, playScanSuccessFeedback, getScannerVideoElement, getScannerVideoTrack, applyBestEffortScannerCameraTuning, focusScannerCameraAtPoint,
  formatDate, getProductPrice, isManualShoppingItem, getPriceHistoryKeyFromProduct, getPriceHistoryKeyFromCartItem, getPriceChangeInfo,
  getSizeToken, hasWord, getNormalizedWords, hasExactNormalizedWord, parseMetricSize, getExactWordScore,
  getBrandMatchScore, getSizeMatchScore, isDifferentColaBrand, buildKSearchName, getKSearchTerms, hasAnyBrand,
  hasAnyToken, isEggSearchTerm, isClearlyEggProduct, isCoffeeSearchTerm, isCoffeeAccessory, hasStrongCoffeeSignal,
  hasCoffeePackSize, isClearlyColaProduct, isClearlyCoffeeProduct, isHardRejectedAlternative, isHardRejectedOptimizationAlternative, VALUE_BRANDS,
  K_OWN_BRANDS, S_OWN_BRANDS, PREMIUM_BRANDS, isValueBrandProduct, isKOwnBrandProduct, isPremiumBrandProduct,
  productGroupGate, isHardRejectedKMatch, scoreNameMatch, scoreDirectQueryNameMatch, getProductSearchText, getPreferredSizeScore,
  looksLikeNonFoodProduct, getGroceryNonFoodPenalty, isWrongMilkSearchProduct, hasStrongMilkSignal, getCategoryConfidence, getImportantQueryWordsForStrictMatch,
  getStrictMultiWordMatchScore, scoreBaseNormalResult, scoreMilkProduct, scoreCoffeeProduct, scoreColaProduct, scoreButtermilkProduct,
  scoreCookingOilProduct, scoreCategorySpecificResult, scoreNormalSResult, rankNormalSearchResults, isNonFoodOffer, isBadNormalResult,
  findArea, storeText, isPrisma, isKCitymarket, isSLocalStore, isKLocalStore,
  pickStore, offerToProduct, scoreOfferForTerm, rankOfferSearchResults, convertKProductToProduct, getPrimaryBrand,
  isAllowedByQualityMode, scoreQualityMode, pickBestSProduct, pickBestKProduct,
} from "./components/ziiply/ziiplyCore";
import {
  ZiiplyLaunchScreen,
  ZiiplyBottomNav,
} from "./components/ziiply/ziiplyComponents";
import * as TopbarResponsiveCardModule from "./components/ziiply/cards/TopbarResponsiveCard";

export default function Page() {
  const TopbarResponsiveCard =
    ((TopbarResponsiveCardModule as any).default ||
      (TopbarResponsiveCardModule as any).TopbarResponsiveCard ||
      (TopbarResponsiveCardModule as any).ZiiplyTopBar ||
      (TopbarResponsiveCardModule as any).ZiiplyTopbarResponsiveCard) as any;

  const [input, setInput] = useState("");
  const [searchCompareMode, setSearchCompareMode] = useState<"cart" | "single">("cart");
  const [locationInput, setLocationInput] = useState("");
  const [activeArea, setActiveArea] = useState<Area>(AREAS[0]);
  const [storeMode, setStoreMode] = useState<StoreMode>("hyper");
  const [storeModeChosenV299, setStoreModeChosenV299] = useState(false);
  const selectedStoreModeRefV302 = useRef<StoreMode>("hyper");
  const [storeCompareScope, setStoreCompareScope] = useState<StoreCompareScope>("none");
  const [withinChain, setWithinChain] = useState<"S" | "K" | null>(null);
  const [openStorePicker, setOpenStorePicker] = useState<string | null>(null);
  const [storeDrillViewV320, setStoreDrillViewV320] = useState<"main" | "selection">("main");
  const [locationMessage, setLocationMessage] = useState("Kirjoita alue tai käytä omaa sijaintia.");
  const [locationMessageVisible, setLocationMessageVisible] = useState(true);
  const [usingOwnLocation, setUsingOwnLocation] = useState(true);
  const [storeSearchLoading, setStoreSearchLoading] = useState(false);
  const [foundStores, setFoundStores] = useState<StoreSearchItem[]>([]);
  const [gpsCoordsV320, setGpsCoordsV320] = useState<{ latitude: number; longitude: number } | null>(null);
  const [storeDistanceFallbacksV320, setStoreDistanceFallbacksV320] = useState<Record<string, number>>({});
  const [keyboardOpenV320, setKeyboardOpenV320] = useState(false);


  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateKeyboardState = () => {
      const activeElement = document.activeElement;
      const isTextInputFocused =
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable);

      const visualViewport = window.visualViewport;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const keyboardLikelyOpen = isTextInputFocused && viewportHeight < window.innerHeight - 110;

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
    const shouldAutoHide =
      !storeSearchLoading &&
      (lower.endsWith("käytössä.") || lower.includes(" löytyi.") || (lower.includes(" valittu") && !lower.includes("valitse")));

    if (!shouldAutoHide) return;

    const timer = window.setTimeout(() => setLocationMessageVisible(false), 1700);
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
      const candidates = uniqueStoresByIdAndName(foundStores.map(normalizeStoreForPickerV320))
        .filter((store) => !getStoreDistanceLabelWithoutFallbackV320(store))
        .slice(0, 24);

      if (candidates.length === 0) return;

      const nextDistances: Record<string, number> = {};

      for (const store of candidates) {
        if (cancelled) return;

        const queryParts = [store.name, store.city || activeArea.label, store.postalCode, "Suomi"].filter(Boolean);
        const query = queryParts.join(", ");

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fi&q=${encodeURIComponent(query)}`,
            { signal: controller.signal }
          );
          if (!response.ok) continue;

          const results = await response.json();
          const first = Array.isArray(results) ? results[0] : null;
          const latitude = readStoreNumberV320(first?.lat);
          const longitude = readStoreNumberV320(first?.lon ?? first?.lng);
          if (latitude == null || longitude == null) continue;

          nextDistances[getStoreDistanceKeyV320(store)] = calculateDistanceKmV320(gpsCoordsForFallbackV320, { latitude, longitude });
        } catch (error) {
          if (!cancelled) console.debug("Etäisyyden varalaskenta epäonnistui", error);
        }
      }

      if (cancelled || Object.keys(nextDistances).length === 0) return;

      setStoreDistanceFallbacksV320((current) => {
        const merged = { ...current, ...nextDistances };
        return JSON.stringify(merged) === JSON.stringify(current) ? current : merged;
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
  const [chainFilter, setChainFilter] = useState<"all" | "S" | "K">("all");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const [activeResult, setActiveResult] = useState<"none" | "offers" | "compare" | "singleCompare">("none");
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartSavePanelOpen, setCartSavePanelOpen] = useState(false);
  const [shopsPanelOpen, setShopsPanelOpen] = useState(false);
  const [initialStoreNavPrompt, setInitialStoreNavPrompt] = useState(true);
  const [gpsErrorMessage, setGpsErrorMessage] = useState("");
  const [gpsAutoActivatedV287, setGpsAutoActivatedV287] = useState(false);
  const gpsUserDisabledRefV306 = useRef(false);

  function stopOwnLocationV306(message = "Kirjoita alue tai postinumero.") {
    gpsUserDisabledRefV306.current = true;
    setUsingOwnLocation(false);
    setGpsErrorMessage("");
    setLocationInput("");
    setLocationMessage(message);
    try {
      localStorage.removeItem("ziiply-use-own-location");
    } catch {}
  }
  // Mobile comparison view uses the same activeResult state as desktop, but renders as its own overlay.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restoredCartPromptV320, setRestoredCartPromptV320] = useState<{ open: boolean; count: number; savedAt?: number }>({ open: false, count: 0 });
  const cartIsEmpty = cart.length === 0;

  const [normalResults, setNormalResults] = useState<Product[]>([]);
  const [normalSearchAttempted, setNormalSearchAttempted] = useState(false);
  const [searchDebug, setSearchDebug] = useState<SearchDebugEntry[]>([]);
  const [loadingNormal, setLoadingNormal] = useState(false);
  const [singleProductCompareResults, setSingleProductCompareResults] = useState<SingleProductCompareResult[]>([]);
  const [singleProductCompareLoading, setSingleProductCompareLoading] = useState(false);
  const [singleProductCompareTerm, setSingleProductCompareTerm] = useState("");
  const searchNavigationLocked = loadingOffers || loadingNormal || singleProductCompareLoading;
  const withinChainStoresReadyV320 = Boolean(
    storeCompareScope === "within_chain" &&
      withinChain &&
      (withinChain === "S"
        ? (activeArea.sStoreId || activeArea.sStoreName) && (activeArea.sLocalStoreId || activeArea.sLocalStoreName)
        : (activeArea.kStoreId || activeArea.kStoreName) && (activeArea.kLocalStoreId || activeArea.kLocalStoreName))
  );
  const storesReadyForSearch = Boolean(
    (storeCompareScope === "between_chains" && storeModeChosenV299) || withinChainStoresReadyV320
  );
  const initialStoreSelectionLocked = !storesReadyForSearch;
  const searchBottomNavDisabled = searchNavigationLocked || initialStoreSelectionLocked;
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
  const [suppressUiForEanClose, setSuppressUiForEanClose] = useState(false);
  const [eanModalClosing, setEanModalClosing] = useState(false);
  const PANEL_FADE_MS = 260;
  const [closingPanels, setClosingPanels] = useState<Record<string, boolean>>({});
  const [eanScannerOpen, setEanScannerOpen] = useState(false);
  const [eanScannerMessage, setEanScannerMessage] = useState("");
  const [scannerTorchOn, setScannerTorchOn] = useState(false);
  const [eanManualInputOpen, setEanManualInputOpen] = useState(false);
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
    const overlayOpen = searchPanelOpen || cartModalOpen || shopsPanelOpen || activeResult === "compare" || activeResult === "offers";

    if (!overlayOpen || typeof document === "undefined") return;

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
  }, [searchPanelOpen, cartModalOpen, shopsPanelOpen, activeResult]);


  useEffect(() => {
    if (!eanModalOpen) stopEanCameraScanner();

    return () => {
      stopEanCameraScanner();
    };
  }, [eanModalOpen]);

  useEffect(() => {
    if (!eanModalOpen || eanResults.length <= 1) return;

    const timeout = window.setTimeout(() => {
      eanResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const hasSearchInput = terms.length > 0;

  function getSingleSearchTerm(value: string, options: { preserveTypingSpace?: boolean } = {}) {
    // v260:
    // Yksi tuote -tilassa sallitaan yksi moniosainen tuote, myös desimaalipilkulla:
    // "Coca Cola zero 1,5L". iOS/Safari antaa välivaiheen "1," ennen seuraavaa
    // numeroa, joten myös numeron jälkeinen keskeneräinen pilkku pitää suojata.
    // Rivinvaihto katkaisee aina ylimääräiset tuotteet pois. Listapilkku katkaisee
    // vain silloin, kun se ei ole numerokoon/desimaalin osa.
    const decimalCommaPlaceholder = "__ZIIPLY_DECIMAL_COMMA__";
    const rawFirstLine = fixText(String(value || "")).split(/[\n]+/)[0] || "";
    const protectedDecimalCommas = rawFirstLine.replace(/(\d)\s*,\s*(?=\d|$)/g, `$1${decimalCommaPlaceholder}`);
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
      const brand = hasAnyToken(text, ["pepsi"]) ? "pepsi" : hasAnyToken(text, ["coca-cola", "coca cola"]) ? "coca cola" : "cola";
      return [brand, isZero ? (brand === "pepsi" ? "max" : "zero") : "", size].filter(Boolean).join(" ");
    }

    if (hasAnyToken(text, ["kananmuna", "kananmunat", "kananmunia", "munat"])) return "kananmuna";

    if (hasAnyToken(text, ["broilerin jauheliha", "kanan jauheliha"])) return "broilerin jauheliha";
    if (hasAnyToken(text, ["naudan jauheliha"])) return "naudan jauheliha";
    if (hasAnyToken(text, ["sika-nauta jauheliha", "sikanauta jauheliha"])) return "sika-nauta jauheliha";
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

    const candidates = new Map<string, { label: string; hint: string; score: number }>();

    const addCandidate = (label: string, hint: string, score: number) => {
      const cleanLabel = fixText(label).replace(/\s+/g, " ").trim();
      const key = normalize(cleanLabel);
      if (!key || key.length < 2) return;
      if (!key.includes(query) && !key.startsWith(query) && !query.includes(key)) return;

      const existing = candidates.get(key);
      if (!existing || existing.score < score) candidates.set(key, { label: cleanLabel, hint, score });
    };

    for (const item of cart) addCandidate(getCompactSuggestionLabel(item.name), "Korista", 115);
    for (const item of recentCartItems) addCandidate(getCompactSuggestionLabel(item.name), "Viimeksi lisätty", 105);

    for (const intent of SEARCH_INTENTS) {
      const intentMatchesQuery = normalize(intent.label).includes(query) || intent.variants.some((variant) => normalize(variant).includes(query));
      for (const variant of intent.variants) addCandidate(variant, intent.label, intentMatchesQuery ? 92 : 78);
    }

    Object.values(SEARCH_ALIASES).forEach((alias) => addCandidate(alias, "Nopea haku", 70));

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

  const hasActiveStores = activeStores.sStoreId > 0 && activeStores.kStoreId > 0;

  function shouldUseLocalFallback(chain: "S" | "K") {
    if (storeMode !== "local") return false;

    if (chain === "S") {
      return Boolean(activeArea.sStoreId) && activeStores.sStoreId !== activeArea.sStoreId;
    }

    return Boolean(activeArea.kStoreId) && activeStores.kStoreId !== activeArea.kStoreId;
  }

  function normalizeSProduct(raw: any): Product | null {
    const idValue = raw?.id ?? raw?.item?.id ?? raw?.productId ?? raw?.ean ?? `${raw?.name || "s-product"}-${Math.random()}`;
    const price =
      raw?.price ??
      raw?.storeItems?.[0]?.price ??
      raw?.storeItem?.price ??
      raw?.pricing?.price ??
      raw?.currentPrice ??
      0;

    const name = fixText(String(raw?.name ?? raw?.item?.name ?? raw?.productName ?? ""));
    if (!name) return null;

    return {
      id: Number(String(idValue).replace(/\D/g, "").slice(0, 9)) || Math.abs(String(idValue).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)),
      name,
      ean: raw?.ean ?? raw?.item?.ean ?? raw?.gtin ?? raw?.barcode ?? "",
      brandName: raw?.brandName ?? raw?.brand ?? raw?.item?.brandName ?? "",
      pictureUrl: raw?.pictureUrl ?? raw?.imageUrl ?? raw?.item?.pictureUrl ?? "",
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

  async function fetchSProducts(search: string, storeId: number): Promise<Product[]> {
    const response = await fetch(
      `/api/s-products?search=${encodeURIComponent(search)}&store=${encodeURIComponent(String(storeId))}`,
      { cache: "no-store" }
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
      .filter((item: Product | null): item is Product => Boolean(item && item.name && getProductPrice(item) > 0));
  }

  async function fetchKProducts(search: string, storeId: number): Promise<KProduct[]> {
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
        const restoredItems = Array.isArray(parsed)
          ? parsed.slice(0, MAX_ITEMS)
          : Array.isArray(parsed?.items)
          ? parsed.items.slice(0, MAX_ITEMS)
          : [];

        if (restoredItems.length > 0) {
          setCart(restoredItems);
          setRestoredCartPromptV320({
            open: true,
            count: restoredItems.length,
            savedAt: typeof parsed?.savedAt === "number" ? parsed.savedAt : undefined,
          });
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

  function transitionMobilePanel(nextPanel: "none" | "shops" | "search" | "cart" | "compare" | "offers" | "singleCompare", applyNext: () => void) {
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
    if (!storesReadyForSearch) {
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
    if (!storesReadyForSearch) {
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
    const chainFilteredOffers = offers.filter((item) => chainFilter === "all" || item.chain === chainFilter);
    return rankOfferSearchResults(chainFilteredOffers, terms);
  }, [offers, terms, chainFilter]);

  const offerSearchLabel = useMemo(() => {
    const label = terms.join(", ").trim() || input.trim();
    return label || "haku";
  }, [terms, input]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  }, [cart]);

  const cartNameSet = useMemo(() => {
    return new Set(cart.map((item) => normalize(item.name)));
  }, [cart]);

  const visibleNormalResults = useMemo(() => {
    if (searchCompareMode === "single") return normalResults;
    return normalResults.filter((product) => !cartNameSet.has(normalize(product.name)));
  }, [normalResults, cartNameSet, searchCompareMode]);

  // Hakutulosten valintatila on eri käyttömoodi kuin korivertailu.
  // Kun käyttäjä valitsee seuraavaa tuotetta koriin, vertailukortteja ei näytetä
  // taustalla, vaikka vertailudataa päivitettäisiin samaan aikaan.
  const searchSelectionMode = loadingNormal || visibleNormalResults.length > 0;

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
    // v319: Vertailu avautuu aina yleisnäkymään. Näytä iso halvin kori -kortti heti,
    // vaikka vertailussa olisi vain yksi valmis kauppa tai säästöä ei vielä synny.
    return cart.length > 0 && Boolean(cheapest);
  }, [cart.length, cheapest]);


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
    // v318: Vertailu-kortin taustalle ei näytetä erillistä säästötoastia.
    setLastSavingsToast(null);
  }, [activeResult, cheapest?.key, cheapest?.totalPrice, savings]);

  useEffect(() => {
    // v319: Vertailu-kortti avautuu aina yleisnäkymän alkuun, ei edelliseen skrollipaikkaan
    // eikä suoraan kauppakohtaiseen tuotelistaan.
    if (activeResult !== "compare") return;
    requestAnimationFrame(() => {
      compareOverlayScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      comparisonSectionRef.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
    });
  }, [activeResult, cheapest?.key, cart.length]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToNextUncheckedShoppingItem(nextChecks: Record<string, boolean>, currentKey: string) {
    const currentIndex = shoppingListKeys.findIndex((itemKey) => itemKey === currentKey);
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


  function inferStoreModeForStoreV306(store: StoreSearchItem, fallbackMode: StoreMode = storeMode): StoreMode {
    const name = normalize(store.name || "");
    if (store.type === "S") {
      if (isSLocalStore(store) || hasAnyToken(name, ["s-market", "s market", "alepa", "sale", "market"])) return "local";
      if (isPrisma(store)) return "hyper";
    }
    if (store.type === "K") {
      if (isKLocalStore(store) || hasAnyToken(name, ["k-market", "k market", "k-supermarket", "k supermarket", "market"])) return "local";
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

  function selectStoreForCurrentMode(store: StoreSearchItem, forcedMode?: StoreMode) {
    if (!store.id || !store.name) return;

    // v304_STORE_MODE_LOCK:
    // Kauppavalinta tehdään aina sen valintalaatikon moodiin, josta klikkaus tuli.
    // Älä päättele moodia uudelleen refistä/stateista, koska async-effectit voivat olla
    // ehtineet palauttaa storeMode-arvon hyperiksi juuri ennen kaupan klikkausta.
    const effectiveStoreMode = forcedMode || selectedStoreModeRefV302.current || storeMode;

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
        : `${store.name} valittu. Valitse vielä Tavaratalot tai Lähikaupat.`
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

  function buildDynamicArea(query: string, stores: StoreSearchItem[], mode: StoreMode): Area {
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
      aliases: Array.from(new Set([...(matchedArea?.aliases || []), query, detectedCity].filter(Boolean))),
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

  async function fetchStoresForLocationQuery(query: string, coords?: { latitude: number; longitude: number } | null) {
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
    const stores = ((data.items || []) as StoreSearchItem[]).filter((store) => store.id && store.name);

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
      const longitude = getStoreCoordinateV320(store, ["longitude", "lng", "lon", "x"]);

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
        ""
    ).trim();
  }

  function isFinnishPostalCode(value: string) {
    return /^\d{5}$/.test(value.trim());
  }

  async function reverseGeocodeCity(latitude: number, longitude: number) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=fi`,
      { cache: "no-store" }
    );
    const data = await response.json();
    return getCityFromGeocodeAddress(data?.address || {});
  }

  async function resolvePostalCodeToCity(postalCode: string) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=fi&postalcode=${encodeURIComponent(postalCode)}&addressdetails=1&limit=1&accept-language=fi`,
      { cache: "no-store" }
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

  async function applyLocation(queryOverride?: string, source: "manual" | "gps" = "manual", coordsOverride?: { latitude: number; longitude: number } | null) {
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
    setLocationMessage(source === "gps" ? `Haetaan kauppoja alueelle ${rawQuery}...` : "Haetaan kauppoja...");

    try {
      let query = rawQuery;

      if (isFinnishPostalCode(rawQuery)) {
        setLocationMessage(`Haetaan aluetta postinumerolle ${rawQuery}...`);
        const cityFromPostalCode = await resolvePostalCodeToCity(rawQuery);

        if (!cityFromPostalCode) {
          setFoundStores([]);
          setLocationMessage(`Postinumeroa "${rawQuery}" ei tunnistettu. Valitse alue käsin.`);
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

      setLocationMessage(source === "gps" ? `Haetaan kauppoja alueelle ${query}...` : "Haetaan kauppoja...");
      const stores = await fetchStoresForLocationQuery(query, source === "gps" ? (coordsOverride || gpsCoordsV320) : null);
      setFoundStores(stores);

      if (stores.length === 0) {
        setLocationMessage(`Alueelle "${query}" ei löytynyt kauppoja. Valitse alue käsin.`);
        return;
      }

      const ranked = rankStoresForMode(stores, storeModeChosenV299 ? selectedStoreModeRefV302.current : storeMode);
      const nextArea = buildDynamicArea(query, stores, storeModeChosenV299 ? selectedStoreModeRefV302.current : storeMode);
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

      if (typeof document !== "undefined") {
        const activeElement = document.activeElement as HTMLElement | null;
        activeElement?.blur?.();
      }

      const modeMissing = storeMode === "local"
        ? !ranked.sLocal || !ranked.kLocal
        : !ranked.sHyper || !ranked.kHyper;

      if (modeMissing) {
        setLocationMessage(
          `${nextArea.label || query} löytyi, mutta kaikkia ${storeMode === "local" ? "lähikauppoja" : "tavarataloja"} ei löytynyt. Voit valita kaupat listasta.`
        );
      } else {
        setLocationMessage(`${nextArea.label || query} käytössä.`);
      }
    } catch (error) {
      console.error(error);
        const gpsErrorCode = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
        if (gpsErrorCode === 1) {
          setGpsErrorMessage("GPS-paikannus estetty selaimen asetuksissa.");
        } else if (gpsErrorCode === 2) {
          setGpsErrorMessage("GPS-sijaintia ei saatu haettua.");
        } else if (gpsErrorCode === 3) {
          setGpsErrorMessage("GPS-paikannus aikakatkaistiin.");
        } else {
          setGpsErrorMessage("GPS-paikannus ei ole käytettävissä.");
        }
      setLocationMessage(source === "gps" ? "Sijainti löytyi, mutta kauppahaku epäonnistui. Valitse alue käsin." : "Kauppahaku epäonnistui. Valitse alue käsin.");
    } finally {
      setStoreSearchLoading(false);
    }
  }

  async function useOwnLocation() {
    if (storeSearchLoading) return;

    gpsUserDisabledRefV306.current = false;
    setGpsErrorMessage("");
    setUsingOwnLocation(true);
    setLocationInput("");
    setStoreSearchLoading(true);
    setLocationMessage("Haetaan sijaintia...");

    try {
      const position = await getCurrentPosition();
      setGpsCoordsV320({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      const city = await reverseGeocodeCity(position.coords.latitude, position.coords.longitude);

      if (!city) {
        setLocationMessage("Sijaintia ei saatu. Valitse alue käsin.");
        gpsUserDisabledRefV306.current = true;
        setUsingOwnLocation(false);
        setGpsCoordsV320(null);
        return;
      }

      setLocationMessage(`${city} löytyi. Haetaan kaupat...`);
      setLocationInput("");
      setStoreSearchLoading(false);
      await applyLocation(city, "gps", { latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (error) {
      console.error(error);
        const gpsErrorCode = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
        if (gpsErrorCode === 1) {
          setGpsErrorMessage("GPS-paikannus estetty selaimen asetuksissa.");
        } else if (gpsErrorCode === 2) {
          setGpsErrorMessage("GPS-sijaintia ei saatu haettua.");
        } else if (gpsErrorCode === 3) {
          setGpsErrorMessage("GPS-paikannus aikakatkaistiin.");
        } else {
          setGpsErrorMessage("GPS-paikannus ei ole käytettävissä.");
        }
      setLocationMessage("Sijaintia ei saatu. Valitse alue käsin.");
      gpsUserDisabledRefV306.current = true;
      setUsingOwnLocation(false);
      setStoreSearchLoading(false);
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
      setLocationMessage("Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.");
      setHasSearchedOffers(false);
      setOffers([]);
      setActiveResult("none");
      return;
    }

    const isMainOfferSearch = !termOverride;

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
        const gpsErrorCode = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
        if (gpsErrorCode === 1) {
          setGpsErrorMessage("GPS-paikannus estetty selaimen asetuksissa.");
        } else if (gpsErrorCode === 2) {
          setGpsErrorMessage("GPS-sijaintia ei saatu haettua.");
        } else if (gpsErrorCode === 3) {
          setGpsErrorMessage("GPS-paikannus aikakatkaistiin.");
        } else {
          setGpsErrorMessage("GPS-paikannus ei ole käytettävissä.");
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
      setLocationMessage("Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.");
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
          let rawItems: Product[] = await fetchSProducts(searchQuery, activeStores.sStoreId);
          let usedStoreName = activeStores.sStoreName;
          let fallbackStoreName = "";

          if (rawItems.length === 0 && shouldUseLocalFallback("S")) {
            if (activeArea.sStoreId) rawItems = await fetchSProducts(searchQuery, activeArea.sStoreId);
            fallbackStoreName = activeArea.sStoreName || "S-tavaratalo";
            usedStoreName = activeArea.sStoreName || "S-tavaratalo";
          }

          const pricedItems = rawItems.filter((product: Product) => getProductPrice(product) > 0);
          const eggLockedSearch = detectSearchIntent(term).category === "egg" || isEggSearchTerm(term) || isEggSearchTerm(searchQuery);
          const normalFiltered = pricedItems
            .filter((product: Product) => !isBadNormalResult(product, searchQuery))
            .filter((product: Product) => !eggLockedSearch || isClearlyEggProduct(product.name));

          // Fail-open pidetään vain yleisissä hauissa. Kananmunahaussa se aiheutti sen,
          // että "kananmunaton pasta" palasi tuloksiin, jos kaikki aidot osumat putosivat.
          const safeItems = eggLockedSearch ? normalFiltered : normalFiltered.length > 0 ? normalFiltered : pricedItems;

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

      const unique = Array.from(new Map(all.map((item) => [item.id, item])).values())
        .filter((item) => {
          const originalQuery = (item as Product & { originalSearchTerm?: string }).originalSearchTerm || useTerms[0] || "";
          if (detectSearchIntent(originalQuery).category === "egg" || isEggSearchTerm(originalQuery)) {
            return isClearlyEggProduct(item.name);
          }
          if (!normalize(originalQuery).includes("jauheliha")) return true;
          return normalize(`${item.name} ${item.category || ""}`).includes("jauheliha");
        })
        .sort((a, b) => {
          const aOriginalQuery = (a as Product & { originalSearchTerm?: string }).originalSearchTerm || useTerms[0] || "";
          const bOriginalQuery = (b as Product & { originalSearchTerm?: string }).originalSearchTerm || useTerms[0] || "";
          const directNameDifference =
            scoreDirectQueryNameMatch(bOriginalQuery, b.name) -
            scoreDirectQueryNameMatch(aOriginalQuery, a.name);

          if (Math.abs(directNameDifference) > 12) return directNameDifference;

          return scoreNormalSResult(bOriginalQuery, b) - scoreNormalSResult(aOriginalQuery, a);
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

      if (unique.length === 0 && isMainSearch) {
        setSearchPanelOpen(true);
      }
    } catch (error) {
      console.error(error);
        const gpsErrorCode = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
        if (gpsErrorCode === 1) {
          setGpsErrorMessage("GPS-paikannus estetty selaimen asetuksissa.");
        } else if (gpsErrorCode === 2) {
          setGpsErrorMessage("GPS-sijaintia ei saatu haettua.");
        } else if (gpsErrorCode === 3) {
          setGpsErrorMessage("GPS-paikannus aikakatkaistiin.");
        } else {
          setGpsErrorMessage("GPS-paikannus ei ole käytettävissä.");
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

  async function updateChainComparison(nextCart = cart, options: { openCompare?: boolean } = {}) {
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
            nextSMatches[item.id] = { product: item.product, price: item.price, quantity: item.quantity, matchType: "ean", cartItemId: item.id };
          } else {
            try {
              let items = await fetchSProducts(item.name, activeStores.sStoreId);
              let best = pickBestSProduct(items, item.name, item.ean);
              let fallbackStoreName = "";

              if (!best && shouldUseLocalFallback("S")) {
                if (activeArea.sStoreId) items = await fetchSProducts(item.name, activeArea.sStoreId);
                best = pickBestSProduct(items, item.name, item.ean);
                fallbackStoreName = activeArea.sStoreName || activeStores.sStoreName || "S-kauppa";
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
                if (activeArea.kStoreId) best = await findBestKMatchForStore(item.name, activeArea.kStoreId, item.ean);

                if (best) {
                  fallbackStoreName = activeArea.kStoreName || activeStores.kStoreName || "K-kauppa";
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
    if (previous?.code === normalizedCode && now - previous.at < SAME_EAN_RESCAN_LOCK_MS) {
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

  async function toggleScannerTorch() {
    try {
      const track = getScannerVideoTrack();
      if (!track) {
        setEanScannerMessage("Valoa voi kokeilla vasta, kun kamera on käynnissä.");
        return;
      }

      const capabilities = typeof track.getCapabilities === "function" ? (track.getCapabilities() as any) : {};
      if (!capabilities.torch) {
        setEanScannerMessage("Tämä selain tai kamera ei tue taskuvaloa. Hyvä yleisvalo toimii yleensä paremmin.");
        return;
      }

      const nextTorchState = !scannerTorchOn;
      await track.applyConstraints({ advanced: [{ torch: nextTorchState }] } as any);
      setScannerTorchOn(nextTorchState);
      setEanScannerMessage(nextTorchState ? "Valo päällä kokeiluna. Jos pakkaus heijastaa, sammuta valo." : "Valo pois päältä.");
    } catch {
      setEanScannerMessage("Taskuvaloa ei saatu vaihdettua tässä selaimessa.");
    }
  }

  async function stopEanCameraScanner(options: { keepScannerOpenState?: boolean } = {}) {
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

      setEanScannerMessage("Aseta viivakoodi kehykseen. Napauta kuvaa tarkennusta varten.");

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
        () => undefined
      );

      window.requestAnimationFrame(() => {
        void applyBestEffortScannerCameraTuning();
      });
    } catch (error) {
      console.error(error);
        const gpsErrorCode = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
        if (gpsErrorCode === 1) {
          setGpsErrorMessage("GPS-paikannus estetty selaimen asetuksissa.");
        } else if (gpsErrorCode === 2) {
          setGpsErrorMessage("GPS-sijaintia ei saatu haettua.");
        } else if (gpsErrorCode === 3) {
          setGpsErrorMessage("GPS-paikannus aikakatkaistiin.");
        } else {
          setGpsErrorMessage("GPS-paikannus ei ole käytettävissä.");
        }
      await stopEanCameraScanner();
      setEanScannerMessage("Kameraa ei saatu avattua tai skanneri ei käynnistynyt. Tarkista kameran lupa ja yritä uudelleen.");
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

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
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
          if (eanScannerOpen || eanHtml5ScannerRef.current) showScanSuccessFlash();
          setEanResults(exactResults.slice(0, 8));
          setEanMessage("Löytyi 1 tarkka EAN-osuma.");
        } else {
          // Kamera löysi oikean EANin, vaikka käyttäjän pitää valita useasta osumasta.
          // Näytetään vihreä palaute myös tässä tilanteessa, ei punaista virhettä.
          if (eanScannerOpen || eanHtml5ScannerRef.current) showScanSuccessFlash();
          setEanResults(exactResults.slice(0, 8));
          setEanMessage(`Löytyi ${exactResults.length} tarkkaa EAN-osumaa. Valitse lisättävä tuote.`);
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
        const gpsErrorCode = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
        if (gpsErrorCode === 1) {
          setGpsErrorMessage("GPS-paikannus estetty selaimen asetuksissa.");
        } else if (gpsErrorCode === 2) {
          setGpsErrorMessage("GPS-sijaintia ei saatu haettua.");
        } else if (gpsErrorCode === 3) {
          setGpsErrorMessage("GPS-paikannus aikakatkaistiin.");
        } else {
          setGpsErrorMessage("GPS-paikannus ei ole käytettävissä.");
        }
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

  async function compareEanResultAsSingle(result: EanSearchResult) {
    const selectedName = fixText(result.product.name);
    const selectedPrice = getProductPrice(result.product);

    if (!selectedName || selectedPrice <= 0 || singleProductCompareLoading) return;

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
            const kItems = await fetchKProducts(kSearchTerm, activeStores.kStoreId);
            kBest = pickBestKProduct(kItems, selectedName, selectedEan);
            if (kBest && !shouldKeepSearchingKOwnBrand(selectedName, kBest)) break;
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

          for (const sSearchTerm of getNormalSearchQueries(selectedName).slice(0, 6)) {
            const sItems = await fetchSProducts(sSearchTerm, activeStores.sStoreId);
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

      setSingleProductCompareResults(nextResults.sort((a, b) => a.price - b.price));
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
    if (lastEanCartAddRef.current?.key === addKey && now - lastEanCartAddRef.current.at < 2500) {
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
            : item
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
      setEanScannerMessage("Lisätty koriin. Kamera pysyy päällä seuraavaa tuotetta varten.");
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
    const originalSearchTerm = normalizeLooseProductMatch((product as Product & { originalSearchTerm?: string }).originalSearchTerm || "");

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
      const colaSizeMatches = !termSize || !productSize || termSize === productSize;

      return (
        normalizedTerm.length > 0 &&
        (
          productName.includes(normalizedTerm) ||
          productName.includes(normalizedSearchQuery) ||
          looseProductName.includes(looseTerm) ||
          looseProductName.includes(looseSearchQuery) ||
          (termIsGroundMeat && productIsGroundMeat) ||
          (termIsCola && productIsCola && colaSizeMatches)
        )
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

    if (cartWithoutMatchingManualRows.some((x) => normalize(x.name) === normalize(product.name))) {
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
      return normalize(item.name) === normalizedResultName && item.chain === result.key.toUpperCase();
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

    trackZiiplyEvent("shopping_list_saved", {
      listName,
      cartItemsCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    });

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

      void updateChainComparison(cart);
    });
  }

  function toggleComparisonView() {
    if (cart.length === 0) {
      showCartToast("Lisää ensin tuote koriin.");
      return;
    }

    if (activeResult === "compare" && !searchPanelOpen && !cartModalOpen && !eanModalOpen) {
      closePanelWithFade("compare", () => setActiveResult("none"));
      return;
    }

    openComparisonView();
  }

  function openShopsPanel() {
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
      showCartToast("Liittäminen ei onnistunut suoraan. Tarkista selaimen leikepöytäoikeus.");
      // Ei fallback-fokusta: käyttäjä ei halua selaimen omaa Sijoita-valikkoa tähän.
    }
  }

  async function compareSelectedSingleProduct(product: Product) {
    const selectedName = fixText(product.name);
    const selectedPrice = getProductPrice(product);

    if (!selectedName || selectedPrice <= 0 || singleProductCompareLoading) return;

    if (!hasActiveStores) {
      setLocationMessage("Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.");
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
        (product as Product & { sourceStoreName?: string; fallbackStoreName?: string }).sourceStoreName ||
        (product as Product & { fallbackStoreName?: string }).fallbackStoreName ||
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
          const kItems = await fetchKProducts(kSearchTerm, activeStores.kStoreId);
          kBest = pickBestKProduct(kItems, selectedName, selectedEan);
          if (kBest && !shouldKeepSearchingKOwnBrand(selectedName, kBest)) break;
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

      setSingleProductCompareResults(nextResults.sort((a, b) => a.price - b.price));
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
      setLocationMessage("Hae ensin alue tai käytä omaa sijaintia, jotta kaupat voidaan valita.");
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
          const sItems = await fetchSProducts(sSearchTerm, activeStores.sStoreId);
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
          const kItems = await fetchKProducts(kSearchTerm, activeStores.kStoreId);
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

      setSingleProductCompareResults(nextResults.sort((a, b) => a.price - b.price));
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
    const searchQueryForMode = searchCompareMode === "single" ? singleModeTerm : terms.join(", ");

    trackZiiplyEvent("main_search_clicked", {
      query: searchQueryForMode,
      searchType: searchCompareMode === "single" ? "single_product_compare" : "normal_prices",
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
      window.localStorage.setItem("ziiply-cart-v1", JSON.stringify({ version: 2, savedAt: Date.now(), items: [] }));
    } catch {}
    showCartToast("Ostoskori tyhjennetty");
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
        const gpsErrorCode = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
        if (gpsErrorCode === 1) {
          setGpsErrorMessage("GPS-paikannus estetty selaimen asetuksissa.");
        } else if (gpsErrorCode === 2) {
          setGpsErrorMessage("GPS-sijaintia ei saatu haettua.");
        } else if (gpsErrorCode === 3) {
          setGpsErrorMessage("GPS-paikannus aikakatkaistiin.");
        } else {
          setGpsErrorMessage("GPS-paikannus ei ole käytettävissä.");
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
        const gpsErrorCode = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
        if (gpsErrorCode === 1) {
          setGpsErrorMessage("GPS-paikannus estetty selaimen asetuksissa.");
        } else if (gpsErrorCode === 2) {
          setGpsErrorMessage("GPS-sijaintia ei saatu haettua.");
        } else if (gpsErrorCode === 3) {
          setGpsErrorMessage("GPS-paikannus aikakatkaistiin.");
        } else {
          setGpsErrorMessage("GPS-paikannus ei ole käytettävissä.");
        }
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
          : `${activeArea.label || "Alue"} käytössä. Valitse hakutapa: Tavaratalot tai Lähikaupat.`
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
    setLocationMessage("Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.");
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
    if (raw === "S" || raw.includes("S-RYHM") || raw.includes("SOK")) return "S";
    if (raw === "K" || raw.includes("K-RYHM") || raw.includes("KESKO")) return "K";

    const text = storeText(store);
    if (text.includes("prisma") || text.includes("s-market") || text.includes("smarket") || text.includes("alepa") || text.includes("sale")) return "S";
    if (text.includes("k-citymarket") || text.includes("kcitymarket") || text.includes("k-supermarket") || text.includes("ksupermarket") || text.includes("k-market") || text.includes("kmarket")) return "K";

    return null;
  }

  function normalizeStoreForPickerV320(store: StoreSearchItem): StoreSearchItem {
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
    const isLocalLike = isStrictLocal || (!isHyper && (text.includes("market") || text.includes("alepa") || text.includes("sale")));

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

  function sortStoresForPickerV320(stores: StoreSearchItem[], mode: StoreMode, selectedId?: number, selectedName?: string) {
    return uniqueStoresByIdAndName(stores.map(normalizeStoreForPickerV320))
      .sort((a, b) => {
        const aSelected = Boolean((selectedId && a.id === selectedId) || (selectedName && a.name === selectedName));
        const bSelected = Boolean((selectedId && b.id === selectedId) || (selectedName && b.name === selectedName));
        if (aSelected !== bSelected) return aSelected ? -1 : 1;

        const modeDiff = getStoreModeRankV320(a, mode) - getStoreModeRankV320(b, mode);
        if (modeDiff !== 0) return modeDiff;

        const cityA = normalize(a.city || "");
        const cityB = normalize(b.city || "");
        const area = normalize(activeArea.label || "");
        const aSameCity = area && cityA.includes(area);
        const bSameCity = area && cityB.includes(area);
        if (aSameCity !== bSameCity) return aSameCity ? -1 : 1;

        return normalize(a.name || "").localeCompare(normalize(b.name || ""), "fi");
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
    const localStores = chainStores.filter((store) => !isHyperStoreForModeV295(store));

    const scoped = mode === "hyper"
      ? (hyperStores.length > 0 ? hyperStores : chainStores)
      : (localStores.length > 0 ? localStores : chainStores);

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
      return [{
        id: fallbackId,
        name: fallbackName,
        type: chain,
        city: activeArea.label,
      } as StoreSearchItem];
    }

    return [];
  }

  function getSelectedStoreNameFor(chain: "S" | "K", mode: StoreMode) {
    if (chain === "S") return mode === "local" ? activeArea.sLocalStoreName : activeArea.sStoreName;
    return mode === "local" ? activeArea.kLocalStoreName : activeArea.kStoreName;
  }

  function getSelectedStoreIdFor(chain: "S" | "K", mode: StoreMode) {
    if (chain === "S") return mode === "local" ? activeArea.sLocalStoreId : activeArea.sStoreId;
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

  function readNestedNumberByKeysV320(source: unknown, keys: string[], maxDepth = 5): number | null {
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
    const lowerKeyMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));

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

    const wantsLatitude = keys.some((key) => ["latitude", "lat", "y"].includes(key));
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

  function calculateDistanceKmV320(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
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
    const km = readNestedNumberByKeysV320(store, [
      "distanceKm",
      "distance_km",
      "distanceKilometers",
      "distance_kilometers",
      "distanceInKm",
      "distance_in_km",
      "kilometers",
      "kilometres",
      "km",
    ], 5);

    if (km != null) return km;

    const meters = readNestedNumberByKeysV320(store, [
      "distanceMeters",
      "distance_m",
      "distance_meters",
      "distanceInMeters",
      "distance_in_meters",
      "meters",
      "metres",
      "m",
    ], 5);

    if (meters != null) return meters / 1000;

    const genericDistance = readNestedNumberByKeysV320(store, [
      "distance",
      "distanceText",
      "distance_text",
      "distanceLabel",
      "distance_label",
    ], 5);

    if (genericDistance == null) return null;
    return genericDistance > 100 ? genericDistance / 1000 : genericDistance;
  }

  function getStoreDistanceKeyV320(store?: StoreSearchItem | null) {
    if (!store) return "";
    return `${store.type || store.chain || ""}:${store.id || ""}:${normalize(store.name || "")}:${normalize(store.city || "")}:${store.postalCode || ""}`;
  }

  function getStoreDistanceLabelWithoutFallbackV320(store?: StoreSearchItem | null) {
    if (!store) return "";

    const explicitKm = readExplicitDistanceKmV320(store);
    if (explicitKm != null && Number.isFinite(explicitKm)) {
      return formatDistanceKmV320(explicitKm);
    }

    const latitude = getStoreCoordinateV320(store, ["latitude", "lat", "y"]);
    const longitude = getStoreCoordinateV320(store, ["longitude", "lng", "lon", "x"]);
    if (gpsCoordsV320 && latitude != null && longitude != null) {
      return formatDistanceKmV320(calculateDistanceKmV320(gpsCoordsV320, { latitude, longitude }));
    }

    return "";
  }

  function getStoreDistanceLabelV320(store?: StoreSearchItem | null) {
    const directLabel = getStoreDistanceLabelWithoutFallbackV320(store);
    if (directLabel) return directLabel;

    const fallbackKm = storeDistanceFallbacksV320[getStoreDistanceKeyV320(store)];
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
      .find((store) =>
        getStoreChainV320(store) === chain &&
        Boolean((selectedId && store.id === selectedId) || (selectedName && store.name === selectedName))
      );
  }

  function uniqueStoresByIdAndName(stores: StoreSearchItem[]) {
    const seen = new Set<string>();
    const result: StoreSearchItem[] = [];

    for (const store of stores) {
      const key = store.id ? `${store.type || store.chain || ""}:${store.id}` : `${store.type || store.chain || ""}:${normalize(store.name || "")}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(store);
    }

    return result;
  }

  function getStoresForWithinChainPicker(chain: "S" | "K", slotMode: StoreMode) {
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

    return sortStoresForPickerV320([...allChainStores, ...fallbackStores], slotMode, selectedId, selectedName)
      .filter((store) => {
        if (otherSelectedId && store.id === otherSelectedId) return false;
        if (otherSelectedName && store.name === otherSelectedName) return false;
        return true;
      });
  }

  function getStoresForPickerContext(chain: "S" | "K", mode: StoreMode) {
    if (storeCompareScope === "within_chain") return getStoresForWithinChainPicker(chain, mode);
    return getStoresForPicker(chain, mode);
  }

  function renderStorePickerMenu(chain: "S" | "K", mode: StoreMode, pickerKey: string, compact: boolean) {
    if (openStorePicker !== pickerKey) return null;

    const options = getStoresForPickerContext(chain, mode);
    const selectedName = getSelectedStoreNameFor(chain, mode);
    const selectedId = getSelectedStoreIdFor(chain, mode);

    const menuTitle = storeCompareScope === "within_chain"
      ? `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} kauppa`
      : mode === "local"
        ? `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} lähikauppa`
        : `Valitse ${chain === "S" ? "S-ryhmän" : "K-ryhmän"} tavaratalo`;

    const selectFromPicker = (
      event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>,
      store: StoreSearchItem
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
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="min-w-0 truncate text-[11px] font-black uppercase tracking-wide text-slate-500">{menuTitle}</p>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpenStorePicker(null);
            }}
            className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 active:scale-[0.98]"
          >
            Sulje
          </button>
        </div>

        <div className={`${compact ? "max-h-[30dvh]" : "max-h-56"} overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch] touch-pan-y`}>
          {options.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-3 font-bold text-slate-400">Ei kauppoja valittavana. Hae alue uudelleen.</p>
          ) : (
            options.map((store, index) => {
              const selected = Boolean((selectedId && store.id === selectedId) || (selectedName && store.name === selectedName));
              const distanceLabel = getStoreDistanceLabelV320(store);

              return (
                <button
                  key={`${pickerKey}-${store.type || chain}-${store.id || index}-${normalize(store.name || "")}`}
                  type="button"
                  onClick={(event) => selectFromPicker(event, store)}
                  className={`mb-1.5 flex w-full touch-manipulation items-center justify-between gap-1.5 rounded-xl px-2.5 py-2.5 text-left font-extrabold transition last:mb-0 active:scale-[0.99] ${
                    selected
                      ? chain === "S" ? "bg-green-700 text-white" : "bg-red-700 text-white"
                      : "bg-slate-50 text-slate-700 active:bg-slate-100"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-normal break-words text-[12.5px] leading-tight">{store.name}</span>
                    <span className={`mt-1 block text-[10.5px] leading-tight ${selected ? "text-white/80" : "text-slate-400"}`}>
                      {[store.city || activeArea.label || "", store.postalCode || "", distanceLabel].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {(selected || distanceLabel) && (
                    <span className={`shrink-0 rounded-full px-1.5 py-1 text-[9px] font-black ${selected ? "bg-white/20 text-white" : "bg-white text-slate-400"}`}>
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

    // Desktop: pidetään vanha, korttiin ankkuroitu absolute-sijoittelu.
    // Älä portaloi desktopia, koska se muutti valintaikkunoiden paikan vääräksi.
    if (!compact) {
      return (
        <div
          className="absolute left-1/2 top-full z-50 mt-2 max-h-64 w-[min(62vw,244px)] -translate-x-1/2 overflow-hidden rounded-2xl bg-white p-2 text-left text-sm shadow-2xl ring-1 ring-slate-200"
          style={{ minWidth: "206px", maxWidth: "244px" }}
          onClick={(event) => event.stopPropagation()}
        >
          {menuBody}
        </div>
      );
    }

    if (typeof document === "undefined") return null;

    const portalContent = (
      <div className="fixed inset-x-0 top-0 z-[2147483647] pointer-events-none">
        <div
          className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+20.25rem)] max-h-[38dvh] w-[min(calc(100vw-8.5rem),15.25rem)] -translate-x-1/2 overflow-hidden rounded-[1.35rem] bg-white p-2 text-left text-xs shadow-2xl ring-1 ring-slate-200 pointer-events-auto"
          style={{ minWidth: "206px", maxWidth: "244px" }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          {menuBody}
        </div>
      </div>
    );

    return createPortal(portalContent, document.body);
  }

  function renderStoreChoiceButton(chain: "S" | "K", mode: StoreMode, pickerKey: string, compact: boolean) {
    const options = storeCompareScope !== "within_chain" && !storeModeChosenV299 ? [] : getStoresForPickerContext(chain, mode);
    const hasMany = options.length > 1;

    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!hasMany) {
            setOpenStorePicker(null);
            return;
          }
          setOpenStorePicker((current) => current === pickerKey ? null : pickerKey);
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

  const selectedRealChainCount = Number(Boolean(selectedChains.s)) + Number(Boolean(selectedChains.k));
  function renderComparedStoreCards(compact = false) {
    if (storeCompareScope === "none" || (storeCompareScope === "between_chains" && !storeModeChosenV299)) {
      return (
        <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-extrabold text-amber-800 ring-1 ring-amber-200">
          Valitse ensin mistä kaupoista haetaan ja miten kauppoja vertaillaan.
        </div>
      );
    }

    if (storeCompareScope === "within_chain") {
      const chainCards = comparedStoreCards.filter((store) => store.key === "s" || store.key === "k");
      const selectedChainKey = withinChain === "S" ? "s" : withinChain === "K" ? "k" : null;

      return (
        <div className={compact ? "mt-2 grid grid-cols-2 gap-2" : "mt-3 grid grid-cols-2 gap-3"}>
          {chainCards.map((store) => {
            const selected = selectedChainKey === store.key;
            const chain = store.key === "s" ? "S" : "K";
            const modeA: StoreMode = "hyper";
            const modeB: StoreMode = "local";
            const storeNameA = getSelectedStoreNameFor(chain, modeA) || (chain === "S" ? "S-kauppa 1" : "K-kauppa 1");
            const storeNameB = getSelectedStoreNameFor(chain, modeB) || (chain === "S" ? "S-kauppa 2" : "K-kauppa 2");
            const selectedStoreA = findStoreForSelectionV320(chain, modeA);
            const selectedStoreB = findStoreForSelectionV320(chain, modeB);
            const distanceA = getStoreDistanceLabelV320(selectedStoreA);
            const distanceB = getStoreDistanceLabelV320(selectedStoreB);

            return (
              <div
                key={store.key}
                className={`${compact ? "min-h-[7.8rem] rounded-xl p-2" : "rounded-2xl p-3"} relative border shadow-sm ring-1 transition ${
                  selected ? `${store.selectedTone} ring-current/20` : "border-slate-200 bg-white text-slate-600 ring-slate-200"
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
                    setLocationMessage(`${store.title} valittu ketjun sisäiseen vertailuun. Valitse kaksi vertailtavaa kauppaa.`);
                  }}
                  className="w-full text-center"
                >
                  <span className={`absolute ${compact ? "right-2 top-2 h-5 w-5 text-[10px]" : "right-3 top-3 h-6 w-6 text-xs"} flex items-center justify-center rounded-full font-black ${
                    selected ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white" : "bg-slate-100 text-slate-300"
                  }`}>
                    {selected ? "✓" : ""}
                  </span>
                  <div className={`mx-auto flex ${compact ? "h-8 w-8 text-[13px]" : "h-10 w-10 text-sm"} items-center justify-center rounded-full font-black shadow-sm ring-4 ${store.tone}`}>
                    {store.logo}
                  </div>
                  <p className={compact ? "mt-1 text-[9px] font-black uppercase tracking-tight text-slate-500" : "mt-2 text-[10px] font-black uppercase tracking-wide text-slate-500"}>{store.title}</p>
                </button>

                {selected && (
                  <div className={compact ? "mt-1.5 grid grid-cols-2 gap-1.5" : "mt-2 grid grid-cols-2 gap-1.5"}>
                    <div className={compact ? "relative rounded-lg bg-white/90 px-1.5 py-1 text-center ring-1 ring-slate-200" : "relative rounded-xl bg-white/80 p-1.5 text-center ring-1 ring-slate-200"}>
                      <p className="text-[9px] font-black uppercase text-slate-400">Kauppa 1</p>
                      <p className={compact ? "min-h-[2.1rem] whitespace-normal break-words text-[9px] font-extrabold leading-tight text-slate-800" : "min-h-[2.7rem] whitespace-normal break-words text-[11px] font-extrabold leading-tight text-slate-800"}>{storeNameA}</p>
                      {distanceA && <p className="mt-0.5 text-[9px] font-black text-slate-400">{distanceA}</p>}
                      {renderStoreChoiceButton(chain, modeA, `${store.key}-within-hyper`, compact)}
                      {renderStorePickerMenu(chain, modeA, `${store.key}-within-hyper`, compact)}
                    </div>
                    <div className={compact ? "relative rounded-lg bg-white/90 px-1.5 py-1 text-center ring-1 ring-slate-200" : "relative rounded-xl bg-white/80 p-1.5 text-center ring-1 ring-slate-200"}>
                      <p className="text-[9px] font-black uppercase text-slate-400">Kauppa 2</p>
                      <p className={compact ? "min-h-[2.1rem] whitespace-normal break-words text-[9px] font-extrabold leading-tight text-slate-800" : "min-h-[2.7rem] whitespace-normal break-words text-[11px] font-extrabold leading-tight text-slate-800"}>{storeNameB}</p>
                      {distanceB && <p className="mt-0.5 text-[9px] font-black text-slate-400">{distanceB}</p>}
                      {renderStoreChoiceButton(chain, modeB, `${store.key}-within-local`, compact)}
                      {renderStorePickerMenu(chain, modeB, `${store.key}-within-local`, compact)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={compact ? "mt-0 grid grid-cols-2 gap-2.5 pb-2" : "mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4"}>
        {comparedStoreCards.map((store) => {
          const isRealChain = store.key === "s" || store.key === "k";
          const selected = selectedChains[store.key] || (storeCompareScope === "between_chains" && storeModeChosenV299 && isRealChain);
          const chain = store.key === "s" ? "S" : store.key === "k" ? "K" : null;
          const pickerKey = `${store.key}-${storeMode}`;
          const selectedStoreForCard = chain ? findStoreForSelectionV320(chain, storeMode) : null;
          const distanceForCard = getStoreDistanceLabelV320(selectedStoreForCard);
          const isComingSoon = Boolean(store.comingSoon);

          const cardTone =
            store.key === "s"
              ? selected
                ? "border-[#08A343] bg-[#EEF9F2] text-[#1F2B42] shadow-[0_5px_16px_rgba(8,163,67,0.16)]"
                : "border-slate-200 bg-white text-slate-500 opacity-70"
              : store.key === "k"
              ? selected
                ? "border-[#E3000F] bg-[#FFF1F1] text-[#1F2B42] shadow-[0_5px_16px_rgba(227,0,15,0.13)]"
                : "border-slate-200 bg-white text-slate-500 opacity-70"
              : "border-slate-200 bg-white text-slate-500 opacity-60";

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

          return (
            <div
              key={store.key}
              className={`relative flex flex-col items-center justify-start rounded-[1.45rem] border-2 px-2 pb-2.5 pt-3 text-center transition active:scale-[0.985] ${
                compact ? "min-h-[8.45rem]" : "min-h-[10.6rem]"
              } ${cardTone}`}
            >
              <button
                type="button"
                aria-pressed={selected}
                disabled={isComingSoon}
                onClick={() => {
                  if (store.comingSoon) return;
                  setSelectedChains((current) => ({
                    ...current,
                    [store.key]: !current[store.key],
                  }));
                  setOpenStorePicker(null);
                }}
                className="flex w-full flex-1 flex-col items-center text-center disabled:cursor-default"
              >
                <span
                  className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-base font-black shadow-[0_4px_10px_rgba(15,23,42,0.18)] ${
                    selected ? "bg-[#008C35] text-white" : "bg-slate-50 text-transparent"
                  }`}
                >
                  ✓
                </span>

                <div className={`flex ${compact ? "h-12 w-12 text-2xl ring-[7px]" : "h-16 w-16 text-3xl ring-[9px]"} items-center justify-center rounded-full font-black shadow-inner ${logoTone}`}>
                  {store.logo}
                </div>

                <p className={compact ? "mt-3 text-[10px] font-black uppercase tracking-wide text-slate-400" : "mt-4 text-[12px] font-black uppercase tracking-wide text-slate-400"}>
                  {cardLabel}
                </p>

                <p className={`mt-1.5 min-h-[1.95rem] max-w-full whitespace-normal break-words text-[13px] font-black leading-tight ${
                  isComingSoon ? "text-slate-500" : "text-slate-900"
                }`}>
                  {isComingSoon ? "Tulossa" : store.name}
                </p>

                {isRealChain && distanceForCard && (
                  <p className="mt-1.5 text-[11px] font-black text-slate-400">
                    {distanceForCard}
                  </p>
                )}

                {!isComingSoon && (
                  <span className="mt-2 inline-flex min-h-[1.55rem] items-center rounded-full border border-slate-200 bg-slate-50 px-3.5 text-[11px] font-black text-slate-400">
                    {selected ? "Valittu" : "Valitse"}
                  </span>
                )}
              </button>

              {!compact && isRealChain && chain && selected && (
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="relative mt-2 block"
                >
                  {renderStoreChoiceButton(chain, storeMode, pickerKey, compact)}
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
    <main className={`min-h-screen overflow-x-hidden bg-[#EAF4F1] px-2 pb-44 pt-0 text-slate-950 sm:bg-[radial-gradient(circle_at_top,#ecfdf3_0%,#f8fafc_42%,#f1f5f9_100%)] sm:px-4 sm:pb-32 sm:py-3 sm:py-4 md:pb-4 ${suppressUiForEanClose ? "pointer-events-none" : ""}`}>
      <style jsx global>{`
        html,
        body {
          background: #EAF4F1 !important;
        }

        #__next {
          background: #EAF4F1 !important;
          min-height: 100dvh;
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
        #ziiply-ean-scanner-region canvas,
        #ziiply-ean-scanner-region svg {
          display: none !important;
        }
      `}</style>
      {showLaunchScreen && <ZiiplyLaunchScreen appVersion={APP_VERSION} />}

      <div className="relative z-[80] m-0 p-0 mt-1 mb-0">
        <TopbarResponsiveCard
          areaLabel={activeArea.label}
          storeModeLabel={
            storeModeChosenV299
              ? storeMode === "hyper"
                ? "Tavaratalot"
                : "Lähikaupat"
              : ""
          }
          logoImageSrc="/ziiplylogo_mobile.png"
          infoItems={[
            { id: "weather", label: "SÄÄ", value: "+18°", emoji: "🌤️" },
            { id: "electricity", label: "SÄHKÖ", value: "4,2", emoji: "⚡" },
            { id: "fuel", label: "BENSA", value: "1,65", emoji: "⛽" },
            { id: "calendar", label: "KAL", value: "3", emoji: "📅" },
          ]}
          onOpenArea={() => {
            setSearchPanelOpen(false);
            setCartModalOpen(false);
            setCartSavePanelOpen(false);
            setEanModalOpen(false);
            setActiveResult("none");
            setShopsPanelOpen(true);
          }}
        />
      </div>

      {/* v325_MOBILE_INFO_STRIP_CONDITIONAL: näkyy vain ennen kauppa- ja vertailutapavalintaa. */}
      {!storesReadyForSearch && (
        <div className="mx-auto w-full max-w-6xl px-3 mt-0 mb-1 sm:hidden">
          <div className="w-full overflow-hidden whitespace-nowrap rounded-full border border-[#E6C96A] bg-[#F6F2DD] px-3 py-[3px] text-center text-[10px] font-bold leading-none text-[#9A5A00] shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
            Valitse kaupat ja vertailutapa.
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-3 sm:space-y-4 sm:space-y-6">
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

        {!searchPanelOpen && !cartModalOpen && !shopsPanelOpen && !eanModalOpen && activeResult === "none" && (
          <section className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center px-7 text-center">
            <img
              src="/ziiply.png"
              alt="Ziiply"
              className="h-auto w-full max-w-[280px] object-contain"
            />
            <p className="mt-5 max-w-[21rem] rounded-[1.35rem] border border-white/70 bg-white/82 px-4 py-3 text-[0.95rem] font-semibold leading-snug tracking-[-0.01em] text-slate-600 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
              Hae mitä tarvitset. Ziiply etsii siihen liittyvät tarjoukset ja auttaa vertaamaan ostoskorin hinnat.
            </p>
          </section>
        )}

        <section className="hidden rounded-[1.25rem] border border-slate-200 bg-white/95 p-2 shadow-sm sm:block sm:rounded-[1.75rem] sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-pressed={usingOwnLocation}
              onClick={() => {
                if (usingOwnLocation) {
                  stopOwnLocationV306("GPS pois päältä. Kirjoita alue tai postinumero.");
                  return;
                }
                setLocationInput("");
                useOwnLocation();
              }}
              title="Käytä omaa sijaintia"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-black shadow-sm ring-1 transition active:scale-[0.98] ${
                usingOwnLocation
                  ? "bg-green-50 text-green-600 ring-green-100"
                  : "bg-red-50 text-red-600 ring-red-100"
              }`}
            >
              📍
            </button>

            <input
              value={locationInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setLocationInput(nextValue);
                if (nextValue.trim()) { gpsUserDisabledRefV306.current = true; setUsingOwnLocation(false); }
                setLocationMessage("Kirjoita alue tai käytä omaa sijaintia.");
              }}
              placeholder="05510 tai Hyvinkää"
              className="min-w-0 flex-1 max-w-[280px] rounded-xl border border-slate-300 px-3 py-2 text-[16px] outline-none focus:border-green-600 sm:mx-auto sm:rounded-2xl sm:px-4 sm:py-3"
            />

            <button
              type="button"
              onClick={() => applyLocation()}
              disabled={storeSearchLoading}
              className="min-w-[76px] shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white transition disabled:cursor-not-allowed active:scale-[0.98] sm:min-w-[92px] sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
            >
              Käytä
            </button>
          </div>

          <div className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-900 sm:mt-3 sm:rounded-2xl sm:p-3 sm:text-sm">
            {locationMessage}
          </div>
              {gpsErrorMessage && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-extrabold text-red-700 shadow-sm">
                  {gpsErrorMessage}
                </div>
              )}


          {renderComparedStoreCards(false)}
        </section>



        <section className="hidden rounded-[2rem] bg-white p-5 shadow-sm sm:block">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Hakutapa</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={storeCompareScope === "within_chain"}
              onClick={() => handleStoreModeChange("hyper")}
              className={`rounded-2xl px-4 py-3 sm:py-3 text-base font-extrabold transition disabled:cursor-not-allowed ${
                (storeCompareScope === "within_chain" || (storeModeChosenV299 && storeMode === "hyper"))
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
              className={`rounded-2xl px-4 py-3 sm:py-3 text-base font-extrabold transition disabled:cursor-not-allowed ${
                (storeCompareScope === "within_chain" || (storeModeChosenV299 && storeMode === "local"))
                  ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              🏪 Lähikaupat
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleStoreCompareScopeChange("between_chains")}
              className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                (storeCompareScope === "between_chains")
                  ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              Ketjujen väliltä
            </button>
            <button
              type="button"
              onClick={() => handleStoreCompareScopeChange("within_chain")}
              className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                storeCompareScope === "within_chain"
                  ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              Ketjun sisältä
            </button>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200 empty:hidden">
                  {storeCompareScope === "between_chains" && selectedRealChainCount < 2 && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 font-black text-amber-800 ring-1 ring-amber-100">Vertailu ei ole mahdollinen vain yhdellä valitulla ketjulla.</p>
                  )}
                  {storeCompareScope === "within_chain" && !withinChain && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 font-black text-amber-800 ring-1 ring-amber-100">Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.</p>
                  )}

            {((storeMode === "local" && (!activeArea.sLocalStoreId || !activeArea.kLocalStoreId)) ||
              (storeMode === "hyper" && (!activeArea.sStoreId || !activeArea.kStoreId))) && foundStores.length === 0 && (
              <p className="mt-2 text-amber-700">
                Hae alue tai käytä omaa sijaintia, niin Ziiply hakee kaupat dynaamisesti.
              </p>
            )}
          </div>

          {false && foundStores.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-bold text-slate-700">Valitse kaupat ({foundStores.length})</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700">S-ryhmä</p>
                  <div className="max-h-44 space-y-2 overflow-auto pr-1">
                    {foundStores.filter((store) => {
                      if (store.type !== "S") return false;
                      if (storeCompareScope === "within_chain") return true;
                      if (!storeModeChosenV299) return true;
                      const storeNameForMode = normalize(store.name || "");
                      const isLocalStoreForMode = hasAnyToken(storeNameForMode, ["market", "alepa", "sale", "s-market", "s market"]);
                      return storeMode === "local" ? isLocalStoreForMode : !isLocalStoreForMode;
                    }).map((store) => {
                      const selected =
                        storeMode === "local"
                          ? activeArea.sLocalStoreId === store.id
                          : activeArea.sStoreId === store.id;

                      return (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => selectStoreForCurrentMode(store, storeMode)}
                          className={`w-full min-w-[min(86vw,360px)] rounded-xl px-4 py-3 text-left transition ${
                            selected
                              ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
                              : "bg-slate-50 text-slate-700 hover:bg-green-50"
                          }`}
                        >
                          <span className="block font-bold break-words">{store.name}</span>
                          <span className={`block text-xs ${selected ? "text-green-50" : "text-slate-400"}`}>
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
                    {foundStores.filter((store) => {
                      if (store.type !== "K") return false;
                      if (storeCompareScope === "within_chain") return true;
                      if (!storeModeChosenV299) return true;
                      const storeNameForMode = normalize(store.name || "");
                      const isLocalStoreForMode = hasAnyToken(storeNameForMode, ["market", "k-market", "k market", "k-supermarket", "k supermarket"]);
                      return storeMode === "local" ? isLocalStoreForMode : !isLocalStoreForMode;
                    }).map((store) => {
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
                          onClick={() => selectStoreForCurrentMode(store, storeMode)}
                          className={`w-full min-w-[min(86vw,360px)] rounded-xl px-4 py-3 text-left transition ${
                            selected
                              ? "bg-red-700 shadow-md ring-1 ring-black/10 text-white"
                              : "bg-slate-50 text-slate-700 hover:bg-red-50"
                          }`}
                        >
                          <span className="block whitespace-normal break-words font-bold leading-tight">{store.name}</span>
                          <span className={`block text-xs ${selected ? "text-red-50" : "text-slate-400"}`}>
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

        


        {shopsPanelOpen && (
          <div className={`fixed inset-0 z-40 flex items-end justify-center overflow-hidden overscroll-none bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.45rem)] pt-[calc(env(safe-area-inset-top)+5.0rem)] sm:hidden ${closingPanels.shops ? "ziiply-soft-close" : "ziiply-soft-open"}`}>
            <div className="h-[min(68dvh,630px)] w-full max-w-[28rem] overflow-visible overscroll-none rounded-[1.65rem] bg-white/90 p-2.5 shadow-2xl ring-1 ring-white/70 backdrop-blur-2xl">
              <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] bg-white/95 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
                <div className="mb-2 flex shrink-0 items-center gap-2">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-xl shadow-sm ring-1 ring-green-100">
                    🏪
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[1.05rem] bg-slate-50 p-1.5 ring-1 ring-slate-200">
                    <button
                      type="button"
                      aria-pressed={usingOwnLocation}
                      onClick={() => {
                        if (usingOwnLocation) {
                          stopOwnLocationV306("GPS pois päältä. Kirjoita alue tai postinumero.");
                          return;
                        }
                        setLocationInput("");
                        useOwnLocation();
                      }}
                      title="Käytä omaa sijaintia"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-black shadow-sm ring-1 transition active:scale-[0.98] ${
                        usingOwnLocation
                          ? "bg-green-50 text-green-600 ring-green-100"
                          : "bg-white text-slate-500 ring-slate-200"
                      }`}
                    >
                      📍
                    </button>

                    <input
                      value={locationInput}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setLocationInput(nextValue);
                        if (nextValue.trim()) { gpsUserDisabledRefV306.current = true; setUsingOwnLocation(false); }
                        setLocationMessage("Kirjoita alue tai käytä omaa sijaintia.");
                      }}
                      placeholder="05510 tai Hyvinkää"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[15px] font-semibold text-slate-800 outline-none focus:border-green-600"
                    />

                    <button
                      type="button"
                      onClick={() => applyLocation()}
                      disabled={storeSearchLoading}
                      className="min-w-[56px] shrink-0 rounded-xl bg-slate-900 px-2.5 py-2 text-xs font-black text-white shadow-sm transition disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      Käytä
                    </button>
                  </div>
                </div>

                {/* v325: sijaintibanneri poistettu tästä ikkunasta; sijainti näkyy jo yläpalkissa. */}

                {storeDrillViewV320 === "main" ? (
                  <div data-v320store2="fixed-one-hand-shop-actions" className="min-h-0 flex-1 space-y-1 overflow-hidden">
                    <button
                      type="button"
                      disabled={storeCompareScope === "within_chain"}
                      onClick={() => {
                        handleStoreModeChange("hyper");
                        if (storeCompareScope === "between_chains") setStoreDrillViewV320("selection");
                      }}
                      className={`flex min-h-[2.85rem] w-full items-center justify-between rounded-[1.05rem] px-3.5 text-left text-[15px] font-black shadow-sm ring-1 transition disabled:cursor-not-allowed active:scale-[0.985] ${
                        (storeCompareScope === "within_chain" || (storeModeChosenV299 && storeMode === "hyper"))
                          ? "bg-green-700 text-white ring-black/10"
                          : "bg-white text-slate-800 ring-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-3"><span className="text-xl">🏬</span> Tavaratalot</span>
                      <span className="text-xl opacity-70">›</span>
                    </button>

                    <button
                      type="button"
                      disabled={storeCompareScope === "within_chain"}
                      onClick={() => {
                        handleStoreModeChange("local");
                        if (storeCompareScope === "between_chains") setStoreDrillViewV320("selection");
                      }}
                      className={`flex min-h-[2.85rem] w-full items-center justify-between rounded-[1.05rem] px-3.5 text-left text-[15px] font-black shadow-sm ring-1 transition disabled:cursor-not-allowed active:scale-[0.985] ${
                        (storeCompareScope === "within_chain" || (storeModeChosenV299 && storeMode === "local"))
                          ? "bg-green-700 text-white ring-black/10"
                          : "bg-white text-slate-800 ring-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-3"><span className="text-xl">🏪</span> Lähikaupat</span>
                      <span className="text-xl opacity-70">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const canOpenStoreSelection = storeModeChosenV299;
                        handleStoreCompareScopeChange("between_chains");
                        if (canOpenStoreSelection) setStoreDrillViewV320("selection");
                      }}
                      className={`flex min-h-[2.85rem] w-full items-center justify-between rounded-[1.05rem] px-3.5 text-left text-[15px] font-black shadow-sm ring-1 transition active:scale-[0.985] ${
                        storeCompareScope === "between_chains"
                          ? "bg-green-700 text-white ring-black/10"
                          : "bg-white text-slate-800 ring-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-3"><span className="text-xl">⇄</span> Ketjujen väliltä</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleStoreCompareScopeChange("within_chain");
                        setStoreDrillViewV320("selection");
                      }}
                      className={`flex min-h-[2.85rem] w-full items-center justify-between rounded-[1.05rem] px-3.5 text-left text-[15px] font-black shadow-sm ring-1 transition active:scale-[0.985] ${
                        storeCompareScope === "within_chain"
                          ? "bg-green-700 text-white ring-black/10"
                          : "bg-white text-slate-800 ring-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-3"><span className="text-xl">🔗</span> Ketjun sisältä</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative min-h-0 flex-1 overflow-hidden ziiply-soft-open-fast">
                    <div className="pointer-events-none absolute left-0 right-0 top-[8.4rem] z-20 flex items-center justify-between gap-2 px-0">
                      <button
                        type="button"
                        onClick={() => {
                          setStoreDrillViewV320("main");
                          setOpenStorePicker(null);
                        }}
                        className="pointer-events-auto rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 active:scale-[0.98]"
                      >
                        ← Kaupat
                      </button>
                      <span className="pointer-events-auto truncate rounded-full bg-green-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-green-800 ring-1 ring-green-100">
                        {storeCompareScope === "within_chain" ? "Ketjun sisältä" : storeCompareScope === "between_chains" ? "Ketjujen väliltä" : "Valitse hakutapa"}
                      </span>
                    </div>

                    {!storeModeChosenV299 && storeCompareScope !== "within_chain" && (
                      <div className="mb-1.5 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleStoreModeChange("hyper")} className="rounded-2xl bg-white px-3 py-3 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 active:scale-[0.98]">🏬 Tavaratalot</button>
                        <button type="button" onClick={() => handleStoreModeChange("local")} className="rounded-2xl bg-white px-3 py-3 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 active:scale-[0.98]">🏪 Lähikaupat</button>
                      </div>
                    )}

                    {storeCompareScope === "none" && (
                      <div className="mb-1.5 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleStoreCompareScopeChange("between_chains")} className="rounded-2xl bg-white px-3 py-3 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 active:scale-[0.98]">⇄ Ketjujen väliltä</button>
                        <button type="button" onClick={() => handleStoreCompareScopeChange("within_chain")} className="rounded-2xl bg-white px-3 py-3 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 active:scale-[0.98]">🔗 Ketjun sisältä</button>
                      </div>
                    )}

                    <div className="min-h-0 overflow-hidden">
                      {renderComparedStoreCards(true)}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {activeResult === "offers" && (
          <div className={`fixed inset-0 z-40 flex items-end justify-center overflow-y-auto overscroll-contain bg-slate-950/35 px-3 pb-[calc(env(safe-area-inset-bottom)+5.8rem)] pt-[calc(env(safe-area-inset-top)+5.25rem)] sm:static sm:block sm:overflow-visible sm:bg-transparent sm:p-0 ${closingPanels.offers ? "ziiply-soft-close" : "ziiply-soft-open"}`}>
            <div ref={compareOverlayScrollRef} className="max-h-[calc(100dvh-11.7rem)] w-full max-w-[42rem] overflow-y-auto overscroll-contain overflow-x-visible rounded-[1.75rem] border border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur sm:max-h-none sm:max-w-none sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <div className="mb-3 rounded-2xl bg-green-700 p-4 text-white shadow-sm sm:rounded-[2rem] sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-green-100 sm:text-sm">Tarjousmoottori</p>
                <h2 className="mt-1 text-2xl font-extrabold sm:text-2xl sm:text-3xl">Tarjoukset</h2>
                <p className="mt-2 min-w-0 break-words text-sm font-bold text-green-100">
                  Hakusana: {offerSearchLabel}
                </p>
              </div>

              {loadingOffers ? (
                <section className="rounded-[1.5rem] bg-white p-6 text-center shadow-sm sm:rounded-[2rem]">
                  <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />
                  <p className="text-sm font-black text-slate-700">Haetaan tarjouksia...</p>
                </section>
              ) : hasSearchedOffers && filteredOffers.length === 0 ? (
                <section className="rounded-[1.5rem] bg-white p-6 text-center shadow-sm sm:rounded-[2rem]">
                  <p className="text-lg font-black text-slate-900">Ei tarjouksia: {offerSearchLabel}</p>
                </section>
              ) : hasSearchedOffers ? (
                <section className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-extrabold">Löytyneet tarjoukset</h2>
                      <p className="min-w-0 break-words text-xs font-semibold text-slate-500 sm:text-sm">{filteredOffers.length} tarjousta</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setChainFilter("all")} className={`rounded-full px-4 py-2 text-sm font-bold ${chainFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Kaikki</button>
                      <button onClick={() => setChainFilter("S")} className={`rounded-full px-4 py-2 text-sm font-bold ${chainFilter === "S" ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white" : "bg-slate-100 text-slate-600"}`}>S-ryhmä</button>
                      <button onClick={() => setChainFilter("K")} className={`rounded-full px-4 py-2 text-sm font-bold ${chainFilter === "K" ? "bg-red-700 shadow-md ring-1 ring-black/10 text-white" : "bg-slate-100 text-slate-600"}`}>K-ryhmä</button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredOffers.map((item) => (
                      <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex gap-3 sm:gap-4">
                          {item.offer.item.pictureUrl && <img src={item.offer.item.pictureUrl} alt={item.offer.item.name} className="h-20 w-24 shrink-0 rounded-2xl bg-slate-100 object-contain" />}
                          <div className="min-w-0 max-w-full flex-1 overflow-hidden">
                            <div className="mb-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-extrabold text-green-700">🔥 Tarjous</span>
                              <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.chain === "S" ? "bg-green-100 text-green-700" : "bg-red-100 text-green-700"}`}>{item.chain === "S" ? "S-ryhmä" : "K-ryhmä"}</span>
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
                              <p className="text-2xl sm:text-3xl font-extrabold text-green-700">{formatEuro(item.offer.storeItem?.price)}</p>
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
                </section>
              ) : (
                <section className="rounded-[1.5rem] bg-white p-6 text-center shadow-sm sm:rounded-[2rem]">
                  <p className="text-sm font-black text-slate-700">Aloita hakemalla tarjouksia.</p>
                </section>
              )}
            </div>
          </div>
        )}

        {(activeResult === "compare" || activeResult === "singleCompare" || (!searchPanelOpen && activeResult !== "offers" && (loadingNormal || normalResults.length > 0 || (normalSearchAttempted && activeNormalSearchTerm)))) && (
          <div
            className={`fixed inset-0 z-40 flex items-end justify-center overflow-y-auto overscroll-contain bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.45rem)] pt-[calc(env(safe-area-inset-top)+5.0rem)] sm:static sm:block sm:overflow-visible sm:bg-transparent sm:p-0 ${(closingPanels.compare || closingPanels.singleCompare) ? "ziiply-soft-close" : "ziiply-soft-open"}`}
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              if (activeResult !== "compare" && activeResult !== "singleCompare") {
                closeProductSelectionOverlay();
                setSearchPanelOpen(false);
              }
            }}
          >
            <div
              ref={compareOverlayScrollRef}
              onClick={(event) => event.stopPropagation()}
              className="h-[min(68dvh,630px)] w-full max-w-[28rem] overflow-y-auto overscroll-contain overflow-x-hidden rounded-[1.65rem] border border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur sm:min-h-0 sm:max-h-none sm:max-w-none sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
            >
            <div className="grid min-w-0 max-w-full gap-3 sm:gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {activeResult === "compare" && showCheapestSticky && cheapest && (
                <section ref={savingsSummaryRef} className="min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur sm:rounded-[2rem] sm:p-6">
                  <div className="rounded-[1.6rem] border border-green-100 bg-gradient-to-br from-white via-white to-green-50 p-4 text-left shadow-[0_18px_55px_rgba(16,185,129,0.14)]">
                    <div className="relative mx-auto max-w-sm overflow-hidden rounded-[1.5rem] border border-green-100 bg-white px-5 py-3 sm:py-5 shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[12px] font-extrabold uppercase tracking-wide text-green-700">
                          Halvin täysi kori
                        </p>
                        {secondCheapest && savings > 0 && (
                          <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xl font-black leading-none text-red-500">
                            −{savingsPercent.toFixed(1).replace(".", ",")}%
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 max-w-full break-words text-[2rem] font-black leading-[1.05] text-slate-900 sm:text-2xl sm:text-3xl">
                        {cheapest.storeName}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {cheapest.chain} · {cheapest.foundItems}/{cart.length} tuotetta löytyi
                      </p>

                      <p className="mt-5 text-6xl font-black leading-none tracking-tight text-green-700">
                        {formatEuro(cheapest.totalPrice)}
                      </p>

                      {secondCheapest && savings > 0 && (
                        <p className="mt-3 text-lg font-extrabold text-green-800">
                          Säästö {formatEuro(savings)}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={openShoppingListForCheapest}
                        className="mt-5 w-full rounded-[1.1rem] bg-green-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-green-600/20 transition active:scale-[0.98]"
                      >
                        Näytä ostoslista kauppaan
                      </button>

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
                  </div>
                </section>
              )}

              {activeResult === "singleCompare" && (
                <section className="min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur sm:rounded-[2rem] sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-extrabold">Yhden tuotteen hintavertailu</h2>
                      <p className="text-sm text-slate-500">
                        {singleProductCompareTerm ? `Haetaan: ${singleProductCompareTerm}` : "Valitse ensin tuote."}
                      </p>
                    </div>
                    {singleProductCompareLoading && (
                      <div className="rounded-full bg-green-50 px-3 py-2 text-sm font-black text-green-700 ring-1 ring-green-100">
                        Haetaan hintoja...
                      </div>
                    )}
                  </div>

                  {!singleProductCompareLoading && singleProductCompareResults.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                      Tuotteelle ei löytynyt vertailuhintoja valituista kaupoista.
                    </div>
                  )}

                  <div className="space-y-3">
                    {singleProductCompareResults.map((result, index) => {
                      const isCheapestSingle = index === 0 && singleProductCompareResults.length > 1;
                      return (
                        <div
                          key={`${result.key}-${result.productName}`}
                          className={`rounded-[1.35rem] border p-4 shadow-sm ${
                            isCheapestSingle ? "border-green-200 bg-green-50/90 shadow-green-100" : "border-slate-100 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {result.image && (
                              <img src={result.image} alt={result.productName} className="h-12 sm:h-14 w-16 shrink-0 rounded-xl bg-white object-contain" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${result.key === "s" ? "bg-green-100 text-green-700" : "bg-red-100 text-green-700"}`}>
                                  {result.chain}
                                </span>
                                {isCheapestSingle && (
                                  <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-black text-white">
                                    Halvin
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-1 line-clamp-2 text-base font-black text-slate-950">{result.productName}</h3>
                              <p className="mt-0.5 text-sm font-bold text-slate-500">{result.storeName}</p>
                              {result.ean && <p className="mt-0.5 text-xs text-slate-400">EAN: {result.ean}</p>}
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-2xl font-black text-green-700">{formatEuro(result.price)}</p>
                              {result.comparisonPrice && <p className="text-xs font-bold text-slate-500">{result.comparisonPrice}</p>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addSingleCompareResultToCart(result)}
                            className="mt-3 w-full rounded-xl bg-green-600 px-3 py-2 text-sm font-black text-white shadow-sm shadow-green-600/20 transition active:scale-[0.98]"
                          >
                            Lisää tämä koriin
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {activeResult !== "compare" && (loadingNormal || normalResults.length > 0 || (normalSearchAttempted && activeNormalSearchTerm)) && (
<section ref={normalResultsSectionRef} className="min-h-full min-w-0 max-w-full overflow-hidden rounded-[1.5rem] bg-white p-2.5 sm:min-h-0 sm:rounded-[2rem] sm:p-5">
                <div className="mb-2 flex items-start justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <h2 className="text-[1.7rem] font-black leading-tight text-slate-950">Valitse haluamasi tuote</h2>
                    <p className="mt-0.5 min-w-0 break-words text-sm font-extrabold text-slate-500">
                      {activeNormalSearchTerm ? `Haetaan: ${activeNormalSearchTerm}` : "Valitse listasta tarkka tuote."}
                    </p>
                    {visibleNormalResults.length > 0 && (
                      <p className="mt-0.5 text-xs font-bold text-slate-400">
                        {Math.min(visibleNormalCount, visibleNormalResults.length)} / {visibleNormalResults.length} osumaa
                      </p>
                    )}
                  </div>

                  {loadingNormal && (
                    <div className="shrink-0 rounded-full bg-green-50 px-3 py-2 text-xs font-black text-green-700 ring-1 ring-green-100">
                      Haetaan...
                    </div>
                  )}
                </div>

                {SHOW_SEARCH_DEBUG_PANEL && searchDebug.length > 0 && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <div className="mb-2 font-black text-slate-900">Hakudebug</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {searchDebug.map((row, index) => (
                        <div key={`${row.query}-${index}`} className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
                          <div className="font-extrabold text-slate-900">{row.term} → {row.query} · {row.storeName}</div>
                          <div>API {row.rawCount} · hinnallisia {row.pricedCount} · filtteri läpi {row.badFilterCount} · näytölle {row.finalCount}</div>
                          {(row.rejectedByPrice > 0 || row.rejectedByBadFilter > 0 || row.fallbackStoreName) && (
                            <div className="mt-1 text-slate-500">
                              {row.rejectedByPrice > 0 ? `Hinta puuttui: ${row.rejectedByPrice}. ` : ""}
                              {row.rejectedByBadFilter > 0 ? `Tuotefiltteri poisti: ${row.rejectedByBadFilter}. ` : ""}
                              {row.fallbackStoreName ? `Fallback: ${row.fallbackStoreName}.` : ""}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {loadingNormal ? (
                  <div className="grid gap-2">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-100" />
                          <div className="min-w-0 flex-1 space-y-2" style={{ width: "100%" }}>
                            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                            <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : visibleNormalResults.length === 0 ? (
                  <div className="rounded-[1.35rem] bg-slate-50 p-5 text-center shadow-sm ring-1 ring-slate-200">
                    <div className="text-3xl">🔎</div>
                    <p className="mt-2 text-base font-black text-slate-900">
                      {normalResults.length === 0 ? (normalSearchAttempted && activeNormalSearchTerm ? "Tuotteita ei löytynyt" : terms.length === 0 && cart.length > 0 ? "Ostoskori valmis" : "Ei hakutuloksia vielä") : "Kaikki näkyvät hakutulokset on jo lisätty ostoskoriin."}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {normalResults.length === 0 ? (normalSearchAttempted && activeNormalSearchTerm ? `Haulle “${activeNormalSearchTerm}” ei löytynyt tuotteita. Kokeile tarkempaa hakusanaa tai lisää tuote käsin.` : terms.length === 0 && cart.length > 0 ? "Voit siirtyä kauppaketjuvertailuun." : "Tee hintavertailuhaku tai hae tuotetta nimellä.") : "Voit jatkaa seuraavaan tuotteeseen."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid min-w-0 max-w-full gap-2 overflow-hidden">
                      {visibleNormalResults.slice(0, visibleNormalCount).map((product) => {
                        return (
                          <div key={product.id} className="w-full min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-sm transition active:scale-[0.995] hover:border-green-300 hover:bg-green-50/20 sm:p-3">
                            <div className="grid min-w-0 max-w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2.5 overflow-hidden sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100 sm:h-16 sm:w-16">
                                {product.pictureUrl ? <img src={product.pictureUrl} alt={product.name} className="h-12 w-12 object-contain sm:h-14 sm:w-14" /> : <span className="text-xl">🛒</span>}
                              </div>
                              <div className="min-w-0 max-w-full overflow-hidden">
                                <h3 className="line-clamp-2 max-w-full break-words text-[0.95rem] font-black leading-tight text-slate-950 sm:text-base">{fixText(product.name)}</h3>
                                <p className="mt-0.5 min-w-0 truncate text-xs font-extrabold text-slate-500 sm:text-sm">
                                  {(product as Product & { sourceStoreName?: string; fallbackStoreName?: string }).sourceStoreName ||
                                    (product as Product & { fallbackStoreName?: string }).fallbackStoreName ||
                                    activeStores.sStoreName}
                                </p>
                                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                  {formatComparisonPrice(product) && <span className="rounded-full bg-slate-100 px-2 py-0.5">{formatComparisonPrice(product)}</span>}
                                  {(product as Product & { originalSearchTerm?: string; usedSearchQuery?: string }).usedSearchQuery &&
                                    normalize((product as Product & { originalSearchTerm?: string; usedSearchQuery?: string }).usedSearchQuery || "") !==
                                      normalize((product as Product & { originalSearchTerm?: string; usedSearchQuery?: string }).originalSearchTerm || "") && (
                                    <span className="max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 font-extrabold text-blue-700">
                                      oletus: {(product as Product & { usedSearchQuery?: string }).usedSearchQuery}
                                    </span>
                                  )}
                                  {product.ean && <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-slate-400 sm:inline">EAN {product.ean}</span>}
                                  {(product as Product & { fallbackStoreName?: string }).fallbackStoreName && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">fallback</span>}
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-end justify-center gap-1.5">
                                <p className="whitespace-nowrap text-[1.45rem] font-black leading-none text-green-700 sm:text-2xl">{formatEuro(getProductPrice(product))}</p>
                                {renderPriceHistoryBadge(getPriceHistoryKeyFromProduct(product, (product as Product & { fallbackStoreName?: string }).fallbackStoreName || activeStores.sStoreName), getProductPrice(product))}
                                <button
                                  onClick={() => searchCompareMode === "single" ? void compareSelectedSingleProduct(product) : addProductToCart(product)}
                                  className="min-h-[2.55rem] touch-manipulation rounded-[1rem] bg-green-600 px-4 text-sm font-black text-white shadow-sm shadow-green-600/20 transition active:scale-[0.98] hover:bg-green-700"
                                >
                                  {searchCompareMode === "single" ? "Valitse" : "+ Lisää"}
                                </button>
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
                        className="mt-4 w-full rounded-2xl border border-green-200 bg-green-600 px-5 py-3 text-sm font-black text-white shadow-sm transition active:scale-[0.99] hover:bg-green-700"
                      >
                        Näytä lisää
                      </button>
                    )}
                  </>
                )}
              </section>
              )}

            {activeResult === "compare" && cart.length > 0 && !searchPanelOpen && (
                <section ref={comparisonSectionRef} className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
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
                        className={`flex min-w-0 max-w-full flex-col overflow-hidden rounded-[1.25rem] border p-3 shadow-sm sm:min-h-[22rem] sm:p-4 ${
                          chain.comingSoon
                            ? "border-slate-200 bg-slate-50 opacity-80"
                            : isCheapest
                            ? "border-green-300 bg-white shadow-md"
                            : isComplete
                            ? "border-slate-200 bg-white"
                            : "border-amber-200 bg-white"
                        }`}
                      >
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="min-w-0 break-words text-xs font-bold uppercase tracking-wide text-slate-500">{chain.chain}</p>
                              <h3 className="mt-0.5 line-clamp-2 max-w-full break-words text-lg font-black text-slate-950">{chain.storeName}</h3>
                            </div>

                            <div className="shrink-0 text-right">
                              {isCheapest && (
                                <div className="mb-1 inline-flex rounded-full bg-green-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                  Halvin kori
                                </div>
                              )}
                              {!isComplete && !chain.comingSoon && (
                                <div className="mb-1 inline-flex rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                  Vajaa kori
                                </div>
                              )}
                              {chain.comingSoon && (
                                <div className="mb-1 inline-flex rounded-full bg-slate-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                  Tulossa
                                </div>
                              )}
                              <p className="text-2xl font-black leading-none text-green-700">
                                {chain.comingSoon ? "—" : chain.totalPrice > 0 ? formatEuro(chain.totalPrice) : "—"}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-500">{chain.detail}</p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-600">
                          <span className="text-green-700">{chain.foundItems} löytyi</span>
                          <span className="text-slate-300">·</span>
                          <span className={chain.missingItems > 0 ? "text-green-700" : "text-slate-500"}>{chain.missingItems} puuttuu</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-yellow-700">{chain.offerCount} tarjousta</span>
                          {!chain.comingSoon && <span className="ml-auto text-[10px] uppercase tracking-wide text-green-700">oikea data</span>}
                        </div>

                        {chain.matches.length > 0 ? (
                          <div className="mt-3 max-w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-2.5">
                            <div className="mb-2">
                              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Tuotteet</p>
                            </div>
                            <div className="space-y-2" style={{ width: "100%" }}>
                              {chain.matches.map((match, index) => {
                                const isOwnBrandMatch =
                                  (chain.key === "k" && isKOwnBrandProduct(match.product.name)) ||
                                  (chain.key === "s" && hasAnyBrand(normalize(match.product.name), S_OWN_BRANDS));

                                return (
                                  <div key={`${chain.key}-${match.product.id}-${match.product.name}-${index}`} className="max-w-full overflow-hidden rounded-xl bg-slate-50 px-2.5 py-2 text-sm">
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
                                      className="mt-1.5 rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100 active:scale-[0.98]"
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
                                        <div className="max-h-[82vh] w-full max-w-xl overflow-y-auto rounded-t-[1.75rem] bg-slate-50 p-3 text-xs text-slate-600 shadow-2xl ring-1 ring-slate-200 sm:rounded-[1.75rem]" style={{ width: "100%" }}><div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0 flex-1 overflow-hidden">
                                            <p className="font-extrabold text-slate-700">Vaihtoehdot tuotteelle</p>
                                            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{fixText(match.product.name)}</p>
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
                                                    ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white"
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

                                        <div className="mt-2 space-y-2" style={{ width: "100%" }}>
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
                                      <p className="mt-1 truncate text-xs font-semibold text-amber-600">
                                        fallback: {match.fallbackStoreName}
                                      </p>
                                    )}
                                    {match.product.ean && (
                                      <p className="mt-0.5 truncate text-xs text-slate-400">EAN: {match.product.ean}</p>
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

                        <div className="mt-auto pt-3">
                          <div className="hidden">
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-xl bg-white text-center text-2xl font-black shadow-sm sm:h-12 sm:h-16 sm:w-16 ${
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

                              <p className="max-w-full break-words text-2xl sm:text-3xl font-extrabold leading-none text-green-700 sm:whitespace-normal sm:text-4xl">
                                {chain.comingSoon ? "—" : chain.totalPrice > 0 ? formatEuro(chain.totalPrice) : "—"}
                              </p>
                              {!chain.comingSoon && <p className="text-sm text-green-700">oikea data</p>}
                              {chain.comingSoon && <p className="text-sm font-bold text-green-700">Tulossa myöhemmin</p>}
                            </div>
                          </div>

                          {!chain.comingSoon && chain.matches.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => void shareShoppingList(chain)}
                                className="rounded-xl bg-green-600 px-3 py-2.5 text-xs font-extrabold text-white transition active:scale-[0.98]"
                              >
                                Jaa
                              </button>
                              <button
                                type="button"
                                onClick={() => void buyShoppingList(chain)}
                                className="rounded-xl bg-green-600 px-3 py-2.5 text-xs font-extrabold text-white transition active:scale-[0.98]"
                              >
                                Osta
                              </button>

                              <button
                                type="button"
                                disabled={!canOptimizeChain(chain) || optimizingChains[chain.key]}
                                onClick={() => void optimizeCart(chain)}
                                className={`col-span-1 rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
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
        <div className={`fixed inset-0 z-40 flex items-end justify-center overflow-y-auto overscroll-contain bg-slate-950/40 px-2 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-[calc(env(safe-area-inset-top)+5.25rem)] sm:items-start sm:p-6 ${closingPanels.cart ? "ziiply-soft-close" : "ziiply-soft-open"}`}>
          <div ref={cartOverlayScrollRef} className="max-h-[calc(100dvh-12.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain overflow-x-hidden rounded-[1.6rem] bg-gradient-to-br from-slate-950 via-emerald-950 to-green-800 p-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] sm:max-h-none sm:rounded-[2rem] sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">Ostoskori ({cart.length}/{MAX_ITEMS})</h2>
                <p className="text-sm text-green-100">Ostoskorin tuotteille voi hakea tarjoukset ja vertailla normaalihintoja.</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {cart.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={clearCartAndCloseModal}
                      className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                    >
                      🗑 Tyhjennä kori
                    </button>
                    {!cartSavePanelOpen && (
                      <button
                        type="button"
                        onClick={() => setCartSavePanelOpen(true)}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-900 transition active:scale-[0.98]"
                      >
                        Näytä/tallenna lista
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>



            {cart.length > 0 && cartSavePanelOpen && (
              <div className="mb-4 rounded-2xl bg-white/10 p-4 text-white">
                <p className="text-xs font-black uppercase tracking-wide text-green-200">Tallenna ostoslista</p>
                <p className="mt-1 text-sm font-semibold text-green-50">Tallenna nykyinen kori myöhempää käyttöä varten.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={savedListName}
                    onChange={(event) => setSavedListName(event.target.value)}
                    placeholder="Esim. Viikko-ostos"
                    className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-3 py-2 text-[16px] font-bold text-slate-900 outline-none focus:border-green-300"
                  />
                  <button
                    type="button"
                    onClick={saveCurrentCartAsList}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-900 transition active:scale-[0.98]"
                  >
                    Näytä/tallenna lista
                  </button>
                </div>
              </div>
            )}

            {cartSavePanelOpen && savedShoppingLists.length > 0 && (
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
                        <span className="block whitespace-normal break-words text-sm font-extrabold">{list.name}</span>
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

                <div className="mt-4 max-h-[46vh] space-y-3 sm:space-y-4 overflow-auto pr-1" style={{ width: "100%" }}>
                  {(Object.entries(bestShoppingListGroups) as [string, Match[]][]).map(([category, matches]) => (
                    <div key={category}>
                      <p className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-400"><span>{category}</span><span>{matches.filter((match, index) => checkedCartItems[getShoppingListItemKey(match, index)]).length}/{matches.length}</span></p>
                      <div className="space-y-2" style={{ width: "100%" }}>
                        {matches.map((match, index) => {
                          const key = getShoppingListItemKey(match, index);
                          const checked = Boolean(checkedCartItems[key]);

                          return (
                            <button
                              key={key}
                              ref={(element) => {
                                shoppingItemRefs.current[key] = element;
                              }}
                              data-shopping-key={key}
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
              <div className="grid gap-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-2xl bg-white p-3 text-slate-950 sm:p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 max-w-full items-center gap-2.5 overflow-hidden">
                      {item.image && <img src={item.image} alt={item.name} className="h-14 w-14 shrink-0 object-contain" />}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="line-clamp-2 break-words font-bold leading-tight">{item.name}</p>
                        <p className="min-w-0 break-words text-xs font-semibold text-slate-500 sm:text-sm">{item.storeName ? `${item.storeName} · ${item.chain}` : "Muistilistarivi · ei mukana hintavertailussa"}</p>
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
                      <button
                        type="button"
                        disabled
                        className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700 opacity-80"
                        title="Tuotekohtainen tarjoushaku rakennetaan myöhemmin"
                        aria-label="Tarjoukset tulossa"
                      >
                        🔥 Tarjoukset tulossa
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                        className="rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-green-700 transition active:scale-[0.98]"
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

      {restoredCartPromptV320.open && cart.length > 0 && !showLaunchScreen && (
        <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+10.5rem)] z-[70] mx-auto max-w-[34rem] ziiply-soft-open sm:top-5">
          <div className="rounded-[1.35rem] border border-green-100 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-xl ring-1 ring-green-100">🛒</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-950">Edellinen ostoskori palautettu</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{restoredCartPromptV320.count} tuotetta valmiina jatkamista varten.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoredCartPromptV320({ open: false, count: 0 })}
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
        <div className={`fixed inset-0 z-40 flex items-end justify-center overflow-hidden overscroll-none bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.45rem)] pt-[calc(env(safe-area-inset-top)+5.0rem)] sm:items-center sm:p-6 ${closingPanels.search ? "ziiply-soft-close" : "ziiply-soft-open"}`}>
          <div className="h-[min(68dvh,630px)] w-full max-w-[28rem] overflow-visible overscroll-none rounded-[1.65rem] bg-white/90 p-2.5 shadow-2xl ring-1 ring-white/70 backdrop-blur-2xl">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] ring-1 ring-slate-100 sm:rounded-[2rem] sm:p-4">
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-green-50 text-xl shadow-sm ring-1 ring-green-100">🔎</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black uppercase tracking-[0.32em] text-green-700">Haku</p>
                      <h1 className="mt-0.5 text-[1.14rem] font-black leading-[1.05] tracking-tight text-slate-950 sm:text-[1.42rem]">Mitä haluat ostaa?</h1>
                      <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-500">Kirjoita tuotteet ja valitse toiminto alta.</p>
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
                          searchCompareMode === "cart" ? "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10" : "bg-white text-slate-700 ring-1 ring-slate-200"
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
                            <circle cx="10" cy="20" r="1.55" fill="currentColor" stroke="none" />
                            <circle cx="17" cy="20" r="1.55" fill="currentColor" stroke="none" />
                          </svg>
                          <span className="block leading-none">Koko kori</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchCompareMode("single");
                          setInput((currentInput) => getSingleSearchTerm(currentInput));
                          setNormalResults([]);
                          setSingleProductCompareResults([]);
                          setSingleProductCompareTerm("");
                          setVisibleNormalCount(8);
                        }}
                        className={`min-h-[2.35rem] rounded-[0.9rem] px-3 py-1 text-sm font-black transition active:scale-[0.98] ${
                          searchCompareMode === "single" ? "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10" : "bg-white text-slate-700 ring-1 ring-slate-200"
                        }`}
                      >
                        🔎 Yksi tuote
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-1 shrink-0 rounded-[1.25rem] border border-green-100 bg-white p-2 shadow-inner shadow-green-50/60">
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Tuotteet</p>
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
                    onChange={(event) => setSearchInputForMode(event.target.value)}
                    placeholder={searchCompareMode === "single" ? "Kirjoita yksi tuote, esim. maito" : "Kirjoita tuotteet riveittäin tai pilkulla, esim. maito, kahvi, jauheliha"}
                    className={`${keyboardOpenV320 ? "h-[2.9rem]" : instantSearchSuggestions.length > 0 ? "h-[3.4rem]" : "h-[4.1rem]"} w-full resize-none rounded-[1.25rem] border-2 border-green-500/70 bg-white px-3.5 py-3 text-[16px] font-semibold leading-snug text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-4 focus:ring-green-100 sm:h-[5.2rem]`}
                  />
                  {instantSearchSuggestions.length > 0 && (
                    <div className="mt-1 flex h-8 w-full items-center gap-1.5 overflow-x-auto overflow-y-hidden px-1 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Hakuehdotukset">
                      <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400 ring-1 ring-slate-100">Ehdotukset</span>
                      {instantSearchSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.hint}-${suggestion.label}`}
                          type="button"
                          onPointerDown={(event) => event.preventDefault()}
                          onClick={() => applyInstantSearchSuggestion(suggestion.label)}
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
                      {searchCompareMode === "single" ? "Valitse tarkka tuote listasta ennen vertailua." : "Max 8 tuotetta. Liitä muistilistasta."}
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
                          window.setTimeout(() => searchInputRef.current?.focus(), 0);
                        }}
                        className="shrink-0 rounded-full bg-slate-700 px-3 py-1.5 text-xs font-black text-white shadow-sm ring-1 ring-slate-600 active:scale-[0.98]"
                      >
                        Tyhjennä
                      </button>
                    )}
                  </div>

                  {!loadingNormal && normalSearchAttempted && activeNormalSearchTerm && normalResults.length === 0 && (
                    <div className="mt-2 shrink-0 rounded-[1.35rem] bg-slate-50 p-4 text-center shadow-sm ring-1 ring-slate-200 ziiply-soft-open-fast">
                      <div className="text-3xl">🔎</div>
                      <p className="mt-2 text-base font-black text-slate-900">Tuotteita ei löytynyt</p>
                      <p className="mt-1 text-sm font-bold leading-snug text-slate-500">
                        Haulle “{activeNormalSearchTerm}” ei löytynyt tuotteita. Kokeile tarkempaa hakusanaa tai lisää tuote käsin.
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
                          disabled={!hasSearchInput || loadingNormal || singleProductCompareLoading}
                          aria-disabled={!hasSearchInput || loadingNormal || singleProductCompareLoading}
                          className={`min-h-[2.65rem] touch-manipulation rounded-[1rem] px-3 text-sm font-black transition ${
                            !hasSearchInput || loadingNormal || singleProductCompareLoading
                              ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                              : "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 active:scale-[0.98]"
                          }`}
                        >
                          {loadingNormal || singleProductCompareLoading ? "Haetaan..." : (
                            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">🔎<span>Vertailu</span></span>
                          )}
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => event.preventDefault()}
                          onClick={openEanModal}
                          className="flex min-h-[2.65rem] touch-manipulation items-center justify-center rounded-[1rem] bg-green-700 px-3 text-sm font-black text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 transition active:scale-[0.98]"
                        >
                          <span className="inline-flex h-full w-full items-center justify-center gap-2 whitespace-nowrap leading-none">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="block h-5 w-5 shrink-0 text-white" fill="currentColor">
                              <rect x="3" y="5" width="2" height="14" rx=".4" />
                              <rect x="7" y="5" width="1.2" height="14" rx=".35" />
                              <rect x="10" y="5" width="2.6" height="14" rx=".4" />
                              <rect x="15" y="5" width="1.2" height="14" rx=".35" />
                              <rect x="18.5" y="5" width="2.5" height="14" rx=".4" />
                            </svg>
                            <span className="block leading-none">EAN / SKANNAA</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`${keyboardOpenV320 ? "hidden" : ""} mt-1 shrink-0 rounded-[1.35rem] bg-white/95 p-2 shadow-[0_-8px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-100`}>
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
                      {loadingOffers ? "Haetaan..." : "🔥 Tarjoukset"}
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
                      disabled={!hasSearchInput || loadingNormal || singleProductCompareLoading}
                      aria-disabled={!hasSearchInput || loadingNormal || singleProductCompareLoading}
                      className={`min-h-[2.65rem] touch-manipulation rounded-[1rem] px-3 text-sm font-black transition ${
                        !hasSearchInput || loadingNormal || singleProductCompareLoading
                          ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                          : "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 active:scale-[0.98]"
                      }`}
                    >
                      {loadingNormal || singleProductCompareLoading ? "Haetaan..." : (
                        <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">🔎<span>Vertailu</span></span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={openEanModal}
                      className="flex min-h-[2.65rem] touch-manipulation items-center justify-center rounded-[1rem] bg-green-700 px-3 text-sm font-black text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 transition active:scale-[0.98]"
                    >
                      <span className="inline-flex h-full w-full items-center justify-center gap-2 whitespace-nowrap leading-none">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="block h-5 w-5 shrink-0 text-white" fill="currentColor">
                              <rect x="3" y="5" width="2" height="14" rx=".4" />
                              <rect x="7" y="5" width="1.2" height="14" rx=".35" />
                              <rect x="10" y="5" width="2.6" height="14" rx=".4" />
                              <rect x="15" y="5" width="1.2" height="14" rx=".35" />
                              <rect x="18.5" y="5" width="2.5" height="14" rx=".4" />
                            </svg>
                            <span className="block leading-none">EAN / SKANNAA</span>
                          </span>
                    </button>
                  </div>
                </div>              </div>
            </div>
          </div>
        </div>
      )}

      {eanModalOpen && (
          <div className={`fixed inset-0 z-[80] flex items-end justify-center overflow-hidden overscroll-none bg-slate-950/35 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+5.25rem)] transition-opacity duration-700 ease-out sm:items-center sm:p-4 ${eanModalClosing ? "ziiply-soft-close" : "ziiply-soft-open"}`}>
            <div className={`max-h-[calc(100dvh-7rem)] w-full max-w-[42rem] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur transition-all duration-700 ease-out [WebkitOverflowScrolling:touch] sm:max-h-[calc(100dvh-2rem)] sm:p-5 ${eanModalClosing ? "translate-y-3 scale-[0.98] opacity-0" : "translate-y-0 scale-100 opacity-100"}`}>
              <div className="flex items-center justify-center px-1">
                <p className="min-w-0 text-center text-lg font-black text-slate-950">EAN-skanneri</p>
              </div>

              {eanScannerMessage && !eanScannerOpen && (
                <div className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700 ziiply-soft-open-fast">
                  {eanScannerMessage}
                </div>
              )}

              {eanScannerOpen && (
                <div className="mt-3 rounded-2xl bg-white ziiply-soft-open">
                  <div
                    className="relative mx-auto aspect-[3/4] max-h-[calc(100dvh-21rem)] min-h-[20rem] w-full overflow-hidden rounded-[1.5rem] bg-slate-950 ring-1 ring-slate-200 sm:aspect-square sm:max-w-[430px]"
                    onPointerDown={(event) => void focusScannerCameraAtPoint(event)}
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
                )}
              </div>

                  <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-center text-xs font-black leading-snug text-slate-700 shadow-sm">
                    Aseta viivakoodi kehykseen. Napauta kuvaa tarkennusta varten.
                  </div>
                  <div className="sticky bottom-0 z-10 mt-3 grid grid-cols-4 gap-2 rounded-[1.35rem] border border-slate-200 bg-white/95 p-2 shadow-[0_-12px_35px_rgba(15,23,42,0.08)] backdrop-blur">
                    <button
                      type="button"
                      onClick={() => {
                        setEanManualInputOpen((open) => {
                          const nextOpen = !open;
                          if (nextOpen) {
                            window.setTimeout(() => eanInputRef.current?.focus(), 0);
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
                            setEanMessage("Leikepöydältä ei löytynyt kelvollista EAN-koodia.");
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
                          window.setTimeout(() => eanInputRef.current?.focus(), 0);
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
                <div ref={eanResultsRef} className="mt-4 grid gap-2 scroll-mt-4">
                  {eanResults.map((result) => (
                    <div key={result.key} className="rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-sm">
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

      {false && cheapest && !cartModalOpen && !searchPanelOpen && !shopsPanelOpen && !eanModalOpen && activeResult !== "compare" && !(loadingNormal || normalResults.length > 0) && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-3 right-3 z-40 mx-auto max-w-md rounded-[1.35rem] border border-white/10 bg-slate-950/92 p-3 text-white shadow-[0_18px_55px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:hidden">
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

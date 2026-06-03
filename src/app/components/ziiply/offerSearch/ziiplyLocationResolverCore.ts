export type ZiiplyLocationPermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported";
export type ZiiplyLocationSource = "gps" | "cache" | "manual" | "ip";

export type ZiiplyCoordinates = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt: number;
};

export type ZiiplyStoreChain = "S" | "K" | "LIDL" | "TOKMANNI" | "OTHER";
export type ZiiplyStoreKind = "hypermarket" | "supermarket" | "small_store" | "fuel" | "other";
export type ZiiplyStoreMode = "hyper" | "local" | "nearest";
export type ZiiplyAreaDensity = "urban" | "small_city" | "sparse";

export type ZiiplyGeoStore = {
  id: string | number;
  name: string;
  chain: ZiiplyStoreChain;
  kind: ZiiplyStoreKind;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string;
  city?: string;
  postalCode?: string;
  distanceKm?: number;
  openingHoursText?: string;
  isOpenNow?: boolean;
  hasOffers?: boolean;
  offerCount?: number;
};

export type ZiiplyResolvedNearbyStore = ZiiplyGeoStore & {
  distanceKm: number;
  distanceMeters: number;
  score: number;
  scoreReasons: string[];
};

export type ZiiplyStoreResolutionSettings = {
  preferredMode: ZiiplyStoreMode;
  maxNearbyDistanceKm: number;
  maxHyperDistanceKm: number;
  maxLocalDistanceKm: number;
  adaptiveRadiusEnabled: boolean;
  minimumSearchRadiusKm: number;
  urbanSearchRadiusKm: number;
  smallCitySearchRadiusKm: number;
  sparseSearchRadiusKm: number;
  sparseMinimumUsefulRadiusKm: number;
  minimumStoresForDenseArea: number;
  minimumStoresForSmallCity: number;
  preferOpenStores: boolean;
  preferStoresWithOffers: boolean;
  preferHypermarkets: boolean;
  preferLocalStores: boolean;
  chainPreference: ZiiplyStoreChain[];
  preferredStoreIds: Array<string | number>;
  blockedStoreIds: Array<string | number>;
  minimumLocationAccuracyMeters: number;
  cacheMaxAgeMs: number;
};

export type ZiiplyStoreResolutionResult = {
  location: ZiiplyCoordinates;
  nearestStores: ZiiplyResolvedNearbyStore[];
  nearestByChain: Partial<Record<ZiiplyStoreChain, ZiiplyResolvedNearbyStore>>;
  selectedSStore?: ZiiplyResolvedNearbyStore;
  selectedKStore?: ZiiplyResolvedNearbyStore;
  selectedPrimaryStore?: ZiiplyResolvedNearbyStore;
  selectedMode: ZiiplyStoreMode;
  warnings: string[];
};

export const ZIIPLY_LOCATION_STORAGE_KEY = "ziiply-location-cache-v1";

export const DEFAULT_ZIIPLY_STORE_RESOLUTION_SETTINGS: ZiiplyStoreResolutionSettings = {
  preferredMode: "nearest",
  maxNearbyDistanceKm: 15,
  maxHyperDistanceKm: 35,
  maxLocalDistanceKm: 8,
  adaptiveRadiusEnabled: true,
  minimumSearchRadiusKm: 0,
  urbanSearchRadiusKm: 3,
  smallCitySearchRadiusKm: 15,
  sparseSearchRadiusKm: 60,
  sparseMinimumUsefulRadiusKm: 20,
  minimumStoresForDenseArea: 4,
  minimumStoresForSmallCity: 2,
  preferOpenStores: true,
  preferStoresWithOffers: true,
  preferHypermarkets: false,
  preferLocalStores: true,
  chainPreference: ["S", "K", "LIDL", "TOKMANNI", "OTHER"],
  preferredStoreIds: [],
  blockedStoreIds: [],
  minimumLocationAccuracyMeters: 800,
  cacheMaxAgeMs: 1000 * 60 * 20,
};

function mergeStoreResolutionSettings(settings?: Partial<ZiiplyStoreResolutionSettings>): ZiiplyStoreResolutionSettings {
  return {
    ...DEFAULT_ZIIPLY_STORE_RESOLUTION_SETTINGS,
    ...settings,
    chainPreference: settings?.chainPreference || DEFAULT_ZIIPLY_STORE_RESOLUTION_SETTINGS.chainPreference,
    preferredStoreIds: settings?.preferredStoreIds || DEFAULT_ZIIPLY_STORE_RESOLUTION_SETTINGS.preferredStoreIds,
    blockedStoreIds: settings?.blockedStoreIds || DEFAULT_ZIIPLY_STORE_RESOLUTION_SETTINGS.blockedStoreIds,
  };
}

function toNumber(value: number | string | null | undefined) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getStoreCoordinates(store: ZiiplyGeoStore) {
  const latitude = toNumber(store.latitude);
  const longitude = toNumber(store.longitude);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceKm(
  from: Pick<ZiiplyCoordinates, "latitude" | "longitude">,
  to: Pick<ZiiplyCoordinates, "latitude" | "longitude">
) {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(to.latitude - from.latitude);
  const dLon = degreesToRadians(to.longitude - from.longitude);
  const lat1 = degreesToRadians(from.latitude);
  const lat2 = degreesToRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function formatZiiplyDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1).replace(".", ",")} km`;
}

export function detectZiiplyAreaDensity(options: {
  location: ZiiplyCoordinates;
  stores: ZiiplyGeoStore[];
  settings?: Partial<ZiiplyStoreResolutionSettings>;
}): ZiiplyAreaDensity {
  const settings = mergeStoreResolutionSettings(options.settings);

  const storesWithDistance = options.stores
    .map((store) => {
      const coordinates = getStoreCoordinates(store);
      if (!coordinates) return null;

      const distanceKm =
        store.distanceKm != null
          ? store.distanceKm
          : getDistanceKm(options.location, {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            });

      return { store, distanceKm };
    })
    .filter(Boolean) as Array<{ store: ZiiplyGeoStore; distanceKm: number }>;

  const withinUrbanRadius = storesWithDistance.filter(
    (entry) => entry.distanceKm <= settings.urbanSearchRadiusKm
  ).length;

  if (withinUrbanRadius >= settings.minimumStoresForDenseArea) return "urban";

  const withinSmallCityRadius = storesWithDistance.filter(
    (entry) => entry.distanceKm <= settings.smallCitySearchRadiusKm
  ).length;

  if (withinSmallCityRadius >= settings.minimumStoresForSmallCity) return "small_city";
  return "sparse";
}

export function getZiiplyAdaptiveSearchRadiusKm(options: {
  location: ZiiplyCoordinates;
  stores: ZiiplyGeoStore[];
  settings?: Partial<ZiiplyStoreResolutionSettings>;
  density?: ZiiplyAreaDensity;
}) {
  const settings = mergeStoreResolutionSettings(options.settings);

  if (!settings.adaptiveRadiusEnabled) {
    return {
      density: options.density || "small_city",
      radiusKm: settings.maxNearbyDistanceKm,
      minimumRadiusKm: settings.minimumSearchRadiusKm,
      expandedForSparseArea: false,
    };
  }

  const density =
    options.density ||
    detectZiiplyAreaDensity({
      location: options.location,
      stores: options.stores,
      settings,
    });

  if (density === "urban") {
    return {
      density,
      radiusKm: settings.urbanSearchRadiusKm,
      minimumRadiusKm: settings.minimumSearchRadiusKm,
      expandedForSparseArea: false,
    };
  }

  if (density === "small_city") {
    return {
      density,
      radiusKm: settings.smallCitySearchRadiusKm,
      minimumRadiusKm: settings.minimumSearchRadiusKm,
      expandedForSparseArea: false,
    };
  }

  return {
    density,
    radiusKm: settings.sparseSearchRadiusKm,
    minimumRadiusKm: settings.sparseMinimumUsefulRadiusKm,
    expandedForSparseArea: true,
  };
}

function getAdaptiveDistanceWarning(density: ZiiplyAreaDensity, radiusKm: number) {
  if (density === "urban") return "";
  if (density === "small_city") {
    return `Hakualuetta laajennettiin pikkukaupunkialueelle (${formatZiiplyDistance(radiusKm)}).`;
  }
  return `Hakualuetta laajennettiin harvan alueen vuoksi (${formatZiiplyDistance(radiusKm)}).`;
}

function getChainScore(chain: ZiiplyStoreChain, settings: ZiiplyStoreResolutionSettings) {
  const index = settings.chainPreference.indexOf(chain);
  if (index === -1) return 0;
  return Math.max(0, 18 - index * 3);
}

function getStoreKindScore(store: ZiiplyGeoStore, settings: ZiiplyStoreResolutionSettings, mode: ZiiplyStoreMode) {
  let score = 0;
  const isHyper = store.kind === "hypermarket";
  const isLocal = store.kind === "supermarket" || store.kind === "small_store";

  if (mode === "hyper" && isHyper) score += 38;
  if (mode === "local" && isLocal) score += 30;

  if (mode === "nearest") {
    if (settings.preferHypermarkets && isHyper) score += 16;
    if (settings.preferLocalStores && isLocal) score += 12;
  }

  return score;
}

function getDistanceScore(distanceKm: number, mode: ZiiplyStoreMode) {
  if (mode === "hyper") {
    if (distanceKm <= 3) return 40;
    if (distanceKm <= 8) return 32;
    if (distanceKm <= 15) return 22;
    if (distanceKm <= 35) return 8;
    return -30;
  }

  if (mode === "local") {
    if (distanceKm <= 0.5) return 55;
    if (distanceKm <= 1.5) return 45;
    if (distanceKm <= 3) return 32;
    if (distanceKm <= 8) return 8;
    return -35;
  }

  if (distanceKm <= 0.5) return 50;
  if (distanceKm <= 1.5) return 42;
  if (distanceKm <= 3) return 32;
  if (distanceKm <= 8) return 14;
  if (distanceKm <= 15) return 4;
  return -30;
}

function getMaxDistanceForMode(mode: ZiiplyStoreMode, settings: ZiiplyStoreResolutionSettings, adaptiveRadiusKm?: number) {
  if (mode === "hyper") return Math.max(settings.maxHyperDistanceKm, adaptiveRadiusKm || 0);
  if (mode === "local") return Math.min(settings.maxLocalDistanceKm, adaptiveRadiusKm || settings.maxLocalDistanceKm);
  return adaptiveRadiusKm || settings.maxNearbyDistanceKm;
}

export function scoreZiiplyStore(options: {
  store: ZiiplyGeoStore;
  location: ZiiplyCoordinates;
  settings?: Partial<ZiiplyStoreResolutionSettings>;
  mode?: ZiiplyStoreMode;
  adaptiveRadiusKm?: number;
  minimumRadiusKm?: number;
}): ZiiplyResolvedNearbyStore | null {
  const settings = mergeStoreResolutionSettings(options.settings);
  const mode = options.mode || settings.preferredMode;
  const coordinates = getStoreCoordinates(options.store);

  if (!coordinates) return null;

  const storeId = options.store.id;
  if (settings.blockedStoreIds.map(String).includes(String(storeId))) return null;

  const distanceKm =
    options.store.distanceKm != null
      ? options.store.distanceKm
      : getDistanceKm(options.location, {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });

  const maxDistance = getMaxDistanceForMode(mode, settings, options.adaptiveRadiusKm);
  const minimumDistance = options.minimumRadiusKm ?? 0;

  if (distanceKm < minimumDistance) return null;
  if (distanceKm > maxDistance) return null;

  const scoreReasons: string[] = [];
  let score = 0;

  const distanceScore = getDistanceScore(distanceKm, mode);
  score += distanceScore;
  scoreReasons.push(`distance:${distanceScore}`);

  const chainScore = getChainScore(options.store.chain, settings);
  score += chainScore;
  if (chainScore) scoreReasons.push(`chain:${chainScore}`);

  const kindScore = getStoreKindScore(options.store, settings, mode);
  score += kindScore;
  if (kindScore) scoreReasons.push(`kind:${kindScore}`);

  if (settings.preferOpenStores && options.store.isOpenNow === true) {
    score += 14;
    scoreReasons.push("open:+14");
  }

  if (settings.preferOpenStores && options.store.isOpenNow === false) {
    score -= 18;
    scoreReasons.push("closed:-18");
  }

  if (settings.preferStoresWithOffers && options.store.hasOffers) {
    const offerScore = Math.min(16, Math.max(4, options.store.offerCount || 4));
    score += offerScore;
    scoreReasons.push(`offers:+${offerScore}`);
  }

  if (settings.preferredStoreIds.map(String).includes(String(storeId))) {
    score += 18;
    scoreReasons.push("preferred:+18");
  }

  return {
    ...options.store,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    distanceKm,
    distanceMeters: Math.round(distanceKm * 1000),
    score,
    scoreReasons,
  };
}

export function resolveZiiplyNearbyStores(options: {
  location: ZiiplyCoordinates;
  stores: ZiiplyGeoStore[];
  settings?: Partial<ZiiplyStoreResolutionSettings>;
  mode?: ZiiplyStoreMode;
  maxResults?: number;
}) {
  const settings = mergeStoreResolutionSettings(options.settings);
  const mode = options.mode || settings.preferredMode;
  const maxResults = options.maxResults ?? 12;
  const adaptiveRadius = getZiiplyAdaptiveSearchRadiusKm({
    location: options.location,
    stores: options.stores,
    settings,
  });

  return options.stores
    .map((store) =>
      scoreZiiplyStore({
        store,
        location: options.location,
        settings,
        mode,
        adaptiveRadiusKm: adaptiveRadius.radiusKm,
        minimumRadiusKm: mode === "nearest" ? 0 : adaptiveRadius.minimumRadiusKm,
      })
    )
    .filter(Boolean)
    .sort((a, b) => {
      const storeA = a as ZiiplyResolvedNearbyStore;
      const storeB = b as ZiiplyResolvedNearbyStore;
      if (storeB.score !== storeA.score) return storeB.score - storeA.score;
      return storeA.distanceKm - storeB.distanceKm;
    })
    .slice(0, maxResults) as ZiiplyResolvedNearbyStore[];
}

export function resolveZiiplyStoresByChain(stores: ZiiplyResolvedNearbyStore[]) {
  const result: Partial<Record<ZiiplyStoreChain, ZiiplyResolvedNearbyStore>> = {};
  for (const store of stores) {
    if (!result[store.chain]) result[store.chain] = store;
  }
  return result;
}

export function resolveZiiplyStoreSelection(options: {
  location: ZiiplyCoordinates;
  stores: ZiiplyGeoStore[];
  settings?: Partial<ZiiplyStoreResolutionSettings>;
  mode?: ZiiplyStoreMode;
}): ZiiplyStoreResolutionResult {
  const settings = mergeStoreResolutionSettings(options.settings);
  const selectedMode = options.mode || settings.preferredMode;
  const warnings: string[] = [];

  if (options.location.accuracyMeters != null && options.location.accuracyMeters > settings.minimumLocationAccuracyMeters) {
    warnings.push("Sijainnin tarkkuus on heikko. Lähikauppavalinta voi olla epätarkka.");
  }

  const adaptiveRadius = getZiiplyAdaptiveSearchRadiusKm({
    location: options.location,
    stores: options.stores,
    settings,
  });

  const adaptiveWarning = getAdaptiveDistanceWarning(adaptiveRadius.density, adaptiveRadius.radiusKm);
  if (adaptiveWarning) warnings.push(adaptiveWarning);

  const nearestStores = resolveZiiplyNearbyStores({
    location: options.location,
    stores: options.stores,
    settings,
    mode: selectedMode,
  });

  if (nearestStores.length === 0) warnings.push("Lähikauppoja ei löytynyt nykyisellä säteellä.");

  const nearestByChain = resolveZiiplyStoresByChain(nearestStores);
  const selectedSStore = nearestByChain.S;
  const selectedKStore = nearestByChain.K;

  const selectedPrimaryStore =
    nearestStores.find((store) => settings.preferredStoreIds.map(String).includes(String(store.id))) ||
    selectedSStore ||
    selectedKStore ||
    nearestStores[0];

  return {
    location: options.location,
    nearestStores,
    nearestByChain,
    selectedSStore,
    selectedKStore,
    selectedPrimaryStore,
    selectedMode,
    warnings,
  };
}

export function getZiiplyLocationPermissionState(): Promise<ZiiplyLocationPermissionState> {
  if (typeof navigator === "undefined") return Promise.resolve("unsupported");
  if (!("geolocation" in navigator)) return Promise.resolve("unsupported");

  const permissions = (navigator as any).permissions;
  if (!permissions?.query) return Promise.resolve("unknown");

  return permissions
    .query({ name: "geolocation" })
    .then((result: any) => {
      if (result.state === "granted") return "granted";
      if (result.state === "prompt") return "prompt";
      if (result.state === "denied") return "denied";
      return "unknown";
    })
    .catch(() => "unknown");
}

export function requestZiiplyCurrentLocation(options?: {
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
}): Promise<ZiiplyCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: Date.now(),
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeoutMs ?? 9000,
        maximumAge: options?.maximumAgeMs ?? 1000 * 60 * 10,
      }
    );
  });
}

export function isZiiplyCachedLocationFresh(
  location: ZiiplyCoordinates | null | undefined,
  settings?: Partial<ZiiplyStoreResolutionSettings>,
  now = Date.now()
) {
  if (!location) return false;

  const merged = mergeStoreResolutionSettings(settings);
  if (now - location.capturedAt > merged.cacheMaxAgeMs) return false;

  if (location.accuracyMeters != null && location.accuracyMeters > merged.minimumLocationAccuracyMeters) {
    return false;
  }

  return true;
}

export function readZiiplyCachedLocation(): ZiiplyCoordinates | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ZIIPLY_LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ZiiplyCoordinates;
    if (!Number.isFinite(parsed.latitude) || !Number.isFinite(parsed.longitude)) return null;
    if (!Number.isFinite(parsed.capturedAt)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function writeZiiplyCachedLocation(location: ZiiplyCoordinates) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ZIIPLY_LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Cache is best-effort.
  }
}

export function clearZiiplyCachedLocation() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ZIIPLY_LOCATION_STORAGE_KEY);
  } catch {
    // Cache is best-effort.
  }
}

export async function getZiiplyBestKnownLocation(options?: {
  settings?: Partial<ZiiplyStoreResolutionSettings>;
  forceRefresh?: boolean;
  enableHighAccuracy?: boolean;
}) {
  const cached = readZiiplyCachedLocation();

  if (!options?.forceRefresh && isZiiplyCachedLocationFresh(cached, options?.settings)) {
    return {
      location: cached as ZiiplyCoordinates,
      source: "cache" as const,
    };
  }

  const location = await requestZiiplyCurrentLocation({
    enableHighAccuracy: options?.enableHighAccuracy ?? false,
  });

  writeZiiplyCachedLocation(location);

  return {
    location,
    source: "gps" as const,
  };
}

export function buildZiiplyNearbyStoreNotificationPayloads(options: {
  resolution: ZiiplyStoreResolutionResult;
  maxDistanceKm?: number;
  maxItems?: number;
}) {
  const maxDistanceKm = options.maxDistanceKm ?? 1.5;
  const maxItems = options.maxItems ?? 2;

  return options.resolution.nearestStores
    .filter((store) => store.distanceKm <= maxDistanceKm)
    .slice(0, maxItems)
    .map((store) => ({
      id: String(store.id),
      name: store.name,
      chain: store.chain,
      kind:
        store.kind === "hypermarket" || store.kind === "supermarket"
          ? "market"
          : store.kind === "small_store"
            ? "small_store"
            : store.kind === "fuel"
              ? "fuel"
              : "other",
      distanceKm: store.distanceKm,
      city: store.city,
      address: store.address,
      isPreferred: options.resolution.selectedPrimaryStore?.id === store.id,
    }));
}

export function getZiiplyStoreSelectionSummary(result: ZiiplyStoreResolutionResult) {
  const parts: string[] = [];

  if (result.selectedSStore) {
    parts.push(`S: ${result.selectedSStore.name} (${formatZiiplyDistance(result.selectedSStore.distanceKm)})`);
  }

  if (result.selectedKStore) {
    parts.push(`K: ${result.selectedKStore.name} (${formatZiiplyDistance(result.selectedKStore.distanceKm)})`);
  }

  if (parts.length === 0) return "Lähikauppoja ei löytynyt.";
  return parts.join(" · ");
}


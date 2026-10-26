// V1_ZIIPLY_STORE_SELECTION_CORE_PAGE_INDEPENDENT
// Single source of truth for GPS store selection.
// - Page must not decide S/K local or hyper stores with activeArea/AREAS/reverse fallbacks.
// - Hypermarkets are selected only from real API/foundStores candidates.
// - Local stores are selected from real API/foundStores candidates first; if a chain is missing,
//   nearest AREAS local candidate may fill only that missing local chain.
// - No municipality/postal-code/reverse-geocode lock, no stale activeArea, no Kokkola/Espoo far fallback.

export type ZiiplySelectionMode = "local" | "hyper" | string;

export type ZiiplySelectionCoords = {
  latitude: number;
  longitude: number;
};

export type ZiiplySelectedStore = {
  id: string | number;
  name: string;
  chain: "S" | "K";
  level: "local" | "hyper";
  distanceKm?: number;
  source: "api" | "area";
};

export type ZiiplyStoreSelectionResult = {
  sLocal?: ZiiplySelectedStore;
  kLocal?: ZiiplySelectedStore;
  sHyper?: ZiiplySelectedStore;
  kHyper?: ZiiplySelectedStore;
  selectedS?: ZiiplySelectedStore;
  selectedK?: ZiiplySelectedStore;
  debug: {
    apiLocalCount: number;
    apiHyperCount: number;
    areaLocalCount: number;
  };
};

type AnyRecord = Record<string, any>;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").replace(/[^0-9.\-]/g, "").trim();
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function pickNumber(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = toFiniteNumber(record?.[key]);
    if (value != null) return value;
  }
  return null;
}

function readLatitude(record: AnyRecord) {
  return (
    pickNumber(record, ["latitude", "lat", "y", "storeLatitude", "store_latitude"]) ??
    pickNumber(record?.coordinates || {}, ["latitude", "lat", "y"])
  );
}

function readLongitude(record: AnyRecord) {
  return (
    pickNumber(record, ["longitude", "lng", "lon", "x", "storeLongitude", "store_longitude"]) ??
    pickNumber(record?.coordinates || {}, ["longitude", "lng", "lon", "x"])
  );
}

function readDistanceKm(record: AnyRecord) {
  const km = pickNumber(record, ["distanceKm", "distance_km", "distance"]);
  if (km != null) return km;
  const meters = pickNumber(record, ["distanceMeters", "distance_meters"]);
  return meters == null ? null : meters / 1000;
}

function distanceKm(from: ZiiplySelectionCoords, to: ZiiplySelectionCoords) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectChain(store: AnyRecord): "S" | "K" | "OTHER" {
  const text = normalizeText(
    `${store?.type || ""} ${store?.chain || ""} ${store?.chainId || ""} ${store?.brand || ""} ${store?.banner || ""} ${store?.name || ""}`,
  );

  if (
    /(^| )s($| )/.test(text) ||
    text.includes("s ryhma") ||
    text.includes("sok") ||
    text.includes("prisma") ||
    text.includes("s market") ||
    text.includes("sale") ||
    text.includes("alepa")
  ) {
    return "S";
  }

  if (
    /(^| )k($| )/.test(text) ||
    text.includes("kesko") ||
    text.includes("k ryhma") ||
    text.includes("citymarket") ||
    text.includes("k supermarket") ||
    text.includes("k market")
  ) {
    return "K";
  }

  return "OTHER";
}

function isExcluded(store: AnyRecord) {
  const text = normalizeText(`${store?.name || ""} ${store?.kind || ""} ${store?.typeLabel || ""}`);
  return text.includes("abc") || text.includes("liikenneasema") || text.includes("huoltoasema");
}

function detectLevel(store: AnyRecord): "local" | "hyper" | "other" {
  const text = normalizeText(`${store?.name || ""} ${store?.kind || ""} ${store?.typeLabel || ""}`);
  if (text.includes("prisma") || text.includes("citymarket")) return "hyper";
  if (
    text.includes("s market") ||
    text.includes("sale") ||
    text.includes("alepa") ||
    text.includes("k supermarket") ||
    text.includes("k super") ||
    text.includes("k market")
  ) {
    return "local";
  }
  return "other";
}

function storeIdentity(store: AnyRecord) {
  return String(store?.id ?? `${normalizeText(store?.name)}:${normalizeText(store?.city)}`);
}

function normalizeApiCandidate(store: AnyRecord, coords: ZiiplySelectionCoords): ZiiplySelectedStore | null {
  if (!store || isExcluded(store)) return null;
  const chain = detectChain(store);
  if (chain !== "S" && chain !== "K") return null;
  const level = detectLevel(store);
  if (level !== "local" && level !== "hyper") return null;

  const lat = readLatitude(store);
  const lon = readLongitude(store);
  const explicit = readDistanceKm(store);
  const calculated = lat != null && lon != null ? distanceKm(coords, { latitude: lat, longitude: lon }) : null;
  const finalDistance = calculated ?? explicit ?? null;
  if (finalDistance == null || !Number.isFinite(finalDistance)) return null;

  const name = String(store?.name || "").trim();
  if (!name) return null;

  return {
    id: store?.id ?? storeIdentity(store),
    name,
    chain,
    level,
    distanceKm: finalDistance,
    source: "api",
  };
}

function buildAreaLocalCandidates(areas: AnyRecord[], coords: ZiiplySelectionCoords): ZiiplySelectedStore[] {
  const result: ZiiplySelectedStore[] = [];

  areas.forEach((area, index) => {
    const lat = readLatitude(area);
    const lon = readLongitude(area);
    if (lat == null || lon == null) return;

    const baseDistance = distanceKm(coords, { latitude: lat, longitude: lon });
    const areaLabel = String(area?.label || area?.city || "").trim();

    if (area?.sLocalStoreName) {
      result.push({
        id: area?.sLocalStoreId ?? -(20000 + index * 10 + 1),
        name: String(area.sLocalStoreName),
        chain: "S",
        level: "local",
        distanceKm: baseDistance,
        source: "area",
      });
    }

    if (area?.kLocalStoreName) {
      result.push({
        id: area?.kLocalStoreId ?? -(20000 + index * 10 + 2),
        name: String(area.kLocalStoreName),
        chain: "K",
        level: "local",
        distanceKm: baseDistance,
        source: "area",
      });
    }
  });

  return result;
}

function uniqueByChainLevelName(candidates: ZiiplySelectedStore[]) {
  const seen = new Set<string>();
  const result: ZiiplySelectedStore[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.chain}:${candidate.level}:${normalizeText(candidate.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function nearest(
  candidates: ZiiplySelectedStore[],
  chain: "S" | "K",
  level: "local" | "hyper",
  maxDistanceKm: number,
) {
  return candidates
    .filter(
      (candidate) =>
        candidate.chain === chain &&
        candidate.level === level &&
        candidate.distanceKm != null &&
        candidate.distanceKm <= maxDistanceKm,
    )
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))[0];
}

export function resolveZiiplyPageStoreSelection(options: {
  stores: AnyRecord[];
  areas?: AnyRecord[];
  coords: ZiiplySelectionCoords | null | undefined;
  mode: ZiiplySelectionMode;
  maxLocalDistanceKm?: number;
  maxHyperDistanceKm?: number;
  maxAreaLocalDistanceKm?: number;
}): ZiiplyStoreSelectionResult {
  const coords = options.coords;
  const mode = options.mode === "local" ? "local" : "hyper";

  if (!coords) {
    return { debug: { apiLocalCount: 0, apiHyperCount: 0, areaLocalCount: 0 } };
  }

  const maxLocalDistanceKm = options.maxLocalDistanceKm ?? 35;
  const maxHyperDistanceKm = options.maxHyperDistanceKm ?? 90;
  const maxAreaLocalDistanceKm = options.maxAreaLocalDistanceKm ?? 35;

  const apiCandidates = uniqueByChainLevelName(
    (options.stores || [])
      .map((store) => normalizeApiCandidate(store, coords))
      .filter(Boolean) as ZiiplySelectedStore[],
  );

  const apiLocalCandidates = apiCandidates.filter((candidate) => candidate.level === "local");
  const apiHyperCandidates = apiCandidates.filter((candidate) => candidate.level === "hyper");

  const areaLocalCandidates = uniqueByChainLevelName(
    buildAreaLocalCandidates(options.areas || [], coords).filter(
      (candidate) => (candidate.distanceKm ?? 9999) <= maxAreaLocalDistanceKm,
    ),
  );

  const sHyper = nearest(apiHyperCandidates, "S", "hyper", maxHyperDistanceKm);
  const kHyper = nearest(apiHyperCandidates, "K", "hyper", maxHyperDistanceKm);

  const sApiLocal = nearest(apiLocalCandidates, "S", "local", maxLocalDistanceKm);
  const kApiLocal = nearest(apiLocalCandidates, "K", "local", maxLocalDistanceKm);

  const sLocal = sApiLocal ?? nearest(areaLocalCandidates, "S", "local", maxAreaLocalDistanceKm);
  const kLocal = kApiLocal ?? nearest(areaLocalCandidates, "K", "local", maxAreaLocalDistanceKm);

  return {
    sLocal,
    kLocal,
    sHyper,
    kHyper,
    selectedS: mode === "local" ? sLocal : sHyper,
    selectedK: mode === "local" ? kLocal : kHyper,
    debug: {
      apiLocalCount: apiLocalCandidates.length,
      apiHyperCount: apiHyperCandidates.length,
      areaLocalCount: areaLocalCandidates.length,
    },
  };
}

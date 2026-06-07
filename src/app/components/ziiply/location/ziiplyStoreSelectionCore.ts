// V1_STORE_SELECTION_CORE_SINGLE_SOURCE_OF_TRUTH
// Tarkoitus:
// - Kauppavalinta pois page.tsx:stä.
// - Ei kunta-/postinumero-/reverse-geocode-/activeArea-/AREAS-fallbackia.
// - Valinta tehdään vain annetuista oikeista kaupoista distanceKm:n tai koordinaattietäisyyden perusteella.
// - Puuttuvaa lähikauppaa ei paikata tavaratalolla eikä päinvastoin.
// - Puuttuvaa S/K-ketjua ei paikata toisella ketjulla.

export type ZiiplyStoreSelectionMode = "hyper" | "local";
export type ZiiplyStoreSelectionChain = "S" | "K";

export type ZiiplyStoreSelectionCoords = {
  latitude: number;
  longitude: number;
};

export type ZiiplyStoreSelectionResult<TStore> = {
  sHyper?: TStore;
  kHyper?: TStore;
  sLocal?: TStore;
  kLocal?: TStore;
  selectedS?: TStore;
  selectedK?: TStore;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .replace(/\s+/g, " ")
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

function getByKeys(store: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = store[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return undefined;
}

export function ziiplySelectionDistanceKm(
  from: ZiiplyStoreSelectionCoords,
  to: ZiiplyStoreSelectionCoords,
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

export function getZiiplySelectionStoreName(store: Record<string, unknown>) {
  return String(getByKeys(store, ["name", "storeName", "store_name", "title"]) ?? "").trim();
}

export function getZiiplySelectionChain(store: Record<string, unknown>): ZiiplyStoreSelectionChain | "OTHER" {
  const name = normalizeText(getZiiplySelectionStoreName(store));
  const raw = normalizeText(
    `${store.type ?? ""} ${store.chain ?? ""} ${store.chainId ?? ""} ${store.chain_id ?? ""} ${store.brand ?? ""} ${store.banner ?? ""}`,
  );

  if (
    raw === "s" ||
    raw.includes("sok") ||
    raw.includes("s ryh") ||
    name.includes("prisma") ||
    name.includes("s market") ||
    name.includes("s-market") ||
    name.includes("sale") ||
    name.includes("alepa")
  ) {
    return "S";
  }

  if (
    raw === "k" ||
    raw.includes("kesko") ||
    raw.includes("k ryh") ||
    name.includes("k citymarket") ||
    name.includes("k-citymarket") ||
    name.includes("citymarket") ||
    name.includes("k supermarket") ||
    name.includes("k-supermarket") ||
    name.includes("k market") ||
    name.includes("k-market")
  ) {
    return "K";
  }

  return "OTHER";
}

export function isZiiplySelectionExcludedStore(store: Record<string, unknown>) {
  const text = normalizeText(
    `${getZiiplySelectionStoreName(store)} ${store.brand ?? ""} ${store.banner ?? ""} ${store.kind ?? ""} ${store.typeLabel ?? ""}`,
  );
  return (
    text.includes("abc") ||
    text.includes("liikenneasema") ||
    text.includes("huoltoasema") ||
    text.includes("neste") ||
    text.includes("shell") ||
    text.includes("seo") ||
    text.includes("teboil")
  );
}

export function isZiiplySelectionHyper(store: Record<string, unknown>) {
  const name = normalizeText(getZiiplySelectionStoreName(store));
  const text = normalizeText(`${name} ${store.kind ?? ""} ${store.typeLabel ?? ""}`);
  return text.includes("prisma") || text.includes("citymarket");
}

export function isZiiplySelectionLocal(store: Record<string, unknown>) {
  const name = normalizeText(getZiiplySelectionStoreName(store));
  const text = normalizeText(`${name} ${store.kind ?? ""} ${store.typeLabel ?? ""}`);
  return (
    text.includes("s market") ||
    text.includes("s-market") ||
    text.includes("sale") ||
    text.includes("alepa") ||
    text.includes("k supermarket") ||
    text.includes("k-supermarket") ||
    text.includes("k market") ||
    text.includes("k-market")
  );
}

export function getZiiplySelectionStoreCoords(store: Record<string, unknown>): ZiiplyStoreSelectionCoords | null {
  const latitude = toFiniteNumber(
    getByKeys(store, ["latitude", "lat", "y", "storeLatitude", "store_latitude"]),
  );
  const longitude = toFiniteNumber(
    getByKeys(store, ["longitude", "lng", "lon", "x", "storeLongitude", "store_longitude"]),
  );
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

export function getZiiplySelectionExplicitDistanceKm(store: Record<string, unknown>) {
  const direct = toFiniteNumber(getByKeys(store, ["distanceKm", "distance_km"]));
  if (direct != null) return direct;

  const meters = toFiniteNumber(getByKeys(store, ["distanceMeters", "distance_meters"]));
  if (meters != null) return meters / 1000;

  return toFiniteNumber(getByKeys(store, ["distance"]));
}

export function getZiiplySelectionStoreDistanceKm(
  store: Record<string, unknown>,
  coords?: ZiiplyStoreSelectionCoords | null,
) {
  const ownCoords = getZiiplySelectionStoreCoords(store);
  if (coords && ownCoords) return ziiplySelectionDistanceKm(coords, ownCoords);

  const explicit = getZiiplySelectionExplicitDistanceKm(store);
  return explicit != null && Number.isFinite(explicit) ? explicit : null;
}

export function selectZiiplyStoresByDistance<TStore extends Record<string, unknown>>(options: {
  stores: TStore[];
  coords?: ZiiplyStoreSelectionCoords | null;
  mode: ZiiplyStoreSelectionMode;
  maxLocalDistanceKm?: number;
  maxHyperDistanceKm?: number;
}): ZiiplyStoreSelectionResult<TStore> {
  const maxLocalDistanceKm = options.maxLocalDistanceKm ?? 35;
  const maxHyperDistanceKm = options.maxHyperDistanceKm ?? 80;

  const candidates = options.stores
    .filter((store) => getZiiplySelectionChain(store) === "S" || getZiiplySelectionChain(store) === "K")
    .filter((store) => !isZiiplySelectionExcludedStore(store))
    .map((store) => {
      const chain = getZiiplySelectionChain(store);
      const distanceKm = getZiiplySelectionStoreDistanceKm(store, options.coords);
      return { store, chain, distanceKm };
    })
    .filter((entry) => entry.distanceKm != null && Number.isFinite(entry.distanceKm as number)) as Array<{
      store: TStore;
      chain: ZiiplyStoreSelectionChain;
      distanceKm: number;
    }>;

  const pickNearest = (chain: ZiiplyStoreSelectionChain, mode: ZiiplyStoreSelectionMode) => {
    const maxDistanceKm = mode === "local" ? maxLocalDistanceKm : maxHyperDistanceKm;
    const predicate = mode === "local" ? isZiiplySelectionLocal : isZiiplySelectionHyper;

    return candidates
      .filter((entry) => entry.chain === chain)
      .filter((entry) => predicate(entry.store))
      .filter((entry) => entry.distanceKm <= maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)[0]?.store;
  };

  const sHyper = pickNearest("S", "hyper");
  const kHyper = pickNearest("K", "hyper");
  const sLocal = pickNearest("S", "local");
  const kLocal = pickNearest("K", "local");

  return {
    sHyper,
    kHyper,
    sLocal,
    kLocal,
    selectedS: options.mode === "local" ? sLocal : sHyper,
    selectedK: options.mode === "local" ? kLocal : kHyper,
  };
}

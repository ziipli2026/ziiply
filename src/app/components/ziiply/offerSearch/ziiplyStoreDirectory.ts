export type ZiiplyStoreDirectoryChain = "S" | "K" | "LIDL" | "TOKMANNI" | "OTHER";

export type ZiiplyStoreDirectoryKind =
  | "hypermarket"
  | "supermarket"
  | "small_store"
  | "fuel"
  | "other";

export type ZiiplyStoreDirectoryEntry = {
  id: string;
  name: string;
  chain: ZiiplyStoreDirectoryChain;
  kind: ZiiplyStoreDirectoryKind;
  latitude: number;
  longitude: number;
  distanceKm: number;
  city?: string;
  postalCode?: string;
  address?: string;
};

export type ZiiplyStoreDirectorySelection = {
  nearestStores: ZiiplyStoreDirectoryEntry[];
  selectedSLocal?: ZiiplyStoreDirectoryEntry;
  selectedKLocal?: ZiiplyStoreDirectoryEntry;
  selectedSHyper?: ZiiplyStoreDirectoryEntry;
  selectedKHyper?: ZiiplyStoreDirectoryEntry;
};

/**
 * Tänne voi myöhemmin lisätä käsin varmistettuja kauppoja.
 * Älä lisää kunta- tai postinumero-fallbackeja.
 */
export const ZIIPLY_STORE_DIRECTORY: ZiiplyStoreDirectoryEntry[] = [];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").trim();
    if (!cleaned) return null;

    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function pickFirstNumber(store: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toFiniteNumber(store[key]);
    if (value != null) return value;
  }

  return null;
}

function pickFirstString(store: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = store[key];
    if (value == null) continue;

    const stringValue = String(value).trim();
    if (stringValue) return stringValue;
  }

  return "";
}

export function normalizeZiiplyStoreDirectoryId(id: unknown) {
  return String(id ?? "").trim();
}

export function getZiiplyDirectoryDistanceKm(
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
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectChain(name: string, rawChain?: string): ZiiplyStoreDirectoryChain {
  const lower = name.toLowerCase();
  const chain = String(rawChain || "").toUpperCase();

  if (
    chain === "S" ||
    chain.includes("SOK") ||
    chain.includes("S-RYHM") ||
    lower.includes("prisma") ||
    lower.includes("s-market") ||
    lower.includes("sale") ||
    lower.includes("alepa")
  ) {
    return "S";
  }

  if (
    chain === "K" ||
    chain.includes("KESKO") ||
    chain.includes("K-RYHM") ||
    lower.includes("k-citymarket") ||
    lower.includes("citymarket") ||
    lower.includes("k-supermarket") ||
    lower.includes("k-market")
  ) {
    return "K";
  }

  if (chain.includes("LIDL") || lower.includes("lidl")) return "LIDL";
  if (chain.includes("TOKMANNI") || lower.includes("tokmanni")) return "TOKMANNI";

  return "OTHER";
}

function detectKind(name: string): ZiiplyStoreDirectoryKind {
  const lower = name.toLowerCase();

  if (lower.includes("prisma") || lower.includes("citymarket")) {
    return "hypermarket";
  }

  if (lower.includes("s-market") || lower.includes("k-supermarket")) {
    return "supermarket";
  }

  if (
    lower.includes("sale") ||
    lower.includes("alepa") ||
    lower.includes("k-market")
  ) {
    return "small_store";
  }

  if (
    lower.includes("abc") ||
    lower.includes("neste") ||
    lower.includes("shell") ||
    lower.includes("seo")
  ) {
    return "fuel";
  }

  return "other";
}

export function isZiiplyDirectoryHyperStore(
  store: Pick<ZiiplyStoreDirectoryEntry, "kind" | "name">,
) {
  const lower = store.name.toLowerCase();

  return (
    store.kind === "hypermarket" ||
    lower.includes("prisma") ||
    lower.includes("citymarket")
  );
}

export function isZiiplyDirectoryLocalStore(
  store: Pick<ZiiplyStoreDirectoryEntry, "kind" | "name">,
) {
  const lower = store.name.toLowerCase();

  return (
    store.kind === "supermarket" ||
    store.kind === "small_store" ||
    lower.includes("s-market") ||
    lower.includes("sale") ||
    lower.includes("alepa") ||
    lower.includes("k-supermarket") ||
    lower.includes("k-market")
  );
}

export function normalizeApiStoresToZiiplyDirectory(
  stores: Array<Record<string, unknown>> = [],
  options?: { latitude?: number; longitude?: number },
): ZiiplyStoreDirectoryEntry[] {
  const userLatitude = toFiniteNumber(options?.latitude);
  const userLongitude = toFiniteNumber(options?.longitude);

  return stores
    .map((store) => {
      const id = normalizeZiiplyStoreDirectoryId(
        store.id ??
          store.storeId ??
          store.store_id ??
          store.locationId ??
          store.location_id,
      );

      const name = pickFirstString(store, [
        "name",
        "storeName",
        "store_name",
        "title",
      ]);

      if (!id || !name) return null;

      const latitude = pickFirstNumber(store, [
        "latitude",
        "lat",
        "y",
        "storeLatitude",
        "store_latitude",
      ]);

      const longitude = pickFirstNumber(store, [
        "longitude",
        "lng",
        "lon",
        "x",
        "storeLongitude",
        "store_longitude",
      ]);

      const explicitDistanceKm =
        pickFirstNumber(store, ["distanceKm", "distance_km"]) ??
        (() => {
          const meters = pickFirstNumber(store, [
            "distanceMeters",
            "distance_meters",
          ]);
          return meters == null ? null : meters / 1000;
        })() ??
        pickFirstNumber(store, ["distance"]);

      const hasCoordinates = latitude != null && longitude != null;
      const hasDistance =
        explicitDistanceKm != null && Number.isFinite(explicitDistanceKm);

      if (!hasCoordinates && !hasDistance) return null;

      const finalLatitude = hasCoordinates
        ? latitude
        : userLatitude != null
          ? userLatitude
          : 0;

      const finalLongitude = hasCoordinates
        ? longitude
        : userLongitude != null
          ? userLongitude
          : 0;

      let distanceKm = hasDistance ? explicitDistanceKm : 0;

      if (
        !hasDistance &&
        userLatitude != null &&
        userLongitude != null &&
        hasCoordinates
      ) {
        distanceKm = getZiiplyDirectoryDistanceKm(
          { latitude: userLatitude, longitude: userLongitude },
          { latitude: latitude as number, longitude: longitude as number },
        );
      }

      const rawChain = pickFirstString(store, [
        "chain",
        "chainId",
        "chain_id",
        "type",
      ]);

      return {
        id,
        name,
        chain: detectChain(name, rawChain),
        kind: detectKind(name),
        latitude: finalLatitude as number,
        longitude: finalLongitude as number,
        distanceKm,
        city: pickFirstString(store, ["city", "municipality"]) || undefined,
        postalCode:
          pickFirstString(store, ["postalCode", "postal_code", "zip"]) ||
          undefined,
        address:
          pickFirstString(store, [
            "address",
            "streetAddress",
            "street_address",
          ]) || undefined,
      };
    })
    .filter(Boolean) as ZiiplyStoreDirectoryEntry[];
}

export function mergeZiiplyStoreDirectories(
  ...directories: ZiiplyStoreDirectoryEntry[][]
): ZiiplyStoreDirectoryEntry[] {
  const byId = new Map<string, ZiiplyStoreDirectoryEntry>();

  for (const directory of directories) {
    for (const store of directory) {
      const id = normalizeZiiplyStoreDirectoryId(store.id);
      if (!id) continue;

      const existing = byId.get(id);

      if (!existing || store.distanceKm < existing.distanceKm) {
        byId.set(id, { ...store, id });
      }
    }
  }

  return Array.from(byId.values());
}

export function resolveZiiplyStoresFromDirectory(options?: {
  latitude: number;
  longitude: number;
  stores?: ZiiplyStoreDirectoryEntry[];
  maxDistanceKm?: number;
}): ZiiplyStoreDirectorySelection {
  const maxDistanceKm = options?.maxDistanceKm ?? 60;
  const latitude = toFiniteNumber(options?.latitude);
  const longitude = toFiniteNumber(options?.longitude);

  const stores = (options?.stores ?? ZIIPLY_STORE_DIRECTORY)
    .map((store) => {
      let distanceKm = toFiniteNumber(store.distanceKm);

      if (
        (distanceKm == null || !Number.isFinite(distanceKm)) &&
        latitude != null &&
        longitude != null &&
        Number.isFinite(store.latitude) &&
        Number.isFinite(store.longitude)
      ) {
        distanceKm = getZiiplyDirectoryDistanceKm(
          { latitude, longitude },
          { latitude: store.latitude, longitude: store.longitude },
        );
      }

      if (distanceKm == null || !Number.isFinite(distanceKm)) return null;

      return {
        ...store,
        distanceKm,
      };
    })
    .filter(Boolean) as ZiiplyStoreDirectoryEntry[];

  const nearestStores = stores
    .filter((store) => store.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const localStores = nearestStores.filter(isZiiplyDirectoryLocalStore);
  const hyperStores = nearestStores.filter(isZiiplyDirectoryHyperStore);

  return {
    nearestStores,
    selectedSLocal: localStores.find((store) => store.chain === "S"),
    selectedKLocal: localStores.find((store) => store.chain === "K"),
    selectedSHyper: hyperStores.find((store) => store.chain === "S"),
    selectedKHyper: hyperStores.find((store) => store.chain === "K"),
  };
}

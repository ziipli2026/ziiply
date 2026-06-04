export type ZiiplyStoreDirectoryEntry = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
};

export type ZiiplyStoreDirectorySelection = {
  nearestStores: ZiiplyStoreDirectoryEntry[];
  selectedSLocal?: ZiiplyStoreDirectoryEntry;
  selectedKLocal?: ZiiplyStoreDirectoryEntry;
  selectedSHyper?: ZiiplyStoreDirectoryEntry;
  selectedKHyper?: ZiiplyStoreDirectoryEntry;
};

export const ZIIPLY_STORE_DIRECTORY: ZiiplyStoreDirectoryEntry[] = [];

export function normalizeApiStoresToZiiplyDirectory(
  stores: unknown[] = [],
): ZiiplyStoreDirectoryEntry[] {
  void stores;
  return [];
}

export function resolveZiiplyStoresFromDirectory(
  options?: {
    latitude: number;
    longitude: number;
    stores?: ZiiplyStoreDirectoryEntry[];
    maxDistanceKm?: number;
  },
): ZiiplyStoreDirectorySelection {
  void options;

  return {
    nearestStores: [],
    selectedSLocal: undefined,
    selectedKLocal: undefined,
    selectedSHyper: undefined,
    selectedKHyper: undefined,
  };
}

export function mergeZiiplyStoreDirectories(
  ...directories: ZiiplyStoreDirectoryEntry[][]
): ZiiplyStoreDirectoryEntry[] {
  const byId = new Map<string, ZiiplyStoreDirectoryEntry>();

  for (const directory of directories) {
    for (const store of directory) {
      byId.set(store.id, store);
    }
  }

  return Array.from(byId.values());
}

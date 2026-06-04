export type ZiiplyStoreDirectoryEntry = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const ZIIPLY_STORE_DIRECTORY: ZiiplyStoreDirectoryEntry[] = [];

export function normalizeApiStoresToZiiplyDirectory(
  stores: unknown[] = [],
): ZiiplyStoreDirectoryEntry[] {
  return [];
}

export function resolveZiiplyStoresFromDirectory(options?: {
  latitude: number;
  longitude: number;
  stores?: ZiiplyStoreDirectoryEntry[];
  maxDistanceKm?: number;
}) {
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

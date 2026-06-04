export type ZiiplyStoreDirectoryEntry = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const ZIIPLY_STORE_DIRECTORY: ZiiplyStoreDirectoryEntry[] = [];

export function normalizeApiStoresToZiiplyDirectory() {
  return [];
}

export function resolveZiiplyStoresFromDirectory() {
  return {
    nearestStores: [],
    selectedSLocal: undefined,
    selectedKLocal: undefined,
    selectedSHyper: undefined,
    selectedKHyper: undefined,
  };
}

/**
 * Ziiply normal product search shared types.
 * Location: src/app/components/ziiply/search/types.ts
 */

export type ZiiplySearchSuggestionType = "category" | "product" | "query" | "correction";

export type ZiiplySearchProductLike = {
  id?: string | number | null;
  ean?: string | null;
  name?: string | null;
  brandName?: string | null;
  category?: string | null;
  subCategory?: string | null;
  comparisonPriceUnit?: string | null;
  packageSizeText?: string | null;
  packageSize?: string | null;
  size?: string | null;
  volume?: string | null;
  weight?: string | null;
};

export type ZiiplyPackageSize = {
  amount: number;
  unit: "g" | "kg" | "ml" | "l" | "kpl" | "pcs" | "unknown";
  normalizedAmount: number;
  normalizedUnit: "g" | "ml" | "kpl" | "unknown";
  raw: string;
};

export type ZiiplySearchSuggestion = {
  id: string;
  type: ZiiplySearchSuggestionType;
  label: string;
  value: string;
  category?: string;
  brandName?: string;
  ean?: string;
  score: number;
  reason?: string;
};

export type ZiiplyNormalSearchOptions<T extends ZiiplySearchProductLike = ZiiplySearchProductLike> = {
  limit?: number;
  getBaseScore?: (product: T) => number;
};

export type ZiiplyNormalSearchResult<T extends ZiiplySearchProductLike = ZiiplySearchProductLike> = {
  product: T;
  score: number;
  reasons: string[];
};

export type ZiiplySearchSuggestionType =
  | "category"
  | "product"
  | "brand"
  | "correction"
  | "query";

export type ZiiplySearchSuggestion = {
  id?: string;
  type: ZiiplySearchSuggestionType;
  label: string;
  value: string;
  score?: number;
  reason?: string;
};

export type ZiiplySearchProductLike = {
  id?: string | number | null;
  ean?: string | null;
  name?: string | null;
  title?: string | null;
  brand?: string | null;
  brandName?: string | null;
  category?: string | null;
  hierarchyPath?: string[] | string | null;
  packageSize?: string | null;
  comparisonPriceUnit?: string | null;
  imageUrl?: string | null;
};

export type ZiiplyNormalSearchOptions<
  TProduct extends ZiiplySearchProductLike = ZiiplySearchProductLike
> = {
  limit?: number;
  maxResults?: number;
  maxSuggestions?: number;
  includeDebug?: boolean;
  getBaseScore?: (product: TProduct) => number;
};

export type ZiiplyNormalSearchResult<
  TProduct extends ZiiplySearchProductLike = ZiiplySearchProductLike
> = {
  product: TProduct;
  score: number;
  reasons: string[];
};

export type ZiiplyNormalSearchResponse<
  TProduct extends ZiiplySearchProductLike = ZiiplySearchProductLike
> = {
  query: string;
  normalizedQuery: string;
  correctedQuery?: string;
  results: ZiiplyNormalSearchResult<TProduct>[];
  products: TProduct[];
  suggestions: ZiiplySearchSuggestion[];
  categories: ZiiplySearchSuggestion[];
  brands: ZiiplySearchSuggestion[];
  debug?: unknown;
};

export type ZiiplyAutocompleteResult = {
  query: string;
  correctedQuery?: string;
  categories: ZiiplySearchSuggestion[];
  products: ZiiplySearchSuggestion[];
  brands: ZiiplySearchSuggestion[];
  suggestions: ZiiplySearchSuggestion[];
};

export type ZiiplySearchCategory = {
  id?: string;
  name: string;
  score?: number;
};

export type ZiiplySearchBrand = {
  id?: string;
  name: string;
  score?: number;
};

export type ZiiplySearchProduct = {
  id?: string | number;
  ean?: string;
  name: string;
  brandName?: string;
  category?: string;
  score?: number;
};

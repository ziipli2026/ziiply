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

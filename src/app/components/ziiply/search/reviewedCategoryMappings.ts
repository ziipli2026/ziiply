import snapshot from "../../../../../data/search/category-mappings-reviewed.json";
import type { SearchIntentCategory } from "../ziiplyCore";

// Only complete provider paths reviewed in Neon may establish a product group.
// Broad categories (e.g. Maitotuotteet) and unknown values stay inconclusive.
export function getReviewedProductCategory(category?: string): SearchIntentCategory | undefined {
  const path = category?.trim();
  if (!path) return undefined;
  const ids = new Set(snapshot.mappings.filter(row => row.source_category === path).map(row => row.category_id));
  return ids.size === 1 ? [...ids][0] as SearchIntentCategory : undefined;
}

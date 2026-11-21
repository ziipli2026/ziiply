import { desktopSearchDecision } from "./desktopNormalRelevance";

type CatalogProduct = Parameters<typeof desktopSearchDecision>[1] & {
  imageUrl?: string;
  pictureUrl?: string;
};

export async function fetchNormalSearchCatalog(query: string, signal?: AbortSignal): Promise<CatalogProduct[]> {
  try {
    const response = await fetch("/api/neon-first-search?desktop=1&q=" + encodeURIComponent(query), {
      cache: "no-store",
      signal,
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.products) ? data.products : [];
  } catch {
    return [];
  }
}

export function selectNormalSearchCatalog(query: string, products: CatalogProduct[]): CatalogProduct[] {
  // Upstream Neon rows can arrive in a different order for the same query.
  // Rank by the shared relevance score before any caller limits the catalog,
  // then use a stable identity as a tie-breaker (never response position).
  return products
    .filter(product => product?.name && product.ean && desktopSearchDecision(query, product).accepted)
    .sort((a, b) => {
      const scoreDiff = desktopSearchDecision(query, b).score - desktopSearchDecision(query, a).score;
      if (scoreDiff) return scoreDiff;
      const eanA = String(a.ean ?? "").replace(/\\D/g, "");
      const eanB = String(b.ean ?? "").replace(/\\D/g, "");
      const eanDiff = eanA.localeCompare(eanB);
      if (eanDiff) return eanDiff;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), "fi-FI");
    });
}

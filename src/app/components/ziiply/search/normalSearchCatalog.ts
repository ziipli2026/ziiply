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
  return products.filter(product => product?.name && product.ean && desktopSearchDecision(query, product).accepted);
}

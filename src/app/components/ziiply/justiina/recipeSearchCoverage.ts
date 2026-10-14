import type { RecipeIngredient } from './recipeCore';

/** Supplement noisy ingredient searches even when the first query has a match. */
export function recipeCoverageQueries(query: string, ingredient?: RecipeIngredient | null): string[] {
  if (!ingredient) return [];
  const term = (ingredient.searchTerm || query).toLowerCase().trim();
  if (term === 'sokeri') return [...new Set([query, 'taloussokeri', 'hienosokeri', 'ruokosokeri', 'fariinisokeri'])];
  const protein = ingredient.proteinRequirement;
  if (protein?.family === 'fish' && protein.processing === 'raw') {
    return [...new Set([query, protein.species])];
  }
  return [];
}

export function mergeRecipeSearchResponses(responses: any[]): any {
  const products: any[] = [];
  const seen = new Set<string>();
  for (const data of responses) {
    const items = Array.isArray(data?.products) ? data.products : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    for (const item of items) {
      const key = String(item.ean || item.gtin || item.id || JSON.stringify([item.name || item.title || item.productName, item.price, item.storeItems]));
      if (seen.has(key)) continue;
      seen.add(key);
      products.push({ ...item, __recipeResponseSource: data?.source || '' });
    }
  }
  return { ...responses[0], products, source: 'recipe-search-merged', querySources: responses.map(data => data?.source || '') };
}

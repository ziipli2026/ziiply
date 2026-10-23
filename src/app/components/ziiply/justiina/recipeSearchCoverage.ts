import { recipeCategoryQueries } from "./recipeCategories";
import type { RecipeIngredient } from './recipeCore';

/** Supplement noisy ingredient searches even when the first query has a match. */
export function recipeCoverageQueries(query: string, ingredient?: RecipeIngredient | null): string[] {
  if (!ingredient) return [];
  const term = (ingredient.searchTerm || query).toLowerCase().trim();
  // Search every explicitly offered alternative, but keep one ingredient/cart line.
  // The parser retains the original source line when it contains "tai".
  const source=String(ingredient.sourceLine||"");
  const alternatives=source.split(/\s+tai\s+/i);
  if(alternatives.length>1){
    const stripAmount=(value:string)=>value.replace(/^\s*(?:\d+(?:[,.]\d+)?(?:\s*[-–]\s*\d+(?:[,.]\d+)?)?\s*(?:kg|g|l|dl|cl|ml|kpl|pkt|pss|prk|rkl|tl)\s+)?/i,"").trim();
    const variants=alternatives.map(stripAmount).filter(Boolean);
    return [...new Set([query,...variants])];
  }
  const categoryQueries=recipeCategoryQueries(term);
  if(categoryQueries.length)return categoryQueries;
  if (term === 'sokeri') return [...new Set([query, 'taloussokeri', 'hienosokeri', 'ruokosokeri', 'fariinisokeri'])];
  const aliases: Record<string, string[]> = {
    'punainen linssi esikeitetty': ['linssi'],
    'koskenlaskija viherpippuri sulatejuusto': ['koskenlaskija'],
    'tomaattisose': ['tomaattipyree'],
    'kuorittu tomaatti': ['kuoritut tomaatit', 'tomaatti'],
    'juokseva margariini': ['juokseva', 'margariini'],
    'ancho chili': ['ancho'],
    'sipulikeittoaines': ['sipulikeitto'],
    'vihreä paprika': ['paprika'],
    'sitruuna': ['sitruuna luomu', 'sitruunat'],
    'ruokaöljy': ['rypsiöljy', 'oliiviöljy', 'rapsiöljy'],
    'kananjauheliha': ['jauheliha'],
    'maissi pakaste': ['maissi'],
    'sweet chili kastike': ['sweet chili'],
    'vaalea suuruste': ['suuruste'],
    'villiriisisekoitus': ['villiriisi', 'riisisekoitus', 'riisi'],
    'jauhoinen peruna': ['peruna', 'rosamunda'],
    'aura muru': ['aura'],
  };
  if (aliases[term]) return [...new Set([query, ...aliases[term]])];
  const protein = ingredient.proteinRequirement;
  if (protein?.family === "meat" && protein.processing === "raw" && protein.marinated) return [...new Set([query, protein.marinade ? protein.marinade + "marinoitu" : "marinoitu", "fileesuikale"])];
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

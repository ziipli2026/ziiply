import { comparePricedSearchResults, type Product } from '../ziiplyCore';
import { prioritizeRecipeFishProducts } from './recipeSearch';
import { recipeProductCompatible, recipeRetailPackageCount, type RecipeIngredient } from './recipeCore';
export type MobileRecipeContext={runId:number;step:number;ingredient:RecipeIngredient};
export type MobileRecipeProduct={name?:string;category?:string;__recipeChain?:"S"|"K";__recipeStoreName?:string;__recipeRunId?:number;__recipeStep?:number};
export function mobileRecipeSelectionAllowed(context:MobileRecipeContext|null,product:MobileRecipeProduct):boolean{
  if(!context)return product.__recipeRunId===undefined;
  return product.__recipeRunId===context.runId&&product.__recipeStep===context.step&&recipeProductCompatible(context.ingredient.name,product,context.ingredient);
}
export function mobileRecipePackageQuantity(context:MobileRecipeContext|null,product:MobileRecipeProduct):number{
  return context?recipeRetailPackageCount(context.ingredient,product)??1:1;
}
/** Mobile Product prices are cents; the S-kaupat fallback returns euros. */
export function mobileRecipePriceInCents(value:number,source:string):number{
  return source==='s-kaupat-normal-v220'?Math.round(value*100):value;
}


export function rankMobileRecipeProducts<T extends Product>(
  products: T[],
  ingredient: RecipeIngredient,
  priceOf: (product: T) => number,
): T[] {
  const priced = products.filter(product => {
    const price = priceOf(product);
    return Number.isFinite(price) && price > 0 &&
      recipeProductCompatible(ingredient.name, product, ingredient);
  });
  priced.sort((a, b) => comparePricedSearchResults(a, b, priceOf));
  return prioritizeRecipeFishProducts(ingredient.name, priced, ingredient);
}

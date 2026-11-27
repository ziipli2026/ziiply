import { isDesktopPetProduct, searchWords } from "../search/desktopNormalRelevance";

export function excludesPetOfferFromSalmonWatch(query: string, offer: Record<string, unknown>): boolean {
  const terms = searchWords(query);
  if (!terms.some(term => /^(?:kirjo)?loh(?:i|e|t)/.test(term)) || isDesktopPetProduct(query)) return false;

  const source = offer.__sourceOfferSearchResult as Record<string, unknown> | undefined;
  return [offer, source].some(row => row && isDesktopPetProduct([
    row.title, row.name, row.productName, row.brand, row.brandName,
    row.category, row.categoryPath, row.mainCategory, row.neonCategoryPath,
  ].filter(Boolean).join(" ")));
}

/** Match saved Gösta watch terms against already-normalized offer titles. */
export function matchesGostaWatch(query:string, offer:Record<string,unknown>):boolean {
 if (excludesPetOfferFromSalmonWatch(query, offer)) return false;
 const normalize=(value:unknown)=>String(value??"").toLocaleLowerCase("fi").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9äöå]+/g," ").trim();
 const words=normalize(query).split(/\\s+/).filter(Boolean);
 const title=normalize(offer.title||offer.name||offer.productName);
 if(!words.length||!title)return false;
 const tokens=title.split(/\\s+/);
 return words.every(word=>tokens.some(token=>token===word||token.startsWith(word)||word.length>=5&&token.startsWith(word.slice(0,-1))));
}

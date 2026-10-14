import { inferRecipeProtein, type RecipeProteinRequirement } from "./recipeProtein";
/** Shared Justiina recipe draft logic. No product is added to the cart here. */
export type RecipeIngredient = { id: string; name: string; amount: number | null; unit: string | null; uncertain: boolean; atHome: boolean; sourceLine?:string; searchTerm?:string; proteinRequirement?:RecipeProteinRequirement|null; wholeSpice?:boolean };
export type RecipeDraft = { title: string; servings: number | null; ingredients: RecipeIngredient[]; instructions: string; source: "text" | "dish" };
const units: Record<string, number> = { kg: 1000, g: 1, l: 1000, dl: 100, cl: 10, ml: 1, rkl: 15, tl: 5, kpl: 1, pkt: 1, prk: 1, pss: 1, rs: 1, tlk: 1, pussi: 1, ruukku: 1, nippu: 1 };
const family: Record<string, string> = { kg: "mass", g: "mass", l: "volume", dl: "volume", cl: "volume", ml: "volume", rkl: "volume", tl: "volume", kpl: "count", pkt: "pack", prk: "can", pss: "bag", rs: "pack", tlk: "can", pussi: "bag", ruukku: "count", nippu: "count" };
const ingredientHeading = /^(?:ainekset|ainesosat|raaka[- ]aineet|tarvikkeet|tarvitset|ingredients)\s*:?\s*/i;
const methodHeading = /^(?:valmistus(?:ohje)?|ohje(?:et)?|työvaiheet|instructions|method)\s*:?\s*/i;
const sectionHeading = /^(?:munamaito|mausteliemi|pullataikina|taikina|pohja|täyte|kastike|lihapullat|lisäksi(?: tarvitaan)?|päälle|pinnalle|voiteluun|paistamiseen|tarjoiluun)\s*:?$/i;
const quantity = "(?:\\d+\\s+(?:ja\\s+)?\\d+\\s*[/]\\s*\\d+|\\d+\\s*[/]\\s*\\d+|\\d+(?:[,.]\\d+)?)";
const measurement = new RegExp(`^(${quantity})(?:\\s*[-–—]\\s*(${quantity}))?\\s*(?:(kg|dl|cl|ml|rkl|tlk|tl|kpl|pkt|prk|pss|rs|pussi|pussia|ruukku|ruukkua|nippu|nippua|g|l)\\b\\.?\\s*)?`, "i");
function numberAmount(value: string): number {
  const mixed=value.match(/^(\d+)\s+(?:ja\s+)?(\d+)\s*\/\s*(\d+)$/);
  if(mixed)return Number(mixed[1])+Number(mixed[2])/Number(mixed[3]);
  const fraction=value.match(/^(\d+)\s*\/\s*(\d+)$/);
  return fraction?Number(fraction[1])/Number(fraction[2]):Number(value.replace(",","."));
}
export function parseRecipeIngredient(line: string, id = "0"): RecipeIngredient {
  const fractions:Record<string,string>={"½":"1/2","¼":"1/4","¾":"3/4","⅓":"1/3","⅔":"2/3","⅛":"1/8"};
  let clean:string;
  // Keep mixed unicode fractions distinct: 5½ means 5 + 1/2, never 51/2.
  clean=line.replace(/(\d)([½¼¾⅓⅔⅛])/g,"$1 $2").replace(/[½¼¾⅓⅔⅛]/g,x=>fractions[x]).replace(/[\u00a0\u202f]/g," ").replace(/^[#*•–-]+\s*/,"").trim();
  clean=clean.replace(/^(?:n\.|noin|vajaa|reilu)\s*/i,"");
  // When a fish recipe explicitly offers fillets, retain that alternative's own amount.
  const alternative=clean.split(/\s+tai\s+/i);
  const filletAlternative=alternative.length>1&&alternative.every(x=>/silak|kirjoloh|loh(?:i|ta)/i.test(x))?alternative.find(x=>/file/i.test(x)):undefined;
  clean=filletAlternative||alternative[0];
  const trailing=clean.match(/^(.+?)\s+(\d+(?:[,.]\d+)?(?:\s*\/\s*\d+)?)\s*(kg|g|l|dl|cl|ml|rkl|tl|kpl)\s*$/i);
  if(!measurement.test(clean)&&trailing)clean=trailing[2]+" "+trailing[3]+" "+trailing[1];
  const match=clean.match(measurement);
  let amount=match?Math.max(numberAmount(match[1]),match[2]?numberAmount(match[2]):0):null;
  let unit=match?.[3]?.toLowerCase().replace(/^pussia$/,"pussi").replace(/^ruukkua$/,"ruukku").replace(/^nippua$/,"nippu")||null;
  let name=match?clean.slice(match[0].length).trim():clean;
  // A package's metric contents are the requirement, not the number of cans.
  const contents=name.match(/^\((à\s*)?(\d+(?:[,.]\d+)?)(?:\s*(?:kg|g|l|dl|cl|ml)?\s*\/\s*(\d+(?:[,.]\d+)?))?\s*(kg|g|l|dl|cl|ml)\)\s*/i);
  if(contents){
    const size=numberAmount(contents[3]||contents[2]);
    const count=amount??1;
    if(!unit||["pkt","prk","tlk","pss","rs","pussi"].includes(unit)){
      amount=contents[1]||unit?count*size:size;unit=contents[4].toLowerCase();
    }
    name=name.slice(contents[0].length);
  }
  name=name.replace(/^(?:ripaus|tilkka|loraus|hyppysellinen|maun mukaan|iso|pieni|keskikokoinen)\s+/i,"").replace(/^\(\d+(?:[,.]\d+)?\s*(?:kg|g|dl|ml)\)\s*/,"");
  if(amount!==null&&!unit&&/^(?:kananmun|mun[ai]|sipul|punasipul|valkosipulinkyn|laakerinleh|kokonaista maustepippur)/i.test(name))unit="kpl";
  if(!Number.isFinite(amount)||amount===0)amount=null;
  return {id,name:name.trim(),amount,unit,uncertain:amount===null||!unit||alternative.length>1||/[?]/.test(line),atHome:false,sourceLine:clean};
}
export function parseRecipeText(text: string): RecipeDraft {
  // Plain pasted lists and one-line "Title: amount ingredient" recipes are accepted.
  const input=text.replace(/^([^\n:]+):\s*(?=(?:n\.\s*)?[\d½¼¾])/gm,"$1\n");
  const lines=input.replace(/\r/g,"").replace(/\\n/g,"\n").replace(/[\u00a0\u202f]/g," ").split("\n").map(x=>x.replace(/^#+\s*/,"").trim()).filter(Boolean);
  const start=lines.findIndex(x=>ingredientHeading.test(x));
  const title=lines[0]&&!ingredientHeading.test(lines[0])&&!measurement.test(lines[0])&&(start>0||!classifyRecipeIngredient(lines[0]))?lines[0]:"Nimetön resepti";
  const servingsMatch=text.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:annosta|annokselle|henkilölle|hlö)/i);
  const servings=servingsMatch?Number(servingsMatch[2]||servingsMatch[1]):null;
  const end=lines.findIndex((x,i)=>i>Math.max(start,0)&&(methodHeading.test(x)||/^(?:\d+[.)]\s*)?(?:sekoita|keitä|paista|kuori|lisää|hienonna|kuumenna|tarjoile|ruskista|kuullota|leikkaa)\b/i.test(x)));
  const raw=lines.slice(start<0?(title==="Nimetön resepti"?0:1):start,end<0?undefined:end);
  const splitIngredients=(line:string):string[]=>{
    const parts:string[]=[];let depth=0,start=0;
    for(let i=0;i<line.length;i++){
      if(line[i]==="(")depth++;if(line[i]===")")depth=Math.max(0,depth-1);
      if(depth===0&&(line[i]===";"||(line[i]===","&&!(/\d/.test(line[i-1]||"")&&/\d/.test(line[i+1]||""))))){
        const tail=line.slice(i+1).trim();
        if(line[i]===";"||/^(?:n\.\s*)?[\d½¼¾]/.test(tail)||classifyRecipeIngredient(tail.split(/[;,]/)[0])){
          parts.push(line.slice(start,i));start=i+1;
        }
      }
    }
    parts.push(line.slice(start));return parts;
  };
  const ingredientLines=raw.flatMap(x=>splitIngredients(x.replace(ingredientHeading,""))).map(x=>x.trim()).filter(x=>x&&!sectionHeading.test(x)&&!/^[-*–]+$/.test(x)&&!/^\d+(?:[-–]\d+)?\s*(?:annosta|hlö|henkilölle)/i.test(x));
  // Some copied ingredient tables put quantity and product name on separate lines.
  const joined:string[]=[];
  for(let i=0;i<ingredientLines.length;i++){
    const line=ingredientLines[i];const parsed=parseRecipeIngredient(line);
    if(!parsed.name&&i+1<ingredientLines.length)joined.push(line+" "+ingredientLines[++i]);else joined.push(line);
  }
  const ingredients=joined.filter(x=>! /^(?:sekoita|keitä|paista|kuori|lisää|hienonna|kuumenna|tarjoile)\b/i.test(x)).map((x,i)=>parseRecipeIngredient(x,String(i))).filter(x=>x.name);
  return {title,servings,ingredients,instructions:end<0?"":lines.slice(end).join("\n").replace(methodHeading,""),source:"text"};
}
export function scaleIngredients(items: RecipeIngredient[], original: number, target: number): RecipeIngredient[] {
  if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(target) || target <= 0) throw new Error("Annoksia pitää olla vähintään yksi");
  return items.map(item => ({ ...item, amount: item.amount === null ? null : Math.round(item.amount * target / original * 1000) / 1000 }));
}
export function packageCount(needed: number | null, neededUnit: string | null, packageSize: number | null, packageUnit: string | null): number | null {
  if (needed === null || packageSize === null || needed <= 0 || packageSize <= 0 || !neededUnit || !packageUnit) return null;
  if (!family[neededUnit] || !family[packageUnit] || !Number.isFinite(needed) || !Number.isFinite(packageSize) || family[neededUnit] !== family[packageUnit]) return null;
  return Math.ceil((needed * units[neededUnit]) / (packageSize * units[packageUnit]));
}
export function ingredientSearchTerms(items: RecipeIngredient[]): string[] {
  return items.filter(item => !item.atHome && item.name.trim()).map(item => item.name.trim());
}

/** Recipe requirement versus selected retail package; never silently round down. */
export function recipePackageSuggestion(needed: number | null, neededUnit: string | null, packageSize: number | null, packageUnit: string | null): { count: number; purchased: number; surplus: number; unit: string } | null {
  const count = packageCount(needed, neededUnit, packageSize, packageUnit);
  if (count === null || needed === null || packageSize === null || !neededUnit || !packageUnit) return null;
  const baseNeeded = needed * units[neededUnit];
  const basePurchased = count * packageSize * units[packageUnit];
  const factor = units[neededUnit];
  return { count, purchased: Math.round(basePurchased / factor * 1000) / 1000, surplus: Math.round((basePurchased - baseNeeded) / factor * 1000) / 1000, unit: neededUnit };
}

/** Match an ingredient to a retail package without confusing unrelated products. */
export function suggestIngredientPurchase(ingredient: RecipeIngredient, product: { name?: string; packageSize?: number | null; packageUnit?: string | null }) {
  const quantity = recipePackageSuggestion(ingredient.amount, ingredient.unit, product.packageSize ?? null, product.packageUnit ?? null);
  if (!quantity) return null;
  return { ingredientId: ingredient.id, needed: ingredient.amount, neededUnit: ingredient.unit, productName: product.name ?? "", suggestedCount: quantity.count, purchased: quantity.purchased, surplus: quantity.surplus, unit: quantity.unit };
}

/** Read the recipe requirement for the current search step; do not apply it to unrelated searches. */
export function recipeIngredientForSearch(items: RecipeIngredient[], searchTerm: string, step: number): RecipeIngredient | null {
  const normalize = (value: string) => value.toLocaleLowerCase("fi").trim().replace(/\s+/g, " ");
  if (!Number.isInteger(step) || step < 0 || step >= items.length) return null;
  const ingredient = items[step];
  if (!ingredient || ingredient.atHome || !ingredient.name.trim()) return null;
  const expected = normalize(ingredient.name);
  const actual = normalize(searchTerm);
  return actual === expected ? ingredient : null;
}

import { recipeProductSearchTerm, classifyRecipeIngredient } from "./recipeSearch";
export { recipeProductSearchTerm, classifyRecipeIngredient, recipeProductCompatible } from "./recipeSearch";
export type { RecipeFoodGroup } from "./recipeSearch";

/** The editor and desktop simulation use exactly the same search requirements. */
export function prepareRecipeSearch(items: RecipeIngredient[], instructions=""): {terms:string[];items:RecipeIngredient[]} {
  const entries:Array<{term:string;item:RecipeIngredient}>=[];
  for(const item of items){
    if(item.atHome)continue;
    const proteinRequirement=inferRecipeProtein(item.name,instructions,item.sourceLine||item.name);
    const baseTerm=recipeProductSearchTerm(item.name);
    const term=proteinRequirement&&(proteinRequirement.processing!=="raw"||proteinRequirement.storage==="frozen"||!classifyRecipeIngredient(item.name))?proteinRequirement.searchTerm:baseTerm;if(!term)continue;
    const wholeSpice=/pippur/.test(item.name)&&item.amount!==null&&(!item.unit||item.unit==="kpl")&&!/jauhe|rouh/.test(item.name);
    const normalized={...item,proteinRequirement,wholeSpice,searchTerm:term};
    if(normalized.amount!==null&&normalized.unit){
      if(family[normalized.unit]==="mass"){normalized.amount*=units[normalized.unit];normalized.unit="g";}
      if(family[normalized.unit]==="volume"){normalized.amount*=units[normalized.unit];normalized.unit="ml";}
    }
    const existing=entries.find(x=>x.term===term&&JSON.stringify(x.item.proteinRequirement)===JSON.stringify(normalized.proteinRequirement)&&(x.item.unit===normalized.unit||!x.item.unit||!normalized.unit));
    if(existing){existing.item.amount=existing.item.amount!==null&&normalized.amount!==null?existing.item.amount+normalized.amount:null;existing.item.uncertain ||= normalized.uncertain;}
    else entries.push({term,item:normalized});
  }
  return {terms:entries.map(x=>x.term),items:entries.map(x=>x.item)};
}

/** Prefer total package contents, accounting for multipacks and drained weights. */
export function recipeRetailPackage(product:{name?:string;packageSize?:number;packageUnit?:string}): {size:number|null;unit:string|null} {
  const name=product.name||"";
  const multi=[...name.matchAll(/(\d+)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(kg|g|l|dl|cl|ml|kpl)\b/gi)].at(-1);
  const withoutMulti=name.replace(/\d+\s*[x×]\s*\d+(?:[,.]\d+)?\s*(?:kg|g|l|dl|cl|ml|kpl)\b/gi," ");
  const total=[...withoutMulti.matchAll(/(\d+(?:[,.]\d+)?)(?:\s*\/\s*(\d+(?:[,.]\d+)?))?\s*(kg|g|l|dl|cl|ml|kpl)\b/gi)].at(-1);
  return {size:total?numberAmount(total[2]||total[1]):multi?Number(multi[1])*numberAmount(multi[2]):product.packageSize||null,unit:total?.[3]?.toLowerCase()||multi?.[3]?.toLowerCase()||product.packageUnit||null};
}
export function recipeRetailPackageCount(ingredient:RecipeIngredient,product:{name?:string;packageSize?:number;packageUnit?:string}):number|null {
  const pack=recipeRetailPackage(product);
  if(ingredient.amount!==null&&ingredient.unit&&["pkt","prk","tlk","pss","rs","pussi"].includes(ingredient.unit))return Math.ceil(ingredient.amount);
  return packageCount(ingredient.amount,ingredient.unit,pack.size,pack.unit);
}

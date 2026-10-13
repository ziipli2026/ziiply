/** Shared Justiina recipe draft logic. No product is added to the cart here. */
export type RecipeIngredient = { id: string; name: string; amount: number | null; unit: string | null; uncertain: boolean; atHome: boolean };
export type RecipeDraft = { title: string; servings: number | null; ingredients: RecipeIngredient[]; instructions: string; source: "text" | "dish" };
const amountPattern = /^(?:(\d+(?:[,.]\d+)?)(?:\s*[-–]\s*(\d+(?:[,.]\d+)?))?\s*)?(kg|g|l|dl|cl|ml|rkl|tl|kpl|pkt|prk|pss)?\s*(.+)$/i;
const units: Record<string, number> = { kg: 1000, g: 1, l: 1000, dl: 100, cl: 10, ml: 1, rkl: 15, tl: 5, kpl: 1, pkt: 1, prk: 1, pss: 1 };
const family: Record<string, string> = { kg: "mass", g: "mass", l: "volume", dl: "volume", cl: "volume", ml: "volume", rkl: "volume", tl: "volume", kpl: "count", pkt: "pack", prk: "can", pss: "bag" };
export function parseRecipeText(text: string): RecipeDraft {
  const lines = text.replace(/\r/g, "").split("\n").map(x => x.trim()).filter(Boolean);
  const title = lines[0]?.replace(/^#+\s*/, "") || "Nimetön resepti";
  const servingsLine = lines.find(x => /\b(?:annosta|annokselle|henkilölle)\b/i.test(x));
  const servingsMatch = servingsLine?.match(/(\d+)\s*(?:annosta|annokselle|henkilölle)/i);
  const servings = servingsMatch ? Number(servingsMatch[1]) : null;
  const start = lines.findIndex(x => /^(?:ainekset|raaka-aineet|tarvikkeet)\s*:?$/i.test(x));
  const end = lines.findIndex((x, i) => i > start && /^(?:valmistus|ohje|valmistusohje)\s*:?$/i.test(x));
  const ingredientLines = start < 0 ? [] : lines.slice(start + 1, end < 0 ? undefined : end);
  const ingredients = ingredientLines.filter(x => x !== servingsLine).map((line, i) => {
    const clean = line.replace(/^[-*•]\s*/, "");
    const m = clean.match(amountPattern);
    const a = m?.[1] ? Number(m[1].replace(",", ".")) : null;
    const uncertain = !m || a === null || !!m[2] || !m[3] || !m[4] || /[?/]/.test(clean);
    return { id: String(i), name: (m?.[4] || clean).trim(), amount: a, unit: m?.[3]?.toLowerCase() || null, uncertain, atHome: false };
  });
  return { title, servings, ingredients, instructions: end < 0 ? "" : lines.slice(end + 1).join("\n"), source: "text" };
}
export function scaleIngredients(items: RecipeIngredient[], original: number, target: number): RecipeIngredient[] {
  if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(target) || target <= 0) throw new Error("Annoksia pitää olla vähintään yksi");
  return items.map(item => ({ ...item, amount: item.amount === null ? null : Math.round(item.amount * target / original * 1000) / 1000 }));
}
export function packageCount(needed: number | null, neededUnit: string | null, packageSize: number | null, packageUnit: string | null): number | null {
  if (needed === null || packageSize === null || needed <= 0 || packageSize <= 0 || !neededUnit || !packageUnit) return null;
  if (family[neededUnit] !== family[packageUnit]) return null;
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

/** Strict recipe-only ingredient classification. Unknown ingredients must be clarified before search. */
export type RecipeFoodGroup = { ingredient: string; mainGroup: string; subGroup: string; searchTerm: string };
const recipeGroups: Array<{ pattern: RegExp; group: RecipeFoodGroup }> = [
  { pattern: /^(?:lohi|lohta|lohen|tuore lohi|lohifilee|lohifile|kirjolohi|kirjolohta)$/, group: { ingredient: "lohi", mainGroup: "Kala ja äyriäiset", subGroup: "Tuore kala", searchTerm: "lohifilee" } },
  { pattern: /^(?:suola|suolaa|merisuola)$/, group: { ingredient: "suola", mainGroup: "Mausteet ja maustaminen", subGroup: "Suolat", searchTerm: "suola" } },
  { pattern: /^(?:maito|maitoa|kevytmaito|täysmaito)$/, group: { ingredient: "maito", mainGroup: "Maitotuotteet", subGroup: "Maito", searchTerm: "maito" } },
  { pattern: /^(?:voi|voita)$/, group: { ingredient: "voi", mainGroup: "Maitotuotteet", subGroup: "Voi", searchTerm: "voi" } },
  { pattern: /^(?:kananmuna|kananmunia|munia)$/, group: { ingredient: "kananmuna", mainGroup: "Kananmunat", subGroup: "Kananmunat", searchTerm: "kananmuna" } },
  { pattern: /^(?:peruna|perunaa|perunoita)$/, group: { ingredient: "peruna", mainGroup: "Kasvikset", subGroup: "Perunat", searchTerm: "peruna" } },
  { pattern: /^(?:porkkana|porkkanaa|porkkanoita)$/, group: { ingredient: "porkkana", mainGroup: "Kasvikset", subGroup: "Juurekset", searchTerm: "porkkana" } },
  { pattern: /^(?:sipuli|sipulia|sipuleita|punasipuli|punasipulia)$/, group: { ingredient: "sipuli", mainGroup: "Kasvikset", subGroup: "Sipulit", searchTerm: "sipuli" } },
  { pattern: /^(?:valkosipuli|valkosipulia|valkosipulinkynsi|valkosipulinkynttä)$/, group: { ingredient: "valkosipuli", mainGroup: "Kasvikset", subGroup: "Sipulit", searchTerm: "valkosipuli" } },
  { pattern: /^(?:tomaatti|tomaattia|tomaatteja)$/, group: { ingredient: "tomaatti", mainGroup: "Kasvikset", subGroup: "Tomaatit", searchTerm: "tomaatti" } },
  { pattern: /^(?:kurkku|kurkkua|kurkkuja)$/, group: { ingredient: "kurkku", mainGroup: "Kasvikset", subGroup: "Kurkut", searchTerm: "kurkku" } },
  { pattern: /^(?:paprika|paprikaa|paprikoita)$/, group: { ingredient: "paprika", mainGroup: "Kasvikset", subGroup: "Paprikat", searchTerm: "paprika" } },
  { pattern: /^(?:riisi|riisiä|basmatiriisi|jasmiiniriisi)$/, group: { ingredient: "riisi", mainGroup: "Kuivatuotteet", subGroup: "Riisit", searchTerm: "riisi" } },
  { pattern: /^(?:pasta|pastaa|spagetti|spagettia|makaroni|makaronia)$/, group: { ingredient: "pasta", mainGroup: "Kuivatuotteet", subGroup: "Pastat", searchTerm: "pasta" } },
  { pattern: /^(?:vehnäjauho|vehnäjauhoja|jauho|jauhoja)$/, group: { ingredient: "vehnäjauho", mainGroup: "Leivonta", subGroup: "Jauhot", searchTerm: "vehnäjauho" } },
  { pattern: /^(?:sokeri|sokeria|taloussokeri)$/, group: { ingredient: "sokeri", mainGroup: "Leivonta", subGroup: "Sokerit", searchTerm: "sokeri" } },
  { pattern: /^(?:ruokakerma|ruokakermaa|kuohukerma|kuohukermaa|kerma|kermaa)$/, group: { ingredient: "kerma", mainGroup: "Maitotuotteet", subGroup: "Kermat", searchTerm: "kerma" } },
  { pattern: /^(?:juusto|juustoa|emmental|edam)$/, group: { ingredient: "juusto", mainGroup: "Maitotuotteet", subGroup: "Juustot", searchTerm: "juusto" } },
  { pattern: /^(?:broileri|broileria|kananfilee|kananfilettä|kananrinta|kananrintaa)$/, group: { ingredient: "broileri", mainGroup: "Liha", subGroup: "Siipikarja", searchTerm: "broileri" } },
  { pattern: /^(?:tonnikala|tonnikalaa)$/, group: { ingredient: "tonnikala", mainGroup: "Kala ja äyriäiset", subGroup: "Tonnikala", searchTerm: "tonnikala" } },
  { pattern: /^(?:oliiviöljy|oliiviöljyä|rypsiöljy|rypsiöljyä|öljy|öljyä)$/, group: { ingredient: "öljy", mainGroup: "Öljyt ja rasvat", subGroup: "Ruokaöljyt", searchTerm: "ruokaöljy" } },
  { pattern: /^(?:mustapippuri|mustapippuria|pippuri|pippuria)$/, group: { ingredient: "mustapippuri", mainGroup: "Mausteet ja maustaminen", subGroup: "Pippurit", searchTerm: "mustapippuri" } },
  { pattern: /^(?:sitruuna|sitruunaa|sitruunoita)$/, group: { ingredient: "sitruuna", mainGroup: "Hedelmät", subGroup: "Sitrushedelmät", searchTerm: "sitruuna" } },
  { pattern: /^(?:jauheliha|jauhelihaa|naudan jauheliha)$/, group: { ingredient: "jauheliha", mainGroup: "Liha", subGroup: "Jauheliha", searchTerm: "jauheliha" } },
];
export function classifyRecipeIngredient(name: string): RecipeFoodGroup | null {
  const normalized = name.toLocaleLowerCase("fi").trim().replace(/\s+/g, " ");
  return recipeGroups.find(entry => entry.pattern.test(normalized))?.group ?? null;
}

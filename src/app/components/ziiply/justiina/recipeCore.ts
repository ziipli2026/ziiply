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
    const uncertain = !m || a === null || !!m[2] || /[?/]/.test(m?.[3] || "");
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

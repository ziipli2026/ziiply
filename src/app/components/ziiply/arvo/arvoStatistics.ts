export type ArvoMeal = {
  id: string;
  timestamp: string;
  ean: string;
  name: string;
  grams: number;
  nutrition: { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };
};

export type ArvoNutritionTotals = {
  kcal: number; protein: number; carbs: number; fat: number;
  entries: number; known: { kcal: number; protein: number; carbs: number; fat: number };
};

export const ARVO_MEALS_KEY = "ziiply-arvo-meals-v1";
const fields = ["kcal", "protein", "carbs", "fat"] as const;
type Field = typeof fields[number];
const empty = (): ArvoNutritionTotals => ({kcal:0,protein:0,carbs:0,fat:0,entries:0,known:{kcal:0,protein:0,carbs:0,fat:0}});
const finite = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s/g,"").replace(",",".");
  if (!clean || clean === "—") return null;
  const number = Number(clean);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
export function normalizeArvoMeal(raw: unknown): ArvoMeal | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const date = new Date(String(value.timestamp || ""));
  const grams = finite(value.grams);
  if (!Number.isFinite(date.getTime()) || !grams || !String(value.ean || "").match(/^\d{8,14}$/)) return null;
  const source = value.nutrition && typeof value.nutrition === "object" ? value.nutrition as Record<string,unknown> : {};
  const nutrition = {kcal:finite(source.kcal),protein:finite(source.protein),carbs:finite(source.carbs),fat:finite(source.fat)};
  return {id:String(value.id || ""),timestamp:date.toISOString(),ean:String(value.ean),name:String(value.name || ""),grams,nutrition};
}
export function readArvoMeals(storage: Pick<Storage,"getItem">): ArvoMeal[] {
  try {
    const rows = JSON.parse(storage.getItem(ARVO_MEALS_KEY) || "[]");
    return Array.isArray(rows) ? rows.map(normalizeArvoMeal).filter((row):row is ArvoMeal=>!!row) : [];
  } catch { return []; }
}
export function arvoNutritionTotals(meals: readonly ArvoMeal[]): ArvoNutritionTotals {
  return meals.reduce((totals,meal)=>{
    totals.entries++;
    for (const field of fields) {
      const value = meal.nutrition[field];
      if (value !== null) {totals[field] += value; totals.known[field]++;}
    }
    return totals;
  },empty());
}
// Group by user's local calendar date rather than UTC, so late-night meals count on the correct day.
export function arvoDailyStatistics(meals: readonly ArvoMeal[], timeZone?: string): Record<string,ArvoNutritionTotals> {
  const result: Record<string,ArvoNutritionTotals> = Object.create(null);
  const formatter = new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"});
  for (const meal of meals) {
    const parts = formatter.formatToParts(new Date(meal.timestamp));
    const date = ["year","month","day"].map(type=>parts.find(part=>part.type===type)?.value || "").join("-");
    (result[date] ||= empty()).entries++;
    for (const field of fields) {
      const value = meal.nutrition[field];
      if (value !== null) {result[date][field]+=value;result[date].known[field]++;}
    }
  }
  return result;
}
export function arvoPeriodStatistics(meals: readonly ArvoMeal[], from: Date, to: Date): ArvoNutritionTotals {
  return arvoNutritionTotals(meals.filter(meal=>{
    const timestamp = Date.parse(meal.timestamp);
    return timestamp >= from.getTime() && timestamp < to.getTime();
  }));
}
export function arvoNutrientValues(nutrition: Record<string,unknown> | null, grams: number): ArvoMeal["nutrition"] {
  const source = nutrition?.nutrients && typeof nutrition.nutrients === "object" ? nutrition.nutrients as Record<string,unknown> : nutrition || {};
  const keys: Record<Field,string[]> = {
    kcal:["kcal_100g","energy-kcal_100g","ENERC"],
    protein:["proteins_100g","protein_100g","PROCNT"],
    carbs:["carbohydrates_100g","CHOCDF"],
    fat:["fat_100g","FAT"],
  };
  const result = {kcal:null,protein:null,carbs:null,fat:null} as ArvoMeal["nutrition"];
  for (const field of fields) {
    const key = keys[field].find(key=>source[key] !== undefined && source[key] !== null);
    const amount = key ? finite(source[key]) : null;
    result[field] = amount === null ? null : Math.round(amount * grams / 100 * 10)/10;
  }
  return result;
}

"use client";

export const RECIPE_DEBUG_KEY = "ziiply-mobile-recipe-search-debug-v1";
export type RecipeDebugEntry = { at: string; stage: string; detail: unknown };
export function appendRecipeDebug(stage: string, detail: unknown) {
  if (typeof window === "undefined") return;
  try {
    const previous: RecipeDebugEntry[] = JSON.parse(sessionStorage.getItem(RECIPE_DEBUG_KEY) || "[]");
    const next = [...(Array.isArray(previous) ? previous : []), { at: new Date().toISOString(), stage, detail }].slice(-150);
    sessionStorage.setItem(RECIPE_DEBUG_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("ziiply-recipe-debug-updated"));
  } catch {}
}
// Keep the diagnostic writer available without showing debug controls in mobile UI.
export default function ZiiplyRecipeSearchDebug() {
  return null;
}

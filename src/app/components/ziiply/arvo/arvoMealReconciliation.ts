import {normalizeArvoMeal, type ArvoMeal} from "./arvoStatistics";

/**
 * Deterministic, non-destructive reconciliation of local and server meals.
 * This function never writes to storage or sends data to a server.
 * The caller must authenticate and authorize the server collection first.
 */
const validMealId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export function reconcileArvoMeals(local: readonly ArvoMeal[], remote: readonly ArvoMeal[]) {
  const serverById = new Map<string,ArvoMeal>();
  for (const item of remote) {
    const meal = normalizeArvoMeal(item);
    if (meal?.id && validMealId(meal.id)) serverById.set(meal.id,meal);
  }
  const upload: ArvoMeal[] = [];
  const conflicts: string[] = [];
  const seenLocal = new Set<string>();
  for (const item of local) {
    const meal = normalizeArvoMeal(item);
    if (!meal?.id || !validMealId(meal.id) || seenLocal.has(meal.id)) continue;
    seenLocal.add(meal.id);
    const server = serverById.get(meal.id);
    if (!server) { upload.push(meal); continue; }
    if (JSON.stringify(server) !== JSON.stringify(meal)) conflicts.push(meal.id);
  }
  // Server wins only for display of already-uploaded IDs. Conflicts are
  // explicitly reported, never silently overwritten or re-uploaded.
  return {
    merged: [...serverById.values(),...upload].sort((a,b)=>b.timestamp.localeCompare(a.timestamp)),
    upload,
    conflicts,
  };
}

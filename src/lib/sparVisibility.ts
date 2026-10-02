// Future SPAR grocery-search visibility gate. Disabled until reviewed classification data is connected.
export type SparVisibilityClass = "daily" | "department_store" | "review";
export const SPAR_VISIBILITY_ENABLED = false as boolean;
export function applySparVisibility<T extends {ean?: string}>(items: T[], approved: ReadonlyMap<string,SparVisibilityClass>, enabled = SPAR_VISIBILITY_ENABLED): T[] {
  if (!enabled) return items;
  // Unknown EANs and review products are preserved. Scanner data is independent.
  return items.filter(item => approved.get(String(item.ean ?? "")) !== "department_store");
}

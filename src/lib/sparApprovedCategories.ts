// Only explicitly reviewed EAN approvals may override provider categories.
// The empty index is intentional until reviewed approvals are exported and verified.
export type SparApprovedCategory = { productClass: "daily" | "department_store"; ziiplyCategory: string; classificationStatus: "approved" };
export const SPAR_APPROVED_INDEX: ReadonlyMap<string, SparApprovedCategory> = new Map();
export function applyApprovedSparCategories<T extends { ean?: string; category?: string }>(items: T[], approved: ReadonlyMap<string, SparApprovedCategory>): T[] {
  return items.map(item => {
    const match = approved.get(String(item.ean ?? ""));
    if (!match || match.classificationStatus !== "approved" || match.productClass !== "daily" || !match.ziiplyCategory.trim()) return item;
    return { ...item, category: match.ziiplyCategory };
  });
}

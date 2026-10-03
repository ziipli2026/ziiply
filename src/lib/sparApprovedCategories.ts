import reviewedIndex from "@/data/tokmanni-spar-approved-index.json";
// Only explicitly reviewed EAN approvals may override provider categories.
// The empty index is intentional until reviewed approvals are exported and verified.
export type SparApprovedCategory = { productClass: "daily" | "department_store"; ziiplyCategory: string; classificationStatus: "approved" };
type ApprovedRow = { ean: string; productClass: string; ziiplyCategory: string; classificationStatus: string };
export function buildApprovedIndex(rows: ApprovedRow[]): ReadonlyMap<string, SparApprovedCategory> {
  const result = new Map<string, SparApprovedCategory>();
  for (const row of rows) {
    if (!/^[0-9]{8,14}$/.test(row.ean) || result.has(row.ean)) throw Error("Invalid or duplicate approved SPAR EAN");
    if (row.classificationStatus !== "approved" || !["daily", "department_store"].includes(row.productClass)) throw Error("Unapproved SPAR EAN index row");
    if (row.productClass === "daily" && !row.ziiplyCategory?.trim()) throw Error("Missing approved SPAR category");
    result.set(row.ean, {productClass: row.productClass as SparApprovedCategory["productClass"], ziiplyCategory: row.ziiplyCategory, classificationStatus: "approved"});
  }
  return result;
}
export const SPAR_APPROVED_INDEX = buildApprovedIndex(reviewedIndex.items as ApprovedRow[]);
export function applyApprovedSparCategories<T extends { ean?: string; category?: string }>(items: T[], approved: ReadonlyMap<string, SparApprovedCategory>): T[] {
  return items.map(item => {
    const match = approved.get(String(item.ean ?? ""));
    if (!match || match.classificationStatus !== "approved" || match.productClass !== "daily" || !match.ziiplyCategory.trim()) return item;
    return { ...item, category: match.ziiplyCategory };
  });
}

// Exclude only explicitly approved department-store EANs; unknown products remain visible.
export function filterApprovedSparGroceryItems<T extends { ean?: string }>(items: T[], approved: ReadonlyMap<string, SparApprovedCategory>): T[] {
  return items.filter(item => {
    const match = approved.get(String(item.ean ?? ""));
    return !(match?.classificationStatus === "approved" && match.productClass === "department_store");
  });
}

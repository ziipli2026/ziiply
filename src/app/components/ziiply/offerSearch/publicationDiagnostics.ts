/** Source-independent quality checks for staged grocery offer publications. */
export type OfferDiagnosticRow = {
  name?: unknown; title?: unknown; imageUrl?: unknown; category?: unknown;
  validFrom?: unknown; validUntil?: unknown; ean?: unknown; price?: unknown;
};
export function inspectOfferPublication(rows: readonly OfferDiagnosticRow[], validFrom: string, validUntil: string) {
  const missingNames: number[] = [];
  const missingImages: number[] = [];
  const missingCategories: number[] = [];
  const mismatchedValidity: number[] = [];
  const duplicates: number[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const name = String(row.name || row.title || "").trim();
    if (!name) missingNames.push(index);
    if (!String(row.imageUrl || "").trim()) missingImages.push(index);
    if (!String(row.category || "").trim()) missingCategories.push(index);
    if (row.validFrom && String(row.validFrom).slice(0, 10) !== validFrom ||
        row.validUntil && String(row.validUntil).slice(0, 10) !== validUntil) mismatchedValidity.push(index);
    const identity = [String(row.ean || "").trim(), name.toLocaleLowerCase("fi-FI"), String(row.price ?? "")].join("|");
    if (seen.has(identity)) duplicates.push(index);
    seen.add(identity);
  });
  return {
    count: rows.length,
    missingNames: { count: missingNames.length, sampleIndices: missingNames.slice(0, 10) },
    missingImages: { count: missingImages.length, sampleIndices: missingImages.slice(0, 10) },
    missingCategories: { count: missingCategories.length, sampleIndices: missingCategories.slice(0, 10) },
    mismatchedValidity: { count: mismatchedValidity.length, sampleIndices: mismatchedValidity.slice(0, 10) },
    duplicates: { count: duplicates.length, sampleIndices: duplicates.slice(0, 10) },
    severity: rows.length === 0 || missingNames.length || mismatchedValidity.length ? "error" :
      missingImages.length || missingCategories.length || duplicates.length ? "warning" : "ok",
  };
}

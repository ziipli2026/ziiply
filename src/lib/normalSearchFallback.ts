// Preserve product identity and requested package size in result matching.
export function normalizeSearchPackageSpacing(input: string): string {
  return input.replace(/\b(?:e\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|kpl|pkt|pss)\b/gi, "$1$2");
}

// Broaden provider queries only after the original query returns no results.
export function getZeroResultFallbackQuery(input: string): string | null {
  const query = input.trim().replace(/\s+/g, " ");
  const match = query.match(/\s+\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|kpl|pkt|pss)$/i);
  if (!match || match.index == null) return null;
  const reduced = query.slice(0, match.index).trim();
  return reduced.length >= 5 && reduced.split(" ").length >= 2 ? reduced : null;
}

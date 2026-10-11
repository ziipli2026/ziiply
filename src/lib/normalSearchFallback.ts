// Conservative provider-query fallback for grocery product names.
// Preserve the original query for product ranking and never infer an exact match.
export function getZeroResultFallbackQuery(input: string): string | null {
  const query = input.trim().replace(/\s+/g, " ");
  if (!query) return null;
  const words = query.split(" ");
  if (words.length < 3) return null;
  const last = words[words.length - 1];
  // Remove only an explicit trailing package quantity. Avoid stripping
  // brand, flavour, dietary or other identifying words.
  if (!/^\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|kpl|pkt|pss)$/i.test(last)) return null;
  const reduced = words.slice(0, -1).join(" ");
  return reduced.length >= 5 ? reduced : null;
}

export function normalizeSearchText(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const normalizeFi = normalizeSearchText;

export function splitSearchWords(value: string | null | undefined): string[] {
  return normalizeSearchText(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
}

export const tokenizeFi = splitSearchWords;

export function normalizeEan(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "").trim();
}

export function hasAny(text: string | null | undefined, terms: string[]): boolean {
  const normalizedText = normalizeSearchText(text);

  return terms.some((term) => {
    const normalizedTerm = normalizeSearchText(term);
    return normalizedTerm.length > 0 && normalizedText.includes(normalizedTerm);
  });
}

export function hasWord(text: string | null | undefined, word: string): boolean {
  const normalizedText = normalizeSearchText(text);
  const normalizedWord = normalizeSearchText(word);

  if (!normalizedText || !normalizedWord) return false;

  return new RegExp(`(^|\\s)${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(
    normalizedText
  );
}

export function uniqueStable<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function getProductSearchText(product: {
  name?: string | null;
  title?: string | null;
  brand?: string | null;
  brandName?: string | null;
  category?: string | null;
  hierarchyPath?: string[] | string | null;
  packageSize?: string | null;
  comparisonPriceUnit?: string | null;
}): string {
  const hierarchy = Array.isArray(product.hierarchyPath)
    ? product.hierarchyPath.join(" ")
    : String(product.hierarchyPath || "");

  return normalizeSearchText(
    [
      product.name,
      product.title,
      product.brand,
      product.brandName,
      product.category,
      hierarchy,
      product.packageSize,
      product.comparisonPriceUnit,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function getProductPackageSize(product: {
  name?: string | null;
  title?: string | null;
  packageSize?: string | null;
}): string {
  const direct = normalizeSearchText(product.packageSize);
  if (direct) return direct;

  const text = normalizeSearchText([product.name, product.title].filter(Boolean).join(" "));

  const match = text.match(/\b\d+(?:[,.]\d+)?\s?(kg|g|l|ml|cl|kpl|pkt|ps|tlk)\b/i);
  return match ? normalizeSearchText(match[0]) : "";
}

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

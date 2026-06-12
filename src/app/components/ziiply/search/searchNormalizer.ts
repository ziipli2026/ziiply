/**
 * Ziiply search normalizer.
 *
 * V522_KEEP_FINNISH_DIACRITICS
 * - Ääkkösiä EI enää poisteta pää-normalisoinnissa.
 *   ruisleipä pysyy ruisleipä, sämpylä pysyy sämpylä, jäätelö pysyy jäätelö.
 * - ASCII/ääkkösetön vertailu on silti mukana fallbackina hasAny/hasWord-funktioissa,
 *   jotta käyttäjän "ruisleipa" osuu edelleen tuotteen "ruisleipä" nimeen.
 * - Tärkeä ero: hakusanaa ei enää korvata ääkkösettömällä muodolla koko hakuketjussa.
 */

function cleanSearchText(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/[“”"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSearchText(value: string | null | undefined): string {
  return cleanSearchText(value);
}

/**
 * ASCII fallback vain vertailuun.
 * Älä käytä tätä pääquerynä / canonicalQuerynä, koska suomalaisessa ruokahaussa
 * "ruisleipä" -> "ruisleipa" aiheuttaa helposti väärää rankkausta.
 */
export function normalizeSearchTextAscii(value: string | null | undefined): string {
  return cleanSearchText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function includesWithAsciiFallback(text: string, term: string): boolean {
  if (!text || !term) return false;

  if (text.includes(term)) return true;

  const asciiText = normalizeSearchTextAscii(text);
  const asciiTerm = normalizeSearchTextAscii(term);

  return asciiTerm.length > 0 && asciiText.includes(asciiTerm);
}

export function hasAny(text: string | null | undefined, terms: string[]): boolean {
  const normalizedText = normalizeSearchText(text);

  return terms.some((term) => {
    const normalizedTerm = normalizeSearchText(term);
    return normalizedTerm.length > 0 && includesWithAsciiFallback(normalizedText, normalizedTerm);
  });
}

function hasWordInNormalizedText(normalizedText: string, normalizedWord: string): boolean {
  if (!normalizedText || !normalizedWord) return false;

  return new RegExp(`(^|\\s)${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(
    normalizedText
  );
}

export function hasWord(text: string | null | undefined, word: string): boolean {
  const normalizedText = normalizeSearchText(text);
  const normalizedWord = normalizeSearchText(word);

  if (hasWordInNormalizedText(normalizedText, normalizedWord)) return true;

  const asciiText = normalizeSearchTextAscii(text);
  const asciiWord = normalizeSearchTextAscii(word);

  return hasWordInNormalizedText(asciiText, asciiWord);
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

export type ZiiplyPackageSize = {
  raw: string;
  amount: number;
  unit: string;
};

export function getProductPackageSize(product: {
  name?: string | null;
  title?: string | null;
  packageSize?: string | null;
}): ZiiplyPackageSize | null {
  const source = String(product.packageSize || [product.name, product.title].filter(Boolean).join(" "));

  const match = source.match(/\b(\d+(?:[,.]\d+)?)\s?(kg|g|l|ml|cl|kpl|pkt|ps|tlk)\b/i);
  if (!match) return null;

  const raw = normalizeSearchText(match[0]);
  const amount = Number(String(match[1]).replace(",", "."));
  const unit = normalizeSearchText(match[2]);

  if (!raw || !Number.isFinite(amount) || !unit) return null;

  return { raw, amount, unit };
}

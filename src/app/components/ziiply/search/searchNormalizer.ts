/**
 * Ziiply normal search normalizer.
 * Location: src/app/components/ziiply/search/searchNormalizer.ts
 */

import type { ZiiplyPackageSize, ZiiplySearchProductLike } from "./types";

export function normalizeFi(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " ja ")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEan(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "").trim();
}

export function tokenizeFi(value: string | null | undefined) {
  return normalizeFi(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueStable<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function hasWord(text: string, word: string) {
  const cleanText = normalizeFi(text);
  const cleanWord = normalizeFi(word);
  if (!cleanText || !cleanWord) return false;
  return new RegExp(`(^|\\s)${cleanWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(cleanText);
}

export function hasAny(text: string, terms: string[]) {
  const cleanText = normalizeFi(text);
  return terms.some((term) => {
    const cleanTerm = normalizeFi(term);
    if (!cleanTerm) return false;
    return cleanText === cleanTerm || cleanText.includes(cleanTerm);
  });
}

export function getProductSearchText(product: ZiiplySearchProductLike) {
  return normalizeFi([
    product.name,
    product.brandName,
    product.category,
    product.subCategory,
    product.comparisonPriceUnit,
    product.packageSizeText,
    product.packageSize,
    product.size,
    product.volume,
    product.weight,
  ].filter(Boolean).join(" "));
}

export function parsePackageSize(value: string | null | undefined): ZiiplyPackageSize | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const compact = raw.toLowerCase().replace(/,/g, ".");
  const match = compact.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|kpl|pcs)\b/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2] as ZiiplyPackageSize["unit"];
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (unit === "kg") return { amount, unit, normalizedAmount: amount * 1000, normalizedUnit: "g", raw };
  if (unit === "g") return { amount, unit, normalizedAmount: amount, normalizedUnit: "g", raw };
  if (unit === "l") return { amount, unit, normalizedAmount: amount * 1000, normalizedUnit: "ml", raw };
  if (unit === "ml") return { amount, unit, normalizedAmount: amount, normalizedUnit: "ml", raw };
  if (unit === "kpl" || unit === "pcs") return { amount, unit, normalizedAmount: amount, normalizedUnit: "kpl", raw };

  return { amount, unit: "unknown", normalizedAmount: amount, normalizedUnit: "unknown", raw };
}

export function getProductPackageSize(product: ZiiplySearchProductLike): ZiiplyPackageSize | null {
  return parsePackageSize([
    product.packageSizeText,
    product.packageSize,
    product.size,
    product.volume,
    product.weight,
    product.name,
  ].filter(Boolean).join(" "));
}

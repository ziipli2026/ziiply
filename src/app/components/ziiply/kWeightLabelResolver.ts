export type KWeightLabelResolution = {
  scannedEan: string;
  plu: string;
  priceCents: number;
  price: number;
  canonicalEan: string;
};

export function calculateEan13CheckDigit(first12: string) {
  if (!/^\d{12}$/.test(first12)) return null;
  const sum = [...first12].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return String((10 - (sum % 10)) % 10);
}

export function isValidEan13(value: string) {
  if (!/^\d{13}$/.test(value)) return false;
  return calculateEan13CheckDigit(value.slice(0, 12)) === value[12];
}

/**
 * K-store internal price-bearing scale label verified against real labels:
 * 20 00 RRRR PPPP C
 * RRRR = K internal PLU
 * PPPP = exact weighed purchase price in cents
 *
 * Product identity is resolved through K's zero-price canonical form:
 * 20 00 RRRR 0000 C
 *
 * Deliberately does NOT match GS1 23/24/25 variable-measure GTINs.
 */
export function resolveKWeightLabel(value: string): KWeightLabelResolution | null {
  const scannedEan = String(value || "").replace(/\D/g, "");
  if (!/^2000\d{9}$/.test(scannedEan) || !isValidEan13(scannedEan)) return null;

  const plu = scannedEan.slice(4, 8);
  const priceCents = Number(scannedEan.slice(8, 12));
  if (!Number.isInteger(priceCents) || priceCents <= 0) return null;

  const canonicalBody = `2000${plu}0000`;
  const checkDigit = calculateEan13CheckDigit(canonicalBody);
  if (checkDigit == null) return null;

  return {
    scannedEan,
    plu,
    priceCents,
    price: priceCents / 100,
    canonicalEan: canonicalBody + checkDigit,
  };
}

export type PriceWeightLabelResolution = {
  scannedEan: string;
  plu: string;
  priceCents: number;
  price: number;
};

/**
 * Chain-independent fallback for verified Finnish grocery price-bearing scale labels.
 * Real labels seen in Ziiply use 200x RRRR PPPP C, where PPPP is the exact
 * physical label total in cents. Identity may remain unknown; price must survive.
 */
export function resolvePriceWeightLabel(value: string): PriceWeightLabelResolution | null {
  const scannedEan = String(value || "").replace(/\D/g, "");
  if (!/^200\d{10}$/.test(scannedEan) || !isValidEan13(scannedEan)) return null;
  const plu = scannedEan.slice(4, 8);
  const priceCents = Number(scannedEan.slice(8, 12));
  if (!Number.isInteger(priceCents) || priceCents <= 0) return null;
  return { scannedEan, plu, priceCents, price: priceCents / 100 };
}

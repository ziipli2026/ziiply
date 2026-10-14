/** Numeric Product prices default to cents. Adapters must declare euro values explicitly. */
export type PriceAmountUnit = "cent" | "eur";
export function productMoneyEuros(value: unknown, unit: PriceAmountUnit = "cent"): number | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const explicitEuros = /€|EUR/i.test(raw);
  const amount = Number(raw.replace(/€|EUR/gi, ""));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return explicitEuros || unit === "eur" ? amount : amount / 100;
}

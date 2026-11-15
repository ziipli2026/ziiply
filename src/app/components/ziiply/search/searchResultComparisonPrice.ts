import { productMoneyEuros, type PriceAmountUnit } from "../productMoney";

type ComparisonUnit = "kg" | "l" | "kpl";

type PriceFields = {
  comparisonPrice?: unknown;
  comparisonPriceText?: unknown;
  comparisonPriceUnit?: unknown;
  comparisonPriceAmountUnit?: PriceAmountUnit;
  comparisonUnit?: unknown;
  unitPrice?: unknown;
  pricePerUnit?: unknown;
  priceUnit?: unknown;
  priceAmountUnit?: PriceAmountUnit;
  packageSize?: unknown;
  quantity?: unknown;
  unit?: unknown;
  name?: unknown;
  title?: unknown;
};

type SearchResult = PriceFields & {
  product?: PriceFields;
  storeItems?: PriceFields[];
  storeItem?: PriceFields;
  priceVerified?: boolean;
};

function comparisonUnit(value: unknown): ComparisonUnit | undefined {
  const unit = String(value ?? "").trim().toLowerCase().replace(/^(?:€|eur)\s*\/\s*/, "");
  if (/^(?:kg|kilo|kilogramma)$/.test(unit)) return "kg";
  if (/^(?:l|ltr|litra|litre|liter)$/.test(unit)) return "l";
  if (/^(?:kpl|pcs|pc|pkt)$/.test(unit)) return "kpl";
}

function packageAmount(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  // A weight range or a variable-weight pack cannot supply an exact unit price.
  if (/\d\s*[-–—]\s*\d|(?:^|\s)(?:n\.|noin)\s*\d/.test(text)) return null;
  const matches = [...text.matchAll(/(?:^|[^\d.,])(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|dl|ltr|litraa?|l)\b/g)];
  if (matches.length !== 1) return null;
  const [, count, raw, unit] = matches[0];
  const factors: Record<string, number> = { kg:1, mg:0.000001, g:0.001, ml:0.001, cl:0.01, dl:0.1, ltr:1, litra:1, litraa:1, l:1 };
  const amount = Number(raw.replace(",", ".")) * Number(count ?? 1) * factors[unit];
  return amount > 0 ? { amount, unit: (/^(?:kg|mg|g)$/.test(unit) ? "kg" : "l") as ComparisonUnit } : null;
}

export function formatSearchResultComparisonPrice(product: SearchResult, priceEuros: number | null) {
  if (product.priceVerified === false) return "";
  const nested = product.product;
  const pack = [product.packageSize, nested?.packageSize, product.quantity, nested?.quantity,
    product.unit, nested?.unit, product.name, product.title, nested?.name, nested?.title]
    .map(packageAmount).find(Boolean);
  const format = (value: number, unit: ComparisonUnit) =>
    `${value.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/${unit}`;

  for (const row of [product, product.storeItems?.[0], product.storeItem, nested]) {
    if (!row) continue;
    const declaredUnit = comparisonUnit(row.comparisonPriceUnit ?? row.comparisonUnit ?? row.priceUnit)
      ?? comparisonUnit(product.comparisonPriceUnit ?? product.comparisonUnit);
    const amountUnit = row.comparisonPriceAmountUnit ?? product.comparisonPriceAmountUnit
      ?? row.priceAmountUnit ?? product.priceAmountUnit ?? "cent";
    for (const candidate of [row.comparisonPrice, row.unitPrice, row.pricePerUnit, row.comparisonPriceText]) {
      if (candidate == null || candidate === "") continue;
      const text = String(candidate).trim();
      const formatted = text.match(/^(.+?)\s*(?:€|eur)\s*\/\s*(\S+)$/i);
      const unit = formatted ? comparisonUnit(formatted[2]) : declaredUnit;
      if (!unit || (pack && unit !== pack.unit)) continue;
      const amount = productMoneyEuros(formatted ? formatted[1] : candidate, formatted ? "eur" : amountUnit);
      if (amount !== null && amount > 0) return format(amount, unit);
    }
  }

  return pack && priceEuros !== null && Number.isFinite(priceEuros) && priceEuros > 0
    ? format(priceEuros / pack.amount, pack.unit)
    : "";
}

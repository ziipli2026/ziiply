type ComparisonQuote = {
  name: string;
  ean: string;
  price: number;
  priceAmountUnit: "eur";
  pictureUrl?: string;
  productUrl?: string;
};

function normalizedEan(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export async function fetchLidlBasketQuotes(name: string, barcode: string, storeId: string): Promise<ComparisonQuote[]> {
  const ean = normalizedEan(barcode);
  if (!storeId || !/^(?:\d{8}|\d{12,14})$/.test(ean)) return [];
  const params = new URLSearchParams({ ean, storeId });
  const response = await fetch("/api/lidl/ean-price?" + params, { cache: "no-store", signal: AbortSignal.timeout(6500) });
  if (!response.ok) throw new Error("Lidl basket price lookup failed");
  const body = await response.json();
  const quote = body.price;
  const price = Number(quote?.priceEur);
  if (body.status !== "fresh" || normalizedEan(quote?.ean) !== ean || quote?.storeId !== storeId || !Number.isFinite(price) || price <= 0) return [];
  return [{ name, ean, price, priceAmountUnit: "eur" }];
}

export async function fetchSparBasketQuotes(name: string, barcode: string, alternatives: string[] = []): Promise<ComparisonQuote[]> {
  const ean = normalizedEan(barcode);
  const queries = [...new Set([ean, name, ...alternatives].filter(Boolean))].slice(0, 6);
  const batches = await Promise.allSettled(queries.map(async search => {
    const params = new URLSearchParams({ search, intent: name });
    if (ean && search === ean) params.set("verifyEan", "1");
    const response = await fetch("/api/tokmanni/products?" + params, { cache: "no-store", signal: AbortSignal.timeout(6500) });
    if (!response.ok) throw new Error("SPAR–Tokmanni basket price lookup failed");
    const body = await response.json();
    const rows: unknown[] = Array.isArray(body.items) ? body.items : [];
    return rows.flatMap(row => {
      if (!row || typeof row !== "object") return [];
      const item = row as Record<string, unknown>;
      const price = Number(item.price);
      const name = String(item.name ?? item.title ?? "").trim();
      if (!name || item.priceVerified === false || item.priceAmountUnit !== "eur" || !Number.isFinite(price) || price <= 0) return [];
      return [{ name, ean: normalizedEan(item.ean), price, priceAmountUnit: "eur" as const, pictureUrl: String(item.pictureUrl ?? ""), productUrl: String(item.productUrl ?? "") }];
    });
  }));
  const successful = batches.filter(batch => batch.status === "fulfilled");
  if (batches.length && !successful.length) throw new Error("SPAR–Tokmanni basket price lookup failed");
  const quotes = successful.flatMap(batch => batch.value);
  const unique = new Map<string, ComparisonQuote>();
  for (const quote of quotes) {
    const key = JSON.stringify([quote.productUrl, quote.name, quote.price]);
    const previous = unique.get(key);
    if (!previous || (!previous.ean && quote.ean)) unique.set(key, quote);
  }
  return [...unique.values()];
}

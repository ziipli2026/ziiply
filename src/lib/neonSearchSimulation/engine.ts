export type Product = { ean?: string; id?: string; name: string; imageUrl?: string | null; price?: number | null };
export type Row = { key: string; ean?: string; name: string; imageUrl: string | null; sources: string[]; prices: Record<string, number | null> };
export type Snapshot = { rows: Row[]; stages: Record<string, string>; events: { source: string; status: string; elapsedMs: number; count?: number }[]; done: boolean };
export type Source = { id: string; search: (query: string, signal: AbortSignal) => Promise<Product[]> };
const validEan = (ean?: string) => /^\d{8,14}$/.test(ean || '') ? ean : undefined;

// Simulation only: no database writes, price lookups, recipe rules or UI dependencies.
export async function runSimulation(query: string, bank: Source, shops: Source[], signal: AbortSignal, publish: (state: Snapshot) => void, now = () => performance.now()) {
  const started = now();
  let state: Snapshot = { rows: [], stages: {}, events: [], done: false };
  const current = () => !signal.aborted;
  const emit = () => { if (current()) publish(structuredClone(state)); };
  const event = (source: string, status: string, count?: number) => {
    state.stages[source] = status;
    state.events.push({ source, status, elapsedMs: Math.round(now() - started), ...(count === undefined ? {} : { count }) });
  };
  const merge = (source: string, products: Product[], isBank: boolean) => {
    const rows = new Map(state.rows.map(row => [row.key, row]));
    products.forEach((product, index) => {
      const ean = validEan(product.ean);
      // Name similarity must never merge distinct packages or unrelated products.
      const key = ean ? `ean:${ean}` : `${source}:${product.id || index}`;
      const old = rows.get(key);
      const row: Row = old || { key, ean, name: product.name, imageUrl: null, sources: [], prices: {} };
      if (!row.name && product.name) row.name = product.name;
      if (!row.imageUrl && product.imageUrl) row.imageUrl = product.imageUrl;
      if (!row.sources.includes(source)) row.sources.push(source);
      if (!isBank) row.prices[source] = Number.isFinite(product.price) && Number(product.price) > 0 ? Number(product.price) : null;
      rows.set(key, row);
    });
    state.rows = [...rows.values()];
  };
  const load = async (source: Source, isBank: boolean) => {
    if (!current()) return;
    event(source.id, 'loading'); emit();
    try {
      const products = await source.search(query, signal);
      if (!current()) return;
      merge(source.id, products, isBank);
      event(source.id, products.length ? 'ready' : 'empty', products.length); emit();
    } catch {
      if (!current()) return;
      event(source.id, 'error'); emit();
    }
  };
  // Bank first. Every selected shop still runs even if the bank has matches or fails.
  await load(bank, true);
  if (!current()) return;
  await Promise.all(shops.map(source => load(source, false)));
  if (!current()) return;
  state = { ...state, done: true }; emit();
}

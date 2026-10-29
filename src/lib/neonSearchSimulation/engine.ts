export type Product = { ean?: string; id?: string; name: string; imageUrl?: string | null; price?: number | null };
export type Row = { key: string; ean?: string; name: string; imageUrl: string | null; sources: string[]; prices: Record<string, number | null> };
export type Snapshot = { rows: Row[]; pricedRows: Row[]; unpricedRows: Row[]; stages: Record<string, string>; events: { source: string; status: string; elapsedMs: number; count?: number }[]; done: boolean };
export type Source = { id: string; search: (query: string, signal: AbortSignal) => Promise<Product[]> };
const validEan = (ean?: string) => /^\d{8,14}$/.test(ean || '') ? ean : undefined;

// Generic token-aware relevance. A query term must match a whole word or a
// plausible Finnish compound prefix, not a substring inside another word.
const words = (value: string) => value.toLocaleLowerCase('fi-FI').normalize('NFKC').match(/[a-zåäö0-9]+/gu) || [];
export function relevanceForQuery(query: string, row: Row): number {
  const tokens = words(query);
  const nameWords = words(row.name);
  if (!tokens.length) return 0;
  const matched = tokens.filter(token => nameWords.some(word => word === token || word.startsWith(token) && (token.length >= 5 || word.length - token.length <= 2)));
  if (matched.length !== tokens.length) return -1;
  const exact = tokens.filter(token => nameWords.includes(token)).length;
  return exact * 10 + (nameWords.slice(0, tokens.length).join(' ') === tokens.join(' ') ? 5 : 0);
}
export function projectResults(query: string, rows: Row[]) {
  const pricedRows = rows.filter(row => Object.values(row.prices).some(price => Number.isFinite(price) && Number(price) > 0));
  const unpricedRows = rows.filter(row => !pricedRows.includes(row));
  const byRelevance = (a: Row, b: Row) => relevanceForQuery(query,b) - relevanceForQuery(query,a);
  pricedRows.sort(byRelevance);
  unpricedRows.sort(byRelevance);
  return { pricedRows, unpricedRows };
}
// Simulation only: no database writes, price lookups, recipe rules or UI dependencies.
export async function runSimulation(query: string, bank: Source, shops: Source[], signal: AbortSignal, publish: (state: Snapshot) => void, now = () => performance.now(), timeouts = { bankMs: 5000, shopMs: 5000 }) {
  const started = now();
  let state: Snapshot = { rows: [], pricedRows: [], unpricedRows: [], stages: {}, events: [], done: false };
  const current = () => !signal.aborted;
  const emit = () => { if (current()) { const projected = projectResults(query, state.rows); state.pricedRows = projected.pricedRows; state.unpricedRows = projected.unpricedRows; publish(structuredClone(state)); } };
  const event = (source: string, status: string, count?: number) => {
    state.stages[source] = status;
    state.events.push({ source, status, elapsedMs: Math.round(now() - started), ...(count === undefined ? {} : { count }) });
  };
  const merge = (source: string, products: Product[], isBank: boolean) => {
    const rows = new Map(state.rows.map(row => [row.key, row]));
    products.forEach((product, index) => {
      const ean = validEan(product.ean);
      // Name similarity must never merge distinct packages or unrelated products.
      const key = ean ? `ean:${ean}` : `${source}:${product.id ? `id:${product.id}` : `row:${index}`}`;
      const old = rows.get(key);
      const row: Row = old || { key, ean, name: product.name, imageUrl: null, sources: [], prices: {} };
      if (!row.name && product.name) row.name = product.name;
      if (!row.imageUrl && product.imageUrl) row.imageUrl = product.imageUrl;
      if (!row.sources.includes(source)) row.sources.push(source);
      if (!isBank) {
        const price = Number.isFinite(product.price) && Number(product.price) > 0 ? Number(product.price) : null;
        if (price !== null || row.prices[source] == null) row.prices[source] = price;
      }
      rows.set(key, row);
    });
    state.rows = [...rows.values()];
  };
  const load = async (source: Source, isBank: boolean) => {
    if (!current()) return;
    event(source.id, 'loading'); emit();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    let onAbort = () => {};
    try {
      const stop = new Promise<never>((_resolve, reject) => {
        onAbort = () => { controller.abort(); reject(new Error('Aborted')); };
        signal.addEventListener('abort', onAbort, { once: true });
        timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new Error('Timeout')); }, isBank ? timeouts.bankMs : timeouts.shopMs);
      });
      const products = await Promise.race([source.search(query, controller.signal), stop]);
      if (!current()) return;
      merge(source.id, products, isBank);
      event(source.id, products.length ? 'ready' : 'empty', products.length); emit();
    } catch {
      if (!current()) return;
      event(source.id, timedOut ? 'timeout' : 'error'); emit();
    } finally {
      clearTimeout(timer); signal.removeEventListener('abort', onAbort);
    }
  };
  // Bank first. Every selected shop still runs even if the bank has matches or fails.
  await load(bank, true);
  if (!current()) return;
  await Promise.all(shops.map(source => load(source, false)));
  if (!current()) return;
  state = { ...state, done: true }; emit();
}

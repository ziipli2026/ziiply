// Neon-first integration boundary for the existing mobile search.
// Pure/read-only: the caller supplies the currently selected store identities.
// Never substitutes fixed fixture stores or treats Neon data as a verified price.
const validEan = value => /^\d{8,14}$/.test(String(value || ''));
const validPrice = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
export function mergeSelectedStoreProducts(neonProducts, storeResults, selectedStores) {
  const allowed = new Set(selectedStores.map(s => String(s.id)));
  const rows = new Map();
  function put(product, storeId) {
    const ean = validEan(product.ean) ? String(product.ean) : null;
    const key = ean ? 'ean:' + ean : (storeId || 'neon') + ':id:' + String(product.id ?? product.name ?? '');
    const current = rows.get(key) || {key, ean, name: product.name || '', imageUrl: null, prices: {}, stores: []};
    if (!current.name) current.name = product.name || '';
    if (!current.imageUrl) current.imageUrl = product.imageUrl || product.pictureUrl || product.image || null;
    if (storeId && allowed.has(storeId)) {
      if (!current.stores.includes(storeId)) current.stores.push(storeId);
      if (validPrice(product.price)) current.prices[storeId] = product.price;
      else if (!(storeId in current.prices)) current.prices[storeId] = null;
    }
    rows.set(key, current);
  }
  for (const product of neonProducts) put(product, null);
  for (const {storeId, products} of storeResults) {
    if (!allowed.has(String(storeId))) continue;
    for (const product of products) put(product, String(storeId));
  }
  const lowest = row => [...allowed].map(id => row.prices[id]).filter(validPrice).reduce((a,b) => Math.min(a,b), Infinity);
  const all = [...rows.values()];
  const priced = all.filter(row => Number.isFinite(lowest(row))).sort((a,b) => lowest(a)-lowest(b));
  const unpriced = all.filter(row => !Number.isFinite(lowest(row)));
  return {priced, unpriced, rows: [...priced, ...unpriced]};
}

// Evidence-only transaction-price repair. Never guess from a unit price or discount.
// Evidence-based repair for any publisher issue; historical baselines are guarded by replay tests.
export function repairPublisherTransaction(row) {
  const nearby = Array.isArray(row.nearby) ? row.nearby.map(String) : [];
  const context = nearby.join(' ').replace(/\s+/g, ' ');
  const current = Number(row.spatialResolved?.value);
  if (!(current > 0)) return row;
  // "24-PACK 1099" is EUR 10.99 for the whole pack, not EUR 0.36 per bottle.
  const packs = [...context.matchAll(/\b(\d{1,2})\s*[- ]?PACK\s+(\d{3,4})(?!\d)/gi)]
    .map(m => ({count:Number(m[1]), value:Number(m[2])/100}));
  const ownCount = Number(String(row.title||'').match(/\b(\d{1,2})\s*[- ]?pack\b/i)?.[1]);
  const matching = packs.filter(p=>p.count===ownCount && p.value>0);
  const distinct = [...new Set(matching.map(p=>p.value.toFixed(2)))];
  if (ownCount>=2 && distinct.length===1 && Math.abs(current-matching[0].value)>.011) {
    return {...row, spatialResolved:{value:matching[0].value,quantity:1,unit:'pack',source:'publisher-owned-pack-total',sanity:'pass',confidence:'high'},debugReplacedConflictingPrice:row.spatialResolved};
  }
  // A publisher discount percentage is not a transaction price.
  const pct = [...context.matchAll(/(?:^|\s)-\s*(\d{1,2})\s*%/g)].map(m=>Number(m[1]));
  if (pct.includes(current) && !String(row.spatialResolved?.source||'').includes('printed')) {
    return {...row,spatialResolved:null,debugRejectedPercentageAsPrice:{value:current,reason:'publisher-discount-percentage-not-transaction'}};
  }
  return row;
}

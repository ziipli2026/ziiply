// Evidence-only transaction-price repair. Never guess from a unit price or discount.
// Evidence-based repair for any publisher issue; historical baselines are guarded by replay tests.
export function repairPublisherTransaction(row) {
  const nearby = Array.isArray(row.nearby) ? row.nearby.map(String) : [];
  const context = nearby.join(' ').replace(/\s+/g, ' ');
  const current = Number(row.spatialResolved?.value);
  if (!(current > 0)) return row;
  // Reject a percentage mistaken for a euro price BEFORE any nearby pack repair.
  // A publisher discount percentage is not a transaction price.
  const pct = [...context.matchAll(/(?:^|\s)[−–-]\s*(\d{1,2})(?!\d)\s*%/g)].map(m=>Number(m[1]));
  if (pct.includes(current) && !/printed|verified-transaction|publisher-owned-pack-total/i.test(String(row.spatialResolved?.source||''))) {
    return {...row,spatialResolved:null,debugRejectedPercentageAsPrice:{value:current,reason:'publisher-discount-percentage-not-transaction'}};
  }
  // "24-PACK 1099" is EUR 10.99 for the whole pack, not EUR 0.36 per bottle.
  const packs = [...context.matchAll(/\b(\d{1,2})\s*[- ]?PACK\s+(\d{3,4})(?!\d)/gi)]
    .map(m => ({count:Number(m[1]), value:Number(m[2])/100}));
  const titleCounts=[...String(row.title||'').matchAll(/\b(\d{1,2})\s*[- ]?pack\b/gi)].map(m=>Number(m[1]));
  const ownCount=titleCounts.length===1?titleCounts[0]:NaN;
  const matching = packs.filter(p=>p.count===ownCount && p.value>0);
  const distinct = [...new Set(matching.map(p=>p.value.toFixed(2)))];
  // A neighbouring promotion may advertise the same pack size. Never override
  // a valid publisher-owned transaction total solely on nearby text.
  const currentSource=String(row.spatialResolved?.source||'');
  const authoritativeTotal=/publisher-owned-pack-total|printed-transaction|verified-transaction/i.test(currentSource);
  const ambiguousPackEvidence=matching.length!==1;
  if (ownCount>=2 && !authoritativeTotal && !ambiguousPackEvidence && distinct.length===1 && Math.abs(current-matching[0].value)>.011) {
    return {...row, spatialResolved:{value:matching[0].value,quantity:1,unit:'pack',source:'publisher-owned-pack-total',sanity:'pass',confidence:'high'},debugReplacedConflictingPrice:row.spatialResolved};
  }
  return row;
}

import corrections from './data/kCitymarket42LVPriceCorrections.json';
const byId = new Map(corrections.patches.map(patch => [patch.id, patch]));
/** Price-only migration for already prepared editions; preserve identity and taxonomy. */
export function correctPreparedCitymarketPrices<T extends {id: string; price: number | null; sourceUrl: string}>(rows: T[]): T[] {
  return rows.map(row => {
    const patch = byId.get(row.id);
    if (!patch || row.sourceUrl !== corrections.sourceUrl || row.price !== patch.oldPrice) return row;
    const amount = patch.price.toFixed(2).replace('.', ',') + ' €';
    const basis = patch.offerQuantity > 1 ? `${patch.offerQuantity} ${patch.offerUnit}` : patch.offerUnit;
    const contents = 'packageCount' in patch ? ` (${patch.packageCount} kpl)` : '';
    return {...row, price: patch.price, priceText: `${amount} / ${basis}${contents}`,
      offerQuantity: patch.offerQuantity, offerUnit: patch.offerUnit, priceBasis: patch.priceBasis,
      ...('packageCount' in patch ? {packageCount: patch.packageCount} : {}),
      ...('depositTotal' in patch ? {depositTotal: patch.depositTotal} : {}),
      resolutionSource: patch.resolutionSource, resolutionSanity: 'pass'};
  });
}

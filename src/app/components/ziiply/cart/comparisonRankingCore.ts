/** Shared mobile/desktop comparison ranking. Never rank incomplete baskets by price alone. */
export type RankedComparisonResult = {
  comingSoon?: boolean;
  missingItems: number;
  foundItems: number;
  totalPrice: number;
};
export function rankComparisonResults<T extends RankedComparisonResult>(results: readonly T[]): T[] {
  return [...results].sort((a, b) => {
    if (a.comingSoon && !b.comingSoon) return 1;
    if (!a.comingSoon && b.comingSoon) return -1;
    const aComplete = a.missingItems === 0 && a.totalPrice > 0;
    const bComplete = b.missingItems === 0 && b.totalPrice > 0;
    if (aComplete && !bComplete) return -1;
    if (!aComplete && bComplete) return 1;
    if (!aComplete && !bComplete && a.foundItems !== b.foundItems)
      return b.foundItems - a.foundItems;
    if (a.totalPrice === 0) return 1;
    if (b.totalPrice === 0) return -1;
    return a.totalPrice - b.totalPrice;
  });
}

export type FuelComparisonSort = "distance" | "diesel" | "price95";

export function isValidFuelPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function sortFuelStations<T extends {
  distanceKm: number;
  diesel: number | null;
  price95: number | null;
}>(stations: readonly T[], sort: FuelComparisonSort): T[] {
  const distance = (station: T) => Number.isFinite(station.distanceKm) ? station.distanceKm : Infinity;
  return [...stations].sort((a, b) => {
    if (sort !== "distance") {
      const aPrice = isValidFuelPrice(a[sort]) ? a[sort] : Infinity;
      const bPrice = isValidFuelPrice(b[sort]) ? b[sort] : Infinity;
      if (aPrice !== bPrice) return aPrice < bPrice ? -1 : 1;
    }
    const aDistance = distance(a), bDistance = distance(b);
    return aDistance === bDistance ? 0 : aDistance < bDistance ? -1 : 1;
  });
}

export function buildFineliSaltEstimate(row) {
  if (!row || !Number.isFinite(Number(row.saltG100g))) return null;
  const value = Number(row.saltG100g);
  if (value < 0 || value > 100) return null;
  return {
    value,
    unit: "g/100g",
    source: "fineli-generic",
    estimated: true,
    label: "Fineli – arvio",
    fineliId: row.fineliId,
    foodName: row.foodName,
    confidence: row.confidence
  };
}

export function attachFineliSaltEstimate(nutrition, source, enabled, estimates) {
  const output = { ...nutrition };
  if (!enabled || source !== "open-food-facts" ||
      (output.salt_100g !== null && output.salt_100g !== undefined) ||
      !Array.isArray(estimates) || estimates.length !== 1) return output;
  const estimate = buildFineliSaltEstimate(estimates[0]);
  if (estimate) output.estimatedSalt = estimate;
  return output;
}

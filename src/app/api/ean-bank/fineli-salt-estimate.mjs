export function hasConflictingOffProductName(catalogName, offName) {
  const normalize = value => typeof value === 'string'
    ? value.toLocaleLowerCase('fi-FI').normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    : '';
  const catalog = normalize(catalogName);
  const off = normalize(offName);
  if (!catalog || !off) return false;
  const catalogTokens = new Set(catalog.split(' ').filter(x => x.length >= 3));
  const offTokens = new Set(off.split(' ').filter(x => x.length >= 3));
  // Reject only obvious mismatches, not ordinary brand/packaging name differences.
  return catalogTokens.size > 0 && offTokens.size > 0 &&
    ![...catalogTokens].some(token => offTokens.has(token));
}

export function buildFineliSaltEstimate(row) {
  if (!row || row.saltG100g === null || row.saltG100g === undefined || row.saltG100g === '' || !Number.isFinite(Number(row.saltG100g))) return null;
  if (!['verified', 'high'].includes(row.confidence) || !Number.isInteger(Number(row.fineliId)) || Number(row.fineliId) <= 0 || typeof row.foodName !== 'string' || !row.foodName.trim()) return null;
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

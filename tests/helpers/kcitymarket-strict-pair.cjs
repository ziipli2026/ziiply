function parseStrictPair(lines) {
  const anchor = lines.findIndex(line => line.startsWith("Ilman Plussa-korttia"));
  if (anchor < 2) return null;
  const digits = lines[anchor - 2], unit = lines[anchor - 1];
  if (anchor < 3 || !lines.slice(0, anchor - 2).some(line => /[A-Za-zÀ-ÿ]{3,}/.test(line))) return null;
  const normal = lines[anchor].match(/^Ilman Plussa-korttia\s+(\d{1,3}[,.]\d{2})\s*\/\s*(pkt|ps|rs|kpl|kg|tlk|plo|prk|ltk)\b/i);
  if (!/^\d{3,4}$/.test(digits) || !/^(PKT|PS|RS|KPL|KG|TLK|PLO|PRK|LTK)$/i.test(unit) || !normal || unit.toLowerCase() !== normal[2].toLowerCase()) return null;
  if (/(?:[–-]\s*\d|\btai\s+\d)/i.test(lines[anchor].slice(normal[0].length))) return null;
  const offer = Number(digits) / 100, regular = Number(normal[1].replace(",", "."));
  return offer < regular ? { offer, regular, unit, productContext: lines.slice(0, anchor - 2) } : null;
}

function classifyStoreScope(source) {
  return source?.kind === "VERIFIED_STORE_OFFERS" &&
    /^k-citymarket-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source?.storeId ?? "") &&
    source?.identityVerified === true &&
    source?.verifiedStoreId === source.storeId
    ? { storeScoped: true, storeId: source.storeId }
    : { storeScoped: false, storeId: null };
}
module.exports = { parseStrictPair, classifyStoreScope };

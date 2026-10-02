function parseStrictPair(lines) {
  if (!Array.isArray(lines) || lines.some(line => typeof line !== "string")) return null;
  // Strict candidates represent exactly one product/price block, never adjacent offers.
  if (lines.filter(line => line.startsWith("Ilman Plussa-korttia")).length !== 1) return null;
  const anchor = lines.findIndex(line => line.startsWith("Ilman Plussa-korttia"));
  if (anchor !== lines.length - 1) return null;
  if (anchor < 2) return null;
  const digits = lines[anchor - 2], unit = lines[anchor - 1];
  // Two adjacent compact price glyphs are ambiguous, not a product description.
  if (anchor >= 4 && /^\d{3,4}$/.test(lines[anchor - 3])) return null;
  // A multibuy price in product context must never be treated as a single-item price.
  if (lines.slice(0, anchor - 2).some(line => /\b\d+\s*(?:kpl|pkt|ps|rs|tlk|plo|prk|ltk)\s*(?:\/|[=:]|hintaan\s*)?\s*\d+[,.]\d{2}\b/i.test(line))) return null;
  if (anchor < 3 || !lines.slice(0, anchor - 2).some(line => /[A-Za-zÀ-ÿ]{3,}/.test(line))) return null;
  const normal = lines[anchor].match(/^Ilman Plussa-korttia\s+(\d{1,3}[,.]\d{2})\s*\/\s*(pkt|ps|rs|kpl|kg|tlk|plo|prk|ltk)\b(?:\s*\(\d{1,3}[,.]\d{2}\s*\/\s*(?:kg|l|kpl)\))?$/i);
  if (!/^[1-9]\d{2,3}$/.test(digits) || !/^(PKT|PS|RS|KPL|KG|TLK|PLO|PRK|LTK)$/i.test(unit) || !normal || unit.toLowerCase() !== normal[2].toLowerCase()) return null;
  if (/(?:[–-]\s*\d|\btai\s+\d)/i.test(lines[anchor].slice(normal[0].length))) return null;
  const offer = Number(digits) / 100, regular = Number(normal[1].replace(",", "."));
  if (!(offer > 0) || !(regular > 0) || !Number.isFinite(offer) || !Number.isFinite(regular)) return null;
  return offer < regular ? { offer, regular, unit, productContext: lines.slice(0, anchor - 2) } : null;
}

function classifyStoreScope(source) {
  return source?.kind === "VERIFIED_STORE_OFFERS" &&
    /^k-citymarket-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source?.storeId ?? "") &&
    source?.identityVerified === true &&
    source?.verifiedStoreId === source.storeId &&
    source?.evidence?.canonicalPageUrl === `https://www.k-ruoka.fi/kauppa/${source.storeId}` &&
    source?.evidence?.pageHttpStatus === 200 &&
    source?.evidence?.pageIdentitySeen === true &&
    source?.evidence?.offerFeedStoreId === source.storeId &&
    source?.evidence?.offerFeedIdentityVerified === true
    ? { storeScoped: true, storeId: source.storeId }
    : { storeScoped: false, storeId: null };
}
module.exports = { parseStrictPair, classifyStoreScope };

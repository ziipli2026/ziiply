const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
export function repairCitymarketPrintedTitle(row, rawTitle = row?.title ?? "") {
  let title = String(rawTitle ?? "").trim();
  const nearby = (row?.nearby ?? []).map(x => typeof x === "string" ? x : String(x?.text ?? x?.raw ?? "")).join(" ");
  if (/^ERIAT\b/i.test(title) && /Mikromåltider/i.test(nearby)) title = title.replace(/^ERIAT/i, "MIKROATERIAT");
  if (/^6KLASSIKOT(?=\s+\d)/i.test(title)) title = title.replace(/^6(?=KLASSIKOT)/i, "");
  title = title.replace(/\bAUHOINEN PERUNA\b/i, "JAUHOINEN PERUNA");
  if (/^tai\s+TAHRANPOISTOSUIHKE\s+150\s*ml$/i.test(title)) title = title.replace(/^tai\s+/i, "LV ");
  if (/^TÄYSMEHUT\b/i.test(title)) title = "Innocent " + title.replace(/\s+tai\s*$/i, "");
  if (/^SMOOTHIET\b/i.test(title)) title = "Innocent " + title;
  if (/^SILLIT 210[–-]245 g\/$/i.test(title)) title += "105–120 g";
  return title;
}
export function removeDuplicateContinuationRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  // Join only a same-page, same-discount LV continuation; do not mutate
  // source parser rows or collapse unrelated products sharing a price.
  const parentIndex = input.findIndex(row => /^LV PYYKINPESUNESTEET/i.test(String(row?.title ?? "")));
  const continuationIndex = input.findIndex(row => /^(?:tai|LV)\s+TAHRANPOISTOSUIHKE\s+150\s*ml$/i.test(String(row?.title ?? "")));
  let merged = input;
  if (parentIndex >= 0 && continuationIndex >= 0 && parentIndex !== continuationIndex) {
    const parent = input[parentIndex];
    const continuation = input[continuationIndex];
    const parentDiscount = Number(parent?.percentageOffer?.percent);
    const continuationDiscount = Number(continuation?.percentageOffer?.percent);
    if (Number(parent?.page) === Number(continuation?.page) &&
        parentDiscount > 0 && parentDiscount === continuationDiscount) {
      merged = input.filter((_, index) => index !== continuationIndex).map((row, index) =>
        row === parent ? { ...row, title: String(parent.title).trimEnd() + " tai TAHRANPOISTOSUIHKE 150 ml" } : row);
    }
  }
  return merged.filter((row, index) => {
    const title = normalize(row?.title);
    if (!title || title.length > 42) return true;
    const page = Number(row?.page) || 0;
    const size = row?.package;
    const price = Number(row?.spatialResolved?.value);
    return !merged.slice(0, index).some(previous => {
      if ((Number(previous?.page) || 0) !== page) return false;
      const previousPrice = Number(previous?.spatialResolved?.value);
      if (!Number.isFinite(price) || !Number.isFinite(previousPrice) || Math.abs(price - previousPrice) > 0.005) return false;
      const previousSize = previous?.package;
      if (!size || !previousSize || Math.abs(Number(size.min) - Number(previousSize.min)) > 0.000001 ||
          Math.abs(Number(size.max) - Number(previousSize.max)) > 0.000001) return false;
      const previousTitle = normalize(previous?.title);
      return previousTitle.includes(title) && previousTitle !== title;
    });
  });
}
export function repairCitymarketCategory(title, fallback = "Muut") {
  const s = normalize(title);
  if (/(?:mikroateriat|mikromåltider|kasvispiirakka|vihis|kiisselit|riisipuuro)/.test(s)) return "Valmisruoka";
  if (/(?:paprika|peruna|arrufatina|klementiin|mandariin|clementine)/.test(s)) return "Hevi";
  if (/(?:protein rahka|rahkat)/.test(s)) return "Maitotuotteet";
  if (/(?:täysmehut|smoothiet|vital hyvinvointimehut|kivennäisvedet)/.test(s)) return "Juomat";
  if (/(?:pastat)/.test(s)) return "Kuivatuotteet";
  if (/(?:savustettu kirjolohifilee|sillit|silli)/.test(s)) return "Kala";
  if (/(?:kinkkusuikaleet|hampurilaiset)/.test(s)) return "Liha & makkarat";
  if (/(?:pyykinpesunesteet|täyttöpussi|tahranpoistosuihke|wc-paperi)/.test(s)) return "Kodinhoito";
  if (/(?:arrufatina|klementiin|mandariin|clementine)/.test(s)) return "Hevi";
  if (/(?:moilas|rieskat|ruisleip|ohut tumma)/.test(s)) return "Leipomo";
  if (/(?:hampurilaiset)/.test(s)) return "Liha & makkarat";
  if (/(?:sillit|silli)/.test(s)) return "Kala";
  if (/(?:crispy fish)/.test(s)) return "Pakasteet";
  if (/(?:klassikot|konveh|juleskum|suklaat|suklaapallo)/.test(s)) return "Makeiset & keksit";
  if (/(?:nivea|vartalovoiteet|kroppskrämer)/.test(s)) return "Hygienia & kosmetiikka";
  if (/(?:tuoppi|kierrätysastia)/.test(s)) return "Koti & vapaa-aika";
  return fallback;
}

const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
export function repairCitymarketPrintedTitle(row, rawTitle = row?.title ?? "") {
  let title = String(rawTitle ?? "").trim();
  const nearby = (row?.nearby ?? []).map(x => typeof x === "string" ? x : String(x?.text ?? x?.raw ?? "")).join(" ");
  if (/^ERIAT\b/i.test(title) && /Mikromåltider/i.test(nearby)) title = title.replace(/^ERIAT/i, "MIKROATERIAT");
  if (/^6KLASSIKOT(?=\s+\d)/i.test(title)) title = title.replace(/^6(?=KLASSIKOT)/i, "");
  title = title.replace(/\bAUHOINEN PERUNA\b/i, "JAUHOINEN PERUNA");
  return title;
}
export function removeDuplicateContinuationRows(rows) {
  const input = Array.isArray(rows) ? rows : [];
  return input.filter((row, index) => {
    const title = normalize(row?.title);
    if (!title || title.length > 42) return true;
    const page = Number(row?.page) || 0;
    const size = row?.package;
    const price = Number(row?.spatialResolved?.value);
    return !input.slice(0, index).some(previous => {
      if ((Number(previous?.page) || 0) !== page) return false;
      const previousPrice = Number(previous?.spatialResolved?.value);
      if (!Number.isFinite(price) || !Number.isFinite(previousPrice) || Math.abs(price - previousPrice) > 0.005) return false;
      const previousSize = previous?.package;
      if (!size || !previousSize || Math.abs(Number(size.min) - Number(previousSize.min)) > 0.000001 ||
          Math.abs(Number(size.max) - Number(previousSize.max)) > 0.000001) return false;
      const previousTitle = normalize(previous?.title);
      const isContainedFragment = previousTitle.includes(title) && previousTitle !== title;
      // The clipped row must be a strict title fragment of the complete
      // same-page, same-package, same-price product. Nearby OCR can itself be clipped.
      return isContainedFragment;
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

// Conservative, publication-independent OCR cleanup. Never infer brands,
// prices, quantities or product identities from a neighbouring offer.
export function repairCitymarketOCRTitle(value) {
  let title=String(value??'').normalize('NFKC').replace(/\\s+/g,' ').trim();
  // OCR sometimes joins a duplicated text layer to the same word or size.
  // Only remove consecutive identical tokens, never non-adjacent words.
  title=title.replace(/\\b([A-Za-zÅÄÖåäö]{3,})\\s+\\1\\b/gi,'$1');
  title=title.replace(/\\b(\\d+(?:[,.]\\d+)?)\\s*(kg|g|ml|l)\\s+\\2\\b/gi,'$1 $2');
  // OCR can drop the initial letter from a line at the page margin.
  // Do not guess the missing character; keep the row for quality review.
  return title;
}

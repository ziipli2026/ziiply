// Conservative, publication-independent OCR cleanup. Never infer brands,
// prices, quantities or product identities from a neighbouring offer.
export function repairCitymarketOCRTitle(value) {
  let title=String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();
  // OCR sometimes joins a duplicated text layer to the same word or size.
  // Only remove consecutive identical tokens, never non-adjacent words.
  title=title.replace(/\b([A-Za-zÅÄÖåäö]{3,})\s+\1\b/gi,'$1');
  title=title.replace(/\b(\d+(?:[,.]\d+)?)\s*(kg|g|ml|l)\s+\2\b/gi,'$1 $2');
  // Recover unambiguous Finnish category words damaged by PDF text-layer
  // hyphenation or glyph substitution. Never infer an unknown product brand.
  title=title.replace(/\bMIKROATE\s*[-–]\s*RIAT\b/gi,"MIKROATERIAT");
  title=title.replace(/\bS2UKLAAPATUKAT\b/gi,"SUKLAAPATUKAT");
  title=title.replace(/\bVITAMIINIJ\s*[-–]\s*UOMAT\b/gi,"VITAMIINIJUOMAT");
  title=title.replace(/\bWC\s*[-–]\s*PAPERI\b/gi,"WC-PAPERI");
  // A page-edge numeral can be fused to a complete, unambiguous product word.
  // Only repair complete known words, never prices or unidentified brands.
  title=title.replace(/\bT1ORTILLA\b/gi,"TORTILLA");
  title=title.replace(/\bA4LKOHOLITON\b/gi,"ALKOHOLITON");
  title=title.replace(/\bC8HARDONNAY\b/gi,"CHARDONNAY");
  title=title.replace(/\bG9LÖGI\b/gi,"GLÖGI");
  title=title.replace(/\bH9aribo\b/gi,"Haribo");
  // OCR can drop the initial letter from a line at the page margin.
  // Do not guess the missing character; keep the row for quality review.
  return title;
}

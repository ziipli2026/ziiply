// Remove detached printed discount labels and repair line-wrap hyphenation.
// Do not change prices, quantities or package sizes.
export function clean42AVPrintedTitle(title){
 return String(title||'')
  .replace(/^[-−–]\s*\d{1,2}\s*%\s+(?=[A-ZÅÄÖ])/i,'')
  .replace(/^\d\.\s+(?=[A-ZÅÄÖ])/i,'')
  .replace(/([A-ZÅÄÖa-zåäö]{3,})-\s+(?!(?:ja|tai|sekä)\b)([A-ZÅÄÖa-zåäö]{3,})/gi,'$1$2')
  .replace(/\s+[-−–]\s*\d{1,2}(?:[–-]\d{1,2})?%\s*[-−–]?\s*$/,'')
  // Remove detached OCR price and slogan fragments only for unambiguous 42AV titles.
  .replace(/(MOUSSE ja VANUKAS PROTEIINIVAAHDOLLA 200 g) 4 PRK 69 Ei kreatiini \(6,25\/kg\) 5\./i,'$1')
  .replace(/(TONNIKALAPALOJA AURINGONKUKKAÖLJYSSÄ ja VEDESSÄ 145\/95–102 g) 6\. \(19,61–21,05\/kg\)/i,'$1')
  .replace(/\bSAVUKALGGUNA\b/gi,'SAVUKALKKUNA')
  .replace(/\bFl44ower\b/g,'Flower')
  .replace(/\s+/g,' ')
  .trim();
}

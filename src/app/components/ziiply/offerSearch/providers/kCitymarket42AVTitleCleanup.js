// Remove detached printed discount labels and repair line-wrap hyphenation.
// Do not change prices, quantities or package sizes.
export function clean42AVPrintedTitle(title){
 return String(title||'')
  .replace(/^[-−–]\s*\d{1,2}\s*%\s+(?=[A-ZÅÄÖ])/i,'')
  .replace(/^\d\.\s+(?=[A-ZÅÄÖ])/i,'')
  .replace(/([A-ZÅÄÖa-zåäö]{3,})-\s+([A-ZÅÄÖa-zåäö]{3,})/g,'$1$2')
  .replace(/\s+[-−–]\s*\d{1,2}(?:[–-]\d{1,2})?%\s*[-−–]?\s*$/,'')
  .replace(/\s+/g,' ')
  .trim();
}

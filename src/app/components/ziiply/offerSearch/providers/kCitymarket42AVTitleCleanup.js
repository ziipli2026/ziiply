// Remove only detached visual prefixes from the publisher heading.
// Never modify transaction metadata or numbers within a product title.
export function clean42AVPrintedTitle(title){
 return String(title||'')
  .replace(/^[-−–]\s*\d{1,2}\s*%\s+(?=[A-ZÅÄÖ])/i,'')
  .replace(/^\d\.\s+(?=[A-ZÅÄÖ])/i,'');
}

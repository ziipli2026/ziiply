// A safety gate for price blocks confirmed incorrect against the printed 45LV PDF.
// Do not substitute a guessed amount: keep the offer out until the parser is verified.
export function isUnverified45LVPrice(leafletUrl,page,title){
  if(!/90e9db1_tarjouslehti_45LV_KCM/i.test(String(leafletUrl||''))) return false;
  const name=String(title||'').trim();
  // The OCR can prepend the brand or a stray digit to the product heading.
  // Match the distinctive product term, but only on its reviewed PDF page.
  if(page===3 && /(?:KOLMIOJUUSTOPALAT|(?:CREAM|RUIS)\\s+CRACKER)/i.test(name)) return true;
  if(page===4 && /(?:MEETVURSTIT|M4EETVURSTIT)/i.test(name)) return true;
  if(page===9 && /VIRVOITUSJUOMAT/i.test(name)) return true;
  return false;
}

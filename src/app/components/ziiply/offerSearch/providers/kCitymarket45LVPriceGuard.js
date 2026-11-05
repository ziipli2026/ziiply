// A safety gate for price blocks confirmed incorrect against the printed 45LV PDF.
// Do not substitute a guessed amount: keep the offer out until the parser is verified.
export function isUnverified45LVPrice(leafletUrl,page,title){
  if(!/90e9db1_tarjouslehti_45LV_KCM/i.test(String(leafletUrl||''))) return false;
  const name=String(title||'').trim();
  if(page===3 && /^(?:KOLMIOJUUSTOPALAT|ja RUIS CRACKER)\b/i.test(name)) return true;
  if(page===4 && /^M4EETVURSTIT\b/i.test(name)) return true;
  if(page===9 && /^VIRVOITUSJUOMAT\b/i.test(name)) return true;
  return false;
}

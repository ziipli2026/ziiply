// A safety gate for price blocks confirmed incorrect against the printed 45LV PDF.
// Do not substitute a guessed amount: keep the offer out until the parser is verified.
export function isUnverified45LVPrice(leafletUrl,page,title){
  if(!/90e9db1_tarjouslehti_45LV_KCM/i.test(String(leafletUrl||''))) return false;
  if(verified45LVTransaction(leafletUrl,page,title)) return false;
  const name=String(title||'').trim();
  // The OCR can prepend the brand or a stray digit to the product heading.
  // Match the distinctive product term, but only on its reviewed PDF page.
  if(page===3 && /(?:KOLMIOJUUSTOPALAT|(?:CREAM|RUIS)\s+CRACKER)/i.test(name)) return true;
  if(page===8 && /KÄÄREELLISET\s+KONVEHDIT/i.test(name)) return true;
  return false;
}

// PDF-verified transaction totals for the immutable 45LV publication.
// These are the checkout totals, NOT the printed per-item or per-litre rates.
export function verified45LVTransaction(leafletUrl,page,title){
  if(!/90e9db1_tarjouslehti_45LV_KCM/i.test(String(leafletUrl||''))) return null;
  const name=String(title||'').trim();
  // Exact PDF headings for this edition. The second cracker line belongs
  // to the same two-pack transaction as the first.
  if(page===3 && /^(?:VALIO )?KOLMIOJUUSTOPALAT 45[–-]300 g$/i.test(name)) return {price:5.99,quantity:1,unit:'KPL',title:'Valio KOLMIOJUUSTOPALAT 245–300 g',priceLabel:'kpl',reviewedCard:true};
  if(page===3 && /^(?:KANTOLAN )?CREAM CRACKER 200 g$/i.test(name)) return {price:3,quantity:2,unit:'PKT',title:'Kantolan CREAM CRACKER 200 g ja RUIS CRACKER 225 g',priceLabel:'2 pkt',reviewedCard:true};
  if(page===8 && /^KÄÄREELLISET KONVEHDIT 250[–-]320 g(?: \(15,63[–-]20,00\/kg\))?$/i.test(name)) return {price:10,quantity:2,unit:'RS',title:'Fazer KÄÄREELLISET KONVEHDIT 250–320 g',priceLabel:'2 rs',reviewedCard:true};
  if(page===8 && /^KÄÄREELLISET KONVEHDIT 209 g(?: \(21,48\/kg\))?$/i.test(name)) return {price:4.49,quantity:1,unit:'RS',title:'Marabou tai Oreo KÄÄREELLISET KONVEHDIT 209 g',priceLabel:'rs',reviewedCard:true};
  if(page===4 && /(?:MEETVURSTIT|M4EETVURSTIT)/i.test(name)) return {price:4.50,quantity:2,unit:'KPL'};
  if(page===9 && /VIRVOITUSJUOMAT/i.test(name) && /24[- ]?pack/i.test(name)) return {price:12.99,quantity:1,unit:'PKT',depositAmount:2.40};
  return null;
}

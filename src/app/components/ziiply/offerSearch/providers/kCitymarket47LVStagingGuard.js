// Publication gate for the PDF-reviewed 47LV edition. Do not silently
// rewrite a questionable price: fail the candidate before it reaches Neon.
export function validate47LVPublication(offers, publicationKey) {
  if (publicationKey !== '2026-11-19-W47-LV') return {ok:true,issues:[]};
  const issues=[];
  if (!Array.isArray(offers) || offers.length < 45) issues.push('47LV-offer-count-below-reviewed-minimum');
  const titles=new Set();
  for (const [index,offer] of (offers||[]).entries()) {
    const title=String(offer?.title||'').trim();
    const price=offer?.price;
    const discount=offer?.discountPercent;
    if (!title) issues.push('missing-title:'+index);
    if (/^Haribo JOULUKALENTERI 300 g(?: \(32,63\/kg\))?\s+79$/i.test(title))
      issues.push('detached-price-digits-in-title:'+index+':'+title);

    const offerId=String(offer?.id||'');
    if (/^Innocent TÄYSMEHUT 900 ml\/pl tai SMOOTHIET 750 ml\/pl$/i.test(title) && offer?.unitPrice != null)
      issues.push('ambiguous-innocent-unit-price:'+index);
    if (/^ALKOHOLITON GLÖGI 0,75 l\/pl Ei luomu \(5,59\/l\) Sis\. pantin 0,10$/i.test(title) && (Number(price)!==4.29 || Number(offer?.unitPrice)!==5.59))
      issues.push('incorrect-deposit-adjusted-glogi-unit-price:'+index);
    if (/mascaror|voimassa to[–-]su|joulukalenteri 300 g \(32,63\/kg\) 79/i.test(offerId))
      issues.push('publisher-artifact-in-offer-id:'+index+':'+offerId);
    if (/\bVoimassa\s+TO[–-]SU\b|\bConcealers\s*&\s*Telescopic\b|\bmascaror\b/i.test(title))
      issues.push('publisher-footer-in-title:'+index+':'+title);
    if (/^(?:TUOTTEET ja COSRX-TUOTTEET|NAUDAN LEHTIPIHVI|ULKOFILEESTÄ tai MUREUTETTU|NAUGHTY BURGER)$/i.test(title)
      || /PUNAKAALI KG PÄÄRYNÄ KG|JOGURTTIJUOMAT PROTEIN RAHKAT|^vadelmainen, mausteinen/i.test(title)
      || /^4 LEVITTEET|^H3O T D O G|^RANTIT 45 ml/i.test(title))
      issues.push('merged-or-orphan-title:'+index+':'+title);
    if (!(typeof price==='number' && Number.isFinite(price) && price>0)
      && !(typeof discount==='number' && Number.isFinite(discount) && discount>0 && discount<100))
      issues.push('missing-price-and-discount:'+index+':'+title);
    if (/(?:G9LÖGI|GLÖGI) 8 %/i.test(title) && Number(price)>20)
      issues.push('unverified-glogi-price:'+index+':'+price);
    if (!offer?.category || offer.category==='Muut')
      issues.push('missing-category:'+index+':'+title);
    const key=title.toLocaleLowerCase('fi')+'|'+price+'|'+(discount??'');
    if(titles.has(key))issues.push('duplicate-offer:'+index+':'+title);
    titles.add(key);
  }
  const required=[
    'PUNAKAALI Suomi','CELINA PÄÄRYNÄ Suomi','Järvikylä ROSMARIINI Suomi',
    'Oksasen puutarha JUICY SALAATTI 125 g Suomi',
    'Arla PROTEIN RAHKAT 200 g','Danone ACTIMEL JOGURTTIJUOMAT 8 x 100 g',
    'Vaasan THE BRGR NAUGHTY BURGER 4 kpl/320 g'
  ];
  for(const title of required)if(!(offers||[]).some(o=>o.title===title))issues.push('missing-pdf-reviewed-card:'+title);
  return {ok:issues.length===0,issues};
}

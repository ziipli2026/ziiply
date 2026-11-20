// Grocery and everyday consumables only. Uncertain items are quarantined,
// never silently moved to "Muut" or published as grocery offers.
const ALLOWED=new Set(['Hevi','Hedelmät & vihannekset','Liha','Liha & makkarat','Kala','Maitotuotteet','Leipomo','Kuivatuotteet','Makeiset & keksit','Juomat','Pakasteet','Valmisruoka','Lastenruoat','Hygienia & kosmetiikka','Kodinhoito','Kahvi & tee','Lemmikit']);
const REJECTED=new Set(['Koti & vapaa-aika','Muut','Vaatteet','Elektroniikka','Työkalut','Sisustus','Lelut']);
export function partitionDailyGroceryOffers(offers){
 const accepted=[],quarantined=[];
 for(const offer of offers||[]){
  const category=String(offer?.category||'').trim();
  const title=String(offer?.title||'').trim();
  const reason=!title?'missing-title':!category?'missing-category':REJECTED.has(category)?'not-daily-grocery':!ALLOWED.has(category)?'unrecognized-category':null;
  if(reason)quarantined.push({offer,reason});else accepted.push(offer);
 }
 return {accepted,quarantined};
}

// Recognizable durable goods must be excluded before offer rows are created.
export function isNonGroceryLeafletTitle(title) {
 const repaired=String(title||'').replace(/(?<=\p{L})\d(?=\p{L})/gu,'');
 return /(?:kalenteri\s+a[456]|pöytäkalenter|kopieringspapper|kopiopaper|juomalas|viinilas|valosarj|led[- ]?valais|taskulamp|säilytyslaatik|lautapel|peittoset|sähkömopp|silitysraut|merinovilla\s+aluspaita)/i.test(repaired);
}

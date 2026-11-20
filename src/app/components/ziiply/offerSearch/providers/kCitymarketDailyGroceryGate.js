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

// Tjek discount cards can arrive without a category, and a store selection
// can include durable goods from the same nationwide leaflet.
/**
 * @template {{title?: unknown, name?: unknown, category?: unknown}} T
 * @param {T[]} offers
 * @param {(title: string) => string} classifyTitle
 * @returns {Array<T & {category: string}>}
 */
export function filterCitymarketAdditionalGroceryOffers(offers, classifyTitle) {
 return offers.flatMap(offer=>{
  const title=String(offer.title||offer.name||'').trim();
  if(!title||isNonGroceryLeafletTitle(title)||
    /paistoasti|keittoast|paistinpann|lelut?|lego|palikkarasi|korttipel|lautapeli|kirjoja|kirjat\b|kirjallisuus|pokkare|pyykinkuivausteline|pukupuss|säilytyslaatik|kodintekstiil|sesonkival|jääkiekkomail|pussilakana|koristetyyny|päiväpeit|kylpyhuonetekstiil|aterinset|\baterimet\b|leivontakulh|\bastioita\b|matkalauk|lompak|vaatte|keng[äe]|kenki|päähine|huivit|otsavalo|(?:finlayson|hemtex).*pyyhke|pyjama/i.test(title))return [];

  // Personal-care appliances are durable goods, even when a store labels them
  // as hygiene. Keep consumable replacement heads/blades and paper products.
  if(/(?:sähköhammasharj|parranajokon|trimmer|hiustenmuotoilulait|hiustenkuivain|suoristusraut|kiharrin|led[- ]?valomask|kasvoharj|sähköinen\s+kasvoharj)/i.test(title))return [];

  let category=String(offer.category||'').trim();
  if(/joulukalenteri/i.test(title)&&/haribo|kinder|lindt|teddy|after eight|kitkat|smarties|nestlé|dolci/i.test(title)){
   category='Makeiset & keksit';
  }else if(/(?:juustoviipale|juustosiivu|cheese\\s+slices?|hampurilaiss[äa]mpyl|burgeris[äa]mpyl|burger\\s+buns?|hamburger\\s+buns?|the\\s+brgr\\s+naughty\\s+burger)/i.test(title)){
   // Product-form precedence overrides a stale but technically allowed Tjek category.
   category=classifyTitle(title);
  }else if(!ALLOWED.has(category)){
   category=classifyTitle(title);
  }
  return ALLOWED.has(category)?[{...offer,category}]:[];
 });
}

import { correctSearchQuery, resolveSearchIntentAI, isProductAllowedByIntent } from './searchIntentAI';

/** Desktop normal-search contract, shared by retrieval qualification and display.
 * Synonyms are directional: cola includes Pepsi, Pepsi never means every cola.
 * Unknown brands stay literal; fuzzy correction is only applied to a whole query.
 */
export function searchWords(value: unknown): string[] {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('fi-FI')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d)[,.](\d)/g, '$1.$2')
    .match(/[a-z]+|\d+(?:\.\d+)?/g) || [];
}
const forms: Record<string, string> = {
  kanan:'kana', broilerin:'broileri', kermat:'kerma',
  maitoa:'maito', maidon:'maito', maidot:'maito', kahvia:'kahvi', kahvin:'kahvi',
  juustoa:'juusto', juuston:'juusto', juustot:'juusto', leipaa:'leipa', leivat:'leipa',
  jogurttia:'jogurtti', jogurtin:'jogurtti', jugurtti:'jogurtti', jugurti:'jogurtti',
  voita:'voi', kermaa:'kerma', kerman:'kerma', jauhelihaa:'jauheliha',
  perunoita:'peruna', perunat:'peruna', perunaa:'peruna', porkkanoita:'porkkana',
  tomaatteja:'tomaatti', tomaatin:'tomaatti', kurkkua:'kurkku', kurkun:'kurkku',
  omenoita:'omena', banaaneja:'banaani', kananmunia:'kananmuna', kananmunat:'kananmuna',
  munia:'kananmuna', munat:'kananmuna', sipsit:'sipsi', ranskikset:'ranskanperuna',
  limsat:'limsa', limut:'limsa', limu:'limsa', kokis:'cola', cokis:'cola',
  kaurahiutaleet:'kaurahiutale', ruisleivat:'ruisleipa', makkarat:'makkara', nakit:'nakki',
};
const canonical = (word: string) => forms[word] || word;
const alternatives: Record<string, string[]> = {
  maito:['maito','kevytmaito','täysmaito','ykkösmaito','luomumaito','rasvaton maito'],
  kahvi:['kahvi','juhla mokka','kulta katriina'],
  ketsuppi:['ketsuppi','ketchup'], ketsuppia:['ketsuppi','ketchup'],
  zero:['zero','sokeriton','max'], sokeriton:['sokeriton','zero','max'],
  pepsi:['pepsi'],
  cola:['cola','pepsi','coke'], limsa:['virvoitusjuoma','limonadi','cola','pepsi','fanta','sprite','jaffa'],
  broileri:['broileri','kana'], kana:['kana','broileri'], jogurtti:['jogurtti','yoghurt','yogurt'],
  sipsi:['sipsi','perunalastu','chips'], kananmuna:['kananmuna','muna'],
};
const compoundPrefixes=new Set(['kevyt','tays','luomu','ruis','kaura','maito','kerma','vuohen','soija','manteli','ykkos','rasvaton','sulate','tuore','rae','proteiini','varhais','ruoka','kesa','pika','jaa','vihrea','musta','yrtti','suodatin','pannu','papu','grilli','lenkki','nakki','juusto','havu','meri','hieno','sormi','puna','kirsikka','mini']);
const units: Record<string, [string, number]> = {
  kg:['g',1000], g:['g',1], l:['ml',1000], dl:['ml',100], cl:['ml',10], ml:['ml',1], kpl:['kpl',1],
};
function parse(value: unknown) {
  const words = searchWords(value).map(canonical);
  const sizes: string[] = [];
  const terms: string[] = [];
  for(let i=0;i<words.length;i++) {
    if (/^\d/.test(words[i]) && units[words[i+1]]) {
      const [unit, factor] = units[words[i+1]];
      sizes.push(`${Math.round(Number(words[i])*factor*1000)/1000}${unit}`); i++;
    } else terms.push(words[i]);
  }
  return {terms, sizes};
}
export function desktopSearchQuery(raw: string): string {
  // Preserve decimal punctuation and measurement units; the legacy correction
  // normalizer replaces decimal commas with spaces.
  const clean=raw.normalize('NFKC').trim().replace(/\s+/g,' ');
  if (/\d/.test(clean)) return clean;
  const corrected=correctSearchQuery(clean);
  return corrected || clean;
}
export function desktopSearchQueries(raw: string): string[] {
  const q=desktopSearchQuery(raw);
  const words=searchWords(q).map(canonical);
  // No default pack sizes, brands or extra attributes are invented.
  const normalized=/\d/.test(q) ? q : words.join(' ');
  const parsed=parse(q);
  // Expand each requested term, including combinations, without dropping
  // modifiers. E.g. cola zero -> Pepsi Max / cola sokeriton, not plain cola.
  let variants:string[][]=[[]];
  for(const term of parsed.terms) {
    variants=variants.flatMap(prefix=>(alternatives[term] || [term]).map(word=>[...prefix,word])).slice(0,24);
  }
  const retrievalSizes=q.match(/\d+(?:[.,]\d+)?\s*(?:kg|ml|cl|dl|l|g|kpl)\b/gi) || [];
  const family=variants.map(terms=>[...terms,...retrievalSizes].join(' '));
  return [...new Set([q, normalized, ...family])].filter(Boolean).slice(0,6);
}
type Row = {name?: string; title?: string; brand?: string; brandName?: string; category?: string; ean?: string; __price?: number | null; quantity?: string};
export function desktopSearchDecision(query: string, product: Row) {
  if (/^\d{8,14}$/.test(query.trim())) return {accepted: product.ean===query.trim(), score:10000, reason:'exact_ean'};
  const q=parse(desktopSearchQuery(query));
  if(/\b(?:tai|valitse)\b/.test(searchWords(product.name).join(' ')) && !/\b(?:tai|valitse)\b/.test(query))
    return {accepted:false,score:-10000,reason:'ambiguous_product_choice'};
  const brand=parse(product.brandName || product.brand).terms;
  let productWords=searchWords(product.name || product.title);
  const knownFamily=q.terms.flatMap(t=>alternatives[t] || []);
  const brandDefinesFamily=(q.terms.includes('cola') && /^coca cola(?: |$)/.test(brand.join(' '))) || knownFamily.some(t=>brand.join(' ')===t || brand.join(' ').startsWith(t+' '));
  if(brand.length && !brand.every(t=>q.terms.includes(t)) && !brandDefinesFamily) {
    const index=productWords.findIndex((_,i)=>brand.every((t,j)=>canonical(productWords[i+j] || '')===t));
    if(index>=0)productWords=[...productWords.slice(0,index),...productWords.slice(index+brand.length)];
  }
  const name=parse(productWords.join(' '));
  const categoryLeaf=String(product.category || '').split('/').at(-1) || '';
  const category=parse(categoryLeaf).terms;
  const intent=resolveSearchIntentAI(desktopSearchQuery(query));
  intent.includeTerms=[...intent.includeTerms,...q.terms.flatMap(t=>alternatives[t] || [])];
  if (!isProductAllowedByIntent({...product, category:categoryLeaf, brandName:product.brandName || product.brand},intent))
    return {accepted:false,score:-10000,reason:'wrong_product_group'};
  if (!q.terms.length) return {accepted:false,score:0,reason:'empty_query'};
  const nameText=productWords.join(' ');
  const identityText=searchWords(product.name || product.title).join(' ');
  const categoryText=searchWords(product.category).join(' ');
  const categoryLeafText=searchWords(categoryLeaf).join(' ');
  const nonfood=['shampoo','hoitoaine','tuoksusuihke','saippua','suihkugeeli','kosmetiikka','pesuaine','huulivoide','vartalovoide','hiusnaamio'];
  if(intent.intent!=='unknown' && nonfood.some(t=>(identityText+' '+categoryText).includes(t) && !q.terms.some(w=>w.includes(t))))
    return {accepted:false,score:-10000,reason:'non_food_product'};
  if(q.terms.some(t=>['cola','limsa'].includes(t)) && /ene(?:r)?giajuoma/.test(identityText) && !q.terms.some(t=>t.includes('energiajuoma')))
    return {accepted:false,score:-10000,reason:'energy_drink_other_group'};
  const alcohol=['alkoholi','jaloviina','vodka','likoori','rommi','whisky','lonkero'];
  if(q.terms.some(t=>['cola','limsa','kahvi'].includes(t)) && alcohol.some(t=>(identityText+' '+categoryText).includes(t) && !q.terms.some(w=>w.includes(t))))
    return {accepted:false,score:-10000,reason:'alcoholic_other_product'};
  // Product type takes precedence over a flavour/ingredient word. These
  // shared classes apply across queries, including catalog categories which
  // contain no usable taxonomy (opaque supplier codes).
  const typeRules: [string, RegExp][] = [
    ['nonfood', /shampoo|hoitoaine|tuoksusuihke|kosmetiikka|kauneus|hygienia|epsom|kylpysuola|eteerinen|hius|palapeli|pyydys|torjunta|ilmapallo|sirotin|pippurimylly|ruoanvalmistusastia|lelu|hiusoljy|elvital/],
    ['pet', /best in|bestin|kssanherkku|almo nature|purina|whiskas|pedigree|schesir|shelma|cesar|koir|kiss|lemmik/],
    ['snacks', /chips|snacks|snack|sipsi|naksu|puffs|perunalastu|juusto rinkula/],
    ['sauce', /kastike|sauce|dressing|dippi/],
    ['juice', /mehu|smoothie/],
    ['cream_soda', /cream soda|strawberries cream/],
    ['concentrate', /sodastream|juomatiiviste|siirappi/],
    ['additive', /stabilointiaine|hyyteloimisaine|sakeuttamisaine/],
    ['nuts', /pahkina|cashew|pistaasi|(?:^| )manteli(?: |$)|(?:^| )siemen(?: |$)/],
    ['sweets', /candy|gummy|toffee|suklaa|tryffeli|makeis|karkki|konvehti|purukumi|pastilli/],
    ['prepared', /valmisruo|mikroateria|pizza|pitsa|panini|patonki|kanakastike|vegekastike|keitto|ateriat|ateria|salaatti|tahna|perunamuus|kermaperun|sose|pyree|kiusaus|gratiini/],
    ['processed_meat', /makkara|nakki|lihaleikkele/],
    ['spread', /& voi|margariini|rasvalevit|rasvaseos/],
    ['babyfood', /lastenruo|piltti|vauvanruo/],
    ['bakery', /leivonnai|leivos|kakku|keksi|kranssi|wiener|vohveli|pullapitko/],
    ['yogurt', /jogurtti|jogurtit|yoghurt|yogurt|skyr|vanukas/],
    ['icecream', /jaatelo|mehujaa|sorbet/],
    ['coffee', /cappuccino|latte|kahvijauhe|kahvi|kaakao/],
    ['drink', /virvoitusjuoma|limonadi|kivennais|lahdeves|vitaminoitu vesi|energiajuoma|smoothie|juoma|mehu|(?:^| )tee(?: |$)/],
  ];
  const rawIngredientTerms=new Set(['mehu','vesi','tee','olut','pasta','murot','kaurahiutale','piima','jogurtti','leipa','maito','juusto','kerma','rahka','voi','riisi','jauheliha','kana','broileri','kinkku','lohi','peruna','porkkana','tomaatti','kurkku','banaani','omena','appelsiini','sokeri','suola','oljy','jauho']);
  const rawIntent=q.terms.some(t=>rawIngredientTerms.has(t));
  const requestedTypes=new Set(typeRules.filter(([,pattern])=>pattern.test(q.terms.join(' '))).map(([type])=>type));
  if(q.terms.some(t=>['cola','limsa','vesi','tee','olut','mehu'].includes(t)))requestedTypes.add('drink');
  if(q.terms.some(t=>['kinkku','makkara','nakki','leikkele'].includes(t)))requestedTypes.add('processed_meat');
  if(rawIntent || ['kahvi','cola','limsa','vesi','tee'].some(t=>q.terms.includes(t))) {
    for(const [type,pattern] of typeRules) {
      const typeCategory=(type==='drink'||type==='concentrate') ? categoryLeafText : categoryText;
      if(!pattern.test(identityText+' '+typeCategory) || requestedTypes.has(type))continue;
      if(type==='drink' && q.terms.some(t=>['cola','limsa','vesi','tee'].includes(t)))continue;
      // Category "mehu" is unrelated to a fresh orange search, just as a
      // cheese-flavoured snack is unrelated to the cheese shelf.
      return {accepted:false,score:-10000,reason:'different_product_type:'+type};
    }
  }
  const nameTypes: [string,RegExp][]=[['cheese',/juusto|edam|gouda|emmental|cheddar|mozzarella/],['meat',/kana|broileri|naudan|nauta|porsaan|possu|liha|kinkku|lohi/]];
  for(const [type,pattern] of nameTypes) {
    if((rawIntent || ['cola','limsa','kahvi','vesi','tee'].some(t=>q.terms.includes(t))) && pattern.test(nameText) && !pattern.test(q.terms.join(' ')))
      return {accepted:false,score:-10000,reason:'different_named_product:'+type};
  }
  const pet=/\b(?:koir|kiss|lemmik|dog|cat)/;
  const petRequest=q.terms.some(t=>pet.test(t));
  if(!petRequest && pet.test(nameText+' '+categoryText))
    return {accepted:false,score:-10000,reason:'pet_product'};
  if(q.terms.includes('kana') && /kananmuna|kananmun|munavalmiste/.test(nameText))
    return {accepted:false,score:-10000,reason:'different_product_group'};
  // A requested ingredient is not automatically the finished product. Keep
  // this guard directional so explicit searches for these products still work.
  const accessories=['tutti','pulloharja','suodatinpussi','kahvinsuodatin','avaaja','leipaveitsi','olutlasi','kahvimuki'];
  if(accessories.some(t=>nameText.includes(t) && !q.terms.some(w=>w.includes(t))))
    return {accepted:false,score:-10000,reason:'accessory_not_food'};
  if(q.terms.includes('maito') && ['kondensoitu','tiivistetty','haihdutettu'].some(t=>nameText.includes(t) && !q.terms.includes(t)))
    return {accepted:false,score:-10000,reason:'different_milk_preparation'};
  if(q.terms.includes('maito') && /maitojuoma|maitokahvi|maitokaakao|korvike|maitojauhe|pirtelo/.test(nameText))
    return {accepted:false,score:-10000,reason:'different_milk_product'};
  if(q.terms.includes('kahvi')) {
    const otherCoffeeProducts=['jogurtti','skyr','rahka','vanukas','likoori','jaloviina','olut','kerma','energiajuoma'];
    if(otherCoffeeProducts.some(t=>(identityText+' '+categoryText).includes(t) && !q.terms.some(w=>w.includes(t))))
      return {accepted:false,score:-10000,reason:'coffee_flavoured_other_product'};
  }
  const derived=['jaatelo','suklaa','makeinen','karkki','limppu','sampyla','mauste','kastike','kakku','keksi'];
  if(q.terms.some(t=>['kahvi','maito','piima','juusto','jauheliha'].includes(t)) &&
     derived.some(t=>nameText.includes(t) && !q.terms.some(w=>w.includes(t))))
    return {accepted:false,score:-10000,reason:'ingredient_in_different_product'};
  let score=0;
  for(const term of q.terms) {
    const variants=alternatives[term] || [term];
    const strength=Math.max(0,...variants.map(rawVariant => { const v=searchWords(rawVariant).map(canonical).join(' '); return (name.terms.includes(v) || (v.includes(' ') && (' '+name.terms.join(' ')+' ').includes(' '+v+' '))) ? (v===term?100:80)
      : name.terms.some(w=>v.length>=3 && w.startsWith(v) && ((!rawIngredientTerms.has(v) && !['cola','pepsi','coke','kahvi'].includes(v)) || (['kana','broileri'].includes(v) && /^(?:n)?(?:filee|rinta|reis|siipi|suikale|koipi|paisti|pihvi|jauheliha)/.test(w.slice(v.length))))) ? 65
      : name.terms.some(w=>v.length>=3 && w.endsWith(v) && compoundPrefixes.has(w.slice(0,-v.length))) ? 50 : 0; }));
    if(strength) score+=strength;
    else if(!alternatives[term] && brand.includes(term) && (q.terms.length>1 || brand.join(" ")===term)) score+=25;
    else return {accepted:false,score:-1000,reason:`missing_term:${term}`};
  }
  // Attributes remain mandatory. Broad category metadata cannot satisfy a
  // missing name token, but supports ranking an already qualified name.
  if(q.sizes.some(size=>!name.sizes.includes(size) && !parse(product.quantity).sizes.includes(size)))
    return {accepted:false,score:-1000,reason:'different_package_size'};
  score+=q.sizes.length*40;
  score+=q.terms.filter(t=>category.some(w=>canonical(w)===t)).length*5;
  return {accepted:true,score,reason:'all_terms_match'};
}
export function rankDesktopNormalRows<T extends Row>(query: string, rows: T[], options: {requirePrice?: boolean} = {}): T[] {
  return rows.map((product,index)=>({product,index,...desktopSearchDecision(query,product)}))
    .filter(x=>x.accepted && (!options.requirePrice || (typeof x.product.__price==='number' && Number.isFinite(x.product.__price) && x.product.__price>0)))
    .sort((a,b)=>{
      // Every accepted row matches all requested terms. A price must be a
      // positive finite number; null/zero/NaN never masquerades as a quote.
      const ap=typeof a.product.__price==='number' && Number.isFinite(a.product.__price) && a.product.__price>0;
      const bp=typeof b.product.__price==='number' && Number.isFinite(b.product.__price) && b.product.__price>0;
      return Number(bp)-Number(ap) || (ap && bp ? a.product.__price!-b.product.__price! : 0) || b.score-a.score ||
        (ap&&bp ? a.product.__price!-b.product.__price! : 0) || a.index-b.index;
    }).map(x=>x.product);
}

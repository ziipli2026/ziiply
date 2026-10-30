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
  cola:['cola','pepsi'], limsa:['virvoitusjuoma','limonadi','cola','pepsi','fanta','sprite','jaffa'],
  broileri:['broileri','kana'], kana:['kana','broileri'], jogurtti:['jogurtti','yoghurt','yogurt'],
  sipsi:['sipsi','perunalastu','chips'], kananmuna:['kananmuna','muna'],
};
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
  const family=words.length===1 ? alternatives[words[0]] || [] : [];
  return [...new Set([q, normalized, ...family])].filter(Boolean).slice(0,6);
}
type Row = {name?: string; title?: string; brand?: string; brandName?: string; category?: string; ean?: string; __price?: number | null; quantity?: string};
export function desktopSearchDecision(query: string, product: Row) {
  if (/^\d{8,14}$/.test(query.trim())) return {accepted: product.ean===query.trim(), score:10000, reason:'exact_ean'};
  const q=parse(desktopSearchQuery(query));
  const name=parse(product.name || product.title);
  const brand=parse(product.brandName || product.brand).terms;
  const category=parse(product.category).terms;
  const intent=resolveSearchIntentAI(desktopSearchQuery(query));
  if (!isProductAllowedByIntent({...product, brandName:product.brandName || product.brand},intent))
    return {accepted:false,score:-10000,reason:'wrong_product_group'};
  if (!q.terms.length) return {accepted:false,score:0,reason:'empty_query'};
  const nameText=searchWords(product.name || product.title).join(' ');
  const categoryText=searchWords(product.category).join(' ');
  const pet=/\b(?:koiran|kissan|lemmik|dog|cat)/;
  const petRequest=q.terms.some(t=>pet.test(t));
  if(!petRequest && pet.test(nameText+' '+categoryText))
    return {accepted:false,score:-10000,reason:'pet_product'};
  if(q.terms.includes('kana') && /kananmuna|kananmun|munavalmiste/.test(nameText))
    return {accepted:false,score:-10000,reason:'different_product_group'};
  // A requested ingredient is not automatically the finished product. Keep
  // this guard directional so explicit searches for these products still work.
  const derived=['jaatelo','suklaa','makeinen','karkki','limppu','sampyla','mauste','kastike','kakku','keksi'];
  if(q.terms.some(t=>['kahvi','maito','piima','juusto','jauheliha'].includes(t)) &&
     derived.some(t=>nameText.includes(t) && !q.terms.some(w=>w.includes(t))))
    return {accepted:false,score:-10000,reason:'ingredient_in_different_product'};
  let score=0;
  for(const term of q.terms) {
    const variants=alternatives[term] || [term];
    const strength=Math.max(0,...variants.map(v => name.terms.includes(v) ? (v===term?100:80)
      : name.terms.some(w=>v.length>=3 && w.startsWith(v)) ? 65
      : name.terms.some(w=>v.length>=4 && w.endsWith(v)) ? 50 : 0));
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
export function rankDesktopNormalRows<T extends Row>(query: string, rows: T[]): T[] {
  return rows.map((product,index)=>({product,index,...desktopSearchDecision(query,product)}))
    .filter(x=>x.accepted)
    .sort((a,b)=>{
      // Every accepted row matches all requested terms. A price must be a
      // positive finite number; null/zero/NaN never masquerades as a quote.
      const ap=typeof a.product.__price==='number' && Number.isFinite(a.product.__price) && a.product.__price>0;
      const bp=typeof b.product.__price==='number' && Number.isFinite(b.product.__price) && b.product.__price>0;
      return Number(bp)-Number(ap) || b.score-a.score ||
        (ap&&bp ? a.product.__price!-b.product.__price! : 0) || a.index-b.index;
    }).map(x=>x.product);
}

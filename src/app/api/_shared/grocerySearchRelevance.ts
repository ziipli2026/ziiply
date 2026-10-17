/** Lightweight relevance ordering for broad grocery category queries.
 * Never discard valid products: direct grocery matches are sorted ahead of
 * incidental flavour, prepared-meal and pet-product mentions.
 */
const fold = (value: unknown) => String(value ?? "").toLocaleLowerCase("fi").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const RULES: Record<string, {strong: RegExp; secondary?: RegExp; weak: RegExp}> = {
  kahvi: {strong:/\b(kahvi|kahvipavut|suodatinkahvi|juhla mokka|presidentti)\b/,secondary:/kahvi(papu|jauhe|kapseli|sekoitus|paketti)|suodatinjauhe/,weak:/kahvi[- ]?(suklaa|jogurtti|jäätelö|kakku|patukka|likööri|juoma)/},
  jogurtti: {strong:/\bjogurtti\b/,secondary:/jogurtti(juoma|purkki)|\bskyr\b/,weak:/jogurtti[- ]?(kastike|patukka|rusina|mysli)/},
  maito: {strong:/\b(kevytmaito|täysmaito|rasvaton maito|maito|maitojuoma)\b/,weak:/maidoton|maito[- ]?(suklaa|kahvi|jauhe)/},
  lohi: {strong:/\b(lohi|kirjolohi|lohifilee|lohipala)\b/,secondary:/lohi(file|suikale|pala)/,weak:/koira|kissa|lemmik|sushi|pizza|wrap/},
  banaani: {strong:/\bbanaani\b/,weak:/banaani[- ]?(suklaa|jogurtti|rahka|maku|jäätelö)/},
  peruna: {strong:/\bperuna\b/,weak:/peruna[- ]?(salaatti|pizza|pasta|gnocchi|kikherne)/},
  porkkana: {strong:/\bporkkana\b/,weak:/porkkana[- ]?(leipä|sämpylä|mehu|kakku)/},
  tomaatti: {strong:/\btomaatti\b/,weak:/tomaatti[- ]?(kastike|pizza|pasta|keitto)/},
  leipä: {strong:/\b(leipä|ruisleipä|paahtoleipä|limppu)\b/,weak:/\b(leipomo|leipäveitsi|leipäkori)\b/},
  broileri: {strong:/\b(broileri|broilerin|broilerifilee|broilerisuikale)\b/,weak:/wrap|pizza|patonki|salaatti|pasta|keitto/},
};
const ALIASES: Record<string,string> = {kahvit:"kahvi",jogurtit:"jogurtti",maidot:"maito",lohet:"lohi",banaanit:"banaani",perunat:"peruna",porkkanat:"porkkana",tomaatit:"tomaatti",leivät:"leipä",broilerit:"broileri"};
export function rankGrocerySearchResults<T extends {name?: string|null; category?: string|null}>(items:T[],query:string):T[]{
  const q=fold(query).trim();
  const rule=RULES[ALIASES[q]||q];
  if(!rule)return items;
  const score=(item:T)=>{
    const name=fold(item.name), category=fold(item.category);
    const pet=/lemmik|koira|kissa|dog\b|cat\b/.test(name+" "+category);
    const categoryMatch=category.includes(q)||category.includes(ALIASES[q]||q);
    let value=0;
    if(rule.strong.test(name))value+=30;
    if(rule.secondary?.test(name))value+=18;
    if(categoryMatch)value+=35;
    if(rule.weak.test(name))value-=28;
    if(pet)value-=90;
    if(/\b(salaatti|wrap|pizza|pasta-ateria|kakku|patukka|makeinen)\b/.test(name))value-=8;
    return value;
  };
  return items.map((item,index)=>({item,index,score:score(item)})).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.item);
}

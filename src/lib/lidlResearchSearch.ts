/** Public Lidl catalog: read-only name discovery, never a price or EAN feed. */
import catalog from "../../data/lidl/official-grocery-candidates-v44-2026-10-01.json";
import stapleEvidence from "../../data/lidl/independent-staple-ean-evidence-2026-10-02.json";

const quarantined = new Set(catalog.quarantinedProductIds.map(id => String(id).trim()));
const norm = (s: string) => s.toLocaleLowerCase("fi-FI").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const tokens = (s: string) => norm(s).split(/\s+/).filter(Boolean);
const identity = (s: string) => norm(s)
  .replace(/\b(\d+)\s*x\s*(\d+)\s*(g|kg|ml|l|kpl)\b/g, "$1x$2$3")
  .replace(/\b(\d+)\s+(g|kg|ml|l|kpl)\b/g, "$1$2");
const exactStaples = new Set(["maito","voi","pasta","makaroni","kananmuna","jauheliha","peruna","banaani","juusto","leipa","omena","pizza","kahvi","jogurtti","tee"]);
const forms: Record<string,string[]> = {
 maito:["maito","täysmaito","kevytmaito","rasvatonmaito","laktoositonmaito"],
 tee:["tee","teepussi","teepussit","teelehti","teelehdet"],
 voi:["voi","meijerivoi"],pasta:["pasta"],makaroni:["makaroni","makaronit"],kahvi:["kahvi","kahvijauhe","suodatinkahvi","kahvipavut","kahvipapu"],kananmuna:["kananmuna","kananmunat"],
 jauheliha:["jauheliha","viljapossujauheliha","fileejauheliha"],peruna:["peruna","perunat"],
 banaani:["banaani","banaanit"],juusto:["juusto","juustot","tuorejuusto","juustoviipale","raejuusto","kermajuusto","sinihomejuusto","halloumi","halloumijuusto"],
 jogurtti:["jogurtti","jogurtit","maustamatonjogurtti","laktoositonjogurtti","mangojogurtti","päärynäjogurtti","banaanijogurtti","mansikkajogurtti"],
 omena:["omena","omenat"],pizza:["pizza","pizzat"],
 leipa:["leipa","leivat","ruisleipa","kauraleipa","vehnaleipa","hapanjuurileipa","siemenhapanjuurileipa","kiviuunileipa","artesaanileipa","rusticoleipa","myslileipa","herkkumyslileipa","pitaleipa","tomaattimozzarellaleipa","perunasipulileipa"]
};
const matches=(word:string,term:string)=>word===term||(term==="korvapuusti" && word==="jattikorvapuusti")||(term==="kaurahiutaleet" && ["pikakaurahiutaleet","kaurahiutale"].includes(word))||(term==="riisipiirakka" && word==="pakasteriisipiirakka")||(term==="juusto" && /juusto$/.test(word))||(term==="jogurtti" && /jogurtti$/.test(word))||(exactStaples.has(term)
 ?(forms[term]??[]).some(form=>norm(form)===word):term.length>=4&&word.startsWith(term));
export function searchLidlResearch(query:string,limit=15){
 if(typeof query!=="string")return [];
 const q=tokens(query).map(t=>({kananmunat:"kananmuna",perunat:"peruna",banaanit:"banaani",juustot:"juusto",leivat:"leipa",makaronit:"makaroni",jogurtit:"jogurtti",kahvipapu:"kahvipavut"} as Record<string,string>)[t]??t);
 // Keep product qualifiers such as kevytmaito and kahvipavut intact: a broad
 // category rewrite would silently mix distinct products into exact searches.
 if(!q.length)return [];
 const safeLimit=Number.isFinite(limit)?Math.max(0,Math.min(50,Math.trunc(limit))):15;
 const seen=new Set<string>();
 const seenNames=new Set<string>();
 // Research-only entries are discovery candidates, not verified local stock or prices.
 const independentlyNamed = stapleEvidence.records
  // Use the original evidence position for the temporary research ID: filtering
  // another record must not silently renumber existing cart candidates.
  .map((r,i)=>({r,i}))
  .filter(({r})=>r.eanStatus==="not_verified" && r.recordKind!=="generic-product-type-not-sku" &&
    (((r.brand==="Ilona" || r.brand==="Myllykivi" || r.brand==="Combino" || (r.source==="https://corporate.lidl.fi/vastuullisuus/vuoropuhelu/kotimaisuus/myllyn-paras" && ["Jättikorvapuusti","Pakasteriisipiirakka"].includes(r.name))) && r.source.startsWith("https://corporate.lidl.fi/")) || (r.brand==="Ilona" && r.source.startsWith("https://www.sttinfo.fi/")) || (r.source.startsWith("https://www.lidl.fi/") && ["lidl-named-product","coffee-format-named","coffee-tea-variety-named"].includes(r.recordKind ?? "")) || (r.recordKind==="lidl-named-product" && (r.source.startsWith("https://corporate.lidl.fi/") || r.source.startsWith("https://www.sttinfo.fi/")))))
  .map(({r,i})=>({
    lidlProductId:String(90000000+i),name:r.name,variant:"",
    observedDate:stapleEvidence.observedAt,
    assortmentEvidence:r.assortmentEvidence,
  }));
 return [...catalog.records,...independentlyNamed].filter(r=>typeof r.lidlProductId==="string"&&r.lidlProductId.trim()&&!quarantined.has(r.lidlProductId.trim()))
 .map(r=>{
  const words=tokens([r.name,r.variant].filter(v=>typeof v==="string").join(" "));
  const nameWords=tokens(r.name);
  // A single staple query must identify the product itself, not just a flavour
  // in its variant (e.g. coffee-flavoured pudding is not coffee).
  const all=q.every(t=>(exactStaples.has(t) ? nameWords : words)
    .some(w=>matches(w,t)));
  const score=all?q.reduce((n,t)=>n+(nameWords.includes(t)?20:nameWords.some(w=>matches(w,t))?8:words.includes(t)?4:3),0)
    + (norm(r.name)===q.join(" ")?50:0)
    + ("assortmentEvidence" in r && r.assortmentEvidence==="lidl-national-range-announcement"?12:0)
    + ("assortmentEvidence" in r && r.assortmentEvidence==="lidl-historical-product-mention"?-12:0)
    + ("assortmentEvidence" in r && r.assortmentEvidence==="lidl-public-basket-comparison"?4:0):0;
  // A documented historical name may rank below current-range evidence, but a
  // matching name must not disappear solely because of its provenance penalty.
  return {r,score:all?Math.max(1,score):0};
 }).filter(x=>x.score>0)
 .sort((a,b)=>b.score-a.score||a.r.name.localeCompare(b.r.name,"fi-FI"))
 .filter(({r})=>{const id=r.lidlProductId.trim();const name=identity([r.name,r.variant].filter(Boolean).join(" "));if(seen.has(id)||seenNames.has(name))return false;seen.add(id);seenNames.add(name);return true;})
 .slice(0,safeLimit).map(({r})=>({
  id:-Number(r.lidlProductId),lidlProductId:r.lidlProductId.trim(),name:[r.name,r.variant].filter(Boolean).join(" "),
  ean:null,price:null,observedPriceEur:"displayedPriceEur" in r ? r.displayedPriceEur ?? null : null,
  observedUnitPriceText:"unitPriceText" in r ? r.unitPriceText ?? null : null,
  storeItems:[],source:"lidl.fi-public-research",priceVerified:false,
  storeAvailability:"unknown",observedDate:r.observedDate,eanMatchStatus:"unverified",
  assortmentEvidence:"assortmentEvidence" in r ? r.assortmentEvidence : "lidl-public-catalog-observation",
  note:"assortmentEvidence" in r && r.assortmentEvidence==="lidl-national-range-announcement"
   ?"Lidl on ilmoittanut tuotteen valtakunnalliseen Ilona-valikoimaan. Paikallinen saatavuus ja hinta eivät ole vahvistettuja."
   :"Tuotteesta on Lidlin julkinen tai historiallinen maininta. Nykyinen myymäläsaatavuus ja hinta eivät ole vahvistettuja."
 }));
}

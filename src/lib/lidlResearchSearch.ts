/** Public Lidl catalog: read-only name discovery, never a price or EAN feed. */
import catalog from "../../data/lidl/official-grocery-candidates-v44-2026-10-01.json";
import stapleEvidence from "../../data/lidl/independent-staple-ean-evidence-2026-10-02.json";

const quarantined = new Set(catalog.quarantinedProductIds.map(id => String(id).trim()));
const norm = (s: string) => s.toLocaleLowerCase("fi-FI").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const tokens = (s: string) => norm(s).split(/\s+/).filter(Boolean);
const exactStaples = new Set(["maito","voi","pasta","kananmuna","jauheliha","peruna","banaani","juusto","leipa","omena","pizza"]);
const forms: Record<string,string[]> = {
 maito:["maito","täysmaito","kevytmaito","rasvatonmaito","laktoositonmaito"],
 voi:["voi","meijerivoi"],pasta:["pasta"],kananmuna:["kananmuna","kananmunat"],
 jauheliha:["jauheliha","viljapossujauheliha"],peruna:["peruna","perunat"],
 banaani:["banaani","banaanit"],juusto:["juusto","juustot","tuorejuusto","juustoviipale"],
 omena:["omena","omenat"],pizza:["pizza","pizzat"],
 leipa:["leipa","leivat","ruisleipa","kauraleipa","vehnaleipa","hapanjuurileipa","siemenhapanjuurileipa","kiviuunileipa","artesaanileipa","rusticoleipa","myslileipa","herkkumyslileipa","pitaleipa","tomaattimozzarellaleipa","perunasipulileipa"]
};
const matches=(word:string,term:string)=>word===term||(exactStaples.has(term)
 ?(forms[term]??[]).some(form=>norm(form)===word):term.length>=4&&word.startsWith(term));
export function searchLidlResearch(query:string,limit=15){
 if(typeof query!=="string")return [];
 const q=tokens(query).map(t=>({kananmunat:"kananmuna",perunat:"peruna",banaanit:"banaani",juustot:"juusto",leivat:"leipa"} as Record<string,string>)[t]??t);
 if(!q.length)return [];
 const safeLimit=Number.isFinite(limit)?Math.max(0,Math.min(50,Math.trunc(limit))):15;
 const seen=new Set<string>();
 const seenNames=new Set<string>();
 // Research-only entries are discovery candidates, not verified local stock or prices.
 const independentlyNamed = stapleEvidence.records
  // Research discovery includes Lidl-origin historic references, but excludes
  // generic categories and third-party-only EAN evidence from product cards.
  .filter(r=>r.eanStatus==="not_verified" && r.recordKind!=="generic-product-type-not-sku" &&
    (r.brand==="Ilona" || r.source.startsWith("https://www.lidl.fi/")))
  .map((r,i)=>({
    lidlProductId:String(90000000+i),name:r.name,variant:"",
    observedDate:stapleEvidence.observedAt,
    assortmentEvidence:r.assortmentEvidence,
  }));
 return [...catalog.records,...independentlyNamed].filter(r=>typeof r.lidlProductId==="string"&&r.lidlProductId.trim()&&!quarantined.has(r.lidlProductId.trim()))
 .map(r=>{
  const words=tokens([r.name,r.variant].filter(v=>typeof v==="string").join(" "));
  const all=q.every(t=>words.some(w=>matches(w,t)));
  const nameWords=tokens(r.name);
  const score=all?q.reduce((n,t)=>n+(nameWords.includes(t)?20:nameWords.some(w=>matches(w,t))?8:words.includes(t)?4:3),0)
    + (norm(r.name)===q.join(" ")?50:0)
    + ("assortmentEvidence" in r && r.assortmentEvidence==="lidl-national-range-announcement"?3:0):0;
  return {r,score};
 }).filter(x=>x.score>0)
 .sort((a,b)=>b.score-a.score||a.r.name.localeCompare(b.r.name,"fi-FI"))
 .filter(({r})=>{const id=r.lidlProductId.trim();const name=norm([r.name,r.variant].filter(Boolean).join(" "));if(seen.has(id)||seenNames.has(name))return false;seen.add(id);seenNames.add(name);return true;})
 .slice(0,safeLimit).map(({r})=>({
  id:-Number(r.lidlProductId),lidlProductId:r.lidlProductId.trim(),name:[r.name,r.variant].filter(Boolean).join(" "),
  ean:null,price:null,storeItems:[],source:"lidl.fi-public-research",priceVerified:false,
  storeAvailability:"unknown",observedDate:r.observedDate,eanMatchStatus:"unverified",
  assortmentEvidence:"assortmentEvidence" in r ? r.assortmentEvidence : "lidl-public-catalog-observation",
  note:"assortmentEvidence" in r && r.assortmentEvidence==="lidl-national-range-announcement"
   ?"Lidl on ilmoittanut tuotteen valtakunnalliseen Ilona-valikoimaan. Paikallinen saatavuus ja hinta eivät ole vahvistettuja."
   :"Tuotteesta on Lidlin julkinen tai historiallinen maininta. Nykyinen myymäläsaatavuus ja hinta eivät ole vahvistettuja."
 }));
}

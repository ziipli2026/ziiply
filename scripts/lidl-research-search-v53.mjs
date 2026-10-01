/** Offline name discovery only. Never use this output as a store/price/EAN feed. */
import {readFileSync} from "node:fs";
const source=new URL("../data/lidl/official-grocery-candidates-v44-2026-10-01.json",import.meta.url);
const data=JSON.parse(readFileSync(source,"utf8"));
const quarantinedIds=new Set((data.quarantinedProductIds??[]).map(id=>String(id).trim()));
const norm=s=>String(s??"").toLocaleLowerCase("fi-FI").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const tokens=s=>norm(s).split(/\s+/).filter(Boolean);
const exactStaples=new Set(["maito","voi","pasta","kananmuna","jauheliha","peruna","banaani","juusto","leipa"]);
const stapleForms={maito:new Set(["maito","täysmaito","kevytmaito","rasvatonmaito","laktoositonmaito"]),voi:new Set(["voi","meijerivoi"]),pasta:new Set(["pasta"]),kananmuna:new Set(["kananmuna","kananmunat"]),jauheliha:new Set(["jauheliha","viljapossujauheliha"]),peruna:new Set(["peruna","perunat"]),banaani:new Set(["banaani","banaanit"]),juusto:new Set(["juusto","juustot"]),leipa:new Set(["leipa","leivat","ruisleipa","kauraleipa","vehnaleipa","hapanjuurileipa","siemenhapanjuurileipa","kiviuunileipa","artesaanileipa","rusticoleipa","myslileipa","herkkumyslileipa","pitaleipa","tomaattimozzarellaleipa","perunasipulileipa"])};
const matches=(word,term)=>word===term||(exactStaples.has(term)?[...stapleForms[term]].some(form=>norm(form)===word):term.length>=4&&word.startsWith(term));
export function searchResearch(query,rows=data.records,limit=15){
 if(typeof query!=="string")return [];
 const q=tokens(query).map(t=>t==="kananmunat"?"kananmuna":t==="perunat"?"peruna":t==="banaanit"?"banaani":t==="juustot"?"juusto":t==="leivat"?"leipa":t);if(!q.length||!Array.isArray(rows))return [];
 const safeLimit=typeof limit==="number"&&Number.isFinite(limit)?Math.max(0,Math.min(50,Math.trunc(limit))):15;
 const seen=new Set();
 return rows.filter(r=>r&&typeof r==="object"&&!Array.isArray(r)&&typeof r.lidlProductId==="string"&&r.lidlProductId.trim()&&!quarantinedIds.has(r.lidlProductId.trim())).map(r=>{
  const name=tokens([r.name,r.variant].filter(v=>typeof v==="string").join(" "));
  const score=q.reduce((n,t)=>n+(name.includes(t)?10:name.some(w=>matches(w,t))?3:0),0);
  const all=q.every(t=>name.some(w=>matches(w,t)));
  return {r:{...r,lidlProductId:r.lidlProductId.trim()},score:all?score:0};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.r.name).localeCompare(String(b.r.name),"fi-FI")).filter(({r})=>{if(seen.has(r.lidlProductId))return false;seen.add(r.lidlProductId);return true;}).slice(0,safeLimit).map(({r})=>({
  lidlProductId:r.lidlProductId,name:typeof r.name==="string"?r.name:"",variant:typeof r.variant==="string"?r.variant:null,
  source:"lidl.fi-public-research",observedDate:r.observedDate??null,
  ean:null,regularPriceEur:null,storeAvailability:"unknown",
  checkoutPriceVerified:false,displayedPriceEur:null,
  note:"Name discovery only; observed promotion price deliberately omitted."
 }));
}
if(process.argv[1]&&new URL("file://"+process.argv[1]).pathname===new URL(import.meta.url).pathname){
 console.log(JSON.stringify({query:process.argv.slice(2).join(" "),results:searchResearch(process.argv.slice(2).join(" "))},null,2));
}

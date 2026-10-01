/** Offline name discovery only. Never use this output as a store/price/EAN feed. */
import {readFileSync} from "node:fs";
const source=new URL("../data/lidl/official-grocery-candidates-v44-2026-10-01.json",import.meta.url);
const data=JSON.parse(readFileSync(source,"utf8"));
const norm=s=>String(s??"").toLocaleLowerCase("fi-FI").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const tokens=s=>norm(s).split(/\s+/).filter(Boolean);
const exactStaples=new Set(["maito","voi","pasta","kananmuna"]);
const matches=(word,term)=>word===term||(!exactStaples.has(term)&&term.length>=4&&word.startsWith(term));
export function searchResearch(query,rows=data.records,limit=15){
 const q=tokens(query);if(!q.length)return [];
 return rows.map(r=>{
  const name=tokens([r.name,r.variant].filter(Boolean).join(" "));
  const score=q.reduce((n,t)=>n+(name.includes(t)?10:name.some(w=>matches(w,t))?3:0),0);
  const all=q.every(t=>name.some(w=>matches(w,t)));
  return {r,score:all?score:0};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.r.name).localeCompare(String(b.r.name),"fi-FI")).slice(0,Math.max(0,Math.min(50,limit))).map(({r})=>({
  lidlProductId:String(r.lidlProductId),name:r.name,variant:r.variant??null,
  source:"lidl.fi-public-research",observedDate:r.observedDate??null,
  ean:null,regularPriceEur:null,storeAvailability:"unknown",
  checkoutPriceVerified:false,displayedPriceEur:null,
  note:"Name discovery only; observed promotion price deliberately omitted."
 }));
}
if(process.argv[1]&&new URL("file://"+process.argv[1]).pathname===new URL(import.meta.url).pathname){
 console.log(JSON.stringify({query:process.argv.slice(2).join(" "),results:searchResearch(process.argv.slice(2).join(" "))},null,2));
}

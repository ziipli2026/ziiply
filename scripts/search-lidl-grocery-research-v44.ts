/** Read-only offline candidate lookup; no production routes or basket pricing. */
import {readFileSync} from "node:fs";
import {join} from "node:path";
type Item={lidlProductId:string;name:string;displayedPriceEur:number|null;ian?:string|null;researchCategory?:string};
const catalog=JSON.parse(readFileSync(join(process.cwd(),"data/lidl/official-grocery-candidates-v44-2026-10-01.json"),"utf8")) as {records:Item[]};
export function searchLidlResearch(query:string,limit=20){
 const q=query.trim().toLocaleLowerCase("fi-FI");
 if(!q)return [];
 const words=q.split(/\s+/).filter(Boolean);
 return catalog.records.filter(r=>words.every(w=>r.name.toLocaleLowerCase("fi-FI").includes(w)||r.lidlProductId===w||r.ian===w))
 .slice(0,Math.max(0,Math.min(50,limit))).map(r=>({lidlProductId:r.lidlProductId,name:r.name,ian:r.ian??null,observedPublicPriceEur:r.displayedPriceEur,checkoutPriceVerified:false,basketComparisonEligible:false,category:r.researchCategory??"existing-research"}));
}

/** Offline-only Lidl research catalog validation. No production imports or network calls. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
type RecordItem={lidlProductId:string;name:string;displayedPriceEur:number|null;ean:null;verifiedEans?:string[];researchCategory?:string;priceStatus?:string;pricingUnit?:string};
const data=JSON.parse(readFileSync(join(process.cwd(),"data/lidl/official-catalog-research-v43-2026-10-01.json"),"utf8")) as {records:RecordItem[]};
const errors:string[]=[];const seen=new Set<string>();const counts:Record<string,number>={};
for(const r of data.records){
 const id=String(r.lidlProductId);
 if(seen.has(id))errors.push("Duplicate Lidl product ID: "+id);seen.add(id);
 if(!r.name?.trim())errors.push("Missing name: "+id);
 if(r.ean!==null)errors.push("Unverified EAN placed in canonical EAN field: "+id);
 if(r.displayedPriceEur!==null&&(!Number.isFinite(r.displayedPriceEur)||r.displayedPriceEur<0))errors.push("Invalid price: "+id);
 if(r.priceStatus==="not-published"&&r.displayedPriceEur!==null)errors.push("Unpublished price conflict: "+id);
 if(r.researchCategory==="bakery-piece"&&r.pricingUnit!=="piece-unverified")errors.push("Bakery pricing unit must remain unverified: "+id);
 if(r.researchCategory==="bakery-piece"&&r.displayedPriceEur===null&&r.priceStatus!=="not-published")errors.push("Bakery missing price must stay null: "+id);
 if(r.researchCategory)counts[r.researchCategory]=(counts[r.researchCategory]||0)+1;
}
const result={ok:errors.length===0,total:data.records.length,uniqueIds:seen.size,classified:counts,errors};
process.stdout.write(JSON.stringify(result,null,2)+"\n");
if(errors.length)process.exitCode=1;

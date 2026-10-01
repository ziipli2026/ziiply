/**
 * Offline Lidl snapshot merge. Run: npx tsx scripts/merge-lidl-catalog.ts
 * Never equate Lidl productId or IAN to EAN/GTIN.
 */
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
type Row={lidlProductId:string;ian:string;name:string;variant?:string;displayedPriceEur:number|null;unitPriceText?:string;ean:string|null;eanMatchStatus:string;source:string;observedDate:string};
const root=resolve(process.cwd(),"data/lidl");
const search=JSON.parse(readFileSync(resolve(root,"official-public-catalog-2026-10-01.json"),"utf8")).records as Row[];
const category=JSON.parse(readFileSync(resolve(root,"official-category-catalog-2026-10-01.json"),"utf8")).records as Row[];
const map=new Map<string,Row>();
for(const row of search)map.set(row.lidlProductId,row);
for(const row of category){const old=map.get(row.lidlProductId);if(old&&old.ian!==row.ian)throw new Error("IAN conflict for "+row.lidlProductId);map.set(row.lidlProductId,old?{...row,...old,source:"lidl.fi public search + category Nuxt v14"}:row)}
const records=[...map.values()].sort((a,b)=>a.lidlProductId.localeCompare(b.lidlProductId));
writeFileSync(resolve(root,"official-catalog-merged-2026-10-01.json"),JSON.stringify({schemaVersion:1,sourceRecords:{search:search.length,category:category.length,unique:records.length},notes:"No verified EAN yet. Never import rows with null EAN into ziiply_ean_products.",records},null,2)+"\n");
console.log({search:search.length,category:category.length,unique:records.length});

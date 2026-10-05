import fs from "node:fs";
const catalog=JSON.parse(fs.readFileSync("data/lidl/official-grocery-candidates-v44-2026-10-01.json","utf8")).records;
const batches=[];
for(let n=1;n<=15;n++){const j=JSON.parse(fs.readFileSync(`data/lidl/enrichment-priority-v${n}-2026-10-05.json`,"utf8"));for(const r of j.priority||[])batches.push({batch:n,row:r});}
const byId=new Map();
for(const {batch,row} of batches){const id=String(Array.isArray(row)?row[0]:row.lidlProductId);if(byId.has(id))throw new Error(`duplicate Lidl Product ID ${id}`);byId.set(id,{batch,row});}
if(byId.size!==catalog.length)throw new Error(`coverage mismatch: ${byId.size}/${catalog.length}`);
const records=catalog.map(c=>{const id=String(c.lidlProductId);const hit=byId.get(id);if(!hit)throw new Error(`missing batch record ${id}`);const r=Array.isArray(hit.row)?{}:hit.row;return {lidlProductId:id,name:c.name,ian:c.ian??r.ian??null,ean:null,canonicalPath:c.canonicalPath??null,officialUrl:r.officialUrl??null,researchCategory:c.researchCategory??null,researchSubcategory:r.researchSubcategory??null,pricingUnit:c.pricingUnit??null,variant:c.variant??null,unitPriceText:c.unitPriceText??null,publicDisplayedPriceEur:Number.isFinite(c.displayedPriceEur)?c.displayedPriceEur:(Number.isFinite(r.displayedPriceEur)?r.displayedPriceEur:null),publicPriceEvidenceStatus:r.priceEvidenceStatus??null,priceStatus:r.priceStatus??null,checkoutComparable:false,priceUsePolicy:"do-not-publish-public-observation-as-current-normal-price",sourceBatch:hit.batch};});
const ians=new Map();for(const r of records){if(!r.ian)continue;const k=String(r.ian);if(!ians.has(k))ians.set(k,[]);ians.get(k).push(r.lidlProductId);}
const conflicts=[...ians].filter(([,ids])=>ids.length>1).map(([ian,lidlProductIds])=>({ian,lidlProductIds,policy:"do-not-merge-by-ian"}));
const out={schemaVersion:1,generatedFrom:"official-grocery-candidates-v44 + enrichment-priority-v1..v15",policy:{primaryKey:"lidlProductId",eanImport:"verified-evidence-only",publicPricesComparable:false},counts:{records:records.length,ianConflicts:conflicts.length},identifierConflicts:conflicts,records};
fs.writeFileSync("data/lidl/product-metadata-enrichment-v1-2026-10-05.json",JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify(out.counts));

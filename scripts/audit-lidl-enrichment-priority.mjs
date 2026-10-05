import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
const rows=catalog.records;
const missing=v=>v===null||v===undefined||String(v).trim()==="";
const groups={
 missingCanonicalPath:rows.filter(r=>missing(r.canonicalPath)),
 missingPublicPrice:rows.filter(r=>!Number.isFinite(r.displayedPriceEur)),
 missingUnitPriceText:rows.filter(r=>missing(r.unitPriceText)),
 missingVariant:rows.filter(r=>missing(r.variant)),
 missingResearchCategory:rows.filter(r=>missing(r.researchCategory)),
 missingPricingUnit:rows.filter(r=>missing(r.pricingUnit)),
 missingEan:rows.filter(r=>missing(r.ean))
};
const priorityScore=r=>(
 (!r.canonicalPath?3:0)+(!Number.isFinite(r.displayedPriceEur)?3:0)+(!r.unitPriceText?2:0)+(!r.variant?1:0)+(!r.researchCategory?2:0)+(!r.pricingUnit?2:0)+(!r.ean?1:0)
);
const top=[...rows].sort((a,b)=>priorityScore(b)-priorityScore(a)).slice(0,30).map(r=>({id:r.lidlProductId,name:r.name,score:priorityScore(r),missing:["canonicalPath","price","unitPriceText","variant","researchCategory","pricingUnit","ean"].filter(k=>({canonicalPath:!r.canonicalPath,price:!Number.isFinite(r.displayedPriceEur),unitPriceText:!r.unitPriceText,variant:!r.variant,researchCategory:!r.researchCategory,pricingUnit:!r.pricingUnit,ean:!r.ean}[k]))}));
console.log(JSON.stringify({counts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),top},null,2));

import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
const rows=catalog.records;
const count=k=>rows.filter(r=>r[k]!==null&&r[k]!==undefined&&String(r[k]).trim()!=="").length;
const result={total:rows.length,hasLidlProductId:count("lidlProductId"),hasIan:count("ian"),hasName:count("name"),hasVariant:count("variant"),hasPublicPrice:count("displayedPriceEur"),hasUnitPriceText:count("unitPriceText"),hasEan:count("ean"),hasCanonicalPath:count("canonicalPath"),hasCategoryReview:count("categoryReview"),hasResearchCategory:count("researchCategory"),hasPricingUnit:count("pricingUnit")};
console.log(JSON.stringify(result,null,2));

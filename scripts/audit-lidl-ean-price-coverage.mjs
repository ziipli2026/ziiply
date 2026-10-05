import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
const priced=catalog.records.filter(row=>Number.isFinite(row.displayedPriceEur));
const withEan=priced.filter(row=>/^\\d{8,14}$/.test(String(row.ean??"")));
const result={pricedCount:priced.length,withEanCount:withEan.length,withoutEanCount:priced.length-withEan.length,verifiedComparableCount:0};
console.log(JSON.stringify(result,null,2));

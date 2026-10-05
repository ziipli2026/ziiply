import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
const rows=catalog.records;
const withLidlId=rows.filter(r=>String(r.lidlProductId??"").length>=5 && String(r.lidlProductId??"").length<=8 && Number.isInteger(Number(r.lidlProductId)));
const withEan=rows.filter(r=>String(r.ean??"").length>=8 && String(r.ean??"").length<=14 && Number.isInteger(Number(r.ean)));
const withBrand=rows.filter(r=>String(r.brand??"").trim().length>0);
console.log(JSON.stringify({total:rows.length,withLidlProductId:withLidlId.length,withEan:withEan.length,withBrand:withBrand.length,eanReadyForMatching:0},null,2));

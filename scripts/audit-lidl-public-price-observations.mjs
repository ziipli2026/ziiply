import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};

const priced=catalog.records.filter(row=>Number.isFinite(row.displayedPriceEur));
const promotionSignal=row=>{
 const text=[row.name,row.variant,row.unitPriceText].filter(Boolean).join(" ").toLocaleLowerCase("fi-FI");
 return /(^|\s)\d+\s*kpl(?=\s|$)|hinta yksittäin|lidl\s*plus|superhinta|tarjous|kampanja/.test(text);
};
const multiBuySignal=row=>/(^|\s)\d+\s*kpl(?=\s|$)|hinta yksittäin/i.test([row.name,row.variant,row.unitPriceText].filter(Boolean).join(" "));
const weightPriceSignal=row=>String(row.unitPriceText??"").toLocaleLowerCase("fi-FI").includes("€/kg") || String(row.unitPriceText??"").toLocaleLowerCase("fi-FI").includes("hinta/kg");
const promotionSuspect=priced.filter(promotionSignal);
const multiBuy=priced.filter(multiBuySignal);
const weightPriced=priced.filter(weightPriceSignal);
const unclassified=priced.filter(row=>!promotionSignal(row));
const promotionOnly=priced.filter(row=>promotionSignal(row) && !multiBuySignal(row) && !weightPriceSignal(row));
const summary={
 totalCatalogRecords:catalog.records.length,
 publicPriceObservations:priced.length,
 promotionSuspectCount:promotionSuspect.length,
 explicitMultiBuyCount:multiBuy.length,
 weightPricedObservationCount:weightPriced.length,
 promotionOnlySignalCount:promotionOnly.length,
 unclassifiedPublicPriceCount:unclassified.length,
 checkoutVerifiedCount:0,
 comparableCount:0,
 missingPromotionMetadataFields:["labels","validFrom","validThrough","referencePriceEur"],
 promotionSuspectIds:promotionSuspect.map(row=>row.lidlProductId),
 explicitMultiBuyIds:multiBuy.map(row=>row.lidlProductId),
 weightPricedObservationIds:weightPriced.map(row=>row.lidlProductId)
};
process.stdout.write(JSON.stringify(summary,null,2)+"\n");

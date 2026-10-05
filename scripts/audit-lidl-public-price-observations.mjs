import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};

const priced=catalog.records.filter(row=>Number.isFinite(row.displayedPriceEur));
const promotionSignal=row=>{
 const text=[row.name,row.variant,row.unitPriceText].filter(Boolean).join(" ").toLocaleLowerCase("fi-FI");
 return /\\b\\d+\\s*kpl\\b|hinta yksittäin|lidl\\s*plus|superhinta|tarjous|kampanja/.test(text);
};
const promotionSuspect=priced.filter(promotionSignal);
const unclassified=priced.filter(row=>!promotionSignal(row));
const summary={
 totalCatalogRecords:catalog.records.length,
 publicPriceObservations:priced.length,
 promotionSuspectCount:promotionSuspect.length,
 unclassifiedPublicPriceCount:unclassified.length,
 checkoutVerifiedCount:0,
 comparableCount:0,
 missingPromotionMetadataFields:["labels","validFrom","validThrough","referencePriceEur"],
 promotionSuspectIds:promotionSuspect.map(row=>row.lidlProductId)
};
process.stdout.write(JSON.stringify(summary,null,2)+"\n");

import { buildLidlStorePriceBank } from "./lidl-store-price-bank.mjs";

// Research-only bridge. Never turns an observed web card or historical announced
// price into a current price; no fallback to another store or an old price.
export function enrichLidlResearchWithVerifiedPrices(items, evidenceRows, storeId, at = new Date()) {
 const ids = items.map(item => item?.lidlProductId).filter(id => typeof id === "string");
 const bank = buildLidlStorePriceBank(evidenceRows, ids, storeId, at);
 return {
  items: items.map(item => {
   const verified = bank.getAt(item?.lidlProductId, at);
   if (!verified) return {
    ...item, price:null, storeItems:[], priceVerified:false,
    comparable:false, verifiedPriceEvidence:null
   };
   return {
    ...item, price:verified.regularPriceEur,
    storeItems:[{storeId,price:verified.regularPriceEur}],
    priceVerified:true, comparable:true,
    verifiedPriceEvidence:{
     source:verified.priceSource,observedAt:verified.observedAt,
     validThrough:verified.validThrough,
     freshUntil:verified.priceSource==="verified-store-receipt"
      ? new Date(Date.parse(verified.observedAt)+24*60*60*1000).toISOString()
      : verified.validThrough,
     evidenceReference:verified.evidenceReference
    }
   };
  }),
  rejectedEvidence:bank.rejected
 };
}

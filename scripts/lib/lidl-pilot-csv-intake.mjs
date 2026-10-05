import { parseLidlPilotCsv } from "./lidl-pilot-csv-reader.mjs";
import { processLidlManualPriceBatch } from "./lidl-manual-price-batch.mjs";
import { classifyLidlObservedBarcode } from "./lidl-barcode-kind.mjs";

// No network or production writes. A blank template always produces zero prices.
export function processLidlPilotCsv(csv, knownProductIds, storeId, at = new Date()) {
 const rows=parseLidlPilotCsv(csv);
 const populated=row=>["observedCode","observedCodeOrigin","scannedEanVerified","priceBasis","shelfPriceEur","shelfObservedAt","shelfPhotoReference","scanGoDisplayedPriceEur","receiptUnitPriceEur","receiptTimestamp","receiptEvidenceReference","isLidlPlus","isPromotion","isMultiBuy","permissionToUseEvidence"].some(key=>row[key].trim());
 const missingStoreRows=rows.map((row,index)=>({row,index})).filter(({row})=>populated(row)&&!row.storeId.trim()).map(({index})=>index+2);
 if(missingStoreRows.length)throw new Error(`CSV storeId missing on populated row(s): ${missingStoreRows.join(", ")}`);
 const mismatchedStoreIds=[...new Set(rows.map(row=>row.storeId.trim()).filter(rowStoreId=>rowStoreId&&rowStoreId!==storeId))];
 if(mismatchedStoreIds.length)throw new Error(`CSV storeId mismatch: selected ${storeId}; found ${mismatchedStoreIds.join(", ")}`);
 const parseBoolean=value=>value==="true"?true:value==="false"?false:null;
 const parsePrice=value=>{
  const normalized=value.replace(",",".");
  return normalized!==""&&/^[0-9]+(?:[.][0-9]{1,2})?$/.test(normalized)?Number(normalized):null;
 };
 const observations=rows.map(row=>({
  observedBarcode:row.observedCode.trim()?classifyLidlObservedBarcode(row.observedCode,row.observedCodeOrigin):null,
  lidlProductId:row.lidlProductId,
  storeId:row.storeId,
  priceBasis:row.priceBasis,
  shelfPriceEur:parsePrice(row.shelfPriceEur),
  receiptUnitPriceEur:parsePrice(row.receiptUnitPriceEur),
  receiptTimestamp:row.receiptTimestamp,
  receiptEvidenceReference:row.receiptEvidenceReference,
  isLidlPlus:parseBoolean(row.isLidlPlus),
  isPromotion:parseBoolean(row.isPromotion),
  isMultiBuy:parseBoolean(row.isMultiBuy),
  permissionToUseEvidence:parseBoolean(row.permissionToUseEvidence)
 }));
 return processLidlManualPriceBatch(observations,knownProductIds,storeId,at);
}

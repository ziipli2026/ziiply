import { parseLidlPilotCsv } from "./lidl-pilot-csv-reader.mjs";
import { processLidlManualPriceBatch } from "./lidl-manual-price-batch.mjs";
import { classifyLidlObservedBarcode } from "./lidl-barcode-kind.mjs";

// No network or production writes. A blank template always produces zero prices.
export function processLidlPilotCsv(csv, knownProductIds, storeId, at = new Date()) {
 const rows=parseLidlPilotCsv(csv);
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
  validThrough:row.validThrough,
  isLidlPlus:parseBoolean(row.isLidlPlus),
  isPromotion:parseBoolean(row.isPromotion),
  isMultiBuy:parseBoolean(row.isMultiBuy),
  permissionToUseEvidence:parseBoolean(row.permissionToUseEvidence)
 }));
 return processLidlManualPriceBatch(observations,knownProductIds,storeId,at);
}

// Strict parser for the generated Lidl pilot template; no external CSV dependency.
export const PILOT_COLUMNS=["lidlProductId","name","variant","physicalStoreName","physicalStoreAddress","storeId","observedCode","observedCodeOrigin","scannedEanVerified","priceBasis","shelfPriceEur","shelfObservedAt","shelfPhotoReference","scanGoDisplayedPriceEur","receiptUnitPriceEur","receiptTimestamp","receiptEvidenceReference","isLidlPlus","isPromotion","isMultiBuy","permissionToUseEvidence"];
export function parseLidlPilotCsv(csv) {
 if (typeof csv!=="string") throw new TypeError("CSV string required");
 const records=[];let fields=[],field="",quoted=false,closed=false;
 const pushField=()=>{fields.push(field);field="";closed=false;};
 const pushRow=()=>{pushField();if(fields.some(value=>value!==""))records.push(fields);fields=[];};
 for(let i=0;i<csv.length;i++){
  const c=csv[i];
  if(quoted){if(c==='"'&&csv[i+1]==='"'){field+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else field+=c;continue;}
  if(c==='"'){if(field!==""||closed)throw new Error("Invalid CSV quote");quoted=true;}
  else if(c===",")pushField();
  else if(c==="\n"){if(closed||field!==""||fields.length)pushRow();}
  else if(c==="\r"){if(csv[i+1]!=="\n")throw new Error("Invalid CSV line ending");}
  else {if(closed)throw new Error("Unexpected characters after closing quote");field+=c;}
 }
 if(quoted)throw new Error("Unterminated CSV quote");
 if(field!==""||fields.length)pushRow();
 if(!records.length||records[0].length!==PILOT_COLUMNS.length||
   records[0].some((col,i)=>col!==PILOT_COLUMNS[i]))throw new Error("Lidl pilot header mismatch");
 return records.slice(1).map((values,index)=>{
  if(values.length!==PILOT_COLUMNS.length)throw new Error("CSV column mismatch at row "+(index+2));
  return Object.fromEntries(PILOT_COLUMNS.map((key,i)=>[key,values[i]]));
 });
}

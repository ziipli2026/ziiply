import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {processLidlPilotCsv} from "./lib/lidl-pilot-csv-intake.mjs";
const csv=execFileSync(process.execPath,["scripts/generate-lidl-price-pilot-template.mjs"],{encoding:"utf8"});
const id=csv.split("\n")[1].split(",")[0].replaceAll('"',"");
const at=new Date("2026-10-04T12:00:00Z");
const blank=processLidlPilotCsv(csv,[id],"A",at);
assert.equal(blank.acceptedCount,0);
assert.equal(blank.inputCount,25);
assert.equal(blank.rejectedCount,25);
const lines=csv.trimEnd().split("\n");
const values=lines[1].match(/"(?:[^"]|"")*"/g).map(x=>x.slice(1,-1).replaceAll('""','"'));
const columns=lines[0].match(/"(?:[^"]|"")*"/g).map(x=>x.slice(1,-1));
for(const [key,value] of Object.entries({
 storeId:"A",priceBasis:"unit",shelfPriceEur:"1.29",receiptUnitPriceEur:"1.29",
 receiptTimestamp:"2026-10-04T10:00:00Z",receiptEvidenceReference:"SYNTHETIC-NOT-A-REAL-RECEIPT",
 isLidlPlus:"false",isPromotion:"false",
 isMultiBuy:"false",permissionToUseEvidence:"true"
})) values[columns.indexOf(key)]=value;
lines[1]=values.map(x=>'"'+x.replaceAll('"','""')+'"').join(",");
const completed=processLidlPilotCsv(lines.join("\n")+"\n",[id],"A",at);
assert.equal(completed.acceptedCount,1);
assert.equal(completed.prices[0].regularPriceEur,1.29);
assert.equal(completed.rejectedCount,24);
values[columns.indexOf("shelfPriceEur")]="1,29";
values[columns.indexOf("receiptUnitPriceEur")]="1,29";
lines[1]=values.map(x=>'"'+x.replaceAll('"','""')+'"').join(",");
const finnishDecimal=processLidlPilotCsv(lines.join("\n")+"\n",[id],"A",at);
assert.equal(finnishDecimal.acceptedCount,1);
assert.equal(finnishDecimal.prices[0].regularPriceEur,1.29);
values[columns.indexOf("observedCode")]="123";
values[columns.indexOf("observedCodeOrigin")]="packaging";
lines[1]=values.map(x=>'"'+x.replaceAll('"','""')+'"').join(",");
const invalidBarcode=processLidlPilotCsv(lines.join("\n")+"\n",[id],"A",at);
assert.equal(invalidBarcode.acceptedCount,0);
assert.equal(invalidBarcode.rejected[0].reason,"invalid-observed-barcode");
values[columns.indexOf("observedCode")]="12345678";
lines[1]=values.map(x=>'"'+x.replaceAll('"','""')+'"').join(",");
const validBarcode=processLidlPilotCsv(lines.join("\n")+"\n",[id],"A",at);
assert.equal(validBarcode.acceptedCount,1);
assert.throws(()=>processLidlPilotCsv(lines.join("\n")+"\n",[id],"B",at),/CSV storeId mismatch: selected B; found A/);
console.log("PASS: 25-row blank pilot rejects all; dot/comma decimals normalize; barcode provenance guarded; mismatched CSV store fails closed");

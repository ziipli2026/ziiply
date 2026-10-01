/** Offline, dependency-free guard for manually transcribed Lidl leaflet research. */
import fs from "node:fs";
import {fileURLToPath} from "node:url";
const file=process.argv[2]??fileURLToPath(new URL("../data/lidl/hyvinkaa-paper-leaflet-w40-2026.fixture.json",import.meta.url));
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const errors=[];
if(data===null||typeof data!=="object"||Array.isArray(data)||data.purpose!=="manual-leaflet-cross-check-only"||data.completeLeaflet!==false)errors.push("Research-only/incomplete-leaflet flags missing");
if(!Array.isArray(data?.records)||data.records.length<1)errors.push("No leaflet records");
const ids=new Set();
for(const [i,r] of (Array.isArray(data?.records)?data.records:[]).entries()){
 if(r===null||typeof r!=="object"||Array.isArray(r)){errors.push(i+": expected offer object");continue;}
 if(ids.has(r.id))errors.push(i+": duplicate id");ids.add(r.id);
 if(!r.id||!r.name)errors.push(i+": missing id/name");
 const dateOK=s=>{if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const parsed=new Date(s+"T00:00:00Z");return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===s;};
 if(!dateOK(r.validFrom)||(r.validThrough!==null&&!dateOK(r.validThrough))||(r.validThrough!==null&&r.validFrom>r.validThrough))errors.push(i+": invalid validity dates");
 if(r.validThrough===null&&!String(r.note??"").includes("no confirmed end date"))errors.push(i+": open-ended offer requires explicit unknown-end provenance");
 if(!Number.isFinite(r.printedPriceEur)||r.printedPriceEur<=0)errors.push(i+": invalid printed price");
 if(!["pack","kg","multi-buy","bundle"].includes(r.priceBasis))errors.push(i+": invalid price basis");
 if(!Number.isInteger(r.requiredQuantity)||r.requiredQuantity<1)errors.push(i+": invalid quantity");
 if(["multi-buy","bundle"].includes(r.priceBasis)&&r.requiredQuantity<2)errors.push(i+": multi-buy/bundle requires at least 2");
 if(r.priceBasis==="kg"&&r.requiredQuantity!==1)errors.push(i+": kg price must not be a multi-buy");
 if(!["open","lidl-plus","combination","limited-batch"].includes(r.eligibility))errors.push(i+": unknown eligibility");
 if(r.priceBasis==="bundle"&&r.eligibility!=="combination")errors.push(i+": bundle needs combination flag");
 if(r.ean!==null||r.lidlProductId!==null||r.regularPriceEur!==null||r.checkoutPriceVerified!==false)errors.push(i+": leaflet must not assert EAN, product ID, regular or checkout price");
}
console.log(JSON.stringify({records:data?.records?.length,passed:errors.length===0,errors},null,2));
if(errors.length)process.exitCode=1;

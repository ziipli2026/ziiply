import fs from "node:fs";
import { classifyLidlPriceEvidence } from "./lib/lidl-price-source-contract.mjs";

const input=process.argv[2];if(!input)throw new Error("usage: node scripts/import-lidl-verified-store-price.mjs <evidence.json>");
const candidate=JSON.parse(fs.readFileSync(input,"utf8"));
const bankPath="data/lidl/verified-store-price-bank-v1.json";
const bank=JSON.parse(fs.readFileSync(bankPath,"utf8"));
const required=["lidlProductId","storeId","regularPriceEur","priceKind","priceSource","checkoutPriceVerified","evidenceReference","observedAt"];
for(const k of required)if(candidate[k]===undefined||candidate[k]===null||candidate[k]==="")throw new Error("missing "+k);
if(!["verified-store-receipt","authorized-store-feed"].includes(candidate.priceSource))throw new Error("unsupported priceSource");
const checked=classifyLidlPriceEvidence(candidate,candidate.storeId,new Date());
if(!checked.comparable)throw new Error("rejected: "+checked.reason);
const key=r=>[r.lidlProductId,r.storeId,r.observedAt,r.priceSource,r.evidenceReference].join("|");
if(bank.records.some(r=>key(r)===key(candidate)))throw new Error("duplicate evidence row");
bank.records.push(candidate);
bank.records.sort((a,b)=>String(a.lidlProductId).localeCompare(String(b.lidlProductId))||String(a.storeId).localeCompare(String(b.storeId))||Date.parse(a.observedAt)-Date.parse(b.observedAt));
fs.writeFileSync(bankPath,JSON.stringify(bank,null,2)+"\n");
console.log(JSON.stringify({accepted:true,lidlProductId:candidate.lidlProductId,storeId:candidate.storeId,regularPriceEur:candidate.regularPriceEur,observedAt:candidate.observedAt,priceSource:candidate.priceSource}));

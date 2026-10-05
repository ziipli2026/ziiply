import {readFileSync,writeFileSync} from "node:fs";
import {classifyLidlPriceEvidence} from "./lib/lidl-price-source-contract.mjs";
const [exportPath,bankPath="data/lidl/verified-store-price-bank-v1.json",time]=process.argv.slice(2);
if(!exportPath){console.error("Usage: node scripts/merge-lidl-verified-price-export.mjs <verified-export.json> [bank.json] [ISO-time]");process.exit(2);}
const now=time?new Date(time):new Date();if(!Number.isFinite(now.getTime()))throw new Error("Invalid ISO-time");
const input=JSON.parse(readFileSync(exportPath,"utf8")),bank=JSON.parse(readFileSync(bankPath,"utf8"));
if(!Array.isArray(input.records)||!Array.isArray(bank.records))throw new Error("Invalid export or bank");
const key=r=>[r.lidlProductId,r.storeId,r.observedAt,r.priceSource,r.evidenceReference].join("|");
const existing=new Set(bank.records.map(key));let added=0;
for(const row of input.records){
 const verdict=classifyLidlPriceEvidence(row,row.storeId,now);
 if(!verdict.comparable)throw new Error("Rejected export row "+row.lidlProductId+": "+verdict.reason);
 if(existing.has(key(row)))continue;
 bank.records.push(row);existing.add(key(row));added++;
}
bank.records.sort((a,b)=>String(a.lidlProductId).localeCompare(String(b.lidlProductId))||String(a.storeId).localeCompare(String(b.storeId))||Date.parse(a.observedAt)-Date.parse(b.observedAt));
writeFileSync(bankPath,JSON.stringify(bank,null,2)+"\n");
console.log(JSON.stringify({added,total:bank.records.length}));

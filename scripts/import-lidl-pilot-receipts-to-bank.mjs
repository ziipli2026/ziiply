import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with { type:"json" };
import { processLidlPilotCsv } from "./lib/lidl-pilot-csv-intake.mjs";
import { classifyLidlPriceEvidence } from "./lib/lidl-price-source-contract.mjs";

const [csvPath, storeId, time, bankArg="data/lidl/verified-store-price-bank-v1.json"] = process.argv.slice(2);
if (!csvPath || !storeId) {
  console.error("Usage: node scripts/import-lidl-pilot-receipts-to-bank.mjs <local-csv> <store-id> [ISO-time] [bank.json]");
  process.exit(2);
}
const now = time ? new Date(time) : new Date();
if (!Number.isFinite(now.getTime())) throw new Error("Invalid ISO-time");

const excluded = new Set(catalog.quarantinedProductIds.map(String));
const knownIds = catalog.records.map(x => String(x.lidlProductId)).filter(id => !excluded.has(id));
const result = processLidlPilotCsv(readFileSync(csvPath, "utf8"), knownIds, storeId, now);
if (result.rejected.length) {
  const reasons = Object.fromEntries([...new Set(result.rejected.map(x=>x.reason))].sort().map(reason=>[
    reason, result.rejected.filter(x=>x.reason===reason).length
  ]));
  console.error(JSON.stringify({status:"rejected", accepted:result.prices.length, rejected:result.rejected.length, rejectionReasons:reasons}, null, 2));
  process.exit(1);
}
if (!result.prices.length) {
  console.error(JSON.stringify({status:"rejected", reason:"no-verified-receipt-prices"}, null, 2));
  process.exit(1);
}

const bankPath = resolve(bankArg);
const bank = JSON.parse(readFileSync(bankPath, "utf8"));
if (!Array.isArray(bank.records)) throw new Error("Invalid verified price bank");
const key = r => [r.lidlProductId,r.storeId,r.observedAt,r.priceSource,r.evidenceReference].join("|");
const existing = new Set(bank.records.map(key));
let added = 0;
for (const row of result.prices) {
  if (row.storeId !== storeId) throw new Error("Store mismatch in accepted row");
  const verdict = classifyLidlPriceEvidence(row, storeId, now);
  if (!verdict.comparable) throw new Error("Accepted row failed final price contract: "+row.lidlProductId+" "+verdict.reason);
  if (existing.has(key(row))) continue;
  bank.records.push(row);
  existing.add(key(row));
  added++;
}
bank.records.sort((a,b)=>String(a.lidlProductId).localeCompare(String(b.lidlProductId))||String(a.storeId).localeCompare(String(b.storeId))||Date.parse(a.observedAt)-Date.parse(b.observedAt));

const tmp = bankPath+".tmp";
writeFileSync(tmp, JSON.stringify(bank,null,2)+"\n", {mode:0o600});
renameSync(tmp, bankPath);
console.log(JSON.stringify({status:"ok",storeId,inputCount:result.inputCount,accepted:result.prices.length,added,total:bank.records.length}));

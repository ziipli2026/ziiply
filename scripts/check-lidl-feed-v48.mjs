/** Standalone research-only feed acceptance check: node scripts/check-lidl-feed-v48.mjs path/to/feed.json */
import fs from "node:fs";
const path=process.argv[2];
if(!path){console.error("Usage: node scripts/check-lidl-feed-v48.mjs <feed.json>");process.exit(2);}
const input=JSON.parse(fs.readFileSync(path,"utf8"));
const rows=Array.isArray(input)?input:input.records;
if(!Array.isArray(rows)){console.error("Expected array or {records: array}");process.exit(2);}
const errors=[], seen=new Set();
const words=["maito","kananmuna","voi","pasta","jauheliha","banaani","peruna","juusto"];
const normalize=s=>String(s??"").toLocaleLowerCase("fi-FI").normalize("NFKC");
const matching=(name,q)=>normalize(name).split(/[^\p{L}\p{N}]+/u).some(t=>t===q||t.endsWith(q));
for(const [i,r] of rows.entries()){
 const id=String(r.productId??r.lidlProductId??"").trim();
 if(!id)errors.push(`record ${i}: missing product ID`);
 if(seen.has(id))errors.push(`record ${i}: duplicate ID ${id}`);
 seen.add(id);
 if(!String(r.name??"").trim())errors.push(`record ${i}: missing name`);
 const p=r.regularPriceEur;
 if(p!==null&&p!==undefined&&(!Number.isFinite(p)||p<=0))errors.push(`record ${i}: invalid regular price`);
 if(r.ean!==null&&r.ean!==undefined&&!/^\d{8}(?:\d{4,6})?$/.test(String(r.ean)))errors.push(`record ${i}: invalid EAN/GTIN`);
 if(r.ian!==undefined&&r.ean!==undefined&&String(r.ian)===String(r.ean))errors.push(`record ${i}: suspicious IAN reused as EAN`);
 if(p!==null&&p!==undefined&&(!r.observedAt||!r.priceSource||!r.storeScope))errors.push(`record ${i}: priced record missing timestamp/source/store scope`);
}
const coverage=words.map(query=>({query,matches:rows.filter(r=>matching(r.name,query)).length}));
const missing=coverage.filter(x=>!x.matches).map(x=>x.query);
if(missing.length)errors.push("Core staple gaps: "+missing.join(", "));
console.log(JSON.stringify({records:rows.length,uniqueIds:seen.size,coverage,accepted:errors.length===0,errors},null,2));
if(errors.length)process.exitCode=1;

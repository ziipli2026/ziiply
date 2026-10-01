/** Standalone research-only feed acceptance check: node scripts/check-lidl-feed-v48.mjs path/to/feed.json */
import fs from "node:fs";
const path=process.argv[2];
if(!path){console.error("Usage: node scripts/check-lidl-feed-v48.mjs <feed.json>");process.exit(2);}
let input;
try{input=JSON.parse(fs.readFileSync(path,"utf8"));}catch(error){console.error("Unable to read valid feed JSON:",error.message);process.exit(2);}
const rows=Array.isArray(input)?input:(input!==null&&typeof input==="object"?input.records:null);
if(!Array.isArray(rows)){console.error("Expected array or {records: array}");process.exit(2);}
const errors=[], seen=new Set();
const words=["maito","kananmuna","voi","pasta","jauheliha","banaani","peruna","juusto"];
const normalize=s=>String(s??"").toLocaleLowerCase("fi-FI").normalize("NFKC");
const validGtin=value=>{const digits=String(value);if(!/^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$/.test(digits))return false;const a=[...digits].map(Number);const check=a.pop();let sum=0;for(let i=a.length-1,weight=3;i>=0;i--,weight=weight===3?1:3)sum+=a[i]*weight;return (10-sum%10)%10===check;};
const matching=(name,q)=>normalize(name).split(/[^\p{L}\p{N}]+/u).some(t=>t===q||t.endsWith(q));
for(const [i,r] of rows.entries()){
 if(r===null||typeof r!=="object"||Array.isArray(r)){errors.push(`record ${i}: expected product object`);continue;}
 const rawId=r.productId??r.lidlProductId;
 const id=typeof rawId==="string"?rawId.trim():"";
 if(!id)errors.push(`record ${i}: missing string product ID`);
 else if(seen.has(id))errors.push(`record ${i}: duplicate ID ${id}`);
 else seen.add(id);
 if(!String(r.name??"").trim())errors.push(`record ${i}: missing name`);
 const p=r.regularPriceEur;
 if(p!==null&&p!==undefined&&(!Number.isFinite(p)||p<=0))errors.push(`record ${i}: invalid regular price`);
 if(r.ean!=null&&typeof r.ean!=="string")errors.push(`record ${i}: EAN must be a string to preserve leading zeros`);
 if(r.ean!=null&&!validGtin(r.ean))errors.push(`record ${i}: invalid EAN/GTIN check digit`);
 if(r.ean!=null&&(!String(r.eanSource??"").trim()||r.eanVerifiedForProduct!==true))errors.push(`record ${i}: EAN needs product-specific verification and source`);
 if(r.ian!=null&&r.ean!=null&&String(r.ian)===String(r.ean))errors.push(`record ${i}: suspicious IAN reused as EAN`);
 if(p!==null&&p!==undefined&&(!r.observedAt||!r.priceSource||!r.storeScope))errors.push(`record ${i}: priced record missing timestamp/source/store scope`);
 if(r.checkoutPriceVerified===true&&(!r.storeId||!r.priceValidFrom||!r.priceSource||p===null||p===undefined))errors.push(`record ${i}: checkout verification lacks store ID, effective date, source or price`);
 if(p!==null&&p!==undefined&&r.checkoutPriceVerified!==true)errors.push(`record ${i}: priced feed row is not checkout verified`);
 if(r.checkoutPriceVerified===true&&String(r.storeId)!==String(r.storeScope))errors.push(`record ${i}: verified store ID and scope disagree`);
 if(r.checkoutPriceVerified===true){
 const date=String(r.priceValidFrom??"");
 const parsed=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)?new Date(date+"T00:00:00Z"):null;
 if(!parsed||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)errors.push(`record ${i}: invalid effective calendar date`);
}
 if(r.priceSource==="lidl-official-public"&&r.checkoutPriceVerified===true)errors.push(`record ${i}: public website observation cannot by itself verify local checkout price`);
 if(r.checkoutPriceVerified===true){
 const observed=String(r.observedAt??"");
 const offsetTimestamp=/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(observed);
 if(!offsetTimestamp||!Number.isFinite(Date.parse(observed)))errors.push(`record ${i}: observation timestamp must be valid ISO 8601 with timezone`);
}
 if(r.checkoutPriceVerified===true&&(!String(r.priceSource??"").trim()||!String(r.storeId??"").trim()))errors.push(`record ${i}: empty verification provenance`);
}
const validRows=rows.filter(r=>r!==null&&typeof r==="object"&&!Array.isArray(r));
const coverage=words.map(query=>({query,matches:validRows.filter(r=>matching(r.name,query)).length}));
const missing=coverage.filter(x=>!x.matches).map(x=>x.query);
const priced=validRows.filter(r=>Number.isFinite(r.regularPriceEur)&&r.regularPriceEur>0).length;
const checkoutVerified=validRows.filter(r=>r.checkoutPriceVerified===true).length;
if(checkoutVerified===0)errors.push("No store-specific checkout-verified prices");
if(missing.length)errors.push("Core staple gaps: "+missing.join(", "));
console.log(JSON.stringify({records:rows.length,uniqueIds:seen.size,coverage,priced,checkoutVerified,accepted:errors.length===0,errors},null,2));
if(errors.length)process.exitCode=1;

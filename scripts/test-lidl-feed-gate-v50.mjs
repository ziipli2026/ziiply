/** Regression fixture for Lidl feed acceptance gate. Run: node scripts/test-lidl-feed-gate-v50.mjs */
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const dir=mkdtempSync(join(tmpdir(),"ziiply-lidl-gate-"));
const terms=["maito","kananmuna","voi","pasta","jauheliha","banaani","peruna","juusto"];
const good=terms.map((name,i)=>({productId:String(1000+i),name,regularPriceEur:1.5,storeId:"FI0326",storeScope:"FI0326",observedAt:"2026-10-01T12:00:00+03:00",priceValidFrom:"2026-10-01",priceSource:"authorized-store-feed",checkoutPriceVerified:true,ean:null,ian:String(7000+i)}));
function run(label,records,expected,reason=null){
 const path=join(dir,label+".json");writeFileSync(path,JSON.stringify({records}));
 const result=spawnSync(process.execPath,[fileURLToPath(new URL("./check-lidl-feed-v48.mjs",import.meta.url)),path],{encoding:"utf8"});
 let output=null;
 try{output=JSON.parse(result.stdout);}catch{}
 // A failed child process or invalid JSON must never count as a successful negative test.
 const executed=result.error===undefined&&result.signal===null&&result.stderr.trim()===""&&output!==null&&Array.isArray(output.errors);
 const actualAccepted=executed&&result.status===0&&output.accepted===true&&output.errors.length===0;
 const rejectedProperly=executed&&result.status===1&&output.accepted===false&&output.errors.length>0;
 const reasonMatched=reason===null||Boolean(output?.errors?.some(error=>error.includes(reason)));
 const passed=(expected?actualAccepted:rejectedProperly)&&reasonMatched;
 console.log(JSON.stringify({test:label,expectedAccepted:expected,actualAccepted,errors:output?.errors??null,reasonMatched,passed}));
 if(!passed){console.error(result.error??"",result.stdout,result.stderr);process.exitCode=1;}
}
function runMalformedInput(label,raw,expectedMessage){
 const path=join(dir,label+".json");writeFileSync(path,raw);
 const result=spawnSync(process.execPath,[fileURLToPath(new URL("./check-lidl-feed-v48.mjs",import.meta.url)),path],{encoding:"utf8"});
 const passed=result.status===2&&result.stderr.includes(expectedMessage)&&result.stdout.trim()==="";
 console.log(JSON.stringify({test:label,expectedUsageError:true,passed}));
 if(!passed){console.error(result.stdout,result.stderr);process.exitCode=1;}
}
try{
 runMalformedInput("top-level-null","null","Expected array or {records: array}");
 runMalformedInput("malformed-json","{oops","Unable to read valid feed JSON");
 run("valid-authorized-store-feed",good,true);
 run("null-record",[...good,null],false,"expected product object");
 run("string-record",[...good,"not a product"],false,"expected product object");
 run("array-record",[...good,[]],false,"expected product object");
 run("public-price-not-checkout",good.map(x=>({...x,priceSource:"lidl-official-public"})),false,"public website observation");
 run("unknown-verification-source",good.map(x=>({...x,priceSource:"self-declared"})),false,"approved evidence source");
 run("receipt-without-evidence",good.map(x=>({...x,priceSource:"verified-store-receipt"})),false,"nonempty evidence reference");
 run("verified-store-receipt",good.map(x=>({...x,priceSource:"verified-store-receipt",evidenceReference:"EXAMPLE-RECEIPT-REFERENCE"})),true);
 run("missing-staple",good.slice(1),false,"Core staple gaps");
 run("duplicate-product-id",[...good,good[0]],false,"duplicate ID");
 run("missing-product-id",good.map(x=>({...x,productId:null})),false,"missing string product ID");
 run("numeric-product-id",good.map(x=>({...x,productId:1000})),false,"missing string product ID");
 run("conflicting-product-ids",good.map(x=>({...x,lidlProductId:"other-"+x.productId})),false,"conflicting Lidl product IDs");
 run("matching-product-ids",good.map(x=>({...x,lidlProductId:x.productId})),true);
 run("numeric-product-name",good.map(x=>({...x,name:123})),false,"missing string product name");
 run("empty-product-name",good.map(x=>({...x,name:"   "})),false,"missing string product name");
 run("missing-store",good.map(x=>({...x,storeId:null})),false,"checkout verification lacks store ID");
 run("missing-effective-date",good.map(x=>({...x,priceValidFrom:null})),false,"checkout verification lacks store ID");
 run("unverified-all",good.map(x=>({...x,checkoutPriceVerified:false})),false,"priced feed row is not checkout verified");
 run("partially-unverified",[...good.slice(0,7),{...good[7],checkoutPriceVerified:false}],false,"priced feed row is not checkout verified");
 run("store-scope-mismatch",good.map(x=>({...x,storeScope:"FI9999"})),false,"verified store ID and scope disagree");
 run("invalid-effective-date",good.map(x=>({...x,priceValidFrom:"today"})),false,"invalid effective calendar date");
 run("impossible-calendar-date",good.map(x=>({...x,priceValidFrom:"2026-02-30"})),false,"invalid effective calendar date");
 run("null-ian-and-ean",good.map(x=>({...x,ian:null,ean:null})),true);
 run("invalid-observation-timestamp",good.map(x=>({...x,observedAt:"nonsense"})),false,"observation timestamp must be valid ISO 8601");
 run("timestamp-without-timezone",good.map(x=>({...x,observedAt:"2026-10-01T12:00:00"})),false,"observation timestamp must be valid ISO 8601");
 run("date-only-observation",good.map(x=>({...x,observedAt:"2026-10-01"})),false,"observation timestamp must be valid ISO 8601");
 run("impossible-observation-date",good.map(x=>({...x,observedAt:"2026-02-30T12:00:00+03:00"})),false,"observation timestamp must be valid ISO 8601");
 run("invalid-observation-hour",good.map(x=>({...x,observedAt:"2026-10-01T25:00:00+03:00"})),false,"observation timestamp must be valid ISO 8601");
 run("empty-provenance",good.map(x=>({...x,priceSource:"   "})),false,"empty verification provenance");
 run("invalid-zero-price",good.map(x=>({...x,regularPriceEur:0})),false,"invalid regular price");
 run("ian-reused-as-ean",good.map(x=>({...x,ean:x.ian})),false,"suspicious IAN reused as EAN");
 run("valid-gtin13",good.map(x=>({...x,ean:"6410405082657",eanSource:"verified-product-packaging",eanVerifiedForProduct:true})),true);
 run("numeric-gtin",good.map(x=>({...x,ean:6410405082657,eanSource:"verified-product-packaging",eanVerifiedForProduct:true})),false,"EAN must be a string");
 run("bad-gtin-check-digit",good.map(x=>({...x,ean:"6410405082658",eanSource:"verified-product-packaging",eanVerifiedForProduct:true})),false,"invalid EAN/GTIN check digit");
 run("valid-checksum-without-product-proof",good.map(x=>({...x,ean:"6410405082657"})),false,"EAN needs product-specific verification");
 run("ean-proof-without-source",good.map(x=>({...x,ean:"6410405082657",eanVerifiedForProduct:true})),false,"EAN needs product-specific verification");
}finally{rmSync(dir,{recursive:true,force:true});}

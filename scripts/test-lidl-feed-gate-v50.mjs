/** Regression fixture for Lidl feed acceptance gate. Run: node scripts/test-lidl-feed-gate-v50.mjs */
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const dir=mkdtempSync(join(tmpdir(),"ziiply-lidl-gate-"));
const terms=["maito","kananmuna","voi","pasta","jauheliha","banaani","peruna","juusto"];
const good=terms.map((name,i)=>({productId:String(1000+i),name,regularPriceEur:1.5,storeId:"FI0326",storeScope:"FI0326",observedAt:"2026-10-01T12:00:00+03:00",priceValidFrom:"2026-10-01",priceSource:"authorized-store-feed",checkoutPriceVerified:true,ean:null,ian:String(7000+i)}));
function run(label,records,expected){
 const path=join(dir,label+".json");writeFileSync(path,JSON.stringify({records}));
 const result=spawnSync(process.execPath,[new URL("./check-lidl-feed-v48.mjs",import.meta.url).pathname,path],{encoding:"utf8"});
 const passed=(result.status===0)===expected;
 console.log(JSON.stringify({test:label,expectedAccepted:expected,actualAccepted:result.status===0,passed}));
 if(!passed){console.error(result.stdout,result.stderr);process.exitCode=1;}
}
try{
 run("valid-authorized-store-feed",good,true);
 run("public-price-not-checkout",good.map(x=>({...x,priceSource:"lidl-official-public"})),false);
 run("missing-staple",good.slice(1),false);
 run("duplicate-product-id",[...good,good[0]],false);
 run("missing-store",good.map(x=>({...x,storeId:null})),false);
 run("missing-effective-date",good.map(x=>({...x,priceValidFrom:null})),false);
 run("unverified-all",good.map(x=>({...x,checkoutPriceVerified:false})),false);
 run("invalid-zero-price",good.map(x=>({...x,regularPriceEur:0})),false);
 run("ian-reused-as-ean",good.map(x=>({...x,ean:x.ian})),false);
}finally{rmSync(dir,{recursive:true,force:true});}

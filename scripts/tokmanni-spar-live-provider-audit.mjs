#!/usr/bin/env node
// Read-only provider audit. This reports candidates; it never approves classifications.
import {writeFileSync} from "node:fs";
const terms=["maito","kahvi","kananmuna","leipä","juusto","jogurtti","voi","riisi","pasta","sokeri","jauho","mehu","cola","peruna","banaani","omena","tomaatti","kana","kala","suklaa","keksi","muro","jäätelö","kerma","rahka","öljy","suola","tee","makkara","puuro"];
const ticket="klevu-15488592134928913";
const suspicious=/(?:sukat?|shampoo|puhdistus|kasvovoide|vartalovoide|lemmikki|koiran|kissan|lelu|matto|paita|housut|työkalu|paristo|puhelin|kaapeli)/iu;
const findings=[];let fetched=0,failures=0;
for(const term of terms){
 const url=new URL("https://eucs11.ksearchnet.com/cloud-search/n-search/search");
 for(const [key,value] of Object.entries({ticket,analyticsApiKey:ticket,term,paginationStartsFrom:"0",noOfResults:"100",klevuSort:"rel",responseType:"json",category:"KLEVU_PRODUCT",visibility:"search",showOutOfStockProducts:"true",fetchMinMaxPrice:"true"}))url.searchParams.set(key,value);
 try{
  const response=await fetch(url,{headers:{accept:"application/json","user-agent":"Ziiply/1.0"},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error("HTTP "+response.status);
  const json=await response.json();const items=Array.isArray(json.result)?json.result:[];
  fetched++;
  const suspect=items.filter(x=>suspicious.test(String(x.name??""))).map(x=>({ean:String(x.sku??""),name:String(x.name??""),category:String(x.category??"")}));
  findings.push({term,count:items.length,suspect});
  console.log(term+": "+items.length+" results; "+suspect.length+" candidates");
 }catch(error){failures++;findings.push({term,error:String(error)});console.log(term+": fetch failed "+String(error));}
}
writeFileSync("spar-live-audit.json",JSON.stringify({source:"Tokmanni Klevu public search",readOnly:true,queries:terms.length,fetched,failures,findings},null,2));
console.log("SUMMARY queries="+terms.length+" fetched="+fetched+" failed="+failures+" candidates="+findings.reduce((n,x)=>n+(x.suspect?.length??0),0));
if(failures)process.exitCode=1;

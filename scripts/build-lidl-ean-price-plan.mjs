#!/usr/bin/env node
/**
 * Convert current Lidl collector evidence into exact EAN cache candidates.
 * Plan only: no Neon writes.
 */
import {readFileSync} from "node:fs";
const [collectorPath,linksPath="data/lidl/verified-ean-links.json"]=process.argv.slice(2);
if(!collectorPath) throw new Error("Pass collector JSON path");
const data=JSON.parse(readFileSync(collectorPath,"utf8"));
const links=JSON.parse(readFileSync(linksPath,"utf8"));
const eanByProduct=new Map(links.map(x=>[String(x.lidlProductId),String(x.ean)]));
const rows=[...(data.records||[])];
const candidates=[];
for(const r of rows){
  const ean=eanByProduct.get(String(r.lidlProductId||""));
  if(!ean || !/^\d{8,14}$/.test(ean)) continue;
  if(r.temporalStatus==="future"||r.temporalStatus==="past") continue;
  if(!["regular","offer","lidl_plus"].includes(r.priceKind)) continue;
  if(!(Number(r.displayedPriceEur)>0) || !r.freshUntil) continue;
  candidates.push({
    ean,lidlProductId:String(r.lidlProductId),priceEur:Number(r.displayedPriceEur),
    priceKind:r.priceKind,observedAt:r.observedAt,freshUntil:r.freshUntil,
    source:"lidl-fi-public-current",checkoutPriceVerified:false,
    evidenceReference:[r.productUrl||r.source,r.priceClassificationReason].filter(Boolean).join("; ")
  });
}
const rank={lidl_plus:3,offer:2,regular:1};
const best=new Map();
for(const x of candidates){
  const k=x.ean+"|"+x.priceKind;
  const old=best.get(k);
  if(!old||rank[x.priceKind]>=rank[old.priceKind]) best.set(k,x);
}
const rowsOut=[...best.values()].sort((a,b)=>a.ean.localeCompare(b.ean));
process.stdout.write(JSON.stringify({schemaVersion:1,mode:"plan-only",count:rowsOut.length,rows:rowsOut},null,2)+"\n");

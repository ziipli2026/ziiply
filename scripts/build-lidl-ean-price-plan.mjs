#!/usr/bin/env node
/**
 * Convert current Lidl collector evidence into exact EAN cache candidates.
 * Plan only: no Neon writes.
 * Preserve price kinds independently per verified product/EAN.
 * A current offer/Lidl Plus observation must never erase or masquerade as a regular price.
 */
import {readFileSync} from "node:fs";
const [collectorPath,linksPath="data/lidl/verified-ean-links.json"]=process.argv.slice(2);
if(!collectorPath) throw new Error("Pass collector JSON path");
const data=JSON.parse(readFileSync(collectorPath,"utf8"));
const links=JSON.parse(readFileSync(linksPath,"utf8"));
const eanByProduct=new Map(links.map(x=>[String(x.lidlProductId),String(x.ean)]));
const candidates=[];
for(const r of data.records||[]){
  const productId=String(r.lidlProductId||"");
  const ean=eanByProduct.get(productId);
  if(!ean || !/^\d{8,14}$/.test(ean)) continue;
  if(r.temporalStatus==="future"||r.temporalStatus==="past") continue;
  if(!["regular","offer","lidl_plus"].includes(r.priceKind)) continue;
  if(!(Number(r.displayedPriceEur)>0) || !r.freshUntil) continue;
  candidates.push({
    ean,lidlProductId:productId,priceEur:Number(r.displayedPriceEur),
    priceKind:r.priceKind,temporalStatus:r.temporalStatus,
    observedAt:r.observedAt,freshUntil:r.freshUntil,
    source:"lidl-fi-public-current",checkoutPriceVerified:false,
    evidenceReference:[r.productUrl||r.source,r.priceClassificationReason].filter(Boolean).join("; ")
  });
}
const rank=x=>{
  if(x.temporalStatus==="current") return 20;
  if(x.temporalStatus==="continuous") return 10;
  return 0;
};
const best=new Map();
for(const x of candidates){
  const key=x.ean+"|"+x.priceKind;
  const old=best.get(key);
  if(!old||rank(x)>rank(old)) best.set(key,x);
}
const rowsOut=[...best.values()].sort((a,b)=>a.ean.localeCompare(b.ean)||a.priceKind.localeCompare(b.priceKind));
const counts=rowsOut.reduce((a,x)=>(a[x.priceKind]=(a[x.priceKind]||0)+1,a),{});
process.stdout.write(JSON.stringify({schemaVersion:3,mode:"plan-only",count:rowsOut.length,counts,rows:rowsOut},null,2)+"\n");

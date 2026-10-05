import bank from "../../data/lidl/verified-store-price-bank-v1.json";
import { classifyLidlPriceEvidence } from "../../scripts/lib/lidl-price-source-contract.mjs";

export type VerifiedLidlStorePrice = {
  lidlProductId: string;
  storeId: string;
  regularPriceEur: number;
  observedAt: string;
  freshUntil: string | null;
  priceSource: "verified-store-receipt" | "authorized-store-feed";
  evidenceReference: string;
};

export function getVerifiedLidlStorePrice(lidlProductId:string,storeId:string,now=new Date()):VerifiedLidlStorePrice|null{
 const id=String(lidlProductId||"").trim(),store=String(storeId||"").trim();
 if(!id||!store)return null;
 const candidates=(bank.records as any[]).filter(r=>String(r.lidlProductId)===id&&r.storeId===store)
  .map(r=>({r,result:classifyLidlPriceEvidence(r,store,now)}))
  .filter(x=>x.result.comparable)
  .sort((a,b)=>Date.parse(b.r.observedAt)-Date.parse(a.r.observedAt));
 const hit=candidates[0];if(!hit)return null;
 const r=hit.r;
 const freshUntil=r.priceSource==="verified-store-receipt"
  ?new Date(Date.parse(r.observedAt)+24*60*60*1000).toISOString()
  :r.validThrough??null;
 return {lidlProductId:id,storeId:store,regularPriceEur:hit.result.regularPriceEur,observedAt:r.observedAt,freshUntil,priceSource:r.priceSource,evidenceReference:r.evidenceReference};
}

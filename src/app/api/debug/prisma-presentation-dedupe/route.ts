import { NextResponse } from "next/server";
import { searchSelectedSKaupatOffersV11 } from "../../../components/ziiply/offerSearch/ziiplyOfferSearchSources";
import { fetchPrismaCampaignOffersV1 } from "../../../components/ziiply/offerSearch/providers/skaupatPrismaCampaignProvider";
export const dynamic = "force-dynamic";
export async function GET() {
  const storeName="Prisma Hyvinkää", MASTER="__ziiply_all_offers__";
  const ctx={storeName,sStoreName:storeName,storeNames:[storeName],sStoreNames:[storeName],storeCompareScope:"within_chain",withinChain:"S"};
  const cfg={id:"skaupat",chain:"S",storeLabel:storeName,url:"https://www.s-kaupat.fi"};
  const [offers,campaigns]=await Promise.all([searchSelectedSKaupatOffersV11(MASTER,ctx as any),fetchPrismaCampaignOffersV1(MASTER,cfg as any,storeName)]);
  const price=(x:any)=>{const n=Number(x?.price);if(Number.isFinite(n)&&n>0)return n.toFixed(4);const p=Number(String(x?.priceText??"").replace(/[^0-9,.-]/g,"").replace(",","."));return Number.isFinite(p)&&p>0?p.toFixed(4):""};
  const key=(x:any)=>{const e=String(x?.ean??"").replace(/\D/g,""),p=price(x);return e&&p?e+"|"+p:""};
  const campaignKeys=new Set(campaigns.map(key).filter(Boolean));
  const removed=offers.filter((x:any)=>{const k=key(x);return k&&campaignKeys.has(k)});
  return NextResponse.json({storeName,offersBefore:offers.length,campaignsBefore:campaigns.length,exactMatchesRemoved:removed.length,offersAfter:offers.length-removed.length,campaignsAfter:campaigns.length,totalVisibleAfter:offers.length-removed.length+campaigns.length,muikku:{offersBefore:offers.filter((x:any)=>String(x?.ean)==="2004657500003").length,removed:removed.filter((x:any)=>String(x?.ean)==="2004657500003").length,campaigns:campaigns.filter((x:any)=>String(x?.ean)==="2004657500003").length},removedSamples:removed.slice(0,12).map((x:any)=>({ean:x?.ean??null,title:x?.title??null,price:price(x)}))});
}
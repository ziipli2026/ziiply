import {
  searchSelectedSKaupatOffersV11,
  searchZiiplyOffers,
} from "../src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources";
import { fetchPrismaCampaignOffersV1 } from "../src/app/components/ziiply/offerSearch/providers/skaupatPrismaCampaignProvider";

const MASTER="__ziiply_all_offers__";
const storeName=process.argv[2]||"Prisma Hyvinkää";
const storeId=process.argv[3]||"634976534";
const ctx={storeName,storeId,sStoreId:storeId,sStoreIds:[storeId],sStoreName:storeName,storeNames:[storeName],sStoreNames:[storeName],storeCompareScope:"within_chain",withinChain:"S"};
const cfg={id:"skaupat",chain:"S",storeLabel:"S-kaupat",url:"https://www.s-kaupat.fi/tuotteet/kampanjat"};

const norm=(v:any)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9åäö\s-]/gi," ").replace(/\s+/g," ").trim();
const price=(x:any)=>{const n=Number(x?.price);if(Number.isFinite(n))return n.toFixed(4);const p=Number(String(x?.priceText??"").replace(/[^0-9,.-]/g,"").replace(",", "."));return Number.isFinite(p)?p.toFixed(4):""};
const validity=(x:any)=>({from:String(x?.validFrom??"").trim(),until:String(x?.validUntil??"").trim()});
const type=(x:any)=>x?.campaignType==="campaign"?"campaign":"offer";
const key=(x:any)=>{const e=String(x?.ean??x?.gtin??x?.barcode??"").replace(/\D/g,"");const p=price(x);const v=validity(x);const store=norm(x?.storeLabel);return (e?`ean:${e}`:`title:${norm(x?.title)}`)+`|store:${store}|price:${p}|from:${v.from}|until:${v.until}`};
const typed=(x:any)=>`${type(x)}|${key(x)}`;
const row=(x:any)=>({type:type(x),ean:String(x?.ean??""),title:x?.title??"",price:price(x),priceText:x?.priceText??"",validFrom:x?.validFrom??"",validUntil:x?.validUntil??"",storeLabel:x?.storeLabel??"",category:x?.category??"",id:x?.id??"",source:x?.source??""});

const [discounted,campaigns]=await Promise.all([
  searchSelectedSKaupatOffersV11(MASTER,ctx as any),
  fetchPrismaCampaignOffersV1(MASTER,cfg as any,storeName),
]);
const input=[
  ...discounted.map((x:any)=>({...x,campaignType:x?.campaignType==="campaign"?"campaign":"offer"})),
  ...campaigns.map((x:any)=>({...x,campaignType:"campaign"})),
];
const master=await searchZiiplyOffers(MASTER,ctx as any);

function multimap(items:any[],fn:(x:any)=>string){const m=new Map<string,any[]>();for(const x of items){const k=fn(x);m.set(k,[...(m.get(k)||[]),x]);}return m}
const inputTyped=multimap(input,typed), masterTyped=multimap(master,typed);
const dropped=input.filter(x=>!masterTyped.has(typed(x)));
const unexpected=master.filter(x=>!inputTyped.has(typed(x)));

const offers=master.filter((x:any)=>type(x)==="offer");
const campaignRows=master.filter((x:any)=>type(x)==="campaign");
const offerEan=new Map<string,any[]>(), campaignEan=new Map<string,any[]>();
for(const x of offers){const item=x as any;const e=String(item?.ean??"").trim();if(e)offerEan.set(e,[...(offerEan.get(e)||[]),item])}
for(const x of campaignRows){const item=x as any;const e=String(item?.ean??"").trim();if(e)campaignEan.set(e,[...(campaignEan.get(e)||[]),item])}
const crossTab=[...offerEan.entries()].filter(([e])=>campaignEan.has(e)).map(([e,os])=>({ean:e,offers:os.map(row),campaigns:(campaignEan.get(e)||[]).map(row)}));
const samePriceCrossTab=crossTab.filter((g:any)=>g.offers.some((o:any)=>g.campaigns.some((c:any)=>o.price&&o.price===c.price)));

const report={
 audit:"PRISMA_PIPELINE_DROP_TRACE_V1",storeName,
 counts:{discounted:discounted.length,campaigns:campaigns.length,input:input.length,master:master.length,masterOffers:offers.length,masterCampaigns:campaignRows.length,dropped:dropped.length,unexpected:unexpected.length,crossTabSameEan:crossTab.length,crossTabSameEanSamePrice:samePriceCrossTab.length},
 dropped:dropped.slice(0,200).map(row),
 unexpected:unexpected.slice(0,100).map(row),
 samePriceCrossTab:samePriceCrossTab.slice(0,100),
 pass:dropped.length===0&&unexpected.length===0
};
console.log(JSON.stringify(report,null,2));
if(!report.pass) process.exitCode=1;

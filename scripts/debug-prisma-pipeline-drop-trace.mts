import {
  searchSelectedSKaupatOffersV11,
  searchZiiplyOffers,
} from "../src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources";
import { fetchPrismaCampaignOffersV1 } from "../src/app/components/ziiply/offerSearch/providers/skaupatPrismaCampaignProvider";
import { dedupeZiiplyGostaOfferResultsV146, cleanZiiplyGostaOfferResultsV146, mapZiiplyGostaOfferToCardOfferV147, filterZiiplyGostaOfferResultsV146, GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147 } from "../src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore";

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
const offerDeduped=dedupeZiiplyGostaOfferResultsV146(offers as any);
const campaignDeduped=dedupeZiiplyGostaOfferResultsV146(campaignRows as any);
const offerCleaned=cleanZiiplyGostaOfferResultsV146(offers as any);
const campaignCleaned=cleanZiiplyGostaOfferResultsV146(campaignRows as any);

function pageCardDedupeTrace(items:any[]){
  const seen=new Map<string,any>(), seenRoots=new Map<string,any>(), kept:any[]=[], removed:any[]=[];
  const root=(item:any)=>{
    const stop=new Set(["snellman","snellmanin","atria","hk","kotimaista","pirkka","rainbow","xtra","coop","nopea","ohut","murea","suikale","pala","viipale","marinoitu","maustettu","grilli","grillattu","pakkaus","rasia","tuore","tuotettu","suomi","suomalainen","kg","g"]);
    return norm(item?.name||item?.title||item?.productName||"").replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g," ").replace(/\b\d+\s*x\s*\d+\b/g," ").replace(/\s+/g," ").trim().split(/\s+/).filter((w:string)=>w.length>2&&!stop.has(w)).slice(0,2).join(" ");
  };
  for(const item of items){
    const source=item?.__sourceOfferSearchResult||item;
    const ean=norm(source?.ean||source?.gtin||source?.barcode||item?.ean||"");
    const visibleName=norm(item?.name||item?.title||item?.productName||source?.name||source?.title||source?.productName||"").replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g," ").replace(/\b\d+\s*x\s*\d+\b/g," ").replace(/\s+/g," ").trim();
    const visiblePrice=norm(item?.offerPrice??item?.price??source?.priceText??"");
    const r=root(item), rootKey=r&&visiblePrice?`${r}|${visiblePrice}`:"";
    const key=ean?`ean:${ean}`:(visibleName&&visiblePrice?`visible:${visibleName}|${visiblePrice}`:(r?`root:${r}`:""));
    const collision=ean?(key&&seen.get(key)):((key&&seen.get(key))||(rootKey&&seenRoots.get(rootKey)));
    if(collision){removed.push({reason:ean?"ean":(key&&seen.has(key)?"visible":"root"),key,rootKey,removed:row(source),kept:row(collision?.__sourceOfferSearchResult||collision)});continue;}
    if(key)seen.set(key,item); if(rootKey)seenRoots.set(rootKey,item); kept.push(item);
  }
  return {kept,removed};
}
const offerCards=offerCleaned.map((x:any)=>mapZiiplyGostaOfferToCardOfferV147(x as any));
const campaignCards=campaignCleaned.map((x:any)=>mapZiiplyGostaOfferToCardOfferV147(x as any));
const offerPageDedupe=pageCardDedupeTrace(offerCards);
const campaignPageDedupe=pageCardDedupeTrace(campaignCards);



function mobileCardDedupeTrace(items:any[]){
  const seen=new Map<string,any>(), seenRoots=new Map<string,any>(), kept:any[]=[], removed:any[]=[];
  const root=(offer:any)=>{
    const stop=new Set(["snellman","snellmanin","atria","hk","kotimaista","pirkka","rainbow","xtra","coop","nopea","ohut","murea","suikale","pala","viipale","marinoitu","maustettu","grilli","grillattu","pakkaus","rasia","tuore","tuotettu","suomi","suomalainen","kg","g"]);
    const name=String(offer?.name||offer?.title||offer?.productName||offer?.brandName||"Tarjoustuote");
    return norm(name).replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g," ").replace(/\b\d+\s*x\s*\d+\b/g," ").replace(/\s+/g," ").trim().split(/\s+/).filter((w:string)=>w.length>2&&!stop.has(w)).slice(0,2).join(" ");
  };
  for(const item of items){
    const source=item?.__sourceOfferSearchResult||item;
    const ean=norm(item?.ean||source?.ean||source?.gtin||source?.barcode||"");
    const name=String(item?.name||item?.title||item?.productName||item?.brandName||"Tarjoustuote");
    const visibleName=norm(name).replace(/\b\d+[,.]?\d*\s*(g|kg|ml|l|kpl|pkt|ps|plo|prk)\b/g," ").replace(/\b\d+\s*x\s*\d+\b/g," ").replace(/\s+/g," ").trim();
    const visiblePrice=norm(item?.offerPrice??item?.price??"");
    const r=root(item);
    const key=ean?`ean:${ean}`:(visibleName&&visiblePrice?`visible:${visibleName}|${visiblePrice}`:(r?`root:${r}`:""));
    const rootKey=r&&visiblePrice?`${r}|${visiblePrice}`:"";
    const collision=ean?(key&&seen.get(key)):((key&&seen.get(key))||(rootKey&&seenRoots.get(rootKey)));
    if(collision){removed.push({reason:ean?"ean":(key&&seen.has(key)?"visible":"root"),key,removed:row(source),kept:row(collision?.__sourceOfferSearchResult||collision)});continue;}
    if(key)seen.set(key,item);if(rootKey)seenRoots.set(rootKey,item);kept.push(item);
  }
  return {kept,removed};
}

function categoryCoverageTrace(rows:any[]){
  const cards=rows.map((x:any)=>mapZiiplyGostaOfferToCardOfferV147(x as any));
  const byCategory=new Map<string,any[]>();
  for(const card of cards){const cat=String((card as any)?.category||"").trim();byCategory.set(cat,[...(byCategory.get(cat)||[]),card]);}
  const known=new Set((GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147 as readonly string[]).map(x=>norm(x)));
  const unknownCategories=[...byCategory.entries()].filter(([cat])=>!cat||!known.has(norm(cat))).map(([category,items])=>({category,count:items.length,sample:items.slice(0,10).map((x:any)=>row(x.__sourceOfferSearchResult||x))}));
  const missing:any[]=[];
  for(const source of rows){
    const card:any=mapZiiplyGostaOfferToCardOfferV147(source as any);
    const category=String(card?.category||"").trim();
    const filtered=filterZiiplyGostaOfferResultsV146(rows as any,category);
    const sourceId=String(source?.id||"");
    const sourceEan=String(source?.ean||"");
    const found=filtered.some((x:any)=>String(x?.id||"")===sourceId || (!!sourceEan&&String(x?.ean||"")===sourceEan));
    if(!found)missing.push({category,product:row(source),filteredCount:filtered.length});
  }
  return {cards,byCategory,unknownCategories,missing};
}
const offerMobileDedupe=mobileCardDedupeTrace(offerCards);
const campaignMobileDedupe=mobileCardDedupeTrace(campaignCards);
const offerCategoryCoverage=categoryCoverageTrace(offerCleaned);
const campaignCategoryCoverage=categoryCoverageTrace(campaignCleaned);

const offerEan=new Map<string,any[]>(), campaignEan=new Map<string,any[]>();
for(const x of offers){const item=x as any;const e=String(item?.ean??"").trim();if(e)offerEan.set(e,[...(offerEan.get(e)||[]),item])}
for(const x of campaignRows){const item=x as any;const e=String(item?.ean??"").trim();if(e)campaignEan.set(e,[...(campaignEan.get(e)||[]),item])}
const crossTab=[...offerEan.entries()].filter(([e])=>campaignEan.has(e)).map(([e,os])=>({ean:e,offers:os.map(row),campaigns:(campaignEan.get(e)||[]).map(row)}));
const samePriceCrossTab=crossTab.filter((g:any)=>g.offers.some((o:any)=>g.campaigns.some((c:any)=>o.price&&o.price===c.price)));

const report={
 audit:"PRISMA_PIPELINE_DROP_TRACE_V1",storeName,
 counts:{discounted:discounted.length,campaigns:campaigns.length,input:input.length,master:master.length,masterOffers:offers.length,masterCampaigns:campaignRows.length,offerDeduped:offerDeduped.length,campaignDeduped:campaignDeduped.length,offerCleaned:offerCleaned.length,campaignCleaned:campaignCleaned.length,droppedByOfferClean:offers.length-offerCleaned.length,droppedByCampaignClean:campaignRows.length-campaignCleaned.length,offerCards:offerCards.length,offerCardsAfterPageDedupe:offerPageDedupe.kept.length,offerCardsDroppedByPageDedupe:offerPageDedupe.removed.length,campaignCards:campaignCards.length,campaignCardsAfterPageDedupe:campaignPageDedupe.kept.length,campaignCardsDroppedByPageDedupe:campaignPageDedupe.removed.length,offerMobileCardsAfterDedupe:offerMobileDedupe.kept.length,offerMobileCardsDropped:offerMobileDedupe.removed.length,campaignMobileCardsAfterDedupe:campaignMobileDedupe.kept.length,campaignMobileCardsDropped:campaignMobileDedupe.removed.length,offerUnknownUiCategories:offerCategoryCoverage.unknownCategories.reduce((n:any,g:any)=>n+g.count,0),offerMissingFromOwnCategory:offerCategoryCoverage.missing.length,campaignUnknownUiCategories:campaignCategoryCoverage.unknownCategories.reduce((n:any,g:any)=>n+g.count,0),campaignMissingFromOwnCategory:campaignCategoryCoverage.missing.length,dropped:dropped.length,unexpected:unexpected.length,crossTabSameEan:crossTab.length,crossTabSameEanSamePrice:samePriceCrossTab.length},
 dropped:dropped.slice(0,200).map(row),
 unexpected:unexpected.slice(0,100).map(row),
 samePriceCrossTab:samePriceCrossTab.slice(0,100),
 offerPageDedupeRemoved:offerPageDedupe.removed.slice(0,200),
 campaignPageDedupeRemoved:campaignPageDedupe.removed.slice(0,200),
 offerMobileDedupeRemoved:offerMobileDedupe.removed.slice(0,200),
 campaignMobileDedupeRemoved:campaignMobileDedupe.removed.slice(0,200),
 offerUnknownUiCategories:offerCategoryCoverage.unknownCategories,
 offerMissingFromOwnCategory:offerCategoryCoverage.missing.slice(0,200),
 campaignUnknownUiCategories:campaignCategoryCoverage.unknownCategories,
 campaignMissingFromOwnCategory:campaignCategoryCoverage.missing.slice(0,200),
 pass:dropped.length===0&&unexpected.length===0
};
console.log(JSON.stringify(report,null,2));
if(!report.pass) process.exitCode=1;

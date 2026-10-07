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


function categoryTotals(cards:any[]){
  const counts:Record<string,number>={};
  for(const card of cards){const category=String(card?.category||"").trim();if(!category||norm(category)==="kaikki")continue;counts[category]=(counts[category]||0)+1;}
  return Object.fromEntries(Object.entries(counts).sort((a,b)=>a[0].localeCompare(b[0],"fi")));
}
const offerCategoryTotals=categoryTotals(offerMobileDedupe.kept);
const campaignCategoryTotals=categoryTotals(campaignMobileDedupe.kept);
const offerCategoryTotalSum=Object.values(offerCategoryTotals).reduce((a,b)=>a+b,0);
const campaignCategoryTotalSum=Object.values(campaignCategoryTotals).reduce((a,b)=>a+b,0);

const offerEan=new Map<string,any[]>(), campaignEan=new Map<string,any[]>();
for(const x of offers){const item=x as any;const e=String(item?.ean??"").trim();if(e)offerEan.set(e,[...(offerEan.get(e)||[]),item])}
for(const x of campaignRows){const item=x as any;const e=String(item?.ean??"").trim();if(e)campaignEan.set(e,[...(campaignEan.get(e)||[]),item])}
const crossTab=[...offerEan.entries()].filter(([e])=>campaignEan.has(e)).map(([e,os])=>({ean:e,offers:os.map(row),campaigns:(campaignEan.get(e)||[]).map(row)}));
const samePriceCrossTab=crossTab.filter((g:any)=>g.offers.some((o:any)=>g.campaigns.some((c:any)=>o.price&&o.price===c.price)));


function eanMapV2(rows:any[]){const m=new Map<string,any>();for(const x of rows){const e=String(x?.ean??x?.gtin??x?.barcode??"").trim();if(e)m.set(e,x);}return m;}
const discountedMapV2=eanMapV2(discounted as any[]), campaignMapV2=eanMapV2(campaigns as any[]);
const offerOnlyV2=[...discountedMapV2].filter(([e])=>!campaignMapV2.has(e)).map(([,x])=>row(x));
const campaignOnlyV2=[...campaignMapV2].filter(([e])=>!discountedMapV2.has(e)).map(([,x])=>row(x));
const overlapV2=[...discountedMapV2].filter(([e])=>campaignMapV2.has(e)).map(([e,x])=>({ean:e,offer:row(x),campaign:row(campaignMapV2.get(e))}));
const foodReV2=/(kahvi|tee|maito|juust|jogurt|rahka|kananmuna|voi|kerma|liha|makkar|kala|leip|hedel|vihann|juoma|pakaste|valmisruo|kuivatuot|makeis|keksi|lastenruo)/i;
const isFoodV2=(x:any)=>foodReV2.test(String(x?.category??"")+" "+String(x?.mainCategory??"")+" "+String(x?.title??""));
const sourceComparisonV2={
 discountedRows:discounted.length,campaignRows:campaigns.length,
 discountedUniqueEan:discountedMapV2.size,campaignUniqueEan:campaignMapV2.size,
 overlapEan:overlapV2.length,offerOnlyEan:offerOnlyV2.length,campaignOnlyEan:campaignOnlyV2.length,
 unionEan:new Set([...discountedMapV2.keys(),...campaignMapV2.keys()]).size,
 discountedFood:discounted.filter(isFoodV2).length,campaignFood:campaigns.filter(isFoodV2).length,
 offerOnlyFood:offerOnlyV2.filter(isFoodV2).length,campaignOnlyFood:campaignOnlyV2.filter(isFoodV2).length
};
console.log("PRISMA_SOURCE_COMPARISON",JSON.stringify({sourceComparisonV2,offerOnlyFood:offerOnlyV2.filter(isFoodV2),campaignOnlyFood:campaignOnlyV2.filter(isFoodV2),campaignOnly:campaignOnlyV2,overlap:overlapV2},null,2));


const discountedSignalAuditV3=(discounted as any[]).map((x:any)=>{
 const ev=x?.debugOfferEvidenceV226||{};
 const cp=Number(ev.campaignPrice), cur=Number(ev.currentPrice), reg=Number(ev.regularPrice);
 return {ean:String(x?.ean||""),title:String(x?.title||""),category:String(x?.category||""),categoryPath:String(x?.categoryPath||""),labels:String(ev.rawLabels||""),campaignPrice:Number.isFinite(cp)?cp:null,currentPrice:Number.isFinite(cur)?cur:null,regularPrice:Number.isFinite(reg)?reg:null,validUntil:String(ev.campaignPriceValidUntil||""),hasOfferSignal:Boolean(ev.hasOfferSignal),priceBelowRegular:Boolean(ev.priceBelowRegular)};
});
const signalSummaryV3={
 total:discountedSignalAuditV3.length,
 withCampaignPrice:discountedSignalAuditV3.filter(x=>x.campaignPrice!=null).length,
 withValidUntil:discountedSignalAuditV3.filter(x=>!!x.validUntil).length,
 priceBelowRegular:discountedSignalAuditV3.filter(x=>x.currentPrice!=null&&x.regularPrice!=null&&x.currentPrice<x.regularPrice-0.005).length,
 labelDiscount:discountedSignalAuditV3.filter(x=>/discount|tarjous|kampanja/i.test(x.labels)).length,
 noOfferSignal:discountedSignalAuditV3.filter(x=>!x.hasOfferSignal).length,
 sameCurrentRegular:discountedSignalAuditV3.filter(x=>x.currentPrice!=null&&x.regularPrice!=null&&Math.abs(x.currentPrice-x.regularPrice)<0.005).length
};
const rootCategoryTotalsV3:Record<string,number>={};
for(const x of discountedSignalAuditV3){const root=(x.categoryPath.split("/")[0]||x.category||"(empty)").trim();rootCategoryTotalsV3[root]=(rootCategoryTotalsV3[root]||0)+1;}
const priceGroupsV3=new Map<string,any[]>();
for(const x of discountedSignalAuditV3){const key=[x.categoryPath,x.campaignPrice,x.currentPrice,x.regularPrice,x.validUntil].join("|");priceGroupsV3.set(key,[...(priceGroupsV3.get(key)||[]),x]);}
const largestVariantGroupsV3=[...priceGroupsV3.entries()].map(([key,rows])=>({key,count:rows.length,sample:rows.slice(0,12)})).sort((a,b)=>b.count-a.count).slice(0,30);
console.log("PRISMA_DISCOUNTED_SIGNAL_AUDIT",JSON.stringify({signalSummaryV3,rootCategoryTotalsV3,largestVariantGroupsV3,noOfferSignal:discountedSignalAuditV3.filter(x=>!x.hasOfferSignal),sameCurrentRegular:discountedSignalAuditV3.filter(x=>x.currentPrice!=null&&x.regularPrice!=null&&Math.abs(x.currentPrice-x.regularPrice)<0.005).slice(0,100)},null,2));


const promoGroupsV4=new Map<string,any[]>();
for(const x of discountedSignalAuditV3){
 const titleRoot=norm(x.title).split(" ").slice(0,5).join(" ");
 const key=[x.labels,x.validUntil,x.categoryPath,titleRoot].join("|");
 promoGroupsV4.set(key,[...(promoGroupsV4.get(key)||[]),x]);
}
const promoGroupRowsV4=[...promoGroupsV4.entries()].map(([key,rows])=>({key,count:rows.length,categoryPath:rows[0]?.categoryPath,labels:rows[0]?.labels,validUntil:rows[0]?.validUntil,sample:rows.slice(0,12).map(x=>({ean:x.ean,title:x.title,campaignPrice:x.campaignPrice,currentPrice:x.currentPrice,regularPrice:x.regularPrice}))})).sort((a,b)=>b.count-a.count);
console.log("PRISMA_PROMO_GROUP_AUDIT",JSON.stringify({eanRows:discountedSignalAuditV3.length,promoGroups:promoGroupRowsV4.length,multiVariantGroups:promoGroupRowsV4.filter(x=>x.count>1).length,rowsInMultiVariantGroups:promoGroupRowsV4.filter(x=>x.count>1).reduce((n,x)=>n+x.count,0),largest:promoGroupRowsV4.slice(0,50)},null,2));


const probeTermsV5=["maito","kahvi","liha","juusto","leipä","voi","jogurtti","kana","kala","mehu","pasta","riisi","makkara","rahka","kerma","hedelmä","vihannes","pakaste","suklaa","keksi","limu","olut","muro","jauho"];
const probeRowsV5:any[]=[];
for(const q of probeTermsV5){
 const rows=await searchSelectedSKaupatOffersV11(q,ctx as any);
 for(const x of rows as any[]) probeRowsV5.push({...x,_probe:q});
}
const probeMapV5=new Map<string,any>();
for(const x of probeRowsV5){const e=String(x?.ean||"").trim();if(e&&!probeMapV5.has(e))probeMapV5.set(e,x);}
const probeOutsideDiscountedV5=[...probeMapV5].filter(([e])=>!discountedMapV2.has(e)).map(([,x])=>({probe:x._probe,...row(x),evidence:x.debugOfferEvidenceV226||null}));
console.log("PRISMA_QUERY_PROBE_AUDIT",JSON.stringify({terms:probeTermsV5.length,rows:probeRowsV5.length,uniqueEan:probeMapV5.size,outsideDiscounted:probeOutsideDiscountedV5.length,outside:probeOutsideDiscountedV5},null,2));


const todayV6="2026-10-07";
const probeOutsideClassifiedV6=probeOutsideDiscountedV5.map((x:any)=>{const until=String(x?.evidence?.campaignPriceValidUntil||"");return {...x,expiryClass:!until?"NO_DATE":until<todayV6?"EXPIRED":until===todayV6?"ENDS_TODAY":"FUTURE"};});
console.log("PRISMA_QUERY_PROBE_EXPIRY_AUDIT",JSON.stringify({
 totalOutside:probeOutsideClassifiedV6.length,
 expired:probeOutsideClassifiedV6.filter((x:any)=>x.expiryClass==="EXPIRED").length,
 endsToday:probeOutsideClassifiedV6.filter((x:any)=>x.expiryClass==="ENDS_TODAY").length,
 future:probeOutsideClassifiedV6.filter((x:any)=>x.expiryClass==="FUTURE").length,
 noDate:probeOutsideClassifiedV6.filter((x:any)=>x.expiryClass==="NO_DATE").length,
 activeOutside:probeOutsideClassifiedV6.filter((x:any)=>x.expiryClass==="ENDS_TODAY"||x.expiryClass==="FUTURE"),
 expiredOutside:probeOutsideClassifiedV6.filter((x:any)=>x.expiryClass==="EXPIRED")
},null,2));

const report={
 audit:"PRISMA_PIPELINE_DROP_TRACE_V1",storeName,
 counts:{discounted:discounted.length,campaigns:campaigns.length,input:input.length,master:master.length,masterOffers:offers.length,masterCampaigns:campaignRows.length,offerDeduped:offerDeduped.length,campaignDeduped:campaignDeduped.length,offerCleaned:offerCleaned.length,campaignCleaned:campaignCleaned.length,droppedByOfferClean:offers.length-offerCleaned.length,droppedByCampaignClean:campaignRows.length-campaignCleaned.length,offerCards:offerCards.length,offerCardsAfterPageDedupe:offerPageDedupe.kept.length,offerCardsDroppedByPageDedupe:offerPageDedupe.removed.length,campaignCards:campaignCards.length,campaignCardsAfterPageDedupe:campaignPageDedupe.kept.length,campaignCardsDroppedByPageDedupe:campaignPageDedupe.removed.length,offerMobileCardsAfterDedupe:offerMobileDedupe.kept.length,offerMobileCardsDropped:offerMobileDedupe.removed.length,offerCategoryTotalSum,campaignCategoryTotalSum,campaignMobileCardsAfterDedupe:campaignMobileDedupe.kept.length,campaignMobileCardsDropped:campaignMobileDedupe.removed.length,offerUnknownUiCategories:offerCategoryCoverage.unknownCategories.reduce((n:any,g:any)=>n+g.count,0),offerMissingFromOwnCategory:offerCategoryCoverage.missing.length,campaignUnknownUiCategories:campaignCategoryCoverage.unknownCategories.reduce((n:any,g:any)=>n+g.count,0),campaignMissingFromOwnCategory:campaignCategoryCoverage.missing.length,dropped:dropped.length,unexpected:unexpected.length,crossTabSameEan:crossTab.length,crossTabSameEanSamePrice:samePriceCrossTab.length},
 dropped:dropped.slice(0,200).map(row),
 unexpected:unexpected.slice(0,100).map(row),
 samePriceCrossTab:samePriceCrossTab.slice(0,100),
 offerPageDedupeRemoved:offerPageDedupe.removed.slice(0,200),
 campaignPageDedupeRemoved:campaignPageDedupe.removed.slice(0,200),
 offerCategoryTotals,campaignCategoryTotals,
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

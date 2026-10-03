import { mapZiiplyGostaOfferToCardOfferV147 } from "../src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore";
import { fetchPrismaCampaignOffersV1 } from "../src/app/components/ziiply/offerSearch/providers/skaupatPrismaCampaignProvider";
const results=await fetchPrismaCampaignOffersV1("__ziiply_all_offers__",{id:"skaupat",chain:"S",storeLabel:"Prisma Hämeenlinna",url:"https://www.s-kaupat.fi"},"Prisma Hämeenlinna");
const target=["2396257900001","6438460181269"];
console.log(JSON.stringify({total:results.length,target:target.map(ean=>({ean,found:results.some(r=>String((r as {ean?:string}).ean)===ean),item:results.find(r=>String((r as {ean?:string}).ean)===ean)})),categories:[...new Set(results.map(r=>(r as {category?:string}).category))]}));
if(!results.length || target.some(ean=>!results.some(r=>String((r as {ean?:string}).ean)===ean)))process.exitCode=1;

const visibleCategories = new Set(["Kahvi & tee","Maitotuotteet","Liha & makkarat","Kala","Leipomo","Hevi","Juomat","Pakasteet","Valmisruoka","Kuivatuotteet","Makeiset & keksit","Lastenruoat","Vitamiinit & ravinteet","Lemmikit","Hygienia & kosmetiikka","Kodinhoito","Koti & vapaa-aika","Muut"]);
const unmapped = results.map(item => ({ean:String((item as {ean?:string}).ean ?? ""),sourceCategory:String((item as {category?:string}).category ?? ""),displayCategory:String(mapZiiplyGostaOfferToCardOfferV147(item).category ?? "")})).filter(item => !visibleCategories.has(item.displayCategory));
console.log(JSON.stringify({prismaCampaignCategoryAudit:{total:results.length,unmapped}}));
if(unmapped.length)process.exitCode=1;

// A campaign must retain its tab marker even when the same EAN also exists in DISCOUNTED offers.
const missingCampaignMarker = results.filter(item => (item as {campaignType?:string}).campaignType !== "campaign");
const duplicateCampaignEans = results.map(item => String((item as {ean?:string}).ean ?? "").trim()).filter((ean,index,all) => !!ean && all.indexOf(ean) !== index);
console.log(JSON.stringify({campaignTabAudit:{missingCampaignMarker:missingCampaignMarker.length,duplicateCampaignEans}}));
if(missingCampaignMarker.length || duplicateCampaignEans.length) process.exitCode=1;

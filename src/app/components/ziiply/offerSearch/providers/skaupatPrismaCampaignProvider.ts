// Prisma-only, read-only CMS campaign provider. Does not alter DISCOUNTED offers
// or the S-market/Alepa/Sale local campaign provider.
import type { ZiiplyOfferSearchResult, ZiiplyOfferSearchSourceConfig } from "../types";
import { resolvePrismaCampaignStoreIdV1 } from "./skaupatProvider";

const PAGE_HASH = "f6d87786fda8fb5c233c4eaed08f37b0c5b87dc0d8d4c44c33c5529e446369d1";
const CLIENT_VERSION = "production-14a82a5b48cd1dd42c0592db0037514ed3c84de8";
type RecordValue = Record<string, any>;
function finnishDate() {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}
function pageUrl(storeId: string) {
  const availabilityDate = finnishDate();
  const variables = {preview:false,storeId,skipProducts:false,availabilityDate,where:{
    storeId,path:"tuotteet/kampanjat",platform:"WEB",availabilityDate,
    userConsent:{marketing:false,marketingId:"ziiply-gosta",useCustomerId:false,sessionId:"ziiply-gosta",loop54:true}
  }};
  const extensions = {clientLibrary:{name:"@apollo/client",version:"4.2.12"},persistedQuery:{version:1,sha256Hash:PAGE_HASH}};
  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName","RemoteGetPageContent");
  url.searchParams.set("variables",JSON.stringify(variables));
  url.searchParams.set("extensions",JSON.stringify(extensions));
  return url;
}
function explicitOtherChain(section: RecordValue) {
  const label=normalize([section.title,section.description,section.text,section.tagTitle,section.metadata?.entryName].filter(Boolean).join(" "));
  const named = ["s-market","s market","alepa","sale","prisma"].filter(chain=>label.includes(chain));
  return named.length>0 && !named.includes("prisma");
}
function imageUrl(product: RecordValue): string {
  const template=product.productDetails?.productImages?.mainImage?.urlTemplate ??
    product.productDetails?.productImages?.mobileReadyHeroImage?.urlTemplate ?? "";
  return String(template).replace("{MODIFIERS}","w360h360@_q75").replace("{EXTENSION}","webp");
}
export async function fetchPrismaCampaignOffersV1(
  query: string,
  config: ZiiplyOfferSearchSourceConfig,
  storeName: string,
): Promise<ZiiplyOfferSearchResult[]> {
  if (!/^prisma(?:\s|$)/i.test(storeName.trim())) return [];
  const storeId = await resolvePrismaCampaignStoreIdV1(storeName);
  if (!storeId) return []; // Never borrow another store's prices.
  try {
    const response=await fetch(pageUrl(storeId),{cache:"no-store",headers:{
      accept:"application/graphql-response+json,application/json;q=0.9",
      "accept-language":"fi",origin:"https://www.s-kaupat.fi",referer:"https://www.s-kaupat.fi/",
      "x-client-name":"skaupat-web","x-client-version":CLIENT_VERSION
    }});
    if(!response.ok) return [];
    const json=await response.json();
    const sections: RecordValue[]=json?.data?.pageContent?.sections ?? [];
    if(!Array.isArray(sections)) return [];
    const result: ZiiplyOfferSearchResult[]=[];
    const seen=new Set<string>();
    const master=query.trim()==="__ziiply_all_offers__";
    for(const section of sections){
      if(explicitOtherChain(section)) continue;
      for(const product of (Array.isArray(section.products)?section.products:[])){
        const title=String(product.name??"").trim();
        const ean=String(product.ean??"").trim();
        if(!title) continue;
        if(!master && query.trim() && !normalize(title+" "+section.title).includes(normalize(query))) continue;
        const key=ean || String(product.id??title);
        if(seen.has(key)) continue;
        const pricing=product.pricing??product.store?.pricing??{};
        const price=Number(pricing.campaignPrice??pricing.currentPrice??product.price);
        if(!Number.isFinite(price)||price<=0) continue;
        seen.add(key);
        const hierarchy=Array.isArray(product.hierarchyPath)?product.hierarchyPath.map((h:RecordValue)=>String(h.name??"")).filter(Boolean):[];
        const category=hierarchy[hierarchy.length-1] || String(section.title??"Muut");
        const sectionTitle=String(section.title??"Kampanja");
        const unitPrice=Number(pricing.comparisonPrice);
        const unit=String(pricing.comparisonUnit??"");
        result.push({
          id:"prisma-campaign-"+storeId+"-"+key,source:config.id,chain:config.chain,
          title,priceText:price.toFixed(2).replace(".",",")+" €",
          unitPriceText:Number.isFinite(unitPrice)&&unit ? unitPrice.toFixed(2).replace(".",",")+" € / "+unit.toLowerCase():"",
          benefitText:sectionTitle,storeLabel:storeName,imageUrl:imageUrl(product),
          productUrl:product.slug?"https://www.s-kaupat.fi/tuote/"+product.slug:"",
          matchScore:1,rawText:title+" "+sectionTitle,
          ean,category,categoryPath:[...hierarchy].reverse().join(" > ")||category,
          campaignType:"campaign",campaignSection:sectionTitle,storeId
        } as ZiiplyOfferSearchResult);
      }
    }
    return result;
  } catch(error) {
    console.warn("[Ziiply Prisma campaign] page fetch failed",String(error));
    return [];
  }
}

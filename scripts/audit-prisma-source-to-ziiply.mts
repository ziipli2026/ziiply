import { mapZiiplyGostaOfferToCardOfferV147 } from "../src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore";
import {
  searchSelectedSKaupatOffersV11,
  searchZiiplyOffers,
} from "../src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources";
import { fetchPrismaCampaignOffersV1 } from "../src/app/components/ziiply/offerSearch/providers/skaupatPrismaCampaignProvider";

const MASTER = "__ziiply_all_offers__";
const storeName = process.argv[2] || "Prisma Hyvinkää";

const sourceConfig = {
  id: "skaupat",
  chain: "S",
  storeLabel: storeName,
  url: "https://www.s-kaupat.fi",
};

const context = {
  storeName,
  sStoreName: storeName,
  storeNames: [storeName],
  sStoreNames: [storeName],
  storeCompareScope: "within_chain",
  withinChain: "S",
};

const norm = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäö]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function identity(item: any) {
  const ean = String(item?.ean ?? "").trim();
  const price = String(item?.priceText ?? item?.price ?? "").trim();
  const type = item?.campaignType === "campaign" ? "campaign" : "offer";
  return ean
    ? `${type}|ean:${ean}`
    : `${type}|text:${norm(item?.title)}|price:${norm(price)}`;
}


function canonicalPrice(item: any) {
  const direct = Number(item?.price);
  if (Number.isFinite(direct)) return direct.toFixed(4);
  const parsed = Number(String(item?.priceText ?? "").replace(/[^0-9,.-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed.toFixed(4) : "";
}
function validity(item: any) {
  return String(item?.validUntil ?? item?.debugOfferEvidenceV226?.campaignPriceValidUntil ?? item?.debugPrismaCampaignEvidenceV2?.campaignPriceValidUntil ?? "").trim();
}
function eanOverlap(discounted: any[], campaigns: any[]) {
  const byEan = new Map<string, any[]>();
  for (const row of campaigns) {
    const ean=String(row?.ean??"").trim(); if(!ean) continue;
    byEan.set(ean,[...(byEan.get(ean)||[]),row]);
  }
  const samePrice:any[]=[]; const differentPrice:any[]=[]; const discountedOnly:any[]=[];
  for(const d of discounted){
    const ean=String(d?.ean??"").trim(); if(!ean) continue;
    const cms=byEan.get(ean)||[];
    if(!cms.length){ discountedOnly.push(d); continue; }
    const exact=cms.filter(x=>canonicalPrice(x)===canonicalPrice(d));
    const target=exact.length?exact:cms;
    (exact.length?samePrice:differentPrice).push({ean,title:d?.title??"",discountedPrice:canonicalPrice(d),discountedValidity:validity(d),cms:target.map(x=>({price:canonicalPrice(x),validity:validity(x),title:x?.title??""}))});
  }
  const discountedEans=new Set(discounted.map(x=>String(x?.ean??"").trim()).filter(Boolean));
  const cmsOnly=campaigns.filter(x=>{const e=String(x?.ean??"").trim(); return e&&!discountedEans.has(e);});
  const muikku={discounted:discounted.filter(x=>norm(x?.title).includes("muikku")),campaigns:campaigns.filter(x=>norm(x?.title).includes("muikku"))};
  return {
    sameEanSamePrice:samePrice.length,
    sameEanDifferentPrice:differentPrice.length,
    discountedOnly:discountedOnly.length,
    cmsOnly:cmsOnly.length,
    samePriceValidityMismatch:samePrice.filter(x=>x.cms.some((y:any)=>y.validity!==x.discountedValidity)).length,
    differentPriceRows:differentPrice.slice(0,50),
    discountedOnlyRows:discountedOnly.slice(0,30).map(x=>({ean:x.ean,title:x.title,price:canonicalPrice(x),validity:validity(x),labels:x?.debugOfferEvidenceV226?.rawLabels??""})),
    cmsOnlyRows:cmsOnly.slice(0,30).map(x=>({ean:x.ean,title:x.title,price:canonicalPrice(x),validity:validity(x)})),
    muikku
  };
}

function summarize(items: any[]) {
  const keys = items.map(identity);
  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
  return {
    total: items.length,
    offers: items.filter((x) => x?.campaignType !== "campaign").length,
    campaigns: items.filter((x) => x?.campaignType === "campaign").length,
    uniqueKeys: new Set(keys).size,
    duplicateKeys: [...new Set(duplicateKeys)].slice(0, 25),
  };
}

const [discountedSource, campaignSource] = await Promise.all([
  searchSelectedSKaupatOffersV11(MASTER, context as any),
  fetchPrismaCampaignOffersV1(MASTER, sourceConfig as any, storeName),
]);

const expected = [
  ...discountedSource.map((item: any) => ({ ...item, campaignType: item?.campaignType === "campaign" ? "campaign" : "offer" })),
  ...campaignSource,
];

const ziiplyMaster = await searchZiiplyOffers(MASTER, context as any);

const masterKeys = new Set(ziiplyMaster.map(identity));
const missing = expected.filter((item) => !masterKeys.has(identity(item)));

const cardRows = ziiplyMaster.map((item) => ({
  source: item,
  card: mapZiiplyGostaOfferToCardOfferV147(item),
}));
const invalidCardRows = cardRows
  .filter(({ card }) => !String(card?.title ?? "").trim() || !String(card?.category ?? "").trim())
  .map(({ source, card }) => ({
    key: identity(source),
    sourceTitle: (source as any)?.title ?? "",
    cardTitle: (card as any)?.title ?? "",
    cardCategory: (card as any)?.category ?? "",
  }));

const report = {
  audit: "PRISMA_SOURCE_TO_ZIIPLY_COMPLETENESS_V1",
  storeName,
  overlap: eanOverlap(discountedSource, campaignSource),
  source: {
    discounted: summarize(discountedSource),
    campaigns: summarize(campaignSource),
    combined: summarize(expected),
  },
  ziiplyMaster: summarize(ziiplyMaster),
  missing: {
    total: missing.length,
    offers: missing.filter((x: any) => x?.campaignType !== "campaign").length,
    campaigns: missing.filter((x: any) => x?.campaignType === "campaign").length,
    rows: missing.slice(0, 50).map((x: any) => ({
      key: identity(x),
      title: x?.title ?? "",
      ean: x?.ean ?? "",
      priceText: x?.priceText ?? "",
      campaignType: x?.campaignType ?? "offer",
      source: x?.source ?? "",
    })),
  },
  cardMapping: {
    total: cardRows.length,
    invalid: invalidCardRows.length,
    rows: invalidCardRows.slice(0, 50),
  },
  pass: missing.length === 0 && invalidCardRows.length === 0,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

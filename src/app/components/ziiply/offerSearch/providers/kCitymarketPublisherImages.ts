import manifest from "./data/kCitymarketLeafletImages.json";

type PublicationImages={pdfSha256:string;pageCount:number;offerCount:number;images:Record<string,string>};
const publications=manifest.publications as Record<string,PublicationImages>;

// Exact publication and parser-card identity. Never reuse last week's photo
// merely because another product has the same shortened name.
export function getKCitymarketPublisherImage(sourceUrl:string,offerId:string):string|null{
  const publication=publications[sourceUrl];
  if(!publication)return null;
  const valid=(value:string|undefined)=>value?.startsWith("/citymarket-leaflets/"+publication.pdfSha256+"/images.svg#")?value:null;
  const exact=valid(publication.images[offerId]);
  if(exact)return exact;
  // PDF parser may move a card to another page or change its price/ID.
  // Match only an identical normalized product title within this SAME leaflet.
  // Reject duplicate titles and conflicting images; never match by category alone.
  const titleFromId=(id:string)=>{
    const match=/^kcm:spatial:\\d+:(.+):[^:]+$/.exec(id);
    return match?.[1]?.normalize("NFKC").toLowerCase().replace(/\\s+/g," ").trim()??"";
  };
  const wanted=titleFromId(offerId);
  if(!wanted)return null;
  const candidates=Object.entries(publication.images)
    .filter(([id])=>titleFromId(id)===wanted)
    .map(([,value])=>valid(value)).filter((value):value is string=>!!value);
  return candidates.length===1?candidates[0]:null;
}

/**
 * Report publication coverage without guessing images from product names.
 * The IDs are parser-card identities, scoped to the exact leaflet URL.
 */
export function auditKCitymarketPublisherImages(sourceUrl:string,offerIds:readonly string[]){
  const publication=publications[sourceUrl];
  const uniqueIds=[...new Set(offerIds.filter(Boolean))];
  if(!publication)return {publicationKnown:false,total:uniqueIds.length,matched:0,missing:uniqueIds};
  const missing=uniqueIds.filter(id=>!getKCitymarketPublisherImage(sourceUrl,id));
  return {publicationKnown:true,total:uniqueIds.length,matched:uniqueIds.length-missing.length,missing};
}

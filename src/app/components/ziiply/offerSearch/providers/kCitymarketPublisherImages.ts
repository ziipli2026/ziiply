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
    const match=/^kcm:spatial:\d+:(.+):[^:]+$/.exec(id);
    return match?.[1]?.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim()??"";
  };
  const wanted=titleFromId(offerId);
  if(!wanted)return null;
  const candidates=Object.entries(publication.images)
    .filter(([id])=>titleFromId(id)===wanted)
    .map(([,value])=>valid(value)).filter((value):value is string=>!!value);
  if(candidates.length===1)return candidates[0];
  if(candidates.length>1)return null;

  // The PDF and live parser sometimes disagree only on line-wrap
  // hyphenation (e.g. "juusto-nack" versus "juustonack").
  // This is NOT fuzzy product matching: require one-to-one uniqueness
  // across all verified image identities in this immutable publication
  // before accepting a normalized title.
  const normalized=(title:string)=>title
    .normalize("NFKC").toLowerCase()
    .replace(/([a-zåäö])-\\s*([a-zåäö])/g,"$1$2")
    .replace(/\\s+/g," ").trim();
  const key=normalized(wanted);
  const imageEntries=Object.entries(publication.images);
  const matching=imageEntries.filter(([id])=>normalized(titleFromId(id))===key);
  // Never silently choose between two distinct source cards.
  if(matching.length!==1)return null;
  const match=valid(matching[0][1]);
  return match??null;
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

import manifest from "./data/kCitymarketLeafletImages.json";

type PublicationImages={pdfSha256:string;pageCount:number;offerCount:number;images:Record<string,string>};
const publications=manifest.publications as Record<string,PublicationImages>;

// Exact publication and parser-card identity. Never reuse last week's photo
// merely because another product has the same shortened name.
export function getKCitymarketPublisherImage(sourceUrl:string,offerId:string):string|null{
  const publication=publications[sourceUrl];
  if(!publication)return null;
  // Correcting a price must not orphan the same publisher card's image.
  // Keep publication, page and complete title exact; require a unique crop.
  const cardIdentity=offerId.replace(/:[0-9]+(?:\.[0-9]+)?$/,"");
  const matches=[...new Set(Object.entries(publication.images)
    .filter(([id])=>id.replace(/:[0-9]+(?:\.[0-9]+)?$/,"")===cardIdentity)
    .map(([,url])=>url))];
  const image=publication.images[offerId]||(matches.length===1?matches[0]:null);
  return image?.startsWith("/citymarket-leaflets/"+publication.pdfSha256+"/images.svg#")?image:null;
}

import manifest from "./data/kCitymarketLeafletImages.json";

type PublicationImages={pdfSha256:string;pageCount:number;offerCount:number;images:Record<string,string>};
const publications=manifest.publications as Record<string,PublicationImages>;

// Exact publication and parser-card identity. Never reuse last week's photo
// merely because another product has the same shortened name.
export function getKCitymarketPublisherImage(sourceUrl:string,offerId:string):string|null{
  const publication=publications[sourceUrl];
  if(!publication)return null;
  const image=publication.images[offerId];
  return image?.startsWith("/citymarket-leaflets/"+publication.pdfSha256+"/images.svg#")?image:null;
}

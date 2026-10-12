import manifest from "./data/kCitymarketLeafletImages.json";
import approvals from "../../../../../../scripts/citymarket/41lv-verified-bank-images.json";

type PublicationImages = {pdfSha256:string;pageCount:number;offerCount:number;images:Record<string,string>};
const publications = manifest.publications as Record<string,PublicationImages>;
const verifiedImages = new Map(approvals.images.filter(image =>
  image.approved && image.imageFetchedAndViewed &&
  (image.leafletVisualMatch || ("printedIdentityVerified" in image && image.printedIdentityVerified &&
    "sourceIdentityVerified" in image && image.sourceIdentityVerified))
).map(image => [image.offerId, image.imageUrl]));

// Bind every image to the exact publication and parser-card identity.
export function getKCitymarketPublisherImage(sourceUrl:string,offerId:string):string|null {
  const publication = publications[sourceUrl];
  if (!publication) return null;
  // Preserve the corrected parser's exact-card fallback when only its price changes.
  const cardIdentity = offerId.replace(/:[0-9]+(?:\.[0-9]+)?$/, "");
  const matches = Object.entries(publication.images).filter(([id]) =>
    id.replace(/:[0-9]+(?:\.[0-9]+)?$/, "") === cardIdentity);
  const matchedId = Object.hasOwn(publication.images, offerId) ? offerId :
    (new Set(matches.map(([,url]) => url)).size === 1 ? matches[0]?.[0] : undefined);
  if (!matchedId) return null;
  const image = publication.images[matchedId];
  const prefix = "/citymarket-leaflets/" + publication.pdfSha256 + "/";
  if (image.startsWith(prefix + "images.svg#") && /^[a-f0-9]{20}$/.test(image.slice((prefix + "images.svg#").length))) return image;
  if (publication.pdfSha256 !== approvals.leafletSha256 ||
      verifiedImages.get(matchedId) !== image) return null;
  if (image.startsWith(prefix) && /^verified-group-\d+\.png$/.test(image.slice(prefix.length))) return image;
  try {
    const url = new URL(image);
    return url.protocol === "https:" && !url.username && !url.password ? image : null;
  } catch { return null; }
}

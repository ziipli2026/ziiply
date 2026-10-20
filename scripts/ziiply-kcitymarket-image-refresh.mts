import { neon } from "@neondatabase/serverless";
import { fetchKCitymarketOffers } from "../src/app/components/ziiply/offerSearch/providers/kCitymarketProvider";

if (!process.env.DATABASE_URL) throw new Error("ZIIPLY_DATABASE_URL GitHub secret missing");
const sql=neon(process.env.DATABASE_URL);
const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const read=async()=>await sql`
  SELECT publication_id,
    jsonb_array_length(offers)::int AS total,
    (SELECT count(*)::int FROM jsonb_array_elements(offers) o
      WHERE (COALESCE(o->>'imageUrl','') ~* '^https://' OR COALESCE(o->>'imageUrl','') LIKE '/citymarket-leaflets/%')) AS with_image
  FROM ziiply_offer_publications
  WHERE chain='K-Citymarket' AND approval_state='approved'
    AND valid_from <= ${today}::date AND valid_until >= ${today}::date
  ORDER BY parsed_at DESC LIMIT 1`;
const before=await read();
console.log("BEFORE",JSON.stringify(before));
if(!before.length)throw new Error("No active K-Citymarket approved publication in database");
const offers=await fetchKCitymarketOffers();
console.log("ENRICHED",JSON.stringify({offers:offers.length,withImage:offers.filter(o=>!!o.imageUrl).length}));
const imageFormats:Record<string,number>={};
for(const offer of offers){
 const value=String(offer.imageUrl??"").trim();
 const kind=!value?"empty":/^https:\/\//i.test(value)?"https":/^http:\/\//i.test(value)?"http":/^data:image\//i.test(value)?"data-image":value.startsWith("/")?"relative":value.slice(0,24);
 imageFormats[kind]=(imageFormats[kind]||0)+1;
}
console.log("IMAGE_FORMATS",JSON.stringify(imageFormats));
const imagePatch: Record<string,string> = {};
const publisherBase="https://kcm-tarjouslehdet.k-ruoka.fi/";
const normalizedImage=(value:unknown):string=>{
 const raw=String(value??"").trim();
 if(!raw)return "";
 if(raw.startsWith("/citymarket-leaflets/"))return raw;
 try{
   const url=new URL(raw,publisherBase);
   if(url.protocol!=="https:")return "";
   if(url.pathname.startsWith("/citymarket-leaflets/") && (url.hostname==="kcm-tarjouslehdet.k-ruoka.fi"||url.hostname==="kcm-lehdet.k-ruoka.fi"||url.hostname==="ziiply.fi"))return url.pathname+url.search+url.hash;
   // Only accept publisher-relative paths, or existing HTTPS links.
   if(!/^https:\/\//i.test(raw)&&!raw.startsWith("/"))return "";
   return url.href;
 }catch{return "";}
};
for (const offer of offers) {
  const id=String(offer.id||"");
  const imageUrl=normalizedImage(offer.imageUrl);
  if (id && (/^https:\/\//i.test(imageUrl)||imageUrl.startsWith("/citymarket-leaflets/"))) imagePatch[id]=imageUrl;
}
if(Object.keys(imagePatch).length){
  // Image-only SQL patch: never replace offers, prices or any other metadata
  // from an enrichment run. The database row itself remains authoritative.
  const updated=await sql`
    UPDATE ziiply_offer_publications AS p SET offers=(
      SELECT jsonb_agg(
        CASE
          WHEN (COALESCE(offer.value->>'imageUrl','') !~* '^https://' OR (COALESCE(offer.value->>'imageUrl','') LIKE 'https://ziiply.fi/citymarket-leaflets/%') OR (COALESCE(offer.value->>'imageUrl','') LIKE 'https://kcm-tarjouslehdet.k-ruoka.fi/citymarket-leaflets/%') OR (COALESCE(offer.value->>'imageUrl','') LIKE 'https://kcm-lehdet.k-ruoka.fi/citymarket-leaflets/%'))
            AND (COALESCE(${JSON.stringify(imagePatch)}::jsonb ->> (offer.value->>'id'),'') ~* '^https://' OR COALESCE(${JSON.stringify(imagePatch)}::jsonb ->> (offer.value->>'id'),'') LIKE '/citymarket-leaflets/%')
          THEN jsonb_set(offer.value,'{imageUrl}',
            to_jsonb(${JSON.stringify(imagePatch)}::jsonb ->> (offer.value->>'id')),true)
          ELSE offer.value
        END ORDER BY offer.ordinality)
      FROM jsonb_array_elements(p.offers) WITH ORDINALITY AS offer(value,ordinality)
    )
    WHERE p.chain='K-Citymarket' AND p.publication_id=${before[0].publication_id}
      AND p.approval_state='approved'
    RETURNING publication_id
  `;
  if(updated.length!==1) throw new Error("Image-only update did not reach the approved publication");
  console.log("PATCH_IDS",Object.keys(imagePatch).length);
}

const keyDiagnostics=await sql`
 SELECT jsonb_agg(jsonb_build_object('id',o.value->>'id','title',o.value->>'title','price',o.value->>'price') ORDER BY o.ordinality) AS rows
 FROM ziiply_offer_publications p, jsonb_array_elements(p.offers) WITH ORDINALITY o(value,ordinality)
 WHERE p.chain='K-Citymarket' AND p.publication_id=${before[0].publication_id}
`;
const storedRows=(keyDiagnostics[0]?.rows??[]) as Array<{id?:string,title?:string,price?:number}>;
console.log("ID_AUDIT",JSON.stringify({stored:storedRows.length,fetch:offers.length,storedIdSample:storedRows.slice(0,3).map(x=>x.id),fetchIdSample:offers.slice(0,3).map(x=>x.id),fetchWithImageWithoutId:offers.filter(x=>x.imageUrl&&!x.id).length,fetchWithImageAndId:offers.filter(x=>x.imageUrl&&x.id).length,missingStoredIdMatches:offers.filter(x=>x.imageUrl&&!storedRows.some(y=>y.id===x.id)).slice(0,6).map(x=>({id:x.id,title:x.title,price:x.price}))}));
const diagnostics=await sql`
 SELECT
  (SELECT count(*)::int FROM jsonb_array_elements(p.offers) o WHERE ${JSON.stringify(imagePatch)}::jsonb ? (o->>'id')) AS matching_ids,
  (SELECT count(*)::int FROM jsonb_array_elements(p.offers) o WHERE (coalesce(o->>'imageUrl','') ~* '^https://' OR coalesce(o->>'imageUrl','') LIKE '/citymarket-leaflets/%')) AS valid_urls,
  (SELECT count(*)::int FROM jsonb_array_elements(p.offers) o WHERE coalesce(o->>'imageUrl','') <> '') AS nonempty_urls
 FROM ziiply_offer_publications p
 WHERE p.chain='K-Citymarket' AND p.publication_id=${before[0].publication_id}
`;
console.log("PATCH_DIAGNOSTICS",JSON.stringify(diagnostics));
const after=await read();
console.log("AFTER",JSON.stringify(after));
if(after[0]?.total!==before[0]?.total)throw new Error("Offer count changed unexpectedly");
if(after[0]?.with_image < before[0]?.with_image)throw new Error("Image coverage decreased");
if(after[0]?.with_image < offers.filter(o=>Boolean(normalizedImage(o.imageUrl))).length) throw new Error("Enriched image URLs were not persisted; check DB update");
console.log("RESULT",JSON.stringify({total:after[0].total,withImage:after[0].with_image,missing:after[0].total-after[0].with_image}));

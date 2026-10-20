import { neon } from "@neondatabase/serverless";
import { fetchKCitymarketOffers } from "../src/app/components/ziiply/offerSearch/providers/kCitymarketProvider";

if (!process.env.DATABASE_URL) throw new Error("ZIIPLY_DATABASE_URL GitHub secret missing");
const sql=neon(process.env.DATABASE_URL);
const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const read=async()=>await sql`
  SELECT publication_id,
    jsonb_array_length(offers)::int AS total,
    (SELECT count(*)::int FROM jsonb_array_elements(offers) o
      WHERE COALESCE(o->>'imageUrl','') ~* '^https://') AS with_image
  FROM ziiply_offer_publications
  WHERE chain='K-Citymarket' AND approval_state='approved'
    AND valid_from <= ${today}::date AND valid_until >= ${today}::date
  ORDER BY parsed_at DESC LIMIT 1`;
const before=await read();
console.log("BEFORE",JSON.stringify(before));
if(!before.length)throw new Error("No active K-Citymarket approved publication in database");
const offers=await fetchKCitymarketOffers();
console.log("ENRICHED",JSON.stringify({offers:offers.length,withImage:offers.filter(o=>!!o.imageUrl).length}));
const imagePatch: Record<string,string> = {};
for (const offer of offers) {
  const id=String(offer.id||"");
  const imageUrl=String(offer.imageUrl||"").trim();
  if (id && /^https:\/\//i.test(imageUrl)) imagePatch[id]=imageUrl;
}
if(Object.keys(imagePatch).length){
  // Image-only SQL patch: never replace offers, prices or any other metadata
  // from an enrichment run. The database row itself remains authoritative.
  const updated=await sql`
    UPDATE ziiply_offer_publications AS p SET offers=(
      SELECT jsonb_agg(
        CASE
          WHEN COALESCE(offer.value->>'imageUrl','') !~* '^https://'
            AND COALESCE(${JSON.stringify(imagePatch)}::jsonb ->> (offer.value->>'id'),'') ~* '^https://'
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
}

const after=await read();
console.log("AFTER",JSON.stringify(after));
if(after[0]?.total!==before[0]?.total)throw new Error("Offer count changed unexpectedly");
if(after[0]?.with_image < before[0]?.with_image)throw new Error("Image coverage decreased");
if(after[0]?.with_image < offers.filter(o=>Boolean(o.imageUrl)).length) throw new Error("Enriched image URLs were not persisted; check DB update");
console.log("RESULT",JSON.stringify({total:after[0].total,withImage:after[0].with_image,missing:after[0].total-after[0].with_image}));

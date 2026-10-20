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
const after=await read();
console.log("AFTER",JSON.stringify(after));
if(after[0]?.total!==before[0]?.total)throw new Error("Offer count changed unexpectedly");
if(after[0]?.with_image < before[0]?.with_image)throw new Error("Image coverage decreased");
console.log("RESULT",JSON.stringify({total:after[0].total,withImage:after[0].with_image,missing:after[0].total-after[0].with_image}));

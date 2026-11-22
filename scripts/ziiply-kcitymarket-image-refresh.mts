import { neon } from "@neondatabase/serverless";
import { enrichStoredKCitymarketOfferImages } from "../src/app/components/ziiply/offerSearch/providers/kCitymarketProvider";

if (!process.env.DATABASE_URL) throw new Error("ZIIPLY_DATABASE_URL GitHub secret missing");
const sql=neon(process.env.DATABASE_URL);
const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const read=async()=>await sql`
  SELECT publication_id, approval_state,
    jsonb_array_length(offers)::int AS total,
    (SELECT count(*)::int FROM jsonb_array_elements(offers) o
      WHERE (COALESCE(o->>'imageUrl','') ~* '^https://' OR COALESCE(o->>'imageUrl','') LIKE '/citymarket-leaflets/%')) AS with_image
  FROM ziiply_offer_publications
  WHERE chain='K-Citymarket' AND approval_state IN ('approved','candidate')
    AND valid_from <= ${today}::date AND valid_until >= ${today}::date
  ORDER BY CASE WHEN approval_state='approved' THEN 0 ELSE 1 END, parsed_at DESC LIMIT 1`;
const before=await read();
console.log("BEFORE",JSON.stringify(before));
if(!before.length)throw new Error("No active K-Citymarket approved or candidate publication in database");
const stored=await sql`
  SELECT offers FROM ziiply_offer_publications
  WHERE publication_id=${before[0].publication_id} AND chain='K-Citymarket'
    AND approval_state=${before[0].approval_state} LIMIT 1`;
if(!stored.length)throw new Error("Selected Citymarket publication disappeared before image enrichment");
// Repair only the two independently diagnosed OCR artifacts in the 46AV candidate.
// Never touch approved publications or other periods. Keep all prices intact.
const is46AVCandidate=before[0].approval_state==="candidate" &&
  /^2026-11-09-W46-AV-printed-transactions-/.test(String(before[0].publication_id));
if(is46AVCandidate){
  const brokenTitleId="kcm:spatial:6:sit 100–185 g:4";
  const orphanHeadingId="kcm:spatial:16:tuotteet:percent:30";
  const oldRows=stored[0].offers as Array<{id?:string,title?:string}>;
  const broken=oldRows.find(x=>x.id===brokenTitleId);
  const orphan=oldRows.find(x=>x.id===orphanHeadingId);
  if(broken?.title==="SIT 100–185 g" && orphan?.title==="TUOTTEET"){
    // Name restoration is supported by the spatial parser's same-card heading.
    // The generic TUOTTEET heading has no unique matching product.
    const clean=oldRows.filter(x=>x.id!==orphanHeadingId).map(x=>
      x.id===brokenTitleId?{...x,title:"PERUNALASTUT ja JUUSTONACKSIT 100–185 g",
        id:"kcm:spatial:6:perunalastut ja juustonacksit 100–185 g:4"}:x);
    if(clean.length!==oldRows.length-1)throw new Error("46AV candidate repair row count mismatch");
    const repaired=await sql`
      UPDATE ziiply_offer_publications p
      SET offers=${JSON.stringify(clean)}::jsonb
      WHERE p.chain='K-Citymarket' AND p.publication_id=${before[0].publication_id}
        AND p.approval_state='candidate'
        AND jsonb_array_length(p.offers)=34
        AND EXISTS(SELECT 1 FROM jsonb_array_elements(p.offers) x WHERE x->>'id'=${brokenTitleId} AND x->>'title'='SIT 100–185 g')
        AND EXISTS(SELECT 1 FROM jsonb_array_elements(p.offers) x WHERE x->>'id'=${orphanHeadingId} AND x->>'title'='TUOTTEET')
      RETURNING publication_id`;
    if(repaired.length!==1)throw new Error("46AV candidate repair failed its safety guards");
    console.log("46AV_CANDIDATE_OCR_REPAIRED",JSON.stringify({from:34,to:33,repairedName:"PERUNALASTUT ja JUUSTONACKSIT 100–185 g",removedOrphan:"TUOTTEET"}));
    stored[0].offers=clean;
  }else{
    console.log("46AV_CANDIDATE_OCR_REPAIR_SKIPPED",JSON.stringify({broken:broken?.title,orphan:orphan?.title}));
  }
}
// Reclassify a restored OCR title using the same authoritative provider classifier.
// Restrict the database patch to this exact candidate row and never alter prices/images.
if(is46AVCandidate){
  const repairedId="kcm:spatial:6:perunalastut ja juustonacksit 100–185 g:4";
  const correctedTitle="PERUNALASTUT ja JUUSTONACKSIT 100–185 g";
  const expectedCategory="Makeiset & keksit";
  const updatedCategory=await sql`
    UPDATE ziiply_offer_publications p SET offers=(
      SELECT jsonb_agg(
        CASE WHEN x.value->>'id'=${repairedId}
          AND x.value->>'title'=${correctedTitle}
          AND x.value->>'category'='Muut'
          THEN jsonb_set(x.value,'{category}',to_jsonb(${expectedCategory}::text),true)
          ELSE x.value END ORDER BY x.ordinality)
      FROM jsonb_array_elements(p.offers) WITH ORDINALITY x(value,ordinality)
    )
    WHERE p.chain='K-Citymarket' AND p.publication_id=${before[0].publication_id}
      AND p.approval_state='candidate'
      AND EXISTS(SELECT 1 FROM jsonb_array_elements(p.offers) x
        WHERE x->>'id'=${repairedId} AND x->>'title'=${correctedTitle} AND x->>'category'='Muut')
    RETURNING publication_id`;
  if(updatedCategory.length===1){
    const row=(stored[0].offers as Array<{id?:string,category?:string}>).find(x=>x.id===repairedId);
    if(row)row.category=expectedCategory;
    console.log("46AV_CANDIDATE_CATEGORY_REPAIRED",JSON.stringify({id:repairedId,category:expectedCategory}));
  }else{
    console.log("46AV_CANDIDATE_CATEGORY_REPAIR_SKIPPED");
  }
}
const offers=await enrichStoredKCitymarketOfferImages(stored[0].offers as Parameters<typeof enrichStoredKCitymarketOfferImages>[0]);
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
      AND p.approval_state=${before[0].approval_state}
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
console.log("MISSING_IMAGE_OFFERS",JSON.stringify(storedRows.filter(row =>
  !offers.some(offer => offer.id === row.id && Boolean(normalizedImage(offer.imageUrl)))
).map(row => ({id:row.id,title:row.title,price:row.price}))));
console.log("AFTER",JSON.stringify(after));
if(after[0]?.total!==(stored[0].offers as unknown[]).length)throw new Error("Offer count changed unexpectedly");
if(after[0]?.with_image < before[0]?.with_image)throw new Error("Image coverage decreased");
const matchingEnriched=offers.filter(o=>Boolean(normalizedImage(o.imageUrl))&&storedRows.some(y=>y.id===o.id)).length;
if(after[0]?.with_image < matchingEnriched) throw new Error("Enriched matching image URLs were not persisted; check DB update");
console.log("RESULT",JSON.stringify({total:after[0].total,withImage:after[0].with_image,missing:after[0].total-after[0].with_image}));
const qualityRows=await sql`
 SELECT
  count(*)::int AS total,
  count(*) FILTER (WHERE coalesce(x->>'title','')='')::int AS missing_names,
  count(*) FILTER (WHERE coalesce(x->>'category','') IN ('','Muut'))::int AS missing_categories,
  count(*) FILTER (WHERE NOT (
    (coalesce(x->>'price','') ~ '^[0-9]+([.][0-9]+)?' AND
     CASE WHEN coalesce(x->>'price','') ~ '^[0-9]+([.][0-9]+)?' THEN (x->>'price')::numeric>0 ELSE false END)
    OR
    (coalesce(x->>'discountPercent','') ~ '^[0-9]+([.][0-9]+)?' AND
     CASE WHEN coalesce(x->>'discountPercent','') ~ '^[0-9]+([.][0-9]+)?' THEN (x->>'discountPercent')::numeric>0 AND (x->>'discountPercent')::numeric<100 ELSE false END)
  ))::int AS missing_prices,
  count(*) FILTER (WHERE coalesce(x->>'resolutionSanity','pass')<>'pass')::int AS unverified_prices,
  count(*) FILTER (WHERE coalesce(x->>'title','') ~* '^(TUOTTEET|SIT([[:space:]]|$))')::int AS suspicious_names
 FROM ziiply_offer_publications p, jsonb_array_elements(p.offers) x
 WHERE p.chain='K-Citymarket' AND p.publication_id=${before[0].publication_id}
`;
console.log("CANDIDATE_QUALITY",JSON.stringify({publication:before[0].publication_id,approvalState:after[0].approval_state,...qualityRows[0]}));
const categoryDefects=await sql`
 SELECT x->>'id' AS id,x->>'title' AS title,x->>'category' AS category,x->>'price' AS price,
 x->>'discountPercent' AS discount_percent
 FROM ziiply_offer_publications p, jsonb_array_elements(p.offers) x
 WHERE p.chain='K-Citymarket' AND p.publication_id=${before[0].publication_id}
 AND coalesce(x->>'category','') IN ('','Muut')
`;
console.log("CANDIDATE_MISSING_CATEGORIES",JSON.stringify(categoryDefects));


 // Release only the explicitly reviewed 46AV snapshot, and only when every
 // measured quality gate passes. This does not authorize future editions.
const releaseId="2026-11-09-W46-AV-printed-transactions-v165";
const metrics=qualityRows[0] as Record<string,number>;
const allQualityPassed=after[0]?.total===33 && after[0]?.with_image===33 &&
  ["missing_names","missing_categories","missing_prices","unverified_prices","suspicious_names"].every(key=>Number(metrics[key])===0);
if(before[0].publication_id===releaseId && after[0].approval_state==="candidate"){
  if(!allQualityPassed)throw new Error("46AV release blocked: candidate quality gate failed");
  const promoted=await sql`
    UPDATE ziiply_offer_publications SET approval_state='approved'
    WHERE chain='K-Citymarket' AND publication_id=${releaseId}
      AND approval_state='candidate'
      AND jsonb_array_length(offers)=33
      AND NOT EXISTS(
        SELECT 1 FROM jsonb_array_elements(offers) x
        WHERE coalesce(x->>'title','')=''
          OR coalesce(x->>'category','') IN ('','Muut')
          OR NOT (coalesce(x->>'imageUrl','') ~* '^https://' OR coalesce(x->>'imageUrl','') LIKE '/citymarket-leaflets/%')
          OR coalesce(x->>'resolutionSanity','pass')<>'pass'
          OR coalesce(x->>'title','') ~* '^(TUOTTEET|SIT([[:space:]]|$))'
          OR NOT (
            (coalesce(x->>'price','') ~ '^[0-9]+([.][0-9]+)?$'
              AND CASE WHEN coalesce(x->>'price','') ~ '^[0-9]+([.][0-9]+)?$' THEN (x->>'price')::numeric>0 ELSE false END)
            OR (coalesce(x->>'discountPercent','') ~ '^[0-9]+([.][0-9]+)?$'
              AND CASE WHEN coalesce(x->>'discountPercent','') ~ '^[0-9]+([.][0-9]+)?$' THEN (x->>'discountPercent')::numeric>0 AND (x->>'discountPercent')::numeric<100 ELSE false END)
          )
      )
    RETURNING publication_id,approval_state`;
  if(promoted.length!==1)throw new Error("46AV approval did not satisfy database release guards");
  console.log("46AV_PUBLICATION_APPROVED",JSON.stringify(promoted[0]));
}

import { neon } from "@neondatabase/serverless";
import { appendFileSync } from "node:fs";

if (!process.env.DATABASE_URL) throw new Error("ZIIPLY_DATABASE_URL GitHub secret missing");
const sql=neon(process.env.DATABASE_URL);
const today=new Intl.DateTimeFormat("sv-SE",{
  timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"
}).format(new Date());
const rows=await sql`
  SELECT publication_id, parsed_at, jsonb_array_length(offers)::int AS total,
    (SELECT count(*)::int FROM jsonb_array_elements(offers) o
      WHERE COALESCE(o->>'imageUrl','') ~* '^https://') AS with_image
  FROM ziiply_offer_publications
  WHERE chain='K-Citymarket' AND approval_state='approved'
    AND valid_from <= ${today}::date AND valid_until >= ${today}::date
  ORDER BY parsed_at DESC LIMIT 1
`;
if (!rows.length) {
  console.log("LIGHT_CHECK",JSON.stringify({active:false,runHeavy:false}));
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,"run_heavy=false\n");
  process.exit(0);
}
const row=rows[0];
const ageMs=Date.now()-new Date(String(row.parsed_at)).getTime();
const missing=Math.max(0,Number(row.total)-Number(row.with_image));
// Newly parsed publications get a prompt enrichment. Older incomplete
// publications are handled by the hourly full run to avoid hammering sources.
const runHeavy=missing>0 && Number.isFinite(ageMs) && ageMs>=0 && ageMs<16*60_000;
console.log("LIGHT_CHECK",JSON.stringify({
  publicationId:row.publication_id,total:row.total,withImage:row.with_image,
  missing,ageMinutes:Number.isFinite(ageMs)?Math.round(ageMs/60000):null,runHeavy
}));
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`run_heavy=${runHeavy}\n`);

import { neon } from "@neondatabase/serverless";
import { writeFileSync, mkdirSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL secret is missing; no production coverage claim can be made.");
  process.exit(2);
}
const sql = neon(process.env.DATABASE_URL);
// Diagnose empty results before treating them as zero offers. A successful
// connection alone does not prove that this is the application's database.
const [dbInfo] = await sql`SELECT current_database() AS database_name,
  current_schema() AS schema_name, current_user AS database_user`;
const [tableInfo] = await sql`SELECT
  COUNT(*)::int AS all_publications,
  COUNT(*) FILTER (WHERE valid_until >= CURRENT_DATE - INTERVAL '2 days')::int AS recent_publications,
  COUNT(*) FILTER (WHERE jsonb_typeof(offers)='array')::int AS array_publications,
  MAX(parsed_at) AS newest_parse,
  MAX(valid_until) AS latest_valid_until
  FROM ziiply_offer_publications`;
// The queue table is created by the enrichment endpoint, and may not exist
// in this database yet. Do not fail the read-only coverage audit for that.
const [queueTable] = await sql`SELECT to_regclass('public.ziiply_offer_image_queue') IS NOT NULL AS exists`;
const queueInfo = queueTable.exists
  ? await sql`SELECT status, COUNT(*)::int AS count FROM public.ziiply_offer_image_queue GROUP BY status ORDER BY status`
  : [];
const recent = await sql`SELECT chain,publication_id AS publication,parsed_at,valid_until,
  CASE WHEN jsonb_typeof(offers)='array' THEN jsonb_array_length(offers) ELSE NULL END AS offer_count
  FROM ziiply_offer_publications ORDER BY parsed_at DESC NULLS LAST LIMIT 15`;
const rows = await sql`
  SELECT p.chain, p.publication_id AS publication, p.parsed_at,
    jsonb_array_length(p.offers)::int AS total,
    (SELECT COUNT(*)::int FROM jsonb_array_elements(p.offers) AS o(value)
      WHERE COALESCE(o.value->>'imageUrl','') ~* '^https://[^ /?#]+\\.[^ /?#]+'
        OR length(COALESCE(o.value->>'imageData','')) > 100) AS with_image
  FROM ziiply_offer_publications p
  WHERE p.valid_until >= CURRENT_DATE - INTERVAL '2 days'
    AND jsonb_typeof(p.offers)='array'
  ORDER BY p.chain,p.parsed_at DESC,p.publication_id
`;
const report = {
  checkedAt: new Date().toISOString(),
  source: "ziiply_offer_publications (active and recently expired)",
  diagnostics: { database: dbInfo.database_name, schema: dbInfo.schema_name,
    publicationTable: tableInfo, queueTableExists: queueTable.exists, queueByStatus: queueInfo, latestPublications: recent },
  publications: rows.map(r => ({
    chain:r.chain, publication:r.publication, parsedAt:r.parsed_at,
    total:Number(r.total), withImage:Number(r.with_image),
    missingImage:Number(r.total)-Number(r.with_image)
  }))
};
const groups = new Map();
for (const r of report.publications) {
  const x = groups.get(r.chain) ?? {chain:r.chain,publications:0,total:0,withImage:0,missingImage:0};
  x.publications++; x.total+=r.total; x.withImage+=r.withImage; x.missingImage+=r.missingImage;
  groups.set(r.chain,x);
}
report.byChain=[...groups.values()];
mkdirSync("image-coverage-reports",{recursive:true});
writeFileSync("image-coverage-reports/coverage.json",JSON.stringify(report,null,2)+"\n");
const md=["# Ziiply offer image coverage",`Checked: ${report.checkedAt}`,
  "","## Database diagnostics",
  `Database: ${dbInfo.database_name}; schema: ${dbInfo.schema_name}`,
  `All publication rows: ${tableInfo.all_publications}; recent: ${tableInfo.recent_publications}; arrays: ${tableInfo.array_publications}`,
  `Newest parsed: ${tableInfo.newest_parse ?? "none"}; latest valid until: ${tableInfo.latest_valid_until ?? "none"}`,
  `Queue table exists: ${queueTable.exists}; queue: ${queueInfo.map(q => q.status + "=" + q.count).join(", ") || "empty"}`,
  "","### Latest publications",
  "| Chain | Publication | Parsed | Valid until | Offers |",
  "|---|---|---|---|---:|",
  ...recent.map(x=>`| ${x.chain} | ${x.publication} | ${x.parsed_at ?? ""} | ${x.valid_until ?? ""} | ${x.offer_count ?? "not array"} |`),
  "","## By chain","| Chain | Publications | Offers | With image | Missing |","|---|---:|---:|---:|---:|",...report.byChain.map(x=>`| ${x.chain} | ${x.publications} | ${x.total} | ${x.withImage} | ${x.missingImage} |`),"","## Per publication","| Chain | Publication | Offers | With image | Missing |","|---|---|---:|---:|---:|",...report.publications.map(x=>`| ${x.chain} | ${String(x.publication).replace(/\\|/g,"/")} | ${x.total} | ${x.withImage} | ${x.missingImage} |`)];
writeFileSync("image-coverage-reports/coverage.md",md.join("\n")+"\n");
console.log(md.join("\n"));
if (!rows.length) {
  console.error("DIAGNOSTIC: No recent array publications matched. Review the database, validity dates, and latest publications above.");
  process.exitCode = 1;
}

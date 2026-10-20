import { neon } from "@neondatabase/serverless";
import { writeFileSync, mkdirSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL secret is missing; no production coverage claim can be made.");
  process.exit(2);
}
const sql = neon(process.env.DATABASE_URL);
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
const md=["# Ziiply offer image coverage",`Checked: ${report.checkedAt}`,"","## By chain","| Chain | Publications | Offers | With image | Missing |","|---|---:|---:|---:|---:|",...report.byChain.map(x=>`| ${x.chain} | ${x.publications} | ${x.total} | ${x.withImage} | ${x.missingImage} |`),"","## Per publication","| Chain | Publication | Offers | With image | Missing |","|---|---|---:|---:|---:|",...report.publications.map(x=>`| ${x.chain} | ${String(x.publication).replace(/\\|/g,"/")} | ${x.total} | ${x.withImage} | ${x.missingImage} |`)];
writeFileSync("image-coverage-reports/coverage.md",md.join("\n")+"\n");
console.log(md.join("\n"));

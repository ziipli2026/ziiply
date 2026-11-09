import { neon } from "@neondatabase/serverless";
import { recordPublicationRun } from "./publicationRunLog";

export function citymarketPreflightDatabaseUrl() {
  return process.env.OFFER_PUBLICATION_DATABASE_URL || process.env.DATABASE_URL;
}

export type CitymarketPreflightInput = {
  period: string;
  startedAt: string;
  parsed: { period: string; offers: number; cachedAt: string } | null;
  errors: string[];
};

/** Check the exact next edition after the automatic parser; never infer it from the active edition. */
export async function recordCitymarketPreflight(input: CitymarketPreflightInput) {
  const errors = input.errors.filter(error => error.startsWith("next ")).slice(0, 10);
  const databaseUrl = citymarketPreflightDatabaseUrl();
  const sql = databaseUrl ? neon(databaseUrl) : null;
  let quality: Record<string, number> | null = null;
  let missingCategoryTitles: string[] = [];
  let missingImageTitles: string[] = [];
  if (input.parsed && sql) {
    const rows = await sql`SELECT jsonb_array_length(offers)::int AS total,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE
        COALESCE(NULLIF(o->>'title',''),NULLIF(o->>'name','')) IS NULL) AS missing_names,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE
        btrim(COALESCE(o->>'title',o->>'name','')) ~* '^(TUOTTEET|SIT([[:space:]]|$))') AS suspicious_names,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE
        NOT (COALESCE(o->>'price','') ~ '^[0-9]+([.][0-9]+)?$' AND
          CASE WHEN COALESCE(o->>'price','') ~ '^[0-9]+([.][0-9]+)?$' THEN (o->>'price')::numeric>0 ELSE false END)
        AND NOT (COALESCE(o->>'discountPercent','') ~ '^[0-9]+([.][0-9]+)?$' AND
          CASE WHEN COALESCE(o->>'discountPercent','') ~ '^[0-9]+([.][0-9]+)?$' THEN (o->>'discountPercent')::numeric>0 AND (o->>'discountPercent')::numeric<100 ELSE false END)) AS missing_prices,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(o->>'imageUrl','')='') AS missing_images,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(o->>'category','') IN ('','Muut')) AS missing_categories,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(o->>'resolutionSanity','pass')<>'pass') AS unverified_prices
      FROM ziiply_offer_publications WHERE chain='K-Citymarket' AND (publication_id=${input.period} OR publication_id LIKE ${input.period + '-printed-transactions-%'}) AND approval_state IN ('candidate','approved') ORDER BY parsed_at DESC LIMIT 1`;
    quality = rows[0] as Record<string, number> ?? null;
    // Expose concrete next-edition category defects to the repair workflow.
    // Counts alone leave the automation unable to identify which offers need repair.
    if (quality?.missing_images > 0) {
      const defects = await sql`SELECT COALESCE(o->>'title',o->>'name','(untitled)') AS title
        FROM (
          SELECT offers FROM ziiply_offer_publications
          WHERE chain='K-Citymarket'
            AND (publication_id=${input.period} OR publication_id LIKE ${input.period + '-printed-transactions-%'})
            AND approval_state IN ('candidate','approved')
          ORDER BY parsed_at DESC LIMIT 1
        ) p
        CROSS JOIN LATERAL jsonb_array_elements(p.offers) o
        WHERE COALESCE(o->>'imageUrl','')=''
        LIMIT 40`;
      missingImageTitles = defects.map(row => String(row.title));
    }
    if (quality?.missing_categories > 0) {
      const defects = await sql`SELECT COALESCE(o->>'title',o->>'name','(untitled)') AS title
        FROM (
          SELECT offers FROM ziiply_offer_publications
          WHERE chain='K-Citymarket'
            AND (publication_id=${input.period} OR publication_id LIKE ${input.period + '-printed-transactions-%'})
            AND approval_state IN ('candidate','approved')
          ORDER BY parsed_at DESC LIMIT 1
        ) p
        CROSS JOIN LATERAL jsonb_array_elements(p.offers) o
        WHERE COALESCE(o->>'category','') IN ('','Muut')
        LIMIT 20`;
      missingCategoryTitles = defects.map(row => String(row.title));
    }

  }
  const failed = !input.parsed || errors.length>0 || !quality || quality.total===0 ||
    quality.total!==input.parsed.offers || quality.missing_names>0 || quality.suspicious_names>0 || quality.missing_prices>0 || quality.missing_images>0 || quality.missing_categories>0 || quality.unverified_prices>0;
  const outcome = !input.parsed ? "preflight-parser-failed" : !quality ? "preflight-snapshot-missing" :
    failed ? "preflight-quality-failed" : "preflight-awaiting-pdf-review";
  const details = { period: input.period, parserStartedAt: input.startedAt, parsed: input.parsed,
    quality, missingCategoryTitles, missingImageTitles, errors, severity: failed ? "error" : "warning", pdfReview: "pending" };
  await recordPublicationRun({ chain:"K-Citymarket",source:"k-citymarket-preflight",ok:false,
    count:quality?.total??input.parsed?.offers??0,outcome,details }, databaseUrl);
  return {ok:false,outcome,...details};
}

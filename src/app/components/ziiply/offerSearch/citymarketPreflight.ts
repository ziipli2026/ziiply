import { neon } from "@neondatabase/serverless";
import { recordPublicationRun } from "./publicationRunLog";

export type CitymarketPreflightInput = {
  period: string;
  startedAt: string;
  parsed: { period: string; offers: number; cachedAt: string } | null;
  errors: string[];
};

/** Check the exact next edition after the automatic parser; never infer it from the active edition. */
export async function recordCitymarketPreflight(input: CitymarketPreflightInput) {
  const errors = input.errors.filter(error => error.startsWith("next ")).slice(0, 10);
  const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  let quality: Record<string, number> | null = null;
  if (input.parsed && sql) {
    const rows = await sql`SELECT jsonb_array_length(offers)::int AS total,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE
        COALESCE(NULLIF(o->>'title',''),NULLIF(o->>'name','')) IS NULL) AS missing_names,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE
        NOT (COALESCE(o->>'price','') ~ '^[0-9]+([.][0-9]+)?$' AND
          CASE WHEN COALESCE(o->>'price','') ~ '^[0-9]+([.][0-9]+)?$' THEN (o->>'price')::numeric>0 ELSE false END)
        AND NOT (COALESCE(o->>'discountPercent','') ~ '^[0-9]+([.][0-9]+)?$' AND
          CASE WHEN COALESCE(o->>'discountPercent','') ~ '^[0-9]+([.][0-9]+)?$' THEN (o->>'discountPercent')::numeric>0 AND (o->>'discountPercent')::numeric<100 ELSE false END)) AS missing_prices,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(o->>'imageUrl','')='') AS missing_images,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(o->>'category','') IN ('','Muut')) AS missing_categories,
      (SELECT count(*)::int FROM jsonb_array_elements(offers) o WHERE COALESCE(o->>'resolutionSanity','pass')<>'pass') AS unverified_prices
      FROM ziiply_offer_publications WHERE chain='K-Citymarket' AND (publication_id=${input.period} OR publication_id LIKE ${input.period + '-printed-transactions-%'}) AND approval_state='approved' ORDER BY parsed_at DESC LIMIT 1`;
    quality = rows[0] as Record<string, number> ?? null;
  }
  const failed = !input.parsed || errors.length>0 || !quality || quality.total===0 ||
    quality.total!==input.parsed.offers || quality.missing_names>0 || quality.missing_prices>0 || quality.unverified_prices>0;
  const outcome = !input.parsed ? "preflight-parser-failed" : !quality ? "preflight-snapshot-missing" :
    failed ? "preflight-quality-failed" : "preflight-awaiting-pdf-review";
  const details = { period: input.period, parserStartedAt: input.startedAt, parsed: input.parsed,
    quality, errors, severity: failed ? "error" : "warning", pdfReview: "pending" };
  await recordPublicationRun({ chain:"K-Citymarket",source:"k-citymarket-preflight",ok:!failed,
    count:quality?.total??input.parsed?.offers??0,outcome,details });
  return {ok:!failed,outcome,...details};
}

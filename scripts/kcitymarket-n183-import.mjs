/**
 * Persist independently verified, complete K-Ruoka N183 scans.
 * Input: path to a verified JSON batch, produced by a separately authenticated
 * source adapter. Browser discovery diagnostics are NOT accepted.
 * Requires DATABASE_URL; never deletes or extends previous offers on failure.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";
import { N183_STORE_KEY, validateN183Batch } from "./kcitymarket-n183-validate.mjs";

export async function importN183Batch(batch, sql, now = Date.now()) {
  const rows = validateN183Batch(batch, now);
  const source = (() => { try { return new URL(batch.sourceUrl); } catch { return null; } })();
  if (!source || source.protocol !== "https:" ||
      !["k-ruoka.fi", "www.k-ruoka.fi"].includes(source.hostname) ||
      !batch.sourceEvidence || batch.sourceEvidence.storeScopeConfirmed !== true ||
      batch.sourceEvidence.offerScopeConfirmed !== true ||
      batch.sourceEvidence.storeId !== "N183" ||
      !Array.isArray(batch.sourceEvidence.offerIds) ||
      batch.sourceEvidence.offerIds.length !== rows.length ||
      rows.some(row => !batch.sourceEvidence.offerIds.includes(String(row.offerId))))
    throw new Error("N183 source evidence missing; refusing to publish");
  const scanTime = Date.parse(String(batch.scannedAt ?? ""));
  if (!Number.isFinite(scanTime) || Math.abs(now - scanTime) > 60 * 60 * 1000)
    throw new Error("N183 scan timestamp is missing or stale");
  // Preserve the last known good snapshot on unexpectedly incomplete scans.
  const existing = await sql`SELECT offers FROM public.ziiply_kcitymarket_tjek_snapshots
    WHERE store_key = ${N183_STORE_KEY} LIMIT 1`;
  const previous = Array.isArray(existing[0]?.offers) ? existing[0].offers : [];
  const previousActive = previous.filter(row => {
    const from = Date.parse(String(row.validFrom ?? ""));
    const until = Date.parse(String(row.validUntil ?? ""));
    return Number.isFinite(from) && Number.isFinite(until) && from <= now && now <= until;
  }).length;
  if (previousActive >= 5 && rows.length < Math.max(3, Math.floor(previousActive * 0.5)))
    throw new Error(`N183 offer coverage regression: ${rows.length}/${previousActive}; snapshot preserved`);
  const publicationIds = [...new Set(rows.map(row => String(row.publicationId ?? "")).filter(Boolean))];
  await sql`INSERT INTO public.ziiply_kcitymarket_tjek_snapshots
    (store_key, offers, publication_ids, valid_until, updated_at)
    VALUES (${N183_STORE_KEY}, ${JSON.stringify(rows)}::jsonb,
      ${JSON.stringify(publicationIds)}::jsonb, NOW() + INTERVAL '7 days', NOW())
    ON CONFLICT (store_key) DO UPDATE SET
      offers = EXCLUDED.offers, publication_ids = EXCLUDED.publication_ids,
      valid_until = EXCLUDED.valid_until, updated_at = NOW()`;
  return {stored:rows.length,previousActive,publicationIds:publicationIds.length};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const filename = process.argv[2];
  if (!filename || !process.env.DATABASE_URL) {
    console.error("Usage: DATABASE_URL=... node scripts/kcitymarket-n183-import.mjs verified-batch.json");
    process.exitCode = 2;
  } else {
    try {
      const batch = JSON.parse(await readFile(filename, "utf8"));
      const result = await importN183Batch(batch, neon(process.env.DATABASE_URL));
      console.log("N183_VERIFIED_IMPORT", JSON.stringify(result));
    } catch (error) {
      console.error("N183_IMPORT_REJECTED", String(error));
      process.exitCode = 1;
    }
  }
}

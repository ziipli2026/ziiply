/** Verified K-Ruoka store campaign batch importer for any K-Citymarket. No city exceptions. */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";

const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const SCOPE = "SELECTED_STORE_WEB_OFFERS";

export function validateCitymarketBatch(batch, now = Date.now()) {
  const storeId = String(batch?.storeId ?? "").trim().toUpperCase();
  const storeName = String(batch?.storeName ?? "").trim();
  const key = normalize(storeName);
  if (!/^N[0-9]+$/.test(storeId) || !key.startsWith("k citymarket ") ||
      batch?.verifiedStoreOffers !== true || batch?.complete !== true ||
      !Array.isArray(batch?.offers) || batch.offers.length === 0)
    throw new Error("Store identity or complete verified campaign batch missing");
  const source = (() => { try { return new URL(batch.sourceUrl); } catch { return null; } })();
  const evidence = batch.sourceEvidence;
  if (!source || source.protocol !== "https:" ||
      !["k-ruoka.fi", "www.k-ruoka.fi"].includes(source.hostname) ||
      evidence?.storeScopeConfirmed !== true || evidence?.offerScopeConfirmed !== true ||
      String(evidence.storeId).toUpperCase() !== storeId ||
      !Array.isArray(evidence.offerIds))
    throw new Error("Independently verified K-Ruoka store and offer evidence required");
  if (batch.requests || batch.candidates || String(batch.note ?? "").includes("Diagnostic only"))
    throw new Error("Browser research report cannot be imported as offers");
  const scanTime = Date.parse(String(batch.scannedAt ?? ""));
  if (!Number.isFinite(scanTime) || Math.abs(now - scanTime) > 3600000)
    throw new Error("Campaign scan missing or stale");
  const offers = batch.offers.map(row => {
    const id = String(row?.offerId ?? "").trim();
    const title = String(row?.title ?? row?.name ?? "").trim();
    const price = Number(row?.price);
    const from = Date.parse(String(row?.validFrom ?? ""));
    const until = Date.parse(String(row?.validUntil ?? ""));
    if (!id || !title || !(price > 0) || !Number.isFinite(price) ||
        !Number.isFinite(from) || !Number.isFinite(until) || from > now || until < now ||
        from > until || String(row.storeId ?? "").toUpperCase() !== storeId ||
        normalize(row.storeName) !== key ||
        String(row.sourceScope ?? row.debug?.sourceScope ?? "") !== SCOPE)
      throw new Error("Invalid, expired or wrong-store campaign row");
    return { ...row, id: "kruoka-" + storeId.toLowerCase() + "-" + id,
      title, name: title, price, storeId, storeName,
      sourceScope: SCOPE, debug: { ...row.debug, sourceScope: SCOPE } };
  });
  const ids = offers.map(row => String(row.offerId));
  if (new Set(ids).size !== offers.length ||
      evidence.offerIds.length !== offers.length ||
      new Set(evidence.offerIds.map(String)).size !== offers.length ||
      ids.some(id => !evidence.offerIds.map(String).includes(id)))
    throw new Error("Offer evidence and campaign IDs do not match");
  return { key: "k ruoka " + key, storeId, storeName, offers };
}

export async function importCitymarketBatch(batch, sql, now = Date.now()) {
  const { key, storeId, offers } = validateCitymarketBatch(batch, now);
  const previousRows = await sql`SELECT offers FROM public.ziiply_kcitymarket_tjek_snapshots WHERE store_key = ${key} LIMIT 1`;
  const previous = Array.isArray(previousRows[0]?.offers) ? previousRows[0].offers : [];
  const active = previous.filter(row => Date.parse(String(row.validFrom)) <= now &&
    Date.parse(String(row.validUntil)) >= now).length;
  if (active >= 5 && offers.length < Math.max(3, Math.floor(active * 0.5)))
    throw new Error("Campaign coverage regression; previous snapshot preserved");
  const publicationIds = [...new Set(offers.map(row => String(row.publicationId ?? "")).filter(Boolean))];
  await sql`INSERT INTO public.ziiply_kcitymarket_tjek_snapshots
    (store_key, offers, publication_ids, valid_until, updated_at)
    VALUES (${key}, ${JSON.stringify(offers)}::jsonb, ${JSON.stringify(publicationIds)}::jsonb,
      NOW() + INTERVAL '7 days', NOW())
    ON CONFLICT (store_key) DO UPDATE SET offers = EXCLUDED.offers,
      publication_ids = EXCLUDED.publication_ids, valid_until = EXCLUDED.valid_until, updated_at = NOW()`;
  return { storeId, stored: offers.length, previousActive: active };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const filename = process.argv[2];
  if (!filename || !process.env.DATABASE_URL) {
    console.error("Usage: DATABASE_URL=... node scripts/kcitymarket-store-import.mjs verified-batch.json");
    process.exitCode = 2;
  } else {
    try {
      console.log("CITYMARKET_STORE_IMPORT", JSON.stringify(await importCitymarketBatch(
        JSON.parse(await readFile(filename, "utf8")), neon(process.env.DATABASE_URL))));
    } catch (error) {
      console.error("CITYMARKET_STORE_IMPORT_REJECTED", String(error));
      process.exitCode = 1;
    }
  }
}

import { createHash } from "node:crypto";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { NextResponse } from "next/server";
import { fetchLidlDatedOffersForStaging } from "@/app/components/ziiply/offerSearch/providers/lidlProvider";
import { fetchLidlPublicLeafletOffers } from "@/app/components/ziiply/offerSearch/providers/lidlPublicLeafletProvider";
import { approvePublication, storeParsedPublication } from "@/app/components/ziiply/offerSearch/publicationStore";
import { finnishPublicationDate, publicationState } from "@/app/components/ziiply/offerSearch/publicationLifecycle";
import { inspectOfferPublication } from "@/app/components/ziiply/offerSearch/publicationDiagnostics";
import { LIDL_NATIONAL_PUBLICATION_CHAIN } from "@/app/components/ziiply/offerSearch/lidlPublicationConfig";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const normalize = (value: unknown) => String(value ?? "").toLocaleLowerCase("fi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b/g, " ")
  .replace(/[^a-z0-9åäö]+/gi, " ").replace(/\s+/g, " ").trim();

function mergePeriodRows(rows: Record<string, any>[]) {
  const output: Record<string, any>[] = [];
  const seen = new Map<string, number>();
  for (const row of rows) {
    const name = String(row.name || row.title || "");
    const brand = String(row.brandName || row.brand || "");
    const key = normalize([brand, name, row.validFrom, row.validUntil].join(" "));
    if (!key) continue;
    const oldIndex = seen.get(key);
    if (oldIndex == null) {
      seen.set(key, output.length);
      output.push(row);
      continue;
    }
    // Structured Lidl Plus data wins exact duplicates; public Lidl.fi fills gaps
    // and may contribute an image when the structured row has none.
    const old = output[oldIndex];
    if (String(old.source || "") === "lidl-plus") continue;
    if (String(row.source || "") === "lidl-plus") output[oldIndex] = { ...old, ...row, imageUrl: row.imageUrl || old.imageUrl || "" };
  }
  return output;
}

/** Stage Lidl Plus + official Lidl.fi public leaflet rows, including future dated editions. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Cron unavailable" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const today = finnishPublicationDate();
    const [structuredResult, publicResult] = await Promise.allSettled([
      fetchLidlDatedOffersForStaging("FI0218", "Lidl Hyvinkää"),
      fetchLidlPublicLeafletOffers({ date: today, includeUpcoming: true }),
    ]);
    const structured = structuredResult.status === "fulfilled" ? structuredResult.value : [];
    const publicOffers = publicResult.status === "fulfilled" ? publicResult.value.offers : [];
    const publicAudit = publicResult.status === "fulfilled" ? publicResult.value.audit : { error: String(publicResult.reason) };
    if (!structured.length && !publicOffers.length) throw new Error("No dated Lidl offers from either official source");

    const grouped = new Map<string, Record<string, any>[]>();
    for (const row of [...structured, ...publicOffers]) {
      const validFrom = String(row.validFrom || "").slice(0, 10);
      const validUntil = String(row.validUntil || "").slice(0, 10);
      if (publicationState({ validFrom, validUntil }, validFrom) === "invalid") continue;
      const key = `${validFrom}:${validUntil}`;
      grouped.set(key, [...(grouped.get(key) || []), row]);
    }

    const outcomes = [];
    for (const [period, rawRows] of grouped) {
      const [validFrom, validUntil] = period.split(":");
      const offers = mergePeriodRows(rawRows);
      const quality = inspectOfferPublication(offers, validFrom, validUntil);
      if (quality.severity === "error") {
        outcomes.push({ period, count: offers.length, outcome: "rejected-quality-error", quality });
        continue;
      }
      const fingerprint = createHash("sha256").update(JSON.stringify(
        offers.map((offer) => offer).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      )).digest("hex").slice(0, 20);
      const publicationId = `official-combined:${period}:${fingerprint}`;
      const outcome = await storeParsedPublication({
        chain: LIDL_NATIONAL_PUBLICATION_CHAIN,
        id: publicationId,
        validFrom, validUntil, parsedAt: new Date().toISOString(), offers,
      }, { approvalState: "candidate" });

      // This cron is the automated Lidl publication pipeline. A candidate that
      // passes the publication quality gate is safe to approve immediately:
      // readActivePublicationOffers still enforces valid_from/valid_until, so an
      // upcoming edition cannot become visible before its start date. Failed or
      // empty source runs never reach this point and therefore preserve the last
      // known-good approved edition.
      const approved = await approvePublication(LIDL_NATIONAL_PUBLICATION_CHAIN, publicationId);
      outcomes.push({
        period, count: offers.length,
        structuredCount: offers.filter(row => row.source === "lidl-plus").length,
        publicCount: offers.filter(row => row.source === "lidl-fi-public").length,
        outcome, publicationId, approvalState: approved ? "approved" : "already-approved-or-unchanged", quality,
      });
    }

    const qualityOk = outcomes.length > 0 && outcomes.every(({ quality }) => quality.severity !== "error");
    const sourceHealthy = structured.length > 0 && publicOffers.length > 0;
    await recordPublicationRun({
      chain: LIDL_NATIONAL_PUBLICATION_CHAIN, source: "official-lidl-combined", ok: qualityOk && sourceHealthy,
      count: structured.length + publicOffers.length,
      outcome: qualityOk && sourceHealthy ? "candidate-staging-completed" : "staging-partial-or-quality-error",
      details: {
        structuredCount: structured.length, publicCount: publicOffers.length, publicAudit,
        structuredError: structuredResult.status === "rejected" ? String(structuredResult.reason) : null,
        publicError: publicResult.status === "rejected" ? String(publicResult.reason) : null,
        periods: outcomes,
      },
    }).catch(() => undefined);

    return NextResponse.json({
      ok: qualityOk && sourceHealthy,
      needsAttention: !qualityOk || !sourceHealthy,
      source: "official-lidl-combined",
      structuredCount: structured.length, publicCount: publicOffers.length, publicAudit,
      staged: outcomes,
    }, { status: qualityOk && sourceHealthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await recordPublicationRun({
      chain: LIDL_NATIONAL_PUBLICATION_CHAIN, source: "official-lidl-combined", ok: false,
      count: 0, outcome: "staging-failed", details: { errorType: error instanceof Error ? error.name : "Unknown" },
    }).catch(() => undefined);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Staging failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

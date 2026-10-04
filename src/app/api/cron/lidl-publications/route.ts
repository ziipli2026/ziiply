import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchLidlDatedOffersForStaging } from "@/app/components/ziiply/offerSearch/providers/lidlProvider";
import { storeParsedPublication } from "@/app/components/ziiply/offerSearch/publicationStore";
import { publicationState } from "@/app/components/ziiply/offerSearch/publicationLifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Pilot: stage the official dated Lidl source for Hyvinkää, without publishing future offers. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Cron unavailable" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await fetchLidlDatedOffersForStaging("FI0218", "Lidl Hyvinkää");
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const validFrom = String(row.validFrom || "").slice(0, 10);
      const validUntil = String(row.validUntil || "").slice(0, 10);
      if (publicationState({ validFrom, validUntil }, validFrom) === "invalid") continue;
      const key = `${validFrom}:${validUntil}`;
      groups.set(key, [...(groups.get(key) || []), row]);
    }
    if (!groups.size) throw new Error("No dated grocery offers in Lidl source");
    const outcomes = [];
    for (const [period, offers] of groups) {
      const [validFrom, validUntil] = period.split(":");
      const outcome = await storeParsedPublication({
        // Stable content fingerprint: a corrected offer within the same period is a new snapshot.
        chain: "LIDL:FI0218",
        id: `official-dated:${period}:${createHash("sha256").update(JSON.stringify(
          offers.map((offer) => offer).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
        )).digest("hex").slice(0, 20)}`,
        validFrom, validUntil, parsedAt: new Date().toISOString(), offers,
      });
      outcomes.push({ period, count: offers.length, outcome });
    }
    return NextResponse.json({ ok: true, source: "official-lidl-dated-offers", staged: outcomes },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Staging failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

import { NextResponse } from "next/server";
import { publicationDiagnosticSnapshots } from "@/app/components/ziiply/offerSearch/publicationStore";
import { inspectOfferPublication, type OfferDiagnosticRow } from "@/app/components/ziiply/offerSearch/publicationDiagnostics";
import { publicationState, finnishPublicationDate } from "@/app/components/ziiply/offerSearch/publicationLifecycle";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Unavailable" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const chain = new URL(request.url).searchParams.get("chain") || "LIDL:FI0218";
    if (!/^[A-Z0-9:_-]{2,60}$/.test(chain))
      return NextResponse.json({ ok: false, error: "Invalid chain" }, { status: 400 });
    const snapshots = await publicationDiagnosticSnapshots(chain);
    const date = finnishPublicationDate();
    const editions = snapshots.map((row) => {
      const validFrom = String(row.valid_from);
      const validUntil = String(row.valid_until);
      const offers = Array.isArray(row.offers) ? row.offers as OfferDiagnosticRow[] : [];
      return {
        publicationId: row.publication_id, validFrom, validUntil, parsedAt: row.parsed_at,
        state: publicationState({ validFrom, validUntil }, date),
        quality: inspectOfferPublication(offers, validFrom, validUntil),
      };
    });
    return NextResponse.json({ ok: true, chain, checkedAt: new Date().toISOString(),
      editionCount: editions.length, editions },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Diagnostics failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

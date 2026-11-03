import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { finnishDate, isFinnishWatchSlot, pickMatches, type WatchOffer, type Watch } from "@/lib/gosta/offerWatchCore";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorizationOk(request: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: "Cron secret missing" }, { status: 503 });
  if (!authorizationOk(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  // Vercel cron executes on UTC. Two UTC schedules are used for DST coverage;
  // only one qualifies for each Finnish local clock slot.
  const now = new Date();
  if (!isFinnishWatchSlot(now)) return NextResponse.json({ ok: true, skipped: "Outside Finnish 07/13/19 slot" });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const sql = neon(process.env.DATABASE_URL);
  try {
    // An arbitrary user ID in a request NEVER authorizes reads. Only cron reads all
    // watch rows to perform the scheduled server-side processing.
    const watches = await sql`SELECT id,query,store_scope FROM ziiply_gosta_offer_watches
      WHERE enabled = true AND (last_checked_at IS NULL OR last_checked_at < now() - interval '4 hours')
      ORDER BY last_checked_at NULLS FIRST LIMIT 400` as Watch[];
    if (!watches.length) return NextResponse.json({ ok: true, checked: 0 });
    const today = finnishDate(now);
    // Latest approved edition per chain+period, not all historic snapshots.
    const publications = await sql`SELECT DISTINCT ON (chain,valid_from,valid_until)
      chain,publication_id,offers FROM ziiply_offer_publications
      WHERE approval_state='approved' AND valid_from <= ${today}::date AND valid_until >= ${today}::date
      ORDER BY chain,valid_from,valid_until,parsed_at DESC,publication_id DESC`;
    const offers: Array<WatchOffer & { publicationChain: string; publicationId: string }> = [];
    for (const publication of publications) {
      if (!Array.isArray(publication.offers)) continue;
      for (const offer of publication.offers) {
        if (offer && typeof offer === "object") offers.push({
          ...offer as WatchOffer,
          publicationChain: String(publication.chain), publicationId: String(publication.publication_id),
        });
      }
    }
    let updated = 0;
    for (const watch of watches) {
      const matches = pickMatches(offers, watch);
      await sql`UPDATE ziiply_gosta_offer_watches
        SET matches=${JSON.stringify(matches)}::jsonb, last_checked_at=now(), last_error=NULL, updated_at=now()
        WHERE id=${watch.id}::uuid AND enabled=true`;
      updated++;
    }
    return NextResponse.json({ ok: true, checked: updated, source: "approved-active-publications", date: today });
  } catch (error) {
    console.error("Gösta offer watch cron failed", error);
    return NextResponse.json({ ok: false, error: "Offer watch run failed" }, { status: 500 });
  }
}

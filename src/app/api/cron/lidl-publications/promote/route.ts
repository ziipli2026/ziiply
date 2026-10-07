import { NextResponse } from "next/server";
import { approvePublication, publicationApprovalState, readPublicationCandidate } from "@/app/components/ziiply/offerSearch/publicationStore";
import { inspectOfferPublication } from "@/app/components/ziiply/offerSearch/publicationDiagnostics";
import { LIDL_NATIONAL_PUBLICATION_CHAIN } from "@/app/components/ziiply/offerSearch/lidlPublicationConfig";

export const dynamic = "force-dynamic";

type OfferRow = {
  name?: unknown; title?: unknown; imageUrl?: unknown; category?: unknown;
  validFrom?: unknown; validUntil?: unknown; ean?: unknown; price?: unknown;
};

/**
 * Promotion is intentionally separate from discovery/staging.
 * Only trusted CI may call this after the archived production-parser regression
 * has passed. The server independently re-checks candidate quality before
 * changing visibility.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Promotion unavailable" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { publicationId?: string; regressionPassed?: boolean; regressionCommit?: string } = {};
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const publicationId = String(body.publicationId || "").trim();
  const regressionCommit = String(body.regressionCommit || "").trim();
  if (!publicationId || body.regressionPassed !== true || !/^[0-9a-f]{7,40}$/i.test(regressionCommit))
    return NextResponse.json({ ok: false, error: "Verified parser regression proof required" }, { status: 412 });

  const chain = LIDL_NATIONAL_PUBLICATION_CHAIN;
  const candidate = await readPublicationCandidate<OfferRow>(chain, publicationId);
  if (!candidate) {
    const state = await publicationApprovalState(chain, publicationId);
    if (state === "approved") {
      return NextResponse.json({
        ok: true,
        publicationId,
        regressionCommit,
        approvalState: "approved",
        idempotent: true,
      }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
  }

  const quality = inspectOfferPublication(candidate.offers, candidate.validFrom, candidate.validUntil);
  if (quality.severity === "error")
    return NextResponse.json({ ok: false, error: "Candidate quality gate failed", quality }, { status: 422 });

  // Warnings remain reviewable but do not hide an otherwise valid edition.
  const approved = await approvePublication(chain, publicationId);
  return NextResponse.json({
    ok: approved,
    publicationId,
    regressionCommit,
    quality,
    approvalState: approved ? "approved" : "candidate",
  }, { status: approved ? 200 : 409, headers: { "Cache-Control": "no-store" } });
}

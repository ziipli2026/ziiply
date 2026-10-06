import { NextResponse } from "next/server";
import { refreshSKaupatProtocolConfig } from "@/lib/skaupatProtocol";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Cron unavailable" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshSKaupatProtocolConfig();
    await recordPublicationRun({ chain: "S", source: "s-kaupat-protocol", ok: result.ok, count: result.ok ? 1 : 0, outcome: result.ok ? "protocol-verified" : "protocol-verification-failed", details: { changed: result.changed, persisted: result.persisted, source: result.source } }).catch(() => undefined);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordPublicationRun({ chain: "S", source: "s-kaupat-protocol", ok: false, count: 0, outcome: "protocol-cron-error", details: { error: message } }).catch(() => undefined);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

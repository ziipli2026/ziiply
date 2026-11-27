import { NextResponse } from "next/server";
import { hasBetaAccess } from "../../../../lib/ziiplyBetaAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!(await hasBetaAccess())) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401, headers });
  }
  return NextResponse.json({ ok: true, access: "beta" }, { headers });
}

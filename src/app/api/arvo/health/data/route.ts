import { NextResponse } from "next/server";
import { requireArvoHealthUser } from "../../../../../lib/arvoHealthAuth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
async function unavailable() {
  const auth = await requireArvoHealthUser();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: false, error: "Health data operations not enabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
export async function GET() { return unavailable(); }
export async function POST() { return unavailable(); }
export async function DELETE() { return unavailable(); }

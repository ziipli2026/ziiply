import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public deployment identifiers only; used to pin read-only preview audits.
export async function GET() {
  const host = process.env.VERCEL_URL || "";
  return NextResponse.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    deploymentUrl: host ? `https://${host}` : null,
    searchVersion: "desktop-normalized-v2",
  }, { headers: { "Cache-Control": "no-store" } });
}

import { NextRequest, NextResponse } from "next/server";
import { BETA_COOKIE_NAME } from "../../../../../lib/ziiplyBetaSessionSecurity.mjs";
import { getVerifiedBetaUserId } from "../../../../../lib/ziiplyPostHog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  const token = request.cookies.get(BETA_COOKIE_NAME)?.value;
  if (!token || !process.env.DATABASE_URL) return NextResponse.json({ authenticated: false }, { headers });
  try {
    const userId = await getVerifiedBetaUserId(token);
    return NextResponse.json({ authenticated: userId !== null }, { headers });
  } catch {
    return NextResponse.json({ authenticated: false }, { headers, status: 503 });
  }
}

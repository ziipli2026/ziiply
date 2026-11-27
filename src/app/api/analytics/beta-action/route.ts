import { NextRequest, NextResponse } from "next/server";
import { isBetaAction } from "../../../../lib/ziiplyBetaAnalytics";
import { BETA_COOKIE_NAME } from "../../../../lib/ziiplyBetaSessionSecurity.mjs";
import { betaPostHogIdentity, captureZiiplyEvent, getVerifiedBetaUserId } from "../../../../lib/ziiplyPostHog";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (request.nextUrl.hostname !== "beta.ziiply.fi" || request.headers.get("origin") !== request.nextUrl.origin) {
    return new NextResponse(null, { status: 403 });
  }
  const token = request.cookies.get(BETA_COOKIE_NAME)?.value;
  if (!token) return new NextResponse(null, { status: 401 });
  const text = await request.text();
  if (text.length > 512) return new NextResponse(null, { status: 413 });
  let input;
  try { input = JSON.parse(text); } catch { return new NextResponse(null, { status: 400 }); }
  if (!isBetaAction(input?.action) || !["mobile", "desktop"].includes(input.surface)) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const userId = await getVerifiedBetaUserId(token);
    if (!userId) return new NextResponse(null, { status: 401 });
    const beta = betaPostHogIdentity(userId);
    const result = await captureZiiplyEvent("beta_ui_action", beta.distinctId, {
      ...beta.properties,
      action_name: input.action,
      ziiply_surface: input.surface,
      ziiply_environment: "beta",
      ziiply_internal_test: input.internalTest === true,
      ziiply_analytics_schema: 4,
    });
    return new NextResponse(null, { status: result.accepted ? 204 : 502 });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnostic endpoint for the isolated GPS integration test deployment.
// Only allow an explicit test invocation, never automatic background polling.
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Preview-only diagnostic" }, { status: 403 });
  }
  if (new URL(request.url).searchParams.get("run") !== "1") {
    return NextResponse.json({ ready: Boolean(process.env.TOMTOM_API_KEY), note: "Add ?run=1 to perform one test request" });
  }
  const key = process.env.TOMTOM_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "TOMTOM_API_KEY is missing" }, { status: 503 });
  }

  // Two points on a short stretch of Mannerheimintie, Helsinki.
  // The service must match them to a road; never invent a speed limit on failure.
  const params = new URLSearchParams({
    key,
    points: "24.9397,60.1706;24.9404,60.1726",
    fields: "{route{properties{id,speedLimits{value,unit,type}}}}",
    vehicleType: "PassengerCar",
    measurementSystem: "metric",
  });
  try {
    const upstream = await fetch(`https://api.tomtom.com/snapToRoads/1?${params.toString()}`, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    const payload: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json({
        ok: false,
        upstreamStatus: upstream.status,
        error: "TomTom request failed",
        // Never echo raw upstream responses: some errors may contain the API key.
      }, { status: 502 });
    }
    const data = payload as { route?: { properties?: { id?: string; speedLimits?: { value?: number; unit?: string; type?: string } } }[] } | null;
    const roads = Array.isArray(data?.route) ? data.route.map((segment) => ({
      id: segment.properties?.id ?? null,
      speedLimits: segment.properties?.speedLimits ?? null,
    })) : [];
    return NextResponse.json({
      ok: true,
      location: "Helsinki, Mannerheimintie (two static test points)",
      roadSegments: roads,
      hasSpeedLimits: roads.some((segment) => typeof segment.speedLimits?.value === "number"),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "TomTom connection timed out or failed" }, { status: 502 });
  }
}

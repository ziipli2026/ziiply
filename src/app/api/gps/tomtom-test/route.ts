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
  const scenario = new URL(request.url).searchParams.get("scenario") ?? "helsinki";
  const samples: Record<string, { points: string; headings?: string; label: string }> = {
    helsinki: { points: "24.9397,60.1706;24.9404,60.1726", label: "Helsinki: original two points" },
    tomtom: { points: "4.6104919036936565,52.37576529649988;4.614096792595859,52.38341473290629", headings: "0;0", label: "TomTom documented reference points" },
    helsinki_reverse: { points: "24.9404,60.1726;24.9397,60.1706", label: "Helsinki: reversed travel direction" },
  };
  const sample = samples[scenario];
  if (!sample) return NextResponse.json({ error: "Unknown scenario", allowed: Object.keys(samples) }, { status: 400 });
  const params = new URLSearchParams({
    key,
    points: sample.points,
    fields: "{projectedPoints{type,geometry{type,coordinates},properties{routeIndex,snapResult}},route{properties{id,speedLimits{value,unit,type},address{roadName,municipality,countryName},confidence,frc,formOfWay}}}",
    vehicleType: "PassengerCar",
    measurementSystem: "metric",
  });
  if (sample.headings) params.set("headings", sample.headings);
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
    const data = payload as { projectedPoints?: { properties?: { snapResult?: string }; geometry?: { coordinates?: number[] } }[]; route?: { properties?: { id?: string; speedLimits?: { value?: number; unit?: string; type?: string }; address?: { roadName?: string; municipality?: string; countryName?: string }; confidence?: number; frc?: number; formOfWay?: string } }[] } | null;
    const roads = Array.isArray(data?.route) ? data.route.map((segment) => ({
      id: segment.properties?.id ?? null,
      speedLimits: segment.properties?.speedLimits ?? null,
      address: segment.properties?.address ?? null,
      confidence: segment.properties?.confidence ?? null,
      frc: segment.properties?.frc ?? null,
      formOfWay: segment.properties?.formOfWay ?? null,
    })) : [];
    return NextResponse.json({
      ok: true,
      scenario,
      location: sample.label,
      projectedPoints: data?.projectedPoints ?? [],
      roadSegments: roads,
      hasSpeedLimits: roads.some((segment) => typeof segment.speedLimits?.value === "number"),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "TomTom connection timed out or failed" }, { status: 502 });
  }
}

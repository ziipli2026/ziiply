import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const EVENTS = new Set(["search_started", "search_first_price_shown", "search_completed", "search_cancelled", "product_added_to_cart"]);
const KINDS = new Set(["normal", "ean", "offer"]);
const OUTCOMES = new Set(["priced_results", "no_priced_results", "partial_source_failure", "error"]);
const KEY = "phc_yUGdeyjeZABknZazoazcsLfBhDwuZ8NBTDxXUxN2EweJ";

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 2048) return NextResponse.json({ error: "too_large" }, { status: 413 });
    const data: unknown = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const body = data as Record<string, unknown>;
    if (typeof body.event !== "string" || !EVENTS.has(body.event) ||
        typeof body.search_id !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(body.search_id) ||
        typeof body.search_kind !== "string" || !KINDS.has(body.search_kind)) {
      return NextResponse.json({ error: "invalid_event" }, { status: 400 });
    }
    const props: Record<string, string | number | boolean> = {
      search_id: body.search_id, search_kind: body.search_kind,
      ziiply_environment: request.nextUrl.hostname === "ziiply.fi" || request.nextUrl.hostname === "www.ziiply.fi" ? "production" : "preview",
      ziiply_analytics_schema: 2,
    };
    if (typeof body.outcome === "string" && OUTCOMES.has(body.outcome)) props.outcome = body.outcome;
    for (const key of ["priced_count", "elapsed_ms", "time_to_first_price_ms"]) {
      const n = body[key];
      if (typeof n === "number" && Number.isFinite(n) && n >= 0) props[key] = Math.min(Math.round(n), 3600000);
    }
    const response = await fetch("https://eu.i.posthog.com/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: KEY, event: body.event, distinct_id: "ziiply-search-" + body.search_id, properties: props }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const responseBody = await response.text();
    const accepted = response.ok && !/["']status["']\s*:\s*0/.test(responseBody);
    console.info("[ziiply-search-telemetry]", JSON.stringify({ event: body.event, status: response.status, accepted }));
    return NextResponse.json({ accepted }, { status: accepted ? 200 : 502 });
  } catch (error) {
    console.error("[ziiply-search-telemetry] delivery_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ accepted: false }, { status: 502 });
  }
}

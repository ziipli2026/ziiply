import { NextResponse } from "next/server";

/**
 * Fail-closed boundary for Arvo's sensitive health data.
 * Do not accept a user ID from request body, headers, query or browser storage.
 * Connect this to the application's verified server-side session before enabling
 * consent grants, ingestion, or health-data retrieval.
 */
export async function requireArvoHealthUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  return {
    ok: false,
    response: NextResponse.json(
      { ok: false, code: "AUTH_NOT_CONFIGURED", error: "Terveystietoyhteys ei ole vielä käytettävissä." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    ),
  };
}

export const ARVO_HEALTH_POLICY_VERSION = "draft-2026-10";
export const ARVO_HEALTH_CATEGORIES = [
  "steps", "active_energy", "resting_heart_rate", "hrv", "sleep_stages",
] as const;

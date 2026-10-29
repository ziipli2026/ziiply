import { NextResponse } from "next/server";

// Fail-closed until server-verified authentication, CSRF protection,
// versioned privacy notice and audited Neon consent writes are implemented.
// Never accept user_id or consent state from request JSON as proof.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function disabled() {
  return NextResponse.json(
    { enabled: false, connected: false, consent: "not_available", error: "Terveystietoyhteys ei ole vielä käytössä." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() { return disabled(); }
export async function POST() { return disabled(); }
export async function DELETE() { return disabled(); }

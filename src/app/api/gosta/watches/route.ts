import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server-only beta session lookup. Never accept user_id from caller.
 * The session cookie name MUST match the existing login service before enabling
 * the route in production. No token may be stored in browser localStorage.
 */
async function activeUser(request: Request): Promise<string | null> {
  const cookieName = process.env.ZIIPLY_BETA_SESSION_COOKIE_NAME;
  if (!cookieName || !process.env.DATABASE_URL) return null;
  const cookie = request.headers.get("cookie") || "";
  const encoded = cookie.split(";").map(value => value.trim()).find(value => value.startsWith(cookieName + "="));
  if (!encoded) return null;
  let token: string;
  try { token = decodeURIComponent(encoded.slice(cookieName.length + 1)); } catch { return null; }
  if (!/^[A-Za-z0-9._~-]{24,512}$/.test(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const db = neon(process.env.DATABASE_URL);
  const rows = await db`SELECT s.user_id FROM ziiply_beta_sessions s
    JOIN ziiply_beta_users u ON u.id=s.user_id
    WHERE s.token_hash=${hash} AND s.revoked_at IS NULL AND s.expires_at > now()
    AND u.disabled_at IS NULL LIMIT 1`;
  return rows[0]?.user_id ? String(rows[0].user_id) : null;
}

async function handler(request: Request, method: "GET" | "POST" | "DELETE") {
  if (!process.env.ZIIPLY_BETA_SESSION_COOKIE_NAME || !process.env.DATABASE_URL)
    return NextResponse.json({ ok: false, error: "Account watches unavailable" }, { status: 503 });
  try {
    const userId = await activeUser(request);
    if (!userId) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    const db = neon(process.env.DATABASE_URL);
    if (method === "GET") {
      const rows = await db`SELECT id,query,store_scope,enabled,last_checked_at,matches
        FROM ziiply_gosta_offer_watches WHERE user_id=${userId}::uuid AND enabled=true
        ORDER BY created_at DESC LIMIT 30`;
      return NextResponse.json({ ok: true, watches: rows }, { headers: { "Cache-Control": "private, no-store" } });
    }
    // Require same-origin writes to mitigate cross-site requests from browsers.
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      return NextResponse.json({ ok: false, error: "Origin mismatch" }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    if (method === "POST") {
      const query = typeof body.query === "string" ? body.query.trim() : "";
      if (query.length < 2 || query.length > 120) return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
      const storeScope = Array.isArray(body.storeScope) && body.storeScope.length <= 30 &&
        body.storeScope.every((entry: unknown) => typeof entry === "string" && entry.length < 120) ? body.storeScope : [];
      const count = await db`SELECT COUNT(*)::int AS count FROM ziiply_gosta_offer_watches
        WHERE user_id=${userId}::uuid AND enabled=true`;
      if (Number(count[0]?.count || 0) >= 30) return NextResponse.json({ ok: false, error: "Watch limit reached" }, { status: 409 });
      const rows = await db`INSERT INTO ziiply_gosta_offer_watches (user_id,query,store_scope)
        VALUES (${userId}::uuid,${query},${JSON.stringify(storeScope)}::jsonb)
        RETURNING id,query,store_scope,enabled,last_checked_at,matches`;
      return NextResponse.json({ ok: true, watch: rows[0] }, { status: 201 });
    }
    const id = typeof body.id === "string" && /^[a-f0-9-]{36}$/i.test(body.id) ? body.id : "";
    if (!id) return NextResponse.json({ ok: false, error: "Invalid watch id" }, { status: 400 });
    await db`DELETE FROM ziiply_gosta_offer_watches WHERE id=${id}::uuid AND user_id=${userId}::uuid`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gösta watch API failed", error);
    return NextResponse.json({ ok: false, error: "Watch service unavailable" }, { status: 503 });
  }
}

export async function GET(request: Request) { return handler(request, "GET"); }
export async function POST(request: Request) { return handler(request, "POST"); }
export async function DELETE(request: Request) { return handler(request, "DELETE"); }

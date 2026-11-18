import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const COOKIE_NAME = "__Host-ziiply_beta";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const encoder = new TextEncoder();

function publicPath(pathname: string): boolean {
  // Authentication, enrollment, and public framework assets must remain reachable.
  return pathname === "/beta" ||
    pathname === "/beta/aloitus" ||
    pathname === "/beta/kirjaudu" ||
    pathname.startsWith("/beta/kirjaudu/") ||
    pathname === "/beta/ilmoittaudu" ||
    pathname === "/beta/hallinta" ||
    pathname.startsWith("/beta/hallinta/") ||
    (
      pathname === "/api/beta/register" ||
      pathname === "/api/beta/municipality" ||
      pathname === "/api/beta/login/request" ||
      pathname === "/api/beta/login/verify" ||
      pathname === "/api/beta/login/session" ||
      pathname === "/api/beta/login/status" ||
      pathname === "/api/beta/login/logout" ||
      pathname.startsWith("/api/beta/admin/")
    ) ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/api/cron/");
}

async function authorized(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const url = process.env.DATABASE_URL;
  if (!token || !TOKEN_PATTERN.test(token) || !url) return false;
  try {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const sql = neon(url);
    const rows = await sql`
      SELECT 1 FROM public.ziiply_beta_sessions s
      JOIN public.ziiply_beta_users u ON u.id = s.user_id
      JOIN public.ziiply_beta_applications a ON a.id = u.application_id
      WHERE s.token_hash = ${hash} AND s.revoked_at IS NULL
        AND s.expires_at > now() AND u.disabled_at IS NULL
        AND a.status IN ('invited','active')
      LIMIT 1`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Opt-in only. This flag must be enabled exclusively in the isolated preview
  // after origin/cookie configuration and automated tests have been verified.
  if (process.env.ZIIPLY_BETA_APP_GATE !== "true") return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (publicPath(pathname)) return NextResponse.next();
  if (await authorized(request)) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "BETA_ACCESS_REQUIRED" }, {
      status: 401, headers: { "Cache-Control": "no-store" },
    });
  }
  const login = new URL("/beta/kirjaudu", request.url);
  return NextResponse.redirect(login, { headers: { "Cache-Control": "no-store" } });
}

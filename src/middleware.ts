import { NextRequest, NextResponse } from "next/server";

const MEDIA_COOKIE = "ziiply-media-preview-access";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/media" || pathname.startsWith("/api/media-access") || pathname.startsWith("/_next/") || pathname === "/favicon.ico") return NextResponse.next();
  if (request.cookies.get(MEDIA_COOKIE)?.value === "granted") return NextResponse.next();
  return NextResponse.redirect(new URL("/media", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };

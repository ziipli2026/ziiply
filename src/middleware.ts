import { NextRequest, NextResponse } from "next/server";

const publicRoutes = new Map<string, readonly string[]>([
  ["/tankkaus", ["GET", "HEAD"]],
  ["/api/fuel/stations", ["GET", "HEAD"]],
  ["/api/fuel/photo-learning", ["GET", "POST"]],
  ["/api/fuel/reports", ["POST"]],
]);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "");
  const method = request.method;
  const isRead = method === "GET" || method === "HEAD";

  if (
    publicRoutes.get(pathname)?.includes(method) ||
    (isRead && (pathname.startsWith("/_next/static/") || pathname === "/favicon.ico"))
  ) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", "frame-ancestors 'self' https://ziiply.fi");
    return response;
  }

  return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

import { NextRequest, NextResponse } from "next/server";

const MEDIA_CODES = new Set([
  "K7M4-XP9Q",
  "R2VN-8LKC",
  "N7QK-4X9M",
]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

  if (!MEDIA_CODES.has(code)) return NextResponse.json({ ok: false }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("ziiply-media-preview-access", "granted", {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 60 * 60 * 8,
  });
  return response;
}

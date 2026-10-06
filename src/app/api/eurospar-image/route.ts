import { NextRequest, NextResponse } from "next/server";
import eurosparFeed from "../../../components/ziiply/offerSearch/providers/eurospar-feed.json";

export const dynamic = "force-dynamic";

const allowedImages = new Set(
  (Array.isArray((eurosparFeed as any)?.offers) ? (eurosparFeed as any).offers : [])
    .map((offer: any) => String(offer?.imageUrl || "").trim())
    .filter(Boolean),
);

export async function GET(request: NextRequest) {
  const source = String(request.nextUrl.searchParams.get("src") || "").trim();
  if (!source || !allowedImages.has(source)) {
    return NextResponse.json({ ok: false, error: "Image not allowed" }, { status: 404 });
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid image URL" }, { status: 400 });
  }
  if (url.protocol !== "https:") {
    return NextResponse.json({ ok: false, error: "Invalid image protocol" }, { status: 400 });
  }

  const upstream = await fetch(url, {
    cache: "force-cache",
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8" },
  });
  if (!upstream.ok) {
    return NextResponse.json({ ok: false, error: "Upstream image unavailable" }, { status: 502 });
  }
  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Upstream did not return an image" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

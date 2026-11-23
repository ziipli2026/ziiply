import { NextRequest, NextResponse } from "next/server";
import { hasBetaAccess } from "@/lib/ziiplyBetaAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const guideOrigin = "https://ziiply-protected-guide.vercel.app";
const privateHeaders = { "Cache-Control": "private, no-store" };
const supportImages = new Set(["gosta-original", "gosta-tarjousvahti-dia"]);

function upstreamPath(asset: string[], desktop: boolean): string | undefined {
  if (asset.length === 0) return desktop ? "/ohje/sisalto?versio=desktop" : "/ohje/sisalto";
  if (asset.length === 1 && supportImages.has(asset[0])) return "/ohje/" + asset[0];
  const [kind, name] = asset;
  if (asset.length === 2 && kind === "asset" && /^[a-zA-Z0-9_. -]{1,120}$/.test(name) && !name.includes("..")) {
    return "/api/asset/" + encodeURIComponent(name);
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ asset?: string[] }> }) {
  const { asset = [] } = await params;
  const isPage = asset.length === 0;
  const path = upstreamPath(asset, request.nextUrl.searchParams.get("versio") === "desktop");
  if (!path) return new NextResponse("Not found", { status: 404, headers: privateHeaders });

  if (!(await hasBetaAccess())) {
    if (isPage) return NextResponse.redirect(new URL("/beta/kirjaudu", request.url), { headers: privateHeaders });
    return new NextResponse("Unauthorized", { status: 401, headers: privateHeaders });
  }

  const secret = process.env.ZIIPLY_BETA_GUIDE_PROXY_SECRET;
  if (!secret) return new NextResponse("Käyttöohje ei ole saatavilla.", { status: 503, headers: privateHeaders });

  const upstream = await fetch(guideOrigin + path, {
    cache: "no-store",
    redirect: "manual",
    headers: { "x-ziiply-beta-guide": secret },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);

  const contentType = upstream?.headers.get("content-type") ?? "";
  const expectedType = isPage ? /^text\/html(?:;|$)/i : /^image\/(?:png|jpeg|webp|gif)(?:;|$)/i;
  if (!upstream?.ok || !expectedType.test(contentType)) {
    return new NextResponse("Käyttöohje ei ole saatavilla.", {
      status: upstream?.status === 404 ? 404 : 502,
      headers: privateHeaders,
    });
  }

  const headers = { ...privateHeaders, "Content-Type": contentType, "X-Content-Type-Options": "nosniff" };
  if (!isPage) return new NextResponse(upstream.body, { headers });

  const html = (await upstream.text())
    .replaceAll("/api/asset/", "/beta/ohje/asset/")
    .replaceAll("/ohje/gosta-", "/beta/ohje/gosta-");
  return new NextResponse(html, {
    headers: {
      ...headers,
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
      "Referrer-Policy": "no-referrer",
    },
  });
}

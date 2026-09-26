import { NextResponse } from "next/server";

function cleanText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&aring;/g, "å")
    .replace(/\s+/g, " ")
    .trim();
}

function extractProductName(html: string) {
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        if (entry && typeof entry === "object" && typeof entry.name === "string" &&
            (entry["@type"] === "Product" || String(entry["@type"] || "").includes("Product"))) {
          return cleanText(entry.name);
        }
      }
    } catch {}
  }

  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
             html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og?.[1]) return cleanText(og[1].replace(/\s*\|\s*K-Ruoka.*$/i, ""));

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title?.[1]) return cleanText(title[1].replace(/\s*\|\s*K-Ruoka.*$/i, ""));

  return "";
}

export async function GET(request: Request) {
  const canonicalEan = new URL(request.url).searchParams.get("ean")?.replace(/\D/g, "") || "";
  if (!/^2000\d{9}$/.test(canonicalEan)) {
    return NextResponse.json({ found: false, error: "invalid-canonical-ean" }, { status: 400 });
  }

  const searchUrl = `https://www.k-ruoka.fi/kauppa/tuotehaku?haku=${encodeURIComponent(canonicalEan)}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 Ziiply/1.0",
      },
      cache: "no-store",
      redirect: "follow",
    });
    const html = await response.text();

    const canonicalPathPattern = new RegExp(
      `href=["']([^"']*\\b${canonicalEan.replace(/[.*+?^$()|[\\]{}]/g, "\\$&")}[^"']*)["']`,
      "i",
    );
    const linkMatch = html.match(canonicalPathPattern);

    let productUrl = "";
    if (linkMatch?.[1]) {
      productUrl = new URL(linkMatch[1].replace(/&amp;/g, "&"), "https://www.k-ruoka.fi").toString();
    }

    // Search engines/K-Ruoka often expose canonical product pages directly in result markup.
    // If search redirects straight to a product page, use the final URL.
    if (!productUrl && response.url.includes("/kauppa/tuote/") && response.url.includes(canonicalEan)) {
      productUrl = response.url;
    }

    if (!productUrl) {
      return NextResponse.json({
        found: false,
        canonicalEan,
        source: "k-ruoka",
        searchUrl,
        status: response.status,
      });
    }

    const productResponse = await fetch(productUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 Ziiply/1.0",
      },
      cache: "no-store",
      redirect: "follow",
    });
    const productHtml = await productResponse.text();
    const name = extractProductName(productHtml);

    if (!name) {
      return NextResponse.json({ found: false, canonicalEan, source: "k-ruoka", productUrl });
    }

    return NextResponse.json({
      found: true,
      canonicalEan,
      source: "k-ruoka",
      productUrl,
      product: { id: canonicalEan, ean: canonicalEan, name },
    });
  } catch (error) {
    return NextResponse.json(
      { found: false, canonicalEan, source: "k-ruoka", error: String(error) },
      { status: 502 },
    );
  }
}

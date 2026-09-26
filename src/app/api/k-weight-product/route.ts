import { NextResponse } from "next/server";

type UnknownRecord = Record<string, unknown>;

const K_API = "https://www.k-ruoka.fi/kr-api";
const K_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  "x-k-build-number": "29159",
  "x-k-experiments": "ab4d.10001.0!d2ae.10003.0!a.00145.0!a.00150.0!a.00154.1",
};

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}
function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9åäö]+/gi, " ").replace(/\s+/g, " ").trim();
}
function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter((x): x is UnknownRecord => !!x && typeof x === "object") : [];
}
function getRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}
function productFromResult(result: UnknownRecord): UnknownRecord {
  const nested = getRecord(result.product);
  return Object.keys(nested).length ? nested : result;
}
function eans(product: UnknownRecord) {
  const attrs = getRecord(product.productAttributes);
  return [product.ean, product.baseEan, product.id, attrs.ean].map(digits).filter(Boolean);
}
function finnishName(product: UnknownRecord) {
  const localized = getRecord(product.localizedName);
  const attrs = getRecord(product.productAttributes);
  const label = getRecord(attrs.labelName);
  const marketing = getRecord(attrs.marketingName);
  return String(localized.finnish ?? label.fi ?? marketing.fi ?? "").trim();
}
function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&auml;/g, "ä").replace(/&ouml;/g, "ö").replace(/&aring;/g, "å");
}
async function resolveKaloriIdentity(canonicalEan: string) {
  try {
    const response = await fetch(`https://kalori.info/haku?q=${encodeURIComponent(canonicalEan)}`, {
      headers: { accept: "text/html", "user-agent": "Mozilla/5.0 Ziiply/1.0" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) return null;
    const html = await response.text();
    const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => decodeHtml(String(match[1] ?? "")));
    const exactLink = hrefs.find((href) => href.includes("/kalorit/") && href.includes(`_${canonicalEan}`));
    if (!exactLink) return null;
    const slug = exactLink.split("/kalorit/")[1]?.split("?")[0]?.replace(new RegExp(`_${canonicalEan}$`), "") ?? "";
    if (!slug) return null;
    const name = decodeURIComponent(slug).replace(/-/g, " ").replace(/\s+/g, " ").trim();
    if (!name) return null;
    return name.replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return null;
  }
}
async function resolveStoreId(storeName: string) {
  if (!storeName) return "";
  const response = await fetch(`${K_API}/stores/search`, {
    method: "POST",
    headers: K_HEADERS,
    body: JSON.stringify({ query: storeName, offset: 0, limit: 30 }),
    cache: "no-store",
  });
  if (!response.ok) return "";
  const data = await response.json();
  const candidates = records(Array.isArray(data) ? data : data?.results ?? data?.stores);
  const wanted = normalize(storeName);
  const exact = candidates.find((x) => normalize(x.name) === wanted);
  const chosen = exact ?? (candidates.length === 1 ? candidates[0] : undefined);
  if (!chosen) return "";
  const ids = [chosen.storeId, chosen.id, chosen.branchCode, chosen.externalId]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return ids[0] ?? "";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const canonicalEan = digits(params.get("ean"));
  const storeName = String(params.get("storeName") ?? "").trim();

  if (!/^2000\d{9}$/.test(canonicalEan)) {
    return NextResponse.json({ found: false, error: "invalid-canonical-ean" }, { status: 400 });
  }

  try {
    const storeId = await resolveStoreId(storeName);
    if (storeId) {
      const url = `${K_API}/v2/product-search/${encodeURIComponent(canonicalEan)}?offset=0&language=fi&storeId=${encodeURIComponent(storeId)}&limit=30&discountFilter=false&isTosTrOffer=false`;
      const response = await fetch(url, {
        method: "POST",
        headers: K_HEADERS,
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const resultRows = records(data?.results ?? data?.products ?? data?.items);
        for (const row of resultRows) {
          const product = productFromResult(row);
          if (!eans(product).includes(canonicalEan)) continue;
          const name = finnishName(product);
          if (!name) continue;
          const attrs = getRecord(product.productAttributes);
          const image = getRecord(attrs.image);
          return NextResponse.json({
            found: true,
            canonicalEan,
            source: "k-ruoka-product-search",
            storeId,
            product: {
              id: canonicalEan,
              ean: canonicalEan,
              name,
              brandName: String(getRecord(product.brand).name ?? "") || undefined,
              pictureUrl: String(image.url ?? records(product.images)[0] ?? "") || undefined,
            },
          });
        }
      }
    }

    // Identity-only fallback: Ruoanhinta without store/price filtering.
    const fallbackUrl = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(canonicalEan)}&skip=0&take=30`;
    const fallback = await fetch(fallbackUrl, { headers: { accept: "application/json" }, cache: "no-store" });
    if (fallback.ok) {
      const data = await fallback.json();
      const items = records(data?.items);
      for (const item of items) {
        const itemEans = [item.ean, item.gtin, item.eanCode, item.barcode, item.externalId].map(digits);
        if (!itemEans.includes(canonicalEan) || !item.name) continue;
        return NextResponse.json({
          found: true, canonicalEan, source: "ruoanhinta-identity",
          product: { id: item.id, ean: canonicalEan, name: String(item.name) },
        });
      }
    }

    // Kalori.info supports exact canonical EAN search. Identity only: never use its price.
    const kaloriName = await resolveKaloriIdentity(canonicalEan);
    if (kaloriName) {
      return NextResponse.json({
        found: true,
        canonicalEan,
        source: "kalori-ean-search",
        product: { id: canonicalEan, ean: canonicalEan, name: kaloriName },
      });
    }

    // Other public canonical-EAN identity fallback. Identity only: never use price/availability.
    const publicSources = [
      `https://prices.nedostavka.net/fi/product/${canonicalEan}`,
    ];
    for (const publicUrl of publicSources) {
      try {
        const publicResponse = await fetch(publicUrl, {
          headers: { accept: "text/html", "user-agent": "Mozilla/5.0 Ziiply/1.0" },
          cache: "no-store",
          redirect: "follow",
        });
        if (!publicResponse.ok) continue;
        const html = await publicResponse.text();
        if (!html.includes(canonicalEan)) continue;
        const titleMatch =
          html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
          html.match(/<title[^>]*>([^<]+)<\/title>/i) ??
          html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const rawTitle = decodeHtml(String(titleMatch?.[1] ?? "")).trim();
        const name = rawTitle
          .replace(/\s*[–|-]\s*(Ravintosisältö.*|Kalorit.*|hinta eri maissa.*)$/i, "")
          .trim();
        if (!name || name === canonicalEan) continue;
        return NextResponse.json({
          found: true,
          canonicalEan,
          source: "public-canonical-identity",
          product: { id: canonicalEan, ean: canonicalEan, name },
        });
      } catch { }
    }

    return NextResponse.json({
      found: false,
      canonicalEan,
      source: "identity-chain",
      storeName,
      storeId,
      diagnostic: "No exact canonical identity returned",
    });
  } catch (error) {
    return NextResponse.json({ found: false, canonicalEan, error: String(error) }, { status: 502 });
  }
}

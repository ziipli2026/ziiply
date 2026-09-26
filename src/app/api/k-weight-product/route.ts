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
  return String(chosen?.id ?? chosen?.branchCode ?? "").trim();
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

    return NextResponse.json({ found: false, canonicalEan, source: "k-ruoka-product-search", storeId });
  } catch (error) {
    return NextResponse.json({ found: false, canonicalEan, error: String(error) }, { status: 502 });
  }
}

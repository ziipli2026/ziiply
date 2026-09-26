import { NextResponse } from "next/server";

type IdentityProduct = {
  id?: number | string;
  name?: string;
  ean?: string;
  gtin?: string;
  eanCode?: string;
  barcode?: string;
  externalId?: string;
  brandName?: string;
  pictureUrl?: string;
};

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function productEans(product: IdentityProduct) {
  return [product.ean, product.gtin, product.eanCode, product.barcode, product.externalId]
    .map(digits)
    .filter(Boolean);
}

function fixEncoding(value: string) {
  return value
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¥/g, "å")
    .replace(/â„¢/g, "")
    .replace(/Â/g, "")
    .trim();
}

export async function GET(request: Request) {
  const canonicalEan = digits(new URL(request.url).searchParams.get("ean"));
  if (!/^2000\d{9}$/.test(canonicalEan)) {
    return NextResponse.json({ found: false, error: "invalid-canonical-ean" }, { status: 400 });
  }

  const endpoint =
    `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(canonicalEan)}&skip=0&take=30`;

  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json(
        { found: false, canonicalEan, source: "ruoanhinta-identity", status: response.status },
        { status: 502 },
      );
    }

    const data = await response.json();
    const items: IdentityProduct[] = Array.isArray(data?.items) ? data.items : [];
    const exact = items.find((product) => productEans(product).includes(canonicalEan));

    if (!exact?.name) {
      return NextResponse.json({
        found: false,
        canonicalEan,
        source: "ruoanhinta-identity",
        candidates: items.length,
      });
    }

    return NextResponse.json({
      found: true,
      canonicalEan,
      source: "ruoanhinta-identity",
      product: {
        id: exact.id,
        ean: canonicalEan,
        name: fixEncoding(exact.name),
        brandName: exact.brandName ? fixEncoding(exact.brandName) : undefined,
        pictureUrl: exact.pictureUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { found: false, canonicalEan, source: "ruoanhinta-identity", error: String(error) },
      { status: 502 },
    );
  }
}

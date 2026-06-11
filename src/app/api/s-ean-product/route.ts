import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const S_EAN_HASH =
  "9a0f8fccb697df461e462d3f4192076dd02de0646755e392a8e547ec60815dcb";

function normalizeEan(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function getPrice(product: any) {
  return Number(
    product?.price ??
      product?.pricing?.currentPrice ??
      product?.pricing?.regularPrice ??
      0
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const ean = normalizeEan(searchParams.get("ean"));
    const storeId = String(searchParams.get("storeId") || "708276035").trim();

    if (!ean) {
      return NextResponse.json(
        { ok: false, error: "EAN missing" },
        { status: 400 }
      );
    }

    const variables = {
      storeId,
      eans: [],
      limit: 12,
      focusOnEan: ean,
    };

    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: S_EAN_HASH,
      },
    };

    const url = new URL("https://api.s-kaupat.fi/");
    url.searchParams.set("operationName", "RemoteComplementaryProducts");
    url.searchParams.set("variables", JSON.stringify(variables));
    url.searchParams.set("extensions", JSON.stringify(extensions));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "accept-language": "fi-FI,fi;q=0.9,en;q=0.8",
        "user-agent": "Mozilla/5.0 Ziiply/1.0",
        origin: "https://www.s-kaupat.fi",
        referer: "https://www.s-kaupat.fi/",
      },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    const products: any[] = payload?.data?.complementaryProducts || [];

    const exact = products.find((p) => normalizeEan(p?.ean || p?.id) === ean);
    const price = getPrice(exact);

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          source: "s-kaupat-focusOnEan",
          status: response.status,
          ean,
          storeId,
          error: payload?.errors?.[0]?.message || "S-kaupat request failed",
          details: payload?.errors || null,
        },
        { status: response.status }
      );
    }

    if (!exact || price <= 0) {
      return NextResponse.json({
        ok: true,
        source: "s-kaupat-focusOnEan",
        found: false,
        ean,
        storeId,
        candidateCount: products.length,
        firstCandidate: products[0]
          ? {
              ean: products[0].ean,
              name: products[0].name,
              price: getPrice(products[0]),
            }
          : null,
      });
    }

    return NextResponse.json({
      ok: true,
      source: "s-kaupat-focusOnEan",
      found: true,
      ean,
      storeId,
      product: {
        id: exact.id || exact.ean,
        ean: exact.ean || ean,
        name: exact.name,
        brandName: exact.brandName || null,
        pictureUrl:
          exact?.productDetails?.productImages?.[0]?.url ||
          exact?.productDetails?.productImages?.[0]?.mediumUrl ||
          exact?.productDetails?.productImages?.[0]?.smallUrl ||
          exact?.image ||
          "",
        price,
        comparisonPrice: Number(
          exact?.comparisonPrice ?? exact?.pricing?.comparisonPrice ?? 0
        ),
        comparisonPriceUnit:
          exact?.comparisonUnit ||
          exact?.pricing?.comparisonUnit ||
          null,
        storeId,
        storeName: "S-kaupat",
      },
      debug: {
        candidateCount: products.length,
        firstCandidate: products[0]
          ? {
              ean: products[0].ean,
              name: products[0].name,
              price: getPrice(products[0]),
            }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

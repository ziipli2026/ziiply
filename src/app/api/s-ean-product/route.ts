import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const COMPLEMENTARY_HASH =
  "9a0f8fccb697df461e462d3f4192076dd02de0646755e392a8e547ec60815dcb";

const FILTERED_HASH =
  "44ca017dddccfe49e787b483f471f26217adca807f8c71101d11e881dab9e480";

function normalizeEan(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function fixText(value?: string | null) {
  return String(value || "")
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¥/g, "å")
    .replace(/Â/g, "")
    .trim();
}

function getPrice(product: any) {
  return Number(
    product?.price ??
      product?.pricing?.currentPrice ??
      product?.pricing?.regularPrice ??
      0
  );
}

function getImage(product: any) {
  const main = product?.productDetails?.productImages?.mainImage;
  const template = main?.urlTemplate;

  if (template) {
    return String(template)
      .replace("{MODIFIERS}", "w_400,h_400,c_pad")
      .replace("{EXTENSION}", "jpg");
  }

  return product?.pictureUrl || product?.image || "";
}

function toProduct(product: any, ean: string, storeId: string) {
  const price = getPrice(product);

  return {
    id: product?.id || product?.ean || ean,
    ean: product?.ean || ean,
    name: fixText(product?.name),
    brandName: fixText(product?.brandName || ""),
    pictureUrl: getImage(product),
    price,
    comparisonPrice: Number(
      product?.comparisonPrice ?? product?.pricing?.comparisonPrice ?? 0
    ),
    comparisonPriceUnit:
      product?.comparisonUnit ||
      product?.pricing?.comparisonUnit ||
      null,
    storeId,
    storeName: "S-kaupat",
  };
}

async function fetchSGraphql(operationName: string, variables: any, hash: string) {
  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: hash,
    },
  };

  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", operationName);
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

  return {
    ok: response.ok,
    status: response.status,
    payload,
    url: url.toString(),
  };
}

function findExactFromProducts(products: any[], ean: string) {
  return products.find((p) => normalizeEan(p?.ean || p?.id) === ean) || null;
}

function getFilteredProducts(payload: any): any[] {
  const items = payload?.data?.store?.products?.productListItems || [];
  return items.map((item: any) => item?.product).filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const ean = normalizeEan(searchParams.get("ean"));
    const storeId = String(searchParams.get("storeId") || "708276035").trim();
    const nameHint = fixText(searchParams.get("name") || "");

    if (!ean) {
      return NextResponse.json(
        { ok: false, error: "EAN missing" },
        { status: 400 }
      );
    }

    const debug: any[] = [];

    const complementary = await fetchSGraphql(
      "RemoteComplementaryProducts",
      {
        storeId,
        eans: [],
        limit: 12,
        focusOnEan: ean,
      },
      COMPLEMENTARY_HASH
    );

    const complementaryProducts =
      complementary.payload?.data?.complementaryProducts || [];

    const exactComplementary = findExactFromProducts(complementaryProducts, ean);
    debug.push({
      step: "RemoteComplementaryProducts",
      status: complementary.status,
      count: complementaryProducts.length,
      exact: Boolean(exactComplementary),
      first: complementaryProducts[0]
        ? {
            ean: complementaryProducts[0].ean,
            name: fixText(complementaryProducts[0].name),
            price: getPrice(complementaryProducts[0]),
          }
        : null,
    });

    if (exactComplementary && getPrice(exactComplementary) > 0) {
      return NextResponse.json({
        ok: true,
        source: "s-kaupat-ean",
        found: true,
        ean,
        storeId,
        product: toProduct(exactComplementary, ean, storeId),
        debug,
      });
    }

    const searchTerms = Array.from(
      new Set(
        [
          nameHint,
          nameHint.replace(/\bcoop\b/i, "Coop"),
          nameHint.replace(/pääryna/gi, "päärynä"),
          nameHint.replace(/paaryna/gi, "päärynä"),
        ]
          .map((x) => fixText(x))
          .filter((x) => x.length >= 3)
      )
    );

    for (const term of searchTerms) {
      const filtered = await fetchSGraphql(
        "RemoteFilteredProducts",
        {
          generatedSessionId: "ziiply-ean",
          limit: 48,
          order: "desc",
          orderBy: "score",
          queryString: term,
          slug: "",
          storeId,
          useRandomId: false,
          marketingId: "ziiply-ean",
        },
        FILTERED_HASH
      );

      const products = getFilteredProducts(filtered.payload);
      const exact = findExactFromProducts(products, ean);

      debug.push({
        step: "RemoteFilteredProducts",
        term,
        status: filtered.status,
        count: products.length,
        exact: Boolean(exact),
        first: products[0]
          ? {
              ean: products[0].ean,
              name: fixText(products[0].name),
              price: getPrice(products[0]),
            }
          : null,
      });

      if (exact && getPrice(exact) > 0) {
        return NextResponse.json({
          ok: true,
          source: "s-kaupat-name-search-exact-ean",
          found: true,
          ean,
          storeId,
          product: toProduct(exact, ean, storeId),
          debug,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      source: "s-kaupat-ean",
      found: false,
      ean,
      storeId,
      debug,
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

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
    .replace(/\s+/g, " ")
    .trim();
}

function getPrice(product: any) {
  return Number(
    product?.price ??
      product?.pricing?.currentPrice ??
      product?.pricing?.regularPrice ??
      product?.storeItem?.price ??
      product?.storeItems?.[0]?.price ??
      0
  );
}

function getComparisonPrice(product: any) {
  return Number(
    product?.comparisonPrice ??
      product?.pricing?.comparisonPrice ??
      product?.storeItem?.comparisonPrice ??
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

  return (
    product?.pictureUrl ||
    product?.image ||
    product?.productDetails?.productImages?.[0]?.url ||
    product?.productDetails?.productImages?.[0]?.mediumUrl ||
    product?.productDetails?.productImages?.[0]?.smallUrl ||
    ""
  );
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
    comparisonPrice: getComparisonPrice(product),
    comparisonPriceUnit:
      product?.comparisonUnit ||
      product?.pricing?.comparisonUnit ||
      product?.storeItem?.comparisonPriceUnit ||
      null,
    storeId,
    storeName: "S-kaupat",
    rawSource: "api.s-kaupat.fi",
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
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      origin: "https://www.s-kaupat.fi",
      referer: "https://www.s-kaupat.fi/",
    },
    cache: "no-store",
  });

  const text = await response.text();

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { rawText: text.slice(0, 3000) };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
    url: url.toString(),
    rawTextStart: text.slice(0, 1200),
  };
}

function findExactFromProducts(products: any[], ean: string) {
  return products.find((p) => normalizeEan(p?.ean || p?.id) === ean) || null;
}

function getFilteredProducts(payload: any): any[] {
  const items =
    payload?.data?.store?.products?.productListItems ||
    payload?.data?.store?.products?.items ||
    payload?.data?.products?.productListItems ||
    payload?.data?.products?.items ||
    [];

  return items
    .map((item: any) => item?.product || item)
    .filter(Boolean);
}

function summarizeProduct(product: any) {
  if (!product) return null;

  return {
    id: product?.id ?? null,
    ean: product?.ean ?? null,
    name: fixText(product?.name),
    brandName: fixText(product?.brandName || ""),
    price: getPrice(product),
    comparisonPrice: getComparisonPrice(product),
    keys:
      product && typeof product === "object"
        ? Object.keys(product).slice(0, 30)
        : [],
  };
}

function summarizeProducts(products: any[], limit = 8) {
  return products.slice(0, limit).map(summarizeProduct);
}

function collectDeepProducts(value: any): any[] {
  const found: any[] = [];
  const seen = new Set<any>();

  const walk = (node: any) => {
    if (!node || seen.has(node)) return;

    if (typeof node === "object") seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (typeof node === "object") {
      const maybeName =
        node.name ||
        node.productName ||
        node.title ||
        node.localizedName ||
        node.displayName;

      const maybeEan = node.ean || node.gtin || node.barcode || node.id;
      const maybePrice =
        node.price ||
        node.pricing ||
        node.currentPrice ||
        node.storeItem ||
        node.storeItems;

      if (maybeName || maybeEan || maybePrice) {
        const keys = Object.keys(node);
        const looksLikeProduct =
          keys.includes("name") ||
          keys.includes("ean") ||
          keys.includes("brandName") ||
          keys.includes("pricing") ||
          keys.includes("price");

        if (looksLikeProduct) found.push(node);
      }

      for (const child of Object.values(node)) walk(child);
    }
  };

  walk(value);

  return found;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const ean = normalizeEan(searchParams.get("ean"));
    const storeId = String(searchParams.get("storeId") || "708276035").trim();
    const nameHint = fixText(searchParams.get("name") || "");
    const rawDebug = searchParams.get("raw") === "1";

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

    const complementaryDeepProducts = collectDeepProducts(complementary.payload);
    const exactComplementary =
      findExactFromProducts(complementaryProducts, ean) ||
      findExactFromProducts(complementaryDeepProducts, ean);

    debug.push({
      step: "RemoteComplementaryProducts",
      status: complementary.status,
      ok: complementary.ok,
      count: complementaryProducts.length,
      deepCount: complementaryDeepProducts.length,
      exact: Boolean(exactComplementary),
      errors: complementary.payload?.errors || null,
      dataKeys:
        complementary.payload?.data && typeof complementary.payload.data === "object"
          ? Object.keys(complementary.payload.data)
          : [],
      firstProducts: summarizeProducts(complementaryProducts, 6),
      firstDeepProducts: summarizeProducts(complementaryDeepProducts, 6),
      url: rawDebug ? complementary.url : undefined,
      rawTextStart: rawDebug ? complementary.rawTextStart : undefined,
    });

    if (exactComplementary && getPrice(exactComplementary) > 0) {
      return NextResponse.json({
        ok: true,
        source: "s-kaupat-ean-complementary-exact",
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
          nameHint.replace(/juotava jogurtti/gi, "juotava jogurtti"),
          nameHint.replace(/500\s*g/gi, ""),
          "Coop juotava jogurtti",
          "Coop päärynä jogurtti",
          "Coop päärynä",
        ]
          .map((x) => fixText(x))
          .filter((x) => x.length >= 3)
      )
    );

    for (const term of searchTerms) {
      const filtered = await fetchSGraphql(
        "RemoteFilteredProducts",
        {
          generatedSessionId: "ziiply-ean-debug",
          limit: 48,
          order: "desc",
          orderBy: "score",
          queryString: term,
          slug: "",
          storeId,
          useRandomId: false,
          marketingId: "ziiply-ean-debug",
        },
        FILTERED_HASH
      );

      const products = getFilteredProducts(filtered.payload);
      const deepProducts = collectDeepProducts(filtered.payload);
      const exact =
        findExactFromProducts(products, ean) ||
        findExactFromProducts(deepProducts, ean);

      debug.push({
        step: "RemoteFilteredProducts",
        term,
        status: filtered.status,
        ok: filtered.ok,
        count: products.length,
        deepCount: deepProducts.length,
        exact: Boolean(exact),
        errors: filtered.payload?.errors || null,
        dataKeys:
          filtered.payload?.data && typeof filtered.payload.data === "object"
            ? Object.keys(filtered.payload.data)
            : [],
        firstProducts: summarizeProducts(products, 8),
        firstDeepProducts: summarizeProducts(deepProducts, 8),
        url: rawDebug ? filtered.url : undefined,
        rawTextStart: rawDebug ? filtered.rawTextStart : undefined,
      });

      if (exact && getPrice(exact) > 0) {
        return NextResponse.json({
          ok: true,
          source: "s-kaupat-filtered-exact",
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
      source: "s-kaupat-ean-debug",
      found: false,
      ean,
      storeId,
      nameHint,
      debug,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unknown error",
        stack:
          typeof error?.stack === "string"
            ? error.stack.split("\n").slice(0, 5)
            : undefined,
      },
      { status: 500 }
    );
  }
}

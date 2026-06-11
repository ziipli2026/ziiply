import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FILTERED_HASH =
  "44ca017dddccfe49e787b483f471f26217adca807f8c71101d11e881dab9e480";

const COMPLEMENTARY_HASH =
  "9a0f8fccb697df461e462d3f4192076dd02de0646755e392a8e547ec60815dcb";

const BROAD_SLUGS = [
  "",
  "maito-munat-ja-rasvat",
  "maito-munat-ja-rasvat/jogurtit",
  "maito-munat-ja-rasvat/jogurtit/juotavat-jogurtit",
  "maito-munat-ja-rasvat/rasvat",
  "maito-munat-ja-rasvat/maidot-ja-piimat",
  "liha-ja-kala",
  "liha-ja-kala/makkarat",
  "leivat-ja-leivonnaiset",
  "leivat-ja-leivonnaiset/ruokaleivat",
  "juomat",
  "juomat/kahvit",
];

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
      0,
  );
}

function getComparisonPrice(product: any) {
  return Number(
    product?.comparisonPrice ??
      product?.pricing?.comparisonPrice ??
      product?.storeItem?.comparisonPrice ??
      0,
  );
}

function getImage(product: any) {
  const template = product?.productDetails?.productImages?.mainImage?.urlTemplate;

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
  return {
    id: product?.id || product?.ean || ean,
    ean: product?.ean || ean,
    name: fixText(product?.name),
    brandName: fixText(product?.brandName || ""),
    pictureUrl: getImage(product),
    price: getPrice(product),
    comparisonPrice: getComparisonPrice(product),
    comparisonPriceUnit:
      product?.comparisonUnit ||
      product?.pricing?.comparisonUnit ||
      product?.storeItem?.comparisonPriceUnit ||
      null,
    storeId,
    storeName: "S-kaupat",
    rawSource: product?.rawSource || "api.s-kaupat.fi",
  };
}

async function fetchSGraphql(operationName: string, variables: any, hash: string) {
  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", operationName);
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set(
    "extensions",
    JSON.stringify({
      persistedQuery: { version: 1, sha256Hash: hash },
    }),
  );

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
    payload = { rawText: text.slice(0, 2500) };
  }

  return { ok: response.ok, status: response.status, payload, url: url.toString() };
}

function getFilteredProducts(payload: any): any[] {
  const items =
    payload?.data?.store?.products?.productListItems ||
    payload?.data?.store?.products?.items ||
    payload?.data?.products?.productListItems ||
    payload?.data?.products?.items ||
    [];

  return items.map((item: any) => item?.product || item).filter(Boolean);
}

function flattenProducts(payload: any): any[] {
  if (Array.isArray(payload)) return payload;

  const candidates =
    payload?.products ||
    payload?.items ||
    payload?.results ||
    payload?.data ||
    payload?.data?.products ||
    payload?.data?.items ||
    [];

  if (Array.isArray(candidates)) {
    return candidates.map((x: any) => x?.product || x).filter(Boolean);
  }

  return [];
}

function findExact(products: any[], ean: string) {
  return products.find((p) => normalizeEan(p?.ean || p?.id) === ean) || null;
}

function summarize(product: any) {
  if (!product) return null;
  return {
    id: product?.id ?? null,
    ean: product?.ean ?? null,
    name: fixText(product?.name),
    brandName: fixText(product?.brandName || ""),
    price: getPrice(product),
    comparisonPrice: getComparisonPrice(product),
  };
}

function buildQueries(nameHint: string, ean: string) {
  const terms = new Set<string>();
  const cleaned = fixText(nameHint);

  if (cleaned.length >= 3) {
    terms.add(cleaned);

    const noSize = cleaned
      .replace(/\b\d+\s*(g|kg|ml|l|dl)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (noSize.length >= 3) terms.add(noSize);

    const words = noSize.split(/\s+/).filter((x) => x.length >= 3);
    if (words.length >= 2) terms.add(words.slice(0, 3).join(" "));
    if (words.length >= 1) terms.add(words[0]);

    const normalized = cleaned
      .replace(/pääryna/gi, "päärynä")
      .replace(/paaryna/gi, "päärynä")
      .replace(/\bcoop\b/gi, "Coop")
      .trim();

    if (normalized.length >= 3) terms.add(normalized);
  }

  terms.add(ean);

  if (/jogur/i.test(cleaned)) {
    terms.add("Coop juotava jogurtti");
    terms.add("Coop päärynä");
    terms.add("juotava jogurtti");
  }

  if (/wilhelm|makkara|atria/i.test(cleaned)) {
    terms.add("Wilhelm");
    terms.add("Atria Wilhelm");
    terms.add("makkara");
  }

  if (/oivariini|voi|rasva/i.test(cleaned)) {
    terms.add("Oivariini");
    terms.add("Valio Oivariini");
    terms.add("rasva");
  }

  if (/piimä|piima|maito/i.test(cleaned)) {
    terms.add("piimä");
    terms.add("maito");
  }

  if (/leipä|leipa|voileipä|voileipa/i.test(cleaned)) {
    terms.add("Coop voileipä");
    terms.add("voileipä");
    terms.add("leipä");
  }

  terms.add("");

  return Array.from(terms);
}

async function tryFilteredExact(args: {
  ean: string;
  storeId: string;
  slug: string;
  queryString: string;
}) {
  const result = await fetchSGraphql(
    "RemoteFilteredProducts",
    {
      generatedSessionId: crypto.randomUUID(),
      limit: 96,
      order: "desc",
      orderBy: "score",
      queryString: args.queryString,
      slug: args.slug,
      storeId: args.storeId,
      useRandomId: false,
      marketingId: crypto.randomUUID(),
    },
    FILTERED_HASH,
  );

  const products = getFilteredProducts(result.payload);
  const exact = findExact(products, args.ean);

  return { ...result, products, exact };
}

async function tryInternalSProductsExact(args: {
  origin: string;
  ean: string;
  storeId: string;
  queryString: string;
}) {
  const url = new URL("/api/s-products", args.origin);
  url.searchParams.set("search", args.queryString);
  url.searchParams.set("store", args.storeId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  const products = flattenProducts(payload);
  const exact = findExact(products, args.ean);

  return {
    ok: response.ok,
    status: response.status,
    payload,
    products,
    exact,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const ean = normalizeEan(searchParams.get("ean"));
    const storeId = String(searchParams.get("storeId") || "708276035").trim();
    const nameHint = fixText(searchParams.get("name") || "");
    const origin = new URL(request.url).origin;

    if (!ean) {
      return NextResponse.json({ ok: false, error: "EAN missing" }, { status: 400 });
    }

    const debug: any[] = [];
    const queries = buildQueries(nameHint, ean);

    // 1. S-kaupat GraphQL kategoriat, laajennettu.
    for (const slug of BROAD_SLUGS) {
      for (const queryString of queries) {
        const filtered = await tryFilteredExact({ ean, storeId, slug, queryString });

        debug.push({
          step: "RemoteFilteredProducts",
          slug,
          queryString,
          status: filtered.status,
          ok: filtered.ok,
          count: filtered.products.length,
          exact: Boolean(filtered.exact),
          first: summarize(filtered.products[0]),
          errors: filtered.payload?.errors || null,
        });

        if (filtered.exact && getPrice(filtered.exact) > 0) {
          return NextResponse.json({
            ok: true,
            source: "s-kaupat-filtered-broad-exact",
            found: true,
            ean,
            storeId,
            product: toProduct(filtered.exact, ean, storeId),
            debug,
          });
        }
      }
    }

    // 2. Sama sisäinen /api/s-products-polku kuin käsinhaussa.
    for (const queryString of queries.filter((q) => q.length >= 1)) {
      const internal = await tryInternalSProductsExact({
        origin,
        ean,
        storeId,
        queryString,
      });

      debug.push({
        step: "InternalApiSProducts",
        queryString,
        storeId,
        status: internal.status,
        ok: internal.ok,
        count: internal.products.length,
        exact: Boolean(internal.exact),
        first: summarize(internal.products[0]),
      });

      if (internal.exact && getPrice(internal.exact) > 0) {
        return NextResponse.json({
          ok: true,
          source: "internal-s-products-exact-ean",
          found: true,
          ean,
          storeId,
          product: toProduct(
            { ...internal.exact, rawSource: "internal-/api/s-products" },
            ean,
            storeId,
          ),
          debug,
        });
      }
    }

    // 3. Complementary vain viimeiseksi tarkistukseksi, ei hyväksytä väärää tuotetta.
    const complementary = await fetchSGraphql(
      "RemoteComplementaryProducts",
      {
        storeId,
        eans: [],
        limit: 12,
        focusOnEan: ean,
      },
      COMPLEMENTARY_HASH,
    );

    const complementaryProducts =
      complementary.payload?.data?.complementaryProducts || [];
    const exactComplementary = findExact(complementaryProducts, ean);

    debug.push({
      step: "RemoteComplementaryProducts",
      status: complementary.status,
      ok: complementary.ok,
      count: complementaryProducts.length,
      exact: Boolean(exactComplementary),
      first: summarize(complementaryProducts[0]),
      errors: complementary.payload?.errors || null,
    });

    if (exactComplementary && getPrice(exactComplementary) > 0) {
      return NextResponse.json({
        ok: true,
        source: "s-kaupat-complementary-exact",
        found: true,
        ean,
        storeId,
        product: toProduct(exactComplementary, ean, storeId),
        debug,
      });
    }

    return NextResponse.json({
      ok: true,
      source: "s-kaupat-broad-or-internal-exact",
      found: false,
      ean,
      storeId,
      nameHint,
      checkedSlugs: BROAD_SLUGS,
      checkedQueries: queries,
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
      { status: 500 },
    );
  }
}

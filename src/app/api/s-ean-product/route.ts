// V6_EAN_ROUTE_FAST_INTERNAL_EGGS_AND_CHEESE_ALWAYS_REVISION_VISIBLE
// Korjaus V5:n päälle:
// - Juustot eivät löytyneet luotettavasti, jos OFF/nameHint puuttui tai oli englanniksi/eri muodossa.
// - Lisätty juusto/cheddar/viipalejuusto AINA nopeisiin /api/s-products-hakutermeihin, myös tyhjällä nameHintillä.
// - Lisätty useampi S-kaupat GraphQL -juustoslug fallbackiin.
// - Kananmunien V5-korjaus säilyy.
// - /api/s-products sisäinen nimihaku ajetaan edelleen ENSIN.
// - Hyväksytään edelleen vain exact EAN + price > 0.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FILTERED_HASH =
  "44ca017dddccfe49e787b483f471f26217adca807f8c71101d11e881dab9e480";

const COMPLEMENTARY_HASH =
  "9a0f8fccb697df461e462d3f4192076dd02de0646755e392a8e547ec60815dcb";

const BROAD_SLUGS = [
  "",
  "maito-munat-ja-rasvat",
  "maito-munat-ja-rasvat/kananmunat",
  "maito-munat-ja-rasvat/munat",
  "maito-munat-ja-rasvat/jogurtit",
  "maito-munat-ja-rasvat/jogurtit/juotavat-jogurtit",
  "maito-munat-ja-rasvat/rasvat",
  "maito-munat-ja-rasvat/maidot-ja-piimat",
  "maito-munat-ja-rasvat/juustot",
  "maito-munat-ja-rasvat/juustot/viipalejuustot",
  "maito-munat-ja-rasvat/juustot/ruokajuustot",
  "maito-munat-ja-rasvat/juustot/juustoviipaleet",
  "juustot",
  "juustot/viipalejuustot",
  "juustot/ruokajuustot",
  "liha-ja-kala",
  "liha-ja-kala/makkarat",
  "leivat-ja-leivonnaiset",
  "leivat-ja-leivonnaiset/ruokaleivat",
  "juomat",
  "juomat/kahvit",
];

const ALWAYS_FAST_TERMS = [
  // Nämä ajetaan myös silloin, kun OFF ei anna nimeä.
  // EAN ei yleensä toimi hakusanana /api/s-productsissa,
  // mutta käsinhaun tapaiset sanat toimivat nopeasti.
  "kananmuna",
  "kananmunat",
  "munat",
  "juusto",
  "juustot",
  "viipalejuusto",
  "cheddar",
  "burger slices",
  "burger slices cheddar",
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
      .replace(/\b\d+\s*(kpl|pack|pkt|g|kg|ml|l|dl)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (noSize.length >= 3) terms.add(noSize);

    const words = noSize.split(/\s+/).filter((x) => x.length >= 3);
    if (words.length >= 3) terms.add(words.slice(0, 3).join(" "));
    if (words.length >= 2) terms.add(words.slice(0, 2).join(" "));
    if (words.length >= 1) terms.add(words[0]);

    const normalized = cleaned
      .replace(/pääryna/gi, "päärynä")
      .replace(/paaryna/gi, "päärynä")
      .replace(/\bcoop\b/gi, "Coop")
      .trim();

    if (normalized.length >= 3) terms.add(normalized);
  }

  // Tuotenimellä ohjatut lisätermit
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

  if (/juusto|cheddar|edam|gouda|burger slices|slices|cheese/i.test(cleaned)) {
    terms.add("juusto");
    terms.add("juustot");
    terms.add("cheddar");
    terms.add("viipalejuusto");
    terms.add("burger slices");
    terms.add("burger slices cheddar");
  }

  if (/kananmuna|kananmunat|munia|muna|egg/i.test(cleaned)) {
    terms.add("kananmuna");
    terms.add("kananmunat");
    terms.add("munat");
  }

  // Tämä on olennainen V5-korjaus:
  // Jos OFF/nameHint on tyhjä tai huono, kokeillaan silti kananmunien käsinhaun termejä.
  for (const term of ALWAYS_FAST_TERMS) terms.add(term);

  // EAN viimeiseksi: useimmiten /api/s-products ei löydä EANilla, mutta pidetään debug-varana.
  terms.add(ean);

  return Array.from(terms).filter(Boolean);
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const ean = normalizeEan(searchParams.get("ean"));
    const storeId = String(searchParams.get("storeId") || "708276035").trim();
    const nameHint = fixText(searchParams.get("name") || "");
    const origin = new URL(request.url).origin;
    const debugEnabled = searchParams.get("debug") === "1";

    if (!ean) {
      return NextResponse.json({ ok: false, error: "EAN missing" }, { status: 400 });
    }

    const debug: any[] = [];
    const queries = buildQueries(nameHint, ean);

    // 1) NOPEA ENSISIJAINEN POLKU:
    // Sama /api/s-products-nimihaku kuin käsinhaussa.
    // Hyväksy vain exact EAN + hinta.
    for (const queryString of queries) {
      const internal = await tryInternalSProductsExact({
        origin,
        ean,
        storeId,
        queryString,
      });

      if (debugEnabled) {
        debug.push({
          step: "InternalApiSProductsFastFirst",
          queryString,
          storeId,
          status: internal.status,
          ok: internal.ok,
          count: internal.products.length,
          exact: Boolean(internal.exact),
          first: summarize(internal.products[0]),
        });
      }

      if (internal.exact && getPrice(internal.exact) > 0) {
        return NextResponse.json({
          ok: true,
          source: "internal-s-products-fast-exact-ean-v6",
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

    // 2) GraphQL-kategoriat vasta varalla.
    for (const slug of BROAD_SLUGS) {
      for (const queryString of queries) {
        const filtered = await tryFilteredExact({ ean, storeId, slug, queryString });

        if (debugEnabled) {
          debug.push({
            step: "RemoteFilteredProductsFallback",
            slug,
            queryString,
            status: filtered.status,
            ok: filtered.ok,
            count: filtered.products.length,
            exact: Boolean(filtered.exact),
            first: summarize(filtered.products[0]),
            errors: filtered.payload?.errors || null,
          });
        }

        if (filtered.exact && getPrice(filtered.exact) > 0) {
          return NextResponse.json({
            ok: true,
            source: "s-kaupat-filtered-fallback-exact-v6",
            found: true,
            ean,
            storeId,
            product: toProduct(filtered.exact, ean, storeId),
            debug,
          });
        }
      }
    }

    // 3) Complementary vain viimeiseksi. Ei saa hyväksyä väärää tuotetta.
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

    if (debugEnabled) {
      debug.push({
        step: "RemoteComplementaryProductsLast",
        status: complementary.status,
        ok: complementary.ok,
        count: complementaryProducts.length,
        exact: Boolean(exactComplementary),
        first: summarize(complementaryProducts[0]),
        errors: complementary.payload?.errors || null,
      });
    }

    if (exactComplementary && getPrice(exactComplementary) > 0) {
      return NextResponse.json({
        ok: true,
        source: "s-kaupat-complementary-exact-v6",
        found: true,
        ean,
        storeId,
        product: toProduct(exactComplementary, ean, storeId),
        debug,
      });
    }

    return NextResponse.json({
      ok: true,
      source: "s-kaupat-fast-internal-plus-eggs-cheese-v6",
      found: false,
      ean,
      storeId,
      nameHint,
      checkedQueries: queries,
      checkedSlugs: BROAD_SLUGS,
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

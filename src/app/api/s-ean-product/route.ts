// V10_EAN_ROUTE_WORLD_NAME_FALLBACK_EXACT_EAN_NO_PRICE_OK
// Korjaus V6:n 49 s jumiin:
// - Jos nameHint puuttuu, ei enää ajeta slug * query -massahakua.
// - No-hint skannerihaku kokeilee vain nopean internal-/api/s-products-polun ja complementaryn.
// - Route palauttaa nopeasti found:false, jolloin page/skannerin fallback saa näkyä.
// - Jos nameHint on käytössä, GraphQL-fallback rajataan max. 6 slugiin ja max. 6 queryyn.
// - Kaikille fetch-kutsuille lisätty timeout, ettei selain jää odottamaan.
// - Hyväksytään exact EAN myös silloin, kun price puuttuu tai on 0 (esim. S-kaupat alkoholituotteet).

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FILTERED_HASH =
  "44ca017dddccfe49e787b483f471f26217adca807f8c71101d11e881dab9e480";

const COMPLEMENTARY_HASH =
  "9a0f8fccb697df461e462d3f4192076dd02de0646755e392a8e547ec60815dcb";

const ROUTE_DEADLINE_MS = 8500;
const FETCH_TIMEOUT_MS = 3500;

const BROAD_SLUGS = [
  "",
  "juomat",
  "juomat/alkoholijuomat",
  "juomat/oluet",
  "juomat/siiderit-ja-lonkerot",
  "juomat/virvoitusjuomat",
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
];

const ALWAYS_FAST_TERMS = [
  // Nämä ovat vain viimeinen kevyt varmistus. Oikea fallback hakee EANilla nimen maailmalta.
  "xtra",
  "olut",
  "lonkero",
  "siideri",
  "juoma",
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
  const value =
    product?.price ??
    product?.pricing?.currentPrice ??
    product?.pricing?.regularPrice ??
    product?.storeItem?.price ??
    product?.storeItems?.[0]?.price ??
    null;

  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

function getPossibleEans(product: any): string[] {
  const rawValues = [
    product?.ean,
    product?.gtin,
    product?.code,
    product?.barcode,
    product?.barCode,
    product?.id,
    product?.productId,
    product?.productDetails?.ean,
    product?.productDetails?.gtin,
    product?.productDetails?.code,
    product?.productDetails?.barcode,
    product?.storeItem?.ean,
    product?.storeItem?.gtin,
    product?.storeItem?.code,
  ];

  if (Array.isArray(product?.eans)) rawValues.push(...product.eans);
  if (Array.isArray(product?.gtins)) rawValues.push(...product.gtins);
  if (Array.isArray(product?.barcodes)) rawValues.push(...product.barcodes);
  if (Array.isArray(product?.productDetails?.eans)) rawValues.push(...product.productDetails.eans);
  if (Array.isArray(product?.productDetails?.gtins)) rawValues.push(...product.productDetails.gtins);

  return rawValues
    .map((x) => normalizeEan(typeof x === "object" ? x?.value || x?.ean || x?.gtin || x?.code : x))
    .filter(Boolean);
}

function findExact(products: any[], ean: string) {
  return products.find((p) => getPossibleEans(p).includes(ean)) || null;
}

function summarize(product: any) {
  if (!product) return null;
  return {
    id: product?.id ?? null,
    ean: product?.ean ?? null,
    possibleEans: getPossibleEans(product).slice(0, 5),
    name: fixText(product?.name),
    brandName: fixText(product?.brandName || ""),
    price: getPrice(product),
    comparisonPrice: getComparisonPrice(product),
  };
}

function cleanExternalProductName(value?: string | null) {
  return fixText(value)
    .replace(/\b\d+[,.]?\d*\s*(%|vol\.?|alc\.?|g|kg|ml|l|cl|dl)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function externalNameQueries(name: string, brand?: string | null) {
  const terms = new Set<string>();
  const cleaned = cleanExternalProductName(name);
  const cleanedBrand = cleanExternalProductName(brand || "");

  if (cleaned) terms.add(cleaned);
  if (cleanedBrand && cleaned) terms.add(`${cleanedBrand} ${cleaned}`);
  if (cleanedBrand) terms.add(cleanedBrand);

  const words = cleaned.split(/\s+/).filter((x) => x.length >= 2);
  if (words.length >= 4) terms.add(words.slice(0, 4).join(" "));
  if (words.length >= 3) terms.add(words.slice(0, 3).join(" "));
  if (words.length >= 2) terms.add(words.slice(0, 2).join(" "));

  // Xtra-alkoholeissa käsinhaku löytää usein paremmin ilman kokomerkintöjä.
  if (/xtra/i.test(cleaned) || /xtra/i.test(cleanedBrand)) {
    terms.add("Xtra");
    if (/olut|beer|lager/i.test(cleaned)) terms.add("Xtra olut");
    if (/siider|cider/i.test(cleaned)) terms.add("Xtra siideri");
    if (/lonkero|long drink/i.test(cleaned)) terms.add("Xtra lonkero");
  }

  return Array.from(terms).filter((x) => x.length >= 2).slice(0, 8);
}

async function fetchOpenFoodFactsByEan(ean: string) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=code,product_name,product_name_fi,product_name_en,brands,image_url,image_front_url,quantity,categories_tags`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "user-agent": "Ziiply EAN fallback - contact@ziiply.fi",
    },
    cache: "no-store",
  }, 3000);

  const payload = await response.json().catch(() => null);
  const product = payload?.product || null;

  const name =
    fixText(product?.product_name_fi) ||
    fixText(product?.product_name) ||
    fixText(product?.product_name_en) ||
    "";

  if (!response.ok || !product || !name) {
    return {
      ok: response.ok,
      status: response.status,
      found: false,
      payload,
      product: null,
      name: "",
      brandName: "",
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    found: true,
    payload,
    product,
    name,
    brandName: fixText(product?.brands || ""),
  };
}

function toExternalFallbackProduct(args: {
  ean: string;
  storeId: string;
  name: string;
  brandName?: string;
  image?: string;
  source: string;
}) {
  return {
    id: args.ean,
    ean: args.ean,
    name: fixText(args.name) || `EAN ${args.ean}`,
    brandName: fixText(args.brandName || ""),
    pictureUrl: args.image || "",
    price: null,
    comparisonPrice: null,
    comparisonPriceUnit: null,
    storeId: args.storeId,
    storeName: "Tuotetieto",
    rawSource: args.source,
    noStorePrice: true,
    infoText: "Tuote tunnistettu EANilla, mutta kauppakohtaista hintaa ei saatu.",
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


async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function deadlineExceeded(startedAt: number) {
  return Date.now() - startedAt > ROUTE_DEADLINE_MS;
}

function trimForNoHint(queries: string[], hasNameHint: boolean) {
  if (hasNameHint) return queries.slice(0, 8);

  // Ilman nimeä EAN-route ei saa arpoa 50 sekuntia eri kategorioita.
  // Pidetään silti V6:n kananmunat/juusto-nopeat haut, mutta vain internal-polussa.
  return queries.slice(0, 10);
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

  const response = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  }, 2500);

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

  const response = await fetchWithTimeout(url.toString(), {
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
  }, 3500);

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

async function trySProductsQueries(args: {
  origin: string;
  ean: string;
  storeId: string;
  queries: string[];
  debug: any[];
  debugEnabled: boolean;
  startedAt: number;
  stepPrefix: string;
}) {
  for (const queryString of args.queries) {
    if (deadlineExceeded(args.startedAt)) {
      args.debug.push({ step: `${args.stepPrefix}Deadline`, elapsedMs: Date.now() - args.startedAt });
      return null;
    }

    const internal = await tryInternalSProductsExact({
      origin: args.origin,
      ean: args.ean,
      storeId: args.storeId,
      queryString,
    });

    if (args.debugEnabled) {
      args.debug.push({
        step: args.stepPrefix,
        queryString,
        storeId: args.storeId,
        status: internal.status,
        ok: internal.ok,
        count: internal.products.length,
        exact: Boolean(internal.exact),
        first: summarize(internal.products[0]),
      });
    }

    if (internal.exact) {
      return { exact: internal.exact, queryString };
    }
  }

  return null;
}

async function tryFilteredQueries(args: {
  ean: string;
  storeId: string;
  queries: string[];
  slugs: string[];
  debug: any[];
  debugEnabled: boolean;
  startedAt: number;
  stepPrefix: string;
}) {
  for (const slug of args.slugs) {
    for (const queryString of args.queries) {
      if (deadlineExceeded(args.startedAt)) {
        args.debug.push({ step: `${args.stepPrefix}Deadline`, elapsedMs: Date.now() - args.startedAt });
        return null;
      }

      const filtered = await tryFilteredExact({
        ean: args.ean,
        storeId: args.storeId,
        slug,
        queryString,
      });

      if (args.debugEnabled) {
        args.debug.push({
          step: args.stepPrefix,
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

      if (filtered.exact) {
        return { exact: filtered.exact, slug, queryString };
      }
    }
  }

  return null;
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
    const startedAt = Date.now();
    const hasNameHint = nameHint.length >= 3;
    const initialQueries = trimForNoHint(buildQueries(nameHint, ean), hasNameHint);

    // 1) Nopea S-products-polku nykyisellä nameHintillä / kevyillä termeillä.
    // Hyväksytään exact EAN myös ilman hintaa.
    const initialInternal = await trySProductsQueries({
      origin,
      ean,
      storeId,
      queries: initialQueries,
      debug,
      debugEnabled,
      startedAt,
      stepPrefix: "InternalApiSProductsInitial",
    });

    if (initialInternal?.exact) {
      if ((getPrice(initialInternal.exact) ?? 0) <= 0) {
        console.log(
          "EAN FOUND WITHOUT PRICE",
          { source: "internal-/api/s-products-initial", ean, storeId, queryString: initialInternal.queryString, name: fixText(initialInternal.exact?.name), price: getPrice(initialInternal.exact) },
        );
      }

      return NextResponse.json({
        ok: true,
        source: "internal-s-products-initial-exact-ean-v10-no-price-ok",
        found: true,
        ean,
        storeId,
        product: toProduct(
          { ...initialInternal.exact, rawSource: "internal-/api/s-products" },
          ean,
          storeId,
        ),
        debug,
      });
    }

    // 2) OIKEA FALLBACK: jos nimeä ei ole tai S-haku ei osunut,
    // hae EANilla tuotteen nimi maailmalta ja yritä S-kaupat uudestaan sillä nimellä.
    let externalFallback: any = null;
    let externalQueries: string[] = [];

    if (!deadlineExceeded(startedAt)) {
      const off: any = await fetchOpenFoodFactsByEan(ean).catch((error: any) => ({
        ok: false,
        status: 0,
        found: false,
        payload: null,
        product: null,
        name: "",
        brandName: "",
        error: error?.message || "OpenFoodFacts failed",
      }));

      if (debugEnabled) {
        debug.push({
          step: "OpenFoodFactsByEan",
          status: off.status,
          ok: off.ok,
          found: off.found,
          name: off.name || "",
          brandName: off.brandName || "",
          error: off.error || null,
        });
      }

      if (off.found && off.name) {
        externalFallback = off;
        externalQueries = externalNameQueries(off.name, off.brandName);

        const externalInternal = await trySProductsQueries({
          origin,
          ean,
          storeId,
          queries: externalQueries,
          debug,
          debugEnabled,
          startedAt,
          stepPrefix: "InternalApiSProductsExternalName",
        });

        if (externalInternal?.exact) {
          if ((getPrice(externalInternal.exact) ?? 0) <= 0) {
            console.log(
              "EAN FOUND WITHOUT PRICE",
              { source: "internal-/api/s-products-external-name", ean, storeId, queryString: externalInternal.queryString, name: fixText(externalInternal.exact?.name), price: getPrice(externalInternal.exact) },
            );
          }

          return NextResponse.json({
            ok: true,
            source: "internal-s-products-external-name-exact-ean-v10-no-price-ok",
            found: true,
            ean,
            storeId,
            product: toProduct(
              { ...externalInternal.exact, rawSource: "internal-/api/s-products-external-name" },
              ean,
              storeId,
            ),
            externalName: off.name,
            debug,
          });
        }
      }
    }

    // 3) GraphQL-kategoriat. V10: jos ulkoinen nimi löytyi, ajetaan GraphQL myös ilman alkuperäistä nameHintiä.
    const graphqlQueries = externalQueries.length
      ? externalQueries.slice(0, 6)
      : hasNameHint
        ? initialQueries.slice(0, 6)
        : [];
    const fallbackSlugs = graphqlQueries.length ? BROAD_SLUGS.slice(0, 10) : [];

    const filteredHit = await tryFilteredQueries({
      ean,
      storeId,
      queries: graphqlQueries,
      slugs: fallbackSlugs,
      debug,
      debugEnabled,
      startedAt,
      stepPrefix: "RemoteFilteredProductsFallback",
    });

    if (filteredHit?.exact) {
      if ((getPrice(filteredHit.exact) ?? 0) <= 0) {
        console.log(
          "EAN FOUND WITHOUT PRICE",
          { source: "s-kaupat-filtered-fallback", ean, storeId, slug: filteredHit.slug, queryString: filteredHit.queryString, name: fixText(filteredHit.exact?.name), price: getPrice(filteredHit.exact) },
        );
      }

      return NextResponse.json({
        ok: true,
        source: "s-kaupat-filtered-fallback-exact-v10-no-price-ok",
        found: true,
        ean,
        storeId,
        product: toProduct(filteredHit.exact, ean, storeId),
        externalName: externalFallback?.name || null,
        debug,
      });
    }

    // 4) Jos S-kauppa ei palauta tuotetta mutta maailmahaku tunnisti EANin,
    // palautetaan silti tuotetieto skanneriin eikä näytetä virheellistä hiljaisuutta.
    if (externalFallback?.found && externalFallback?.name) {
      return NextResponse.json({
        ok: true,
        source: "openfoodfacts-world-fallback-v10-no-s-price",
        found: true,
        ean,
        storeId,
        product: toExternalFallbackProduct({
          ean,
          storeId,
          name: externalFallback.name,
          brandName: externalFallback.brandName,
          image: externalFallback.product?.image_front_url || externalFallback.product?.image_url || "",
          source: "openfoodfacts",
        }),
        sStoreMatch: false,
        checkedQueries: initialQueries,
        externalQueries,
        checkedSlugs: fallbackSlugs,
        elapsedMs: Date.now() - startedAt,
        debug,
      });
    }

    // 3) Complementary vain viimeiseksi. Ei saa hyväksyä väärää tuotetta.
    if (deadlineExceeded(startedAt)) {
      return NextResponse.json({
        ok: true,
        source: "s-kaupat-ean-route-deadline-v8",
        found: false,
        ean,
        storeId,
        nameHint,
        checkedQueries: initialQueries,
        checkedSlugs: fallbackSlugs,
        elapsedMs: Date.now() - startedAt,
        debug,
      });
    }

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

    if (exactComplementary) {
      if (getPrice(exactComplementary) <= 0) {
        console.log(
          "EAN FOUND WITHOUT PRICE",
          { source: "s-kaupat-complementary", ean, storeId, name: fixText(exactComplementary?.name), price: getPrice(exactComplementary) },
        );
      }
      return NextResponse.json({
        ok: true,
        source: "s-kaupat-complementary-exact-v8-no-price-ok",
        found: true,
        ean,
        storeId,
        product: toProduct(exactComplementary, ean, storeId),
        debug,
      });
    }

    return NextResponse.json({
      ok: true,
      source: "s-kaupat-fast-internal-plus-eggs-cheese-v8-no-price-ok",
      found: false,
      ean,
      storeId,
      nameHint,
      checkedQueries: initialQueries,
      checkedSlugs: fallbackSlugs,
      elapsedMs: Date.now() - startedAt,
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

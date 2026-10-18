import { after } from "next/server";
import { NextResponse } from "next/server";
import { rankGrocerySearchResults } from "../_shared/grocerySearchRelevance";
import { MEAT_SEARCH_ALIASES, BASKET_SEARCH_ALIASES } from "../_shared/grocerySearchExpansion";
import { observeEanProductsBestEffort } from "@/lib/eanBank";

type RuoanhintaProduct = {
  id: number;
  name: string;
  ean?: string;
  gtin?: string;
  eanCode?: string;
  barcode?: string;
  externalId?: string;
  familyKey?: string;
  brandName?: string;
  pictureUrl?: string;
  storeItems?: {
    price: number;
    comparisonPrice?: number | null;
    comparisonPriceUnit?: string | null;
  }[];
};

function getPrice(product: RuoanhintaProduct) {
  return product.storeItems?.[0]?.price || 0;
}

function getEan(product: RuoanhintaProduct) {
  const candidates = [
    product.ean,
    product.gtin,
    product.eanCode,
    product.barcode,
    product.externalId,
  ];

  return candidates.find((value) => value && /^\d{8,14}$/.test(String(value))) || undefined;
}

function fixEncoding(value: string) {
  return value
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¥/g, "å")
    .replace(/â„¢/g, "")
    .replace(/Â/g, "");
}

function resolveKStoreId(store: string) {
  if (/^\d+$/.test(store)) return Number(store);

  if (store === "k-citymarket-hyvinkaa") return 3221;

  return 3221;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const store = searchParams.get("store") || "3221";
  const storeId = resolveKStoreId(store);

  if (search.length > 120 || store.length > 32) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  if (!search.trim()) {
    return NextResponse.json({
      store,
      storeId,
      source: "ruoanhinta-k",
      status: 200,
      items: [],
    });
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("fi");
  // Ruoanhinta matches "nakit" too literally: its singular "nakki" query
  // returns the actual grocery products in both S and K chains.
  // Normalize common Finnish grocery plurals before querying the literal upstream API.
  // Keep the original query for user-facing results and category ranking.
  const singularByPlural: Record<string, string> = {
    "jogurtit": "jogurtti",
    "kananmunat": "kananmuna",
    "perunat": "peruna",
    "porkkanat": "porkkana",
    "tomaatit": "tomaatti",
    "kurkut": "kurkku",
    "omenat": "omena",
    "banaanit": "banaani",
    "sipulit": "sipuli",
    "paprikat": "paprika",
    "leivät": "leipä",
    "sämpylät": "sämpylä",
    "juustot": "juusto",
    "keksit": "keksi",
    "suklaat": "suklaa",
    "jäätelöt": "jäätelö",
    "kalapuikot": "kalapuikko",
    "lihapullat": "lihapulla",
    "nuudelit": "nuudeli",
    "tortillat": "tortilla",
    "pastat": "pasta",
    "riisit": "riisi",
    "murot": "muro",
    "margariinit": "margariini",
    "leikkeleet": "leikkele",
    "kinkut": "kinkku",
    "herneet": "herne",
    "pavut": "papu",
    "maidot": "maito",
    "mehut": "mehu",
    "kahvit": "kahvi",
    "rahkat": "rahka",
    "broilerit": "broileri",
    "lohet": "lohi",
    "makkarat": "makkara",
    "nakit": "nakki",
  };
  const upstreamSearch = normalizedSearch === "limsa" ? "limonadi" : (singularByPlural[normalizedSearch] || search);

  const endpoint = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(
    upstreamSearch
  )}&storeIds=${storeId}&skip=0&take=100`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Upstream HTTP " + response.status);
    const additionalTerms = [...new Set([...(MEAT_SEARCH_ALIASES[normalizedSearch] || []), ...(BASKET_SEARCH_ALIASES[normalizedSearch] || [])])];
    const extraResponses = await Promise.all(additionalTerms.map(async (term) => {
      try {
        const extraUrl = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(term)}&storeIds=${storeId}&skip=0&take=80`;
        const result = await fetch(extraUrl, {headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(6500)});
        if (!result.ok) return [];
        const body = await result.json();
        return Array.isArray(body.items) ? body.items as RuoanhintaProduct[] : [];
      } catch { return [] as RuoanhintaProduct[]; }
    }));
    const data = await response.json();
    const primaryItems: RuoanhintaProduct[] = Array.isArray(data.items) ? data.items : [];
    // Only when a generic bread search returns no priced items, retry two
    // narrower bread queries. Do not expand nonempty results or other categories.
    const breadFallbackTerms = normalizedSearch === "leipä" && ![...primaryItems, ...extraResponses.flat()].some(product => getPrice(product) > 0)
      ? ["ruisleipä", "paahtoleipä"]
      : [];
    const breadFallbackResponses = await Promise.all(breadFallbackTerms.map(async (term) => {
      try {
        const url = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(term)}&storeIds=${storeId}&skip=0&take=80`;
        const result = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6500) });
        if (!result.ok) return [] as RuoanhintaProduct[];
        const body = await result.json();
        return Array.isArray(body.items) ? body.items as RuoanhintaProduct[] : [];
      } catch { return [] as RuoanhintaProduct[]; }
    }));
    // When the upstream literal search returns too few products, broaden the
    // retrieval independently of product matching. Fetch additional pages so
    // an early page of unrelated items cannot hide a valid product.
    const lowCoverage = primaryItems.filter(product => getPrice(product) > 0).length < 10;
    const searchWords = normalizedSearch.split(/\s+/).filter(Boolean);
    const genericFallbackTerms = lowCoverage
      ? [...new Set([
          searchWords[0],
          searchWords.length > 1 ? searchWords.slice(1).join(" ") : "",
          // A compact product name may have a size suffix (e.g. 30l).
          searchWords.find(word => /^\d+(?:[,.]\d+)?(?:l|ml|kg|g|rll|rl)$/.test(word)) || "",
        ].filter(term => term && term !== normalizedSearch))]
      : [];
    const genericFallbackResponses = await Promise.all(genericFallbackTerms.map(async term => {
      const pages = await Promise.all([0, 100, 200].map(async skip => {
        try {
          const url = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(term)}&storeIds=${storeId}&skip=${skip}&take=100`;
          const result = await fetch(url, {headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(6500)});
          if (!result.ok) return [] as RuoanhintaProduct[];
          const body = await result.json();
          return Array.isArray(body.items) ? body.items as RuoanhintaProduct[] : [];
        } catch { return [] as RuoanhintaProduct[]; }
      }));
      return pages.flat();
    }));
    const sourceItems = [...new Map([...primaryItems, ...extraResponses.flat(), ...breadFallbackResponses.flat(), ...genericFallbackResponses.flat()].map(item => [item.id, item])).values()];

    const items = sourceItems
      .filter((product) => getPrice(product) > 0)
      .filter((product) => normalizedSearch !== "nakit" || !/koira|lemmik|dog\\b|purunak|primadog|pedigree/i.test(`${product.name} ${"category" in product ? product.category || "" : ""}`))
      .map((product) => ({
        id: String(product.id),
        name: fixEncoding(product.name),
        ean: getEan(product),
        familyKey: product.familyKey,
        brandName: product.brandName ? fixEncoding(product.brandName) : undefined,
        // Prefer Kesko's canonical EAN image for K products. Ruoanhinta's
        // pictureUrl can be empty/stale for Citymarket rows even when the EAN is valid.
        pictureUrl: (() => {
          const ean = getEan(product);
          return ean
            ? `https://public.keskofiles.com/f/k-ruoka/product/${ean}`
            : product.pictureUrl || undefined;
        })(),
        price: getPrice(product),
        priceAmountUnit: "cent",
        comparisonPriceAmountUnit: "cent",
        comparisonPrice: product.storeItems?.[0]?.comparisonPrice ?? undefined,
        comparisonPriceUnit: product.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
        unitPrice: undefined,
      }));

    after(() => observeEanProductsBestEffort(items.map((item) => ({ ean: item.ean, name: item.name, brand: item.brandName, imageUrl: item.pictureUrl, source: "ruoanhinta-k" }))));

    return NextResponse.json({
      store,
      storeId,
      source: "ruoanhinta-k",
      endpoint,
      status: response.status,
      items: rankGrocerySearchResults(items, search),
    });
  } catch (error) {
    return NextResponse.json(
      {
        store,
        storeId,
        source: "ruoanhinta-k",
        endpoint,
        status: 500,
        items: [],
        error: String(error),
      },
      { status: 500 }
    );
  }
}
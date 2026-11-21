import { appendRuoanhintaPages } from "@/lib/ruoanhintaPagination";
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { rankGrocerySearchResults } from "../_shared/grocerySearchRelevance";
import { MEAT_SEARCH_ALIASES, BASKET_SEARCH_ALIASES } from "../_shared/grocerySearchExpansion";
import { observeEanProductsBestEffort } from "@/lib/eanBank";

type RuoanhintaProduct = {
  id: number;
  name: string;
  category?: string;
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
  const recipeIngredient=(searchParams.get("recipeIngredient")||"").trim();

  if (search.length > 120 || store.length > 32 || recipeIngredient.length > 200) {
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

  try {
    const payload = recipeIngredient ? await fetchKSearch(storeId, search) : await readNormalKSearch(storeId, search);
    after(() => observeEanProductsBestEffort(payload.items.map((item) => ({
      ean: item.ean, name: item.name, brand: item.brandName,
      imageUrl: item.pictureUrl, source: "ruoanhinta-k",
    }))));
    return NextResponse.json({ store, storeId, source: "ruoanhinta-k", ...payload }, {
      headers: { "x-ziiply-k-search-generated-at": payload.generatedAt },
    });
  } catch (error) {
    return NextResponse.json({
      store, storeId, source: "ruoanhinta-k", endpoint: kSearchEndpoint(storeId, search),
      status: 500, items: [], error: String(error),
    }, { status: 500 });
  }
}

function kSearchEndpoint(storeId: number, search: string) {
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

  return `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(
    upstreamSearch
  )}&storeIds=${storeId}&skip=0&take=100`;
}

async function fetchKSearch(storeId: number, search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase("fi");
  const endpoint = kSearchEndpoint(storeId, search);
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
  const firstPage: RuoanhintaProduct[] = Array.isArray(data.items) ? data.items : [];
  // Recipe candidates must not disappear at the provider's first-page boundary.
  // A full first page is not a complete product set. Also paginate ordinary
  // grocery searches, with the existing bounded timeout, so a product near
  // the provider's first-page boundary is not randomly omitted.
  const paginationEvents: {page:number;status:string;count:number}[] = [];
  // Preserve provider page evidence for every request in both pagination passes.
  // Different page boundaries under the same query can otherwise be mistaken
  // for a frontend-only EAN mismatch.
  const pageEvidence: {skip:number;take:number;count:number;firstIds:(string|number)[];lastIds:(string|number)[]}[] = [];
  const primaryItems = await appendRuoanhintaPages(firstPage, 100, async (skip, signal) => {
    const pageUrl=new URL(endpoint);pageUrl.searchParams.set("skip",String(skip));
    const page=await fetch(pageUrl,{headers:{accept:"application/json"},cache:"no-store",signal});
    if(!page.ok)throw new Error("Provider page HTTP "+page.status);
    const body=await page.json();
    const pageItems: RuoanhintaProduct[] = Array.isArray(body.items)?body.items:[];
    pageEvidence.push({skip,take:100,count:pageItems.length,firstIds:pageItems.slice(0,5).map(p=>p.id),lastIds:pageItems.slice(-5).map(p=>p.id)});
    return pageItems;
  }, 3, 4500, event => paginationEvents.push(event));
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
      category: product.category,
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

  return {
    endpoint,
    pagination: {firstPageCount:firstPage.length, primaryCount:primaryItems.length, events:paginationEvents, firstPageLastIds:firstPage.slice(-5).map(p=>p.id), primaryLastIds:primaryItems.slice(-5).map(p=>p.id), pageEvidence},
    status: response.status,
    generatedAt: new Date().toISOString(),
    items: rankGrocerySearchResults(items, search),
  };
}

type KSearchPayload = Awaited<ReturnType<typeof fetchKSearch>>;

class UncacheableKSearch extends Error {
  constructor(readonly payload: KSearchPayload) {
    super("K search returned an empty or incomplete result");
  }
}

const K_SEARCH_WINDOW_MS = 30_000;

const getCachedKSearch = unstable_cache(async (storeId: number, search: string, _window: number) => {
  const payload = await fetchKSearch(storeId, search);
  if (!payload.items.length || payload.pagination.events.some(event =>
    event.status !== "ok" && event.status !== "empty"
  )) throw new UncacheableKSearch(payload);
  return payload;
}, ["k-normal-search-snapshot-v2"], { revalidate: 120 });

const inFlightKSearches = new Map<string, Promise<KSearchPayload>>();

function readNormalKSearch(storeId: number, search: string) {
  // A new window uses a new cache key, so it waits for a fresh response.
  // Keep entries fresh in the Data Cache throughout their usable window.
  const window = Math.floor(Date.now() / K_SEARCH_WINDOW_MS);
  const key = JSON.stringify([storeId, search, window]);
  const existing = inFlightKSearches.get(key);
  if (existing) return existing;
  const pending = getCachedKSearch(storeId, search, window)
    .catch(error => {
      if (error instanceof UncacheableKSearch) return error.payload;
      throw error;
    })
    .finally(() => inFlightKSearches.delete(key));
  inFlightKSearches.set(key, pending);
  return pending;
}

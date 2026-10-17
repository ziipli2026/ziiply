import { recipeProductCompatible } from "@/app/components/ziiply/justiina/recipeSearch";
import { NextResponse } from "next/server";
import { fetchSKaupatNormalProductsV220 } from "@/app/components/ziiply/offerSearch/providers/skaupatProvider";
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
  category?: string;
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

function resolveSStoreId(store: string) {
  if (/^\d+$/.test(store)) return Number(store);

  if (store === "prisma-hyvinkaa") return 292;

  return 292;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const store = searchParams.get("store") || "292";
  const storeName = (searchParams.get("storeName") || "").trim();
  const recipeIngredient=(searchParams.get("recipeIngredient")||"").trim();
  const storeId = resolveSStoreId(store);

  if (search.length > 120 || store.length > 32 || storeName.length > 120 || recipeIngredient.length > 200) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  if (!search.trim()) {
    return NextResponse.json({
      store,
      storeId,
      source: "ruoanhinta-s",
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
  const upstreamSearch = singularByPlural[normalizedSearch] || search;

  const endpoint = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(
    upstreamSearch
  )}&storeIds=${storeId}&skip=0&take=80`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();
    const sourceItems: RuoanhintaProduct[] = Array.isArray(data.items) ? data.items : [];

    const items = sourceItems
      .filter((product) => getPrice(product) > 0)
      .filter((product) => normalizedSearch !== "nakit" || !/koira|lemmik|dog\\b|purunak|primadog|pedigree/i.test(`${product.name} ${"category" in product ? product.category || "" : ""}`))
      .map((product) => ({
        id: product.id,
        name: fixEncoding(product.name),
        ean: getEan(product),
        familyKey: product.familyKey,
        brandName: product.brandName ? fixEncoding(product.brandName) : undefined,
        pictureUrl: product.pictureUrl,
        category: product.category,
        price: getPrice(product),
        priceAmountUnit: "cent",
        comparisonPriceAmountUnit: "cent",
        comparisonPrice: product.storeItems?.[0]?.comparisonPrice ?? undefined,
        comparisonPriceUnit: product.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
        storeItems: [
          {
            price: getPrice(product),
            comparisonPrice: product.storeItems?.[0]?.comparisonPrice ?? undefined,
            comparisonPriceUnit: product.storeItems?.[0]?.comparisonPriceUnit ?? undefined,
          },
        ],
      }));

    // V220: Ruoanhinta has no rows for some selectable S stores (e.g. Tuusula).
    // Try the selected store's own S-kaupat normal-product feed, not another
    // Prisma's prices. Preserve the existing path for working stores (Kommila).
    let recipeFallback: {attempted:boolean;matchedCount:number;error?:string}|undefined;
    const noRecipeMatches=Boolean(recipeIngredient)&&!items.some(item=>recipeProductCompatible(recipeIngredient,item));
    if ((items.length === 0 || noRecipeMatches) && storeName && /^(prisma|s[ -]?market)/i.test(storeName)) {
      try {
        const fallbackItems = await fetchSKaupatNormalProductsV220(search, storeName);
        const matched=recipeIngredient?fallbackItems.filter(item=>recipeProductCompatible(recipeIngredient,item)):fallbackItems;
        if(recipeIngredient)recipeFallback={attempted:true,matchedCount:matched.length};
        if (matched.length > 0) {
          return NextResponse.json({
            store, storeId, storeName, source: "s-kaupat-normal-v220",
            status: 200, items: matched.map(item=>({...item,priceAmountUnit:"eur",comparisonPriceAmountUnit:"eur"})), recipeFallback,
          });
        }
      } catch (fallbackError) {
        if(recipeIngredient)recipeFallback={attempted:true,matchedCount:0,error:String(fallbackError)};
        console.warn("[S PRODUCTS V220] selected store fallback failed", {
          storeName, error: String(fallbackError),
        });
      }
    }

    // EAN-pankin opetus ei saa blokata käyttäjän hakuvastausta.
    // Tämä on aidosti best-effort: haku palautetaan heti, observointi saa valmistua taustalla.
    void observeEanProductsBestEffort(items.map((item) => ({
      ean: item.ean,
      name: item.name,
      brand: item.brandName,
      imageUrl: item.pictureUrl,
      category: item.category,
      source: "ruoanhinta-s",
    }))).catch(() => undefined);

    return NextResponse.json({
      store,
      storeId,
      source: "ruoanhinta-s",
      endpoint,
      recipeFallback,
      status: response.status,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        store,
        storeId,
        source: "ruoanhinta-s",
        endpoint,
        status: 500,
        items: [],
        error: String(error),
      },
      { status: 500 }
    );
  }
}

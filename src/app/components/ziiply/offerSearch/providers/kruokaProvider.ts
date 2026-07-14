// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_V44_V41_PLUS_JOKELA_LEAFLET_EAN_FILTER
//
// V44:
// - Pohjana käyttäjän toimivaksi vahvistama V41.
// - Ainoa varsinainen muutos: K-Supermarket Jokelan tulokset rajataan
//   käyttäjän HAR-tiedostosta varmennettuun tarjouslehden sivu 1 EAN-listaan.
// - Ruoanhinta storeId 3334 vastaa K-Ruoka storeId:tä S441.
// - V41:n kaupanvalinta, hinnat, kuvat, kategoriat ja voimassaolosuodatus säilyvät ennallaan.
// - Kategoriakohtaisen lukumäärän korjaus on edelleen page V544:ssä, ei tässä providerissa.
// - Ei suoraa K-Ruoka product-map -serverikutsua eikä Cloudflare-riippuvuutta.
//
// V41:
// - Palauttaa vain juuri nyt voimassa olevat tarjoukset.
// - Vaatii oikean tarjoussignaalin: alennusprosentti, erähinta tai tarjoushinta alle aiemman hinnan.
// - Ei palauta vanhoja/tulevia/normaalihintaisia rivejä master-haussa.
// - Numeerinen storeId tarkistetaan kauppalistasta ja kauppatyypin pitää vastata valittua K-Market/K-Supermarket/K-Citymarket-tyyppiä.
// - Näkyvät provider-debugkortit poistettu.
// - Ei kovakoodattua Citymarketia eikä muutosta valitun K-kaupan logiikkaan.
//
// EI hae enää K-Ruoan product-mapia eikä HTML:ää.
// Hakee K-tarjoukset ruoanhinta.fi:n backendistä valitun K-kaupan perusteella.
// V37:
// - EI kovakoodattua kauppaa: hakee vain options/contextin mukana tulleet valitut K-kaupat
// - parannettu K-Citymarket / K-Supermarket / K-Market -nimiosuman pisteytystä, ettei K-Market-valinta osu vahingossa Citymarketiin
// - poistettu pakotettu storeId=3344 varsinaisesta hausta
// - jos Ziiplyn valittu K-storeId ei ole ruoanhinta.fi:n numeerinen storeId,
//   provider etsii oikean storeId:n /api/stores/minimal-listasta kaupan nimen perusteella
// - voimassaoloaika muotoillaan muodossa "Voimassa 5.7." eikä ISO-aikaleimana
// - debug-kortteja ei palauteta normaalissa onnistuneessa haussa
// - tukee useaa valittua K-kauppaa muodossa kStoreId/kStoreName = "id1||id2" / "nimi1||nimi2"
// V39 DEBUG:
// - Lisää näkyvän provider-debugkortin kategoriaksi "Muut" jokaiselle valitulle K-kaupalle.
// - Debug kirjoitetaan benefitText/discountText-kenttiin samalla toimivalla periaatteella kuin aiemmassa provider-debugissa.
// - Näyttää valitun ja ratkaistun kaupan, queryn, raw/filtered/returned-määrät sekä raakakategoriat.
// - Ei muuta varsinaista K-tarjoushakua, tuotteita, hintoja, kuvia tai kauppavalintaa.

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

export type KruokaOfferProviderOptionsV10 = {
  storeId?: string | number | null;
  storeName?: string | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
  kStoreIds?: Array<string | number | null | undefined> | null;
  kStoreNames?: Array<string | null | undefined> | null;
};

type RuoanHintaOffer = {
  id?: number | string;
  type?: string | null;
  source?: string | null;
  title?: string | null;
  description?: string | null;
  requiresLoyaltyCard?: boolean | null;
  loyaltyProgram?: string | null;
  offerPrice?: number | null;
  previousPrice?: number | null;
  offerComparisonPrice?: number | null;
  previousComparisonPrice?: number | null;
  comparisonPriceUnit?: string | null;
  discountPercent?: number | null;
  batchQuantity?: number | null;
  batchTotalPrice?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  item?: {
    id?: number | string;
    name?: string | null;
    ean?: string | null;
    pictureUrl?: string | null;
    brandName?: string | null;
    urlSlug?: string | null;
    category?: string | null;
    itemCategories?: Array<{
      category?: {
        name?: string | null;
        slug?: string | null;
        parentCategory?: {
          name?: string | null;
          slug?: string | null;
          parentCategory?: {
            name?: string | null;
            slug?: string | null;
          } | null;
        } | null;
      } | null;
    }>;
  } | null;
  storeItem?: {
    storeId?: number | string | null;
    price?: number | null;
    priceUnit?: string | null;
    comparisonPrice?: number | null;
    comparisonPriceUnit?: string | null;
  } | null;
};

type RuoanHintaResponse = {
  offers?: RuoanHintaOffer[];
};

type RuoanHintaStore = {
  id?: number | string;
  name?: string | null;
  chain?: string | null;
  type?: string | null;
  urlSlug?: string | null;
};

const PAGE_SIZE = 200;
const MAX_PAGES = 10;
const STORE_PAGE_SIZE = 200;
const MAX_STORE_PAGES = 40;

function normalizeStoreId(options?: KruokaOfferProviderOptionsV10): string | null {
  const raw = options?.kStoreId ?? options?.storeId ?? null;
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw);
}

function normalizeStoreName(options?: KruokaOfferProviderOptionsV10): string {
  return String(options?.kStoreName ?? options?.storeName ?? "K-Ruoka / Ruoanhinta");
}

function splitMultiValueV36(value: unknown): string[] {
  return String(value ?? "")
    .split(/\s*(?:\|\||;|\n)\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getSelectedKStoreOptionsV37(options?: KruokaOfferProviderOptionsV10): KruokaOfferProviderOptionsV10[] {
  const idArray = Array.isArray(options?.kStoreIds) ? options?.kStoreIds ?? [] : [];
  const nameArray = Array.isArray(options?.kStoreNames) ? options?.kStoreNames ?? [] : [];

  const ids = [
    ...idArray.map((value) => String(value ?? "").trim()).filter(Boolean),
    ...splitMultiValueV36(options?.kStoreId ?? options?.storeId),
  ];

  const names = [
    ...nameArray.map((value) => String(value ?? "").trim()).filter(Boolean),
    ...splitMultiValueV36(options?.kStoreName ?? options?.storeName),
  ];

  const maxLength = Math.max(ids.length, names.length);
  if (maxLength <= 0) return [];
  if (maxLength === 1) return [{ ...(options ?? {}), kStoreId: ids[0] || null, kStoreName: names[0] || null }];

  const seen = new Set<string>();
  const result: KruokaOfferProviderOptionsV10[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const storeId = ids[index] || "";
    const storeName = names[index] || "";
    const key = `${storeId}|${storeName}`.toLowerCase();
    if (!storeId && !storeName) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...(options ?? {}),
      storeId,
      storeName,
      kStoreId: storeId,
      kStoreName: storeName,
    });
  }

  return result;
}

function normalizeStoreSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripKStorePrefix(value: string): string {
  return normalizeStoreSearchText(value)
    .replace(/^(k citymarket|k supermarket|k market|citymarket|ksupermarket|kmarket)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatValidityText(expiresAt?: string | null): string | undefined {
  if (!expiresAt) return undefined;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return undefined;

  return `Voimassa ${date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  })} asti`;
}

async function fetchRuoanHintaStores(): Promise<RuoanHintaStore[]> {
  const all: RuoanHintaStore[] = [];

  for (let page = 0; page < MAX_STORE_PAGES; page += 1) {
    const skip = page * STORE_PAGE_SIZE;
    const url = `https://api.ruoanhinta.fi/api/stores/minimal?skip=${skip}&take=${STORE_PAGE_SIZE}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://ruoanhinta.fi",
        Referer: "https://ruoanhinta.fi/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ruoanhinta stores failed: status=${res.status}, body=${text.slice(0, 240)}`);
    }

    const stores = (await res.json()) as RuoanHintaStore[];
    const pageStores = Array.isArray(stores) ? stores : [];
    all.push(...pageStores);

    if (pageStores.length < STORE_PAGE_SIZE) break;
  }

  return all;
}


function getKStoreClass(value: unknown): "citymarket" | "supermarket" | "kmarket" | null {
  const text = normalizeStoreSearchText(value);
  if (!text) return null;
  if (text.includes("citymarket") || text.includes("k citymarket")) return "citymarket";
  if (text.includes("supermarket") || text.includes("k supermarket")) return "supermarket";
  if (text.includes("k market") || text.includes("kmarket")) return "kmarket";
  return null;
}

function scoreRuoanHintaStoreMatch(store: RuoanHintaStore, wantedName: string): number {
  const storeName = normalizeStoreSearchText(store.name);
  const storeSlug = normalizeStoreSearchText(store.urlSlug);
  const wanted = normalizeStoreSearchText(wantedName);
  const wantedStripped = stripKStorePrefix(wantedName);
  const storeStripped = stripKStorePrefix(String(store.name ?? store.urlSlug ?? ""));

  if (!wanted) return 0;

  const wantedClass = getKStoreClass(wantedName);
  const storeClass = getKStoreClass(`${store.name ?? ""} ${store.chain ?? ""} ${store.urlSlug ?? ""}`);

  let score = 0;

  // Kauppatyypin pitää osua ensin. Tämä estää K-Market-valintaa osumasta Citymarketiin
  // vain siksi, että molemmissa lukee "market" tai sama paikkakunta.
  if (wantedClass && storeClass === wantedClass) score += 300;
  if (wantedClass && storeClass && storeClass !== wantedClass) score -= 420;

  if (storeName === wanted) score += 1000;
  if (storeStripped && wantedStripped && storeStripped === wantedStripped) score += 850;
  if (storeName.includes(wanted) || wanted.includes(storeName)) score += 650;
  if (storeStripped && wantedStripped && (storeStripped.includes(wantedStripped) || wantedStripped.includes(storeStripped))) score += 520;
  if (storeSlug.includes(wanted.replace(/\s+/g, " "))) score += 240;

  const wantedTokens = wantedStripped
    .split(" ")
    .filter((token) => token.length >= 3 && !["kauppa", "market", "citymarket", "supermarket", "hyvinkaa", "hyvinkää"].includes(token));

  for (const token of wantedTokens) {
    if (storeName.includes(token) || storeSlug.includes(token)) score += 95;
  }

  // Paikkakunta auttaa vasta toissijaisesti, ei saa voittaa kauppatyypin tai kadun nimeä.
  if (wanted.includes("hyvinkaa") || wanted.includes("hyvinkää")) {
    if (storeName.includes("hyvinkaa") || storeName.includes("hyvinkää") || storeSlug.includes("hyvinkaa")) score += 35;
  }

  return Math.max(0, score);
}

async function resolveRuoanHintaStoreId(options?: KruokaOfferProviderOptionsV10): Promise<{ storeId: string | null; matchedStoreName?: string | null; reason?: string }> {
  const raw = normalizeStoreId(options);
  const selectedName = normalizeStoreName(options);

  const stores = await fetchRuoanHintaStores();

  if (raw && /^\d+$/.test(raw)) {
    const exactStore = stores.find((store) => String(store.id ?? "") === raw);
    if (!exactStore) {
      return {
        storeId: null,
        matchedStoreName: null,
        reason: `Numeric Ruoanhinta storeId not found: ${raw}`,
      };
    }

    const wantedClass = getKStoreClass(selectedName);
    const actualClass = getKStoreClass(
      `${exactStore.name ?? ""} ${exactStore.chain ?? ""} ${exactStore.urlSlug ?? ""}`,
    );

    if (wantedClass && actualClass && wantedClass !== actualClass) {
      return {
        storeId: null,
        matchedStoreName: exactStore.name ?? null,
        reason: `Selected ${wantedClass} but numeric storeId ${raw} resolves to ${actualClass}: ${exactStore.name ?? "unknown"}`,
      };
    }

    return {
      storeId: raw,
      matchedStoreName: exactStore.name ?? selectedName,
      reason: "numeric storeId verified against store list",
    };
  }
  const kStores = stores.filter((store) => normalizeStoreSearchText(store.type) === "k" || normalizeStoreSearchText(store.chain).startsWith("k"));

  const scored = kStores
    .map((store) => ({ store, score: scoreRuoanHintaStoreMatch(store, selectedName) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best?.store?.id || best.score < 90) {
    return {
      storeId: null,
      matchedStoreName: null,
      reason: `Ruoanhinta storeId not found for selected K store: ${selectedName || raw || "unknown"}`,
    };
  }

  return {
    storeId: String(best.store.id),
    matchedStoreName: best.store.name ?? selectedName,
    reason: `matched by name, score=${best.score}`,
  };
}

function centsToEuros(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value) / 100;
}

function centsToPriceText(value: number | null | undefined): string | null {
  const euros = centsToEuros(value);
  if (euros === null) return null;
  return euros.toFixed(2).replace(".", ",");
}

function centsToUnitText(value: number | null | undefined, unit?: string | null): string | null {
  const euros = centsToPriceText(value);
  if (!euros) return null;
  return unit ? `${euros}/${unit}` : euros;
}

function categoryName(offer: RuoanHintaOffer): string {
  const first = offer.item?.itemCategories?.[0]?.category;
  return (
    first?.parentCategory?.parentCategory?.name ??
    first?.parentCategory?.name ??
    first?.name ??
    offer.item?.category ??
    "K-Ruoka tarjoukset"
  );
}

function subCategoryName(offer: RuoanHintaOffer): string {
  const first = offer.item?.itemCategories?.[0]?.category;
  return first?.name ?? offer.item?.category ?? "Tarjoukset";
}


function isOfferActiveNowV41(offer: RuoanHintaOffer, nowMs = Date.now()): boolean {
  const startsAtMs = offer.startsAt ? new Date(offer.startsAt).getTime() : Number.NEGATIVE_INFINITY;
  const expiresAtMs = offer.expiresAt ? new Date(offer.expiresAt).getTime() : Number.NaN;

  // Tarjouslistalla pitää olla päättymisaika. Muuten vanhat/normaalihintaiset rivit
  // voivat jäädä master-hakuun pysyvästi.
  if (!Number.isFinite(expiresAtMs)) return false;
  if (Number.isFinite(startsAtMs) && startsAtMs > nowMs) return false;
  if (expiresAtMs < nowMs) return false;

  return true;
}

function hasRealOfferSignalV41(offer: RuoanHintaOffer): boolean {
  const offerPrice = offer.offerPrice ?? offer.storeItem?.price ?? null;
  const previousPrice = offer.previousPrice ?? null;

  const hasDiscountPercent =
    typeof offer.discountPercent === "number" &&
    Number.isFinite(offer.discountPercent) &&
    offer.discountPercent > 0;

  const hasBatchOffer =
    typeof offer.batchQuantity === "number" &&
    offer.batchQuantity > 0 &&
    typeof offer.batchTotalPrice === "number" &&
    Number.isFinite(offer.batchTotalPrice) &&
    offer.batchTotalPrice > 0;

  const hasLowerOfferPrice =
    typeof offerPrice === "number" &&
    Number.isFinite(offerPrice) &&
    offerPrice > 0 &&
    typeof previousPrice === "number" &&
    Number.isFinite(previousPrice) &&
    previousPrice > offerPrice;

  return hasDiscountPercent || hasBatchOffer || hasLowerOfferPrice;
}

function isCurrentRealOfferV41(offer: RuoanHintaOffer): boolean {
  return isOfferActiveNowV41(offer) && hasRealOfferSignalV41(offer);
}


const K_SUPERMARKET_JOKELA_RUOANHINTA_STORE_ID_V44 = "3334";
const K_SUPERMARKET_JOKELA_KRUOKA_STORE_ID_V44 = "S441";

const K_SUPERMARKET_JOKELA_LEAFLET_PAGE1_EANS_V44 = new Set<string>([
  "2000101000006",
  "2000101100003",
  "6409100026448",
  "6409100026592",
  "6409100026684",
  "6409100026899",
  "6409100026967",
  "6409100028121",
  "6408430037001",
  "2391373800006",
  "2391383100004",
  "6413300308600",
  "6429810891044",
  "6429810891051",
  "6429810891068",
  "6429810891075",
  "6429810891082",
  "6429810891099",
  "6429810891105",
  "2000410300002",
  "2000410400009",
  "6406300000261",
  "6406300000292",
  "6406300011397",
  "6406300014237",
  "6406300014244",
  "6406300014367",
  "6406300014435",
  "6406300014657",
  "6416453053113",
  "6416453053120",
  "6416453053144",
  "6416453053199",
  "6416453076136",
  "2000686300003",
  "2000524700002",
  "6006258002395",
  "6410405044884",
  "6410405330963",
  "2000333500008",
  "6410405109750",
  "6416046375004",
  "6416046375509",
  "6416046375905",
  "6410405099648",
  "2358689100008",
  "2350467900008",
  "2000113400009",
  "2000121000000",
  "2391162500001",
  "2000221900002",
  "2000281500006",
  "2350012200003",
  "2000417400002",
  "2000953900004",
  "6407080003589",
  "6408800004718",
  "6408800020381",
  "6408800020503",
  "6408800020916",
  "6416627011284",
  "6407800008498",
  "6407800009143",
  "6407800025983",
  "6409100051525",
  "6409100051549",
  "6409100053130",
  "6409100055387",
  "6409100055394",
  "6409100055516",
  "6409100055530",
  "6409100055660",
  "6409100055837",
  "6409100070441",
  "6412000057139",
  "6412000057153",
  "6413467519901",
  "6413467616808",
  "6410402026302",
  "6408430142644",
  "6408430142774",
  "8719200006133",
  "6416710300967",
  "6416710301391",
  "6430064400883",
  "6430064401453",
  "6430064404836",
  "6430064405000",
  "6430064406670",
  "0000042360889",
  "0000042361244",
  "0000042467045",
  "4005808445639",
  "4005808479719",
  "4005900355300",
  "4005900370525",
  "4005900370556",
  "4005900370617",
  "4005900370655",
  "4005900370716",
  "4005900462060",
  "4005900462091",
  "4005900462121",
  "4005900462152",
  "4005900601872",
  "4005900601902",
  "4005900601933",
  "4005900601971",
  "4005900602008",
  "4005900602114",
  "4005900605498",
  "4005900606457",
  "4005900702579",
  "4005900702630",
  "4005900702661",
  "4005900901514",
  "4005900997692",
  "4005900998354",
  "4006000002514",
  "4006000056784",
  "4006000103488",
  "4006000128689",
  "4006000132242",
  "4006000132273",
  "4006000137933",
  "4006000137964",
  "4006000138237",
  "4006000173009",
  "4006000217079",
  "4006000217086",
  "4006000229096",
  "6410405122506",
  "6410405141538",
  "6408659993003",
  "6408659993034",
  "6408659993164",
  "6408659993294",
  "6410405341297",
  "6410405341310",
  "6410405341334",
  "6410405341358",
  "6430066382866",
  "6430066384280",
  "6409770076965",
  "6409770077061",
  "6409770079607",
  "6409770080054",
  "6409770080108",
  "6409770080313",
  "6409770080603",
  "6409770080658",
  "6409770080962",
  "6418784011107",
  "6410803642019",
  "6411401035470",
  "6411401035807",
  "6411401035890",
  "6411401036712",
  "6416453040090",
  "7310532301241",
  "7310532301258",
  "7310532304600",
  "7310532305249",
  "7310532305881",
  "7090046314103",
  "7090046314134",
  "7090046314165",
  "7090046314257",
  "6413600015161",
  "6413605229549",
  "6413605250871",
  "6413605000841",
  "6413605201194",
  "6413605264434",
  "6413605264441",
  "6413605283374",
  "6413605319264",
  "6413605365872",
  "6429811306073",
  "6429811306080",
  "6429811306097",
  "6429811306103",
  "6429811306240",
  "6412000036127",
  "6412000036134",
  "6412000036202",
  "6412000036226",
  "6412000036233",
  "6412000036240",
  "6412000036257"
]);

function isKSupermarketJokelaV44(storeId: string, storeName: string): boolean {
  const normalizedName = normalizeStoreSearchText(storeName);
  return (
    storeId === K_SUPERMARKET_JOKELA_RUOANHINTA_STORE_ID_V44 ||
    normalizedName.includes("k supermarket jokela") ||
    normalizedName.includes("ksupermarket jokela")
  );
}

function isJokelaLeafletEanV44(offer: RuoanHintaOffer): boolean {
  const ean = String(offer.item?.ean ?? "").trim();
  return Boolean(ean) && K_SUPERMARKET_JOKELA_LEAFLET_PAGE1_EANS_V44.has(ean);
}

function matchesQuery(offer: RuoanHintaOffer, query: string): boolean {
  const q = query.trim().toLowerCase();

  // Göstan master-tarjoushaku käyttää sisäistä erikoishakua, ei käyttäjän tekstihakua.
  if (!q || q.startsWith("__ziiply")) return true;

  const haystack = [
    offer.id,
    offer.type,
    offer.source,
    offer.item?.name,
    offer.item?.brandName,
    offer.item?.ean,
    offer.item?.urlSlug,
    offer.item?.category,
    offer.title,
    offer.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function asDebugResult(args: {
  id: string;
  title: string;
  detail?: string;
  storeId?: string | null;
  storeName?: string | null;
  debug?: unknown;
}): ZiiplyOfferSearchResult {
  const title = args.detail ? `${args.title} — ${args.detail}` : args.title;

  return {
    id: `k-debug-v36-${args.id}`,
    title,
    name: title,
    price: null,
    unitPrice: null,
    imageUrl: null,
    storeId: args.storeId ?? "unresolved",
    storeName: args.storeName ?? "K DEBUG",
    chain: "K",
    source: "kruoka",
    provider: "kruoka",
    url: "https://ruoanhinta.fi/",
    benefitText: args.detail ?? args.title,
    discountText: args.detail ?? args.title,
    validityText: "DEBUG",
    category: "Muut",
    categoryPath: "Muut",
    productGroup: "Muut",
    mainCategory: "Muut",
    subCategory: "Muut",
    department: "Muut",
    breadcrumbs: "Muut",
    hierarchy: "Muut",
    taxonomy: "Muut",
    matchScore: 999999,
    debug: args.debug ?? null,
    isDebug: true,
  } as unknown as ZiiplyOfferSearchResult;
}


function getRawCategoryCountsV39(offers: RuoanHintaOffer[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const offer of offers) {
    const label = String(categoryName(offer) || "(tyhjä)").trim() || "(tyhjä)";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function makeVisibleProviderDebugResultV39(args: {
  slot: number;
  storeId: string;
  storeName: string;
  selectedStoreId?: string | null;
  selectedStoreName?: string | null;
  resolveReason?: string | null;
  query: string;
  rawOffers: RuoanHintaOffer[];
  filteredOffers: RuoanHintaOffer[];
  returnedCount: number;
}): ZiiplyOfferSearchResult {
  const categoryCounts = getRawCategoryCountsV39(args.filteredOffers);
  const categorySummary = categoryCounts
    .slice(0, 18)
    .map(([name, count]) => `${name}=${count}`)
    .join(" | ");

  const queryLabel = String(args.query || "").trim() || "(tyhjä/master)";
  const title = `[K DEBUG V39 ${args.slot}] ${args.storeName}`;
  const detail =
    `selectedId=${args.selectedStoreId || "-"} selectedName=${args.selectedStoreName || "-"} ` +
    `resolvedId=${args.storeId} reason=${args.resolveReason || "-"} || ` +
    `query=${queryLabel} raw=${args.rawOffers.length} filtered=${args.filteredOffers.length} returned=${args.returnedCount} || ` +
    `rawCategories: ${categorySummary || "-"}`;

  return {
    id: `k-debug-v39-${args.storeId}-${args.slot}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    name: title,
    productName: title,
    price: 0,
    priceText: "0,00 €",
    offerPrice: "0,00 €",
    unitPrice: null,
    unitPriceText: "",
    imageUrl: null,
    image: null,
    pictureUrl: null,
    storeId: args.storeId,
    storeName: args.storeName,
    storeLabel: args.storeName,
    shopName: args.storeName,
    chain: "K",
    source: "kruoka",
    provider: "kruoka",
    url: "https://ruoanhinta.fi/",
    benefitText: detail,
    discountText: detail,
    validityText: "DEBUG",
    additionalInfo: detail,
    category: "Muut",
    categoryPath: "Muut",
    productGroup: "Muut",
    mainCategory: "Muut",
    subCategory: "Muut",
    department: "Muut",
    breadcrumbs: "Muut",
    hierarchy: "Muut",
    taxonomy: "Muut",
    matchScore: 999999,
    debug: {
      providerVersion: "V39_VISIBLE_PROVIDER_DEBUG_TO_MUUT",
      rawCount: args.rawOffers.length,
      filteredCount: args.filteredOffers.length,
      returnedCount: args.returnedCount,
      rawCategoryCounts: Object.fromEntries(categoryCounts),
    },
    isDebug: true,
  } as unknown as ZiiplyOfferSearchResult;
}

function toOfferResult(args: {
  offer: RuoanHintaOffer;
  index: number;
  storeId: string;
  storeName: string;
}): ZiiplyOfferSearchResult {
  const offer = args.offer;
  const item = offer.item ?? {};
  const offerId = String(offer.id ?? `ruoanhinta-${args.index}`);
  const name = String(item.name ?? offer.title ?? "K-Ruoka tarjous");
  const price = centsToEuros(offer.offerPrice ?? offer.storeItem?.price ?? null);
  const previousPrice = centsToEuros(offer.previousPrice ?? null);
  const unitPriceText = centsToUnitText(
    offer.offerComparisonPrice ?? offer.storeItem?.comparisonPrice ?? null,
    offer.comparisonPriceUnit ?? offer.storeItem?.comparisonPriceUnit ?? null,
  );

  const isPlussa = Boolean(offer.requiresLoyaltyCard || offer.loyaltyProgram === "k-plussa");
  const isBatch = typeof offer.batchQuantity === "number" && typeof offer.batchTotalPrice === "number";
  const priceText = isBatch
    ? `${offer.batchQuantity} kpl ${centsToPriceText(offer.batchTotalPrice) ?? ""} €`.trim()
    : centsToPriceText(offer.offerPrice ?? offer.storeItem?.price ?? null);

  return {
    id: `kruoka-v36-ruoanhinta-${offerId}-${args.index}`,
    title: name,
    name,
    price,
    priceText,
    previousPrice,
    unitPrice: unitPriceText,
    unitPriceText,
    unitPriceUnit: offer.comparisonPriceUnit ?? offer.storeItem?.comparisonPriceUnit ?? null,
    imageUrl: item.pictureUrl ?? null,
    storeId: args.storeId,
    storeName: args.storeName,
    storeLabel: args.storeName,
    chain: "K",
    source: "kruoka",
    provider: "kruoka",
    offerId,
    ean: item.ean ?? null,
    eans: item.ean ? [item.ean] : [],
    brand: item.brandName ?? null,
    unit: offer.storeItem?.priceUnit ?? null,
    additionalInfo: offer.discountPercent != null ? `-${offer.discountPercent}%` : null,
    benefitText: isPlussa ? "Plussa-tarjous" : undefined,
    validityText: formatValidityText(offer.expiresAt),
    category: categoryName(offer),
    categoryPath: item.category ?? categoryName(offer),
    productGroup: categoryName(offer),
    mainCategory: categoryName(offer),
    subCategory: subCategoryName(offer),
    validFrom: offer.startsAt ?? null,
    validUntil: offer.expiresAt ?? null,
    isPlussaOffer: isPlussa,
    url: item.urlSlug
      ? `https://www.k-ruoka.fi/kauppa/tuote/${encodeURIComponent(item.urlSlug)}`
      : "https://ruoanhinta.fi/",
    debug: {
      providerVersion: "V44_V41_PLUS_JOKELA_LEAFLET_EAN_FILTER",
      rawOffer: offer,
      sourceApi: "https://api.ruoanhinta.fi/api/offers",
      ruoanhintaStoreId: args.storeId,
      kRuokaStoreId: isKSupermarketJokelaV44(args.storeId, args.storeName)
        ? K_SUPERMARKET_JOKELA_KRUOKA_STORE_ID_V44
        : null,
    },
  } as unknown as ZiiplyOfferSearchResult;
}

async function fetchRuoanHintaOffers(storeId: string): Promise<RuoanHintaOffer[]> {
  const all: RuoanHintaOffer[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const skip = page * PAGE_SIZE;
    const url = `https://api.ruoanhinta.fi/api/offers?storeId=${encodeURIComponent(storeId)}&skip=${skip}&take=${PAGE_SIZE}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://ruoanhinta.fi",
        Referer: "https://ruoanhinta.fi/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3.1 Safari/605.1.15",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ruoanhinta offers failed: status=${res.status}, body=${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as RuoanHintaResponse;
    const offers = Array.isArray(data.offers) ? data.offers : [];
    all.push(...offers);

    if (offers.length < PAGE_SIZE) break;
  }

  return all;
}

export async function fetchKruokaOffers(
  query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const selectedStoreOptions = getSelectedKStoreOptionsV37(options);

  const allResults = await Promise.all(
    selectedStoreOptions.map(async (storeOptions, storeIndex) => {
      const selectedStoreId = normalizeStoreId(storeOptions);
      const selectedStoreName = normalizeStoreName(storeOptions);

      try {
        const resolved = await resolveRuoanHintaStoreId(storeOptions);

        if (!resolved.storeId) {
          console.warn("[Ziiply K provider V41] Kauppaa ei hyväksytty", {
            selectedStoreId,
            selectedStoreName,
            reason: resolved.reason,
          });
          return [];
        }

        const apiStoreId = String(resolved.storeId);
        const storeName = resolved.matchedStoreName || selectedStoreName;
        const rawOffers = await fetchRuoanHintaOffers(apiStoreId);

        // V41: ensin vain juuri nyt voimassa olevat aidot tarjoukset.
        // Master-query ei saa enää hyväksyä koko API-historiaa.
        const currentOffers = rawOffers.filter(isCurrentRealOfferV41);

        const storeScopedOffers = isKSupermarketJokelaV44(apiStoreId, storeName)
          ? currentOffers.filter(isJokelaLeafletEanV44)
          : currentOffers;

        const filtered = storeScopedOffers.filter((offer) => matchesQuery(offer, query));

        return filtered.map((offer, index) =>
          toOfferResult({
            offer,
            index,
            storeId: apiStoreId,
            storeName,
          }),
        );
      } catch (error) {
        console.warn("[Ziiply K provider V41] Ruoanhinta API virhe", {
          selectedStoreId,
          selectedStoreName,
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    }),
  );

  const seen = new Set<string>();
  const merged: ZiiplyOfferSearchResult[] = [];

  for (const result of allResults.flat()) {
    const anyResult = result as any;
    const key = [
      anyResult.storeId ?? "",
      anyResult.ean ?? anyResult.offerId ?? anyResult.id ?? "",
      anyResult.priceText ?? anyResult.price ?? "",
      anyResult.title ?? anyResult.name ?? "",
    ].join("|").toLowerCase();

    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(result);
  }

  return merged;
}

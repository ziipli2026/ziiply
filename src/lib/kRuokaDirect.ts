type KRecord = Record<string, any>;
type KStoreContext = { storeId: string; storeName: string; slug: string; buildNumber: string; expiresAt: number; resolutionSource: "selected-external-id" | "exact-k-store-page" };
const contextCache = new Map<string, KStoreContext>();
const contextRequests = new Map<string, Promise<KStoreContext>>();
// Verified from K-ruoka public runtime/bundle and successful product requests on 2026-10-12.
let verifiedKBuildNumber = "33094";

const record = (value: unknown): KRecord => value && typeof value === "object" ? value as KRecord : {};
const records = (value: unknown): KRecord[] => Array.isArray(value) ? value.map(record) : [];
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const normalize = (value: string): string => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const cents = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value * 100) : undefined;

function decodeStateAttribute(value: string): string {
  const entities: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", "#39": "'", "#x27": "'" };
  return value.replace(/&(quot|amp|lt|gt|#39|#x27);/g, (_, entity: string) => entities[entity]);
}

export function parseKDirectStoreContext(html: string, storeName: string, slug: string): KStoreContext {
  const match = html.match(/<div\b[^>]*\bid="applicationState"[^>]*\bdata-state="([^"]+)"/i);
  if (!match) throw new Error("K store page application state missing");
  const state = JSON.parse(decodeStateAttribute(match[1]));
  const selected = record(state?.reduxState?.user?.selectedStore);
  if (text(selected.slug) !== slug || normalize(text(selected.name)) !== normalize(storeName)) {
    throw new Error("K store page identity mismatch");
  }
  const storeId = text(selected.id);
  if (!/^[A-Z][A-Z0-9]{2,15}$/.test(storeId)) throw new Error("K official store ID missing");
  const buildNumber = html.match(/\/assets\/b-(\d+)\/(?:runtime|bundle)\.js/)?.[1];
  if (!buildNumber) throw new Error("K store page build version missing");
  verifiedKBuildNumber = buildNumber;
  return { storeId, storeName: text(selected.name), slug, buildNumber, expiresAt: Date.now() + 10 * 60 * 1000, resolutionSource: "exact-k-store-page" };
}

async function resolveKDirectStoreContext(storeName: string, externalId: string): Promise<KStoreContext> {
  const suppliedSlug = text(externalId);
  const slug = /^k-(?:citymarket|supermarket|market)-[a-z0-9-]+$/.test(suppliedSlug)
    ? suppliedSlug : normalize(storeName).replace(/ /g, "-");
  if (!/^k-(?:citymarket|supermarket|market)-[a-z0-9-]+$/.test(slug)) throw new Error("K selected store slug missing");
  // The picker already supplies the official K identifier (e.g. N183).
  // A numeric Ziiply ID is never treated as an official K store identifier.
  if (/^[A-Z][A-Z0-9]{2,15}$/.test(suppliedSlug)) {
    return { storeId: suppliedSlug, storeName, slug, buildNumber: verifiedKBuildNumber,
      expiresAt: Date.now() + 10 * 60 * 1000, resolutionSource: "selected-external-id" };
  }
  const key = normalize(storeName) + "|" + slug;
  const cached = contextCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const pending = contextRequests.get(key);
  if (pending) return pending;
  const request = (async () => {
    const url = "https://www.k-ruoka.fi/kauppa/" + slug;
    const response = await fetch(url, {
      cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { accept: "text/html", "accept-language": "fi", "user-agent": "Mozilla/5.0 Ziiply/1.0" },
    });
    if (!response.ok) throw new Error("K selected store page HTTP " + response.status);
    if (response.url && new URL(response.url).pathname.replace(/\/$/, "") !== "/kauppa/" + slug) {
      throw new Error("K store page redirected to another context");
    }
    const context = parseKDirectStoreContext(await response.text(), storeName, slug);
    if (contextCache.size >= 100) contextCache.delete(contextCache.keys().next().value!);
    contextCache.set(key, context);
    return context;
  })();
  contextRequests.set(key, request);
  try { return await request; } finally { contextRequests.delete(key); }
}

export function mapKDirectProduct(row: KRecord, storeId: string, storeName: string, query: string, now = Date.now()) {
  const product = record(row.product);
  const adInfo = record(product.adInfo);
  if (adInfo.isSponsored === true || row.type !== "product") return null;
  if (text(record(product.store).id) !== storeId || product.isAvailable === false) return null;
  const availability = record(product.availability);
  if (availability.store === false) return null;
  const ean = text(product.ean);
  const name = text(record(product.localizedName).finnish);
  if (!/^\d{8,14}$/.test(ean) || !name) return null;
  if (/^\d{8,14}$/.test(query) && ean !== query) return null;
  const category = record(product.category);
  if (normalize(query) === "voi" && text(category.path) !== "maito-juusto-munat-ja-rasvat/rasvat/voit") return null;
  const pricing = record(record(product.mobilescan).pricing);
  const normal = record(pricing.normal);
  const discount = record(pricing.discount);
  const start = Date.parse(text(discount.startDate));
  const end = Date.parse(text(discount.endDate));
  // Membership and quantity-based prices remain metadata; compare the ordinary
  // single-item price unless the active standard discount is unconditional.
  const ordinaryDiscount = discount.discountType === "STANDARD" &&
    (discount.type == null || discount.type === "sameprice") &&
    discount.minimumQuantity == null && discount.quantity == null && discount.bundlePrice == null &&
    !record(product.mobilescan).discountLimited &&
    record(discount.discountAvailability).store === true &&
    Number.isFinite(start) && Number.isFinite(end) && start <= now && end >= now && cents(discount.price) != null;
  const effective = ordinaryDiscount ? discount : normal;
  const price = cents(effective.price);
  if (price == null) return null;
  const comparison = record(effective.unitPrice);
  const hierarchy = records(category.tree);
  const image = text(record(record(product.productAttributes).image).url);
  return {
    id: ean, ean, name, brandName: text(record(product.brand).name) || undefined,
    pictureUrl: image || "https://public.keskofiles.com/f/k-ruoka/product/" + ean,
    category: hierarchy.map(entry => text(record(entry.localizedName).finnish)).filter(Boolean).join(" > "),
    categoryPath: hierarchy.map(entry => text(entry.slug)).filter(Boolean),
    price, priceUnit: "cents", regularPrice: cents(normal.price),
    comparisonPrice: cents(comparison.value), comparisonPriceUnit: text(comparison.unit) || undefined,
    approximatePrice: effective.isApproximate === true, salesUnit: text(effective.unit),
    campaign: Object.keys(discount).length ? discount : undefined,
    storeId, storeName, availability,
    storeItems: [{ price, comparisonPrice: cents(comparison.value), comparisonPriceUnit: text(comparison.unit) || undefined }],
  };
}

export async function fetchKDirectNormalProducts(query: string, storeName: string, externalId: string) {
  const context = await resolveKDirectStoreContext(storeName, externalId);
  const items: NonNullable<ReturnType<typeof mapKDirectProduct>>[] = [];
  const seen = new Set<string>();
  const rawSeen = new Set<string>();
  let total = 0;
  let pages = 0;
  let rawCount = 0;
  for (let offset = 0; offset < 240; offset += 30) {
    const url: URL = new URL("https://www.k-ruoka.fi/kr-api/v2/product-search/" + encodeURIComponent(query));
    url.search = new URLSearchParams({ offset: String(offset), language: "fi", storeId: context.storeId,
      limit: "30", discountFilter: "false", isTosTrOffer: "false" }).toString();
    const response = await fetch(url, {
      method: "POST", body: "{}", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json", "content-type": "application/json", "accept-language": "fi",
        "x-k-build-number": context.buildNumber, origin: "https://www.k-ruoka.fi",
        referer: "https://www.k-ruoka.fi/kauppa/" + context.slug, "user-agent": "Mozilla/5.0 Ziiply/1.0" },
    });
    if (!response.ok) throw new Error("K direct product search HTTP " + response.status);
    const data: KRecord = await response.json();
    if (text(data.storeId) !== context.storeId) throw new Error("K direct product search store identity mismatch");
    if (!Array.isArray(data.result)) throw new Error("K direct product search result array missing");
    const raw = records(data.result);
    total = typeof data.totalHits === "number" ? data.totalHits : 0;
    pages++;
    rawCount += raw.length;
    let newRaw = 0;
    for (const row of raw) {
      const rawId = text(row.id) || text(record(row.product).ean);
      if (rawId && !rawSeen.has(rawId)) { rawSeen.add(rawId); newRaw++; }
      const item = mapKDirectProduct(row, context.storeId, context.storeName, query);
      if (!item || seen.has(item.ean)) continue;
      seen.add(item.ean); items.push(item);
    }
    if (!raw.length || !newRaw || raw.length < 30 || (total > 0 && offset + 30 >= total)) break;
  }
  return { items, storeId: context.storeId, storeName: context.storeName, total, pages, rawCount,
    truncated: rawCount < total, storeResolutionSource: context.resolutionSource, buildNumber: context.buildNumber };
}

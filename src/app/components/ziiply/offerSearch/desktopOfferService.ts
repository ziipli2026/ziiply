import {
  mapZiiplyGostaOfferToCardOfferV147,
  searchZiiplyGostaOffersV146,
} from "./ziiplyOfferSearchCore";
import {
  desktopOfferCacheKey,
  desktopOfferContext,
  type DesktopOfferChain,
  type DesktopOfferStore,
} from "./desktopOfferContext";

/**
 * Desktop adapter to the same Gösta offer search core used by mobile.
 * Keeps UI state, presentation and browser storage out of the data layer.
 */
export async function fetchDesktopGostaOffers(
  chain: DesktopOfferChain,
  store: DesktopOfferStore,
  query = "",
) {
  const response = await searchZiiplyGostaOffersV146({
    query,
    terms: query.trim() ? [query.trim()] : [],
    context: desktopOfferContext(chain, store),
  });
  return (response.results || []).map(mapZiiplyGostaOfferToCardOfferV147);
}

export function createDesktopGostaOfferLoader() {
  const cache = new Map<string, Awaited<ReturnType<typeof fetchDesktopGostaOffers>>>();
  const pending = new Map<string, Promise<Awaited<ReturnType<typeof fetchDesktopGostaOffers>>>>();

  async function load(chain: DesktopOfferChain, store: DesktopOfferStore, options: { refresh?: boolean } = {}) {
    const key = desktopOfferCacheKey(chain, store);
    if (!options.refresh && cache.has(key)) return cache.get(key)!;
    if (pending.has(key)) return pending.get(key)!;
    const request = fetchDesktopGostaOffers(chain, store);
    pending.set(key, request);
    try {
      const results = await request;
      cache.set(key, results);
      return results;
    } finally {
      pending.delete(key);
    }
  }

  function invalidate(chain?: DesktopOfferChain, store?: DesktopOfferStore) {
    if (chain && store) cache.delete(desktopOfferCacheKey(chain, store));
    else cache.clear();
  }

  return { load, invalidate };
}

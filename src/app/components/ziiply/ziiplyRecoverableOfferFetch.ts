import { registerZiiplyRecoverableRequest } from './ziiplyRequestRecovery';

let nextRequestId = 0;

/** Track offer searches until response headers arrive, and release on every outcome. */
export async function fetchZiiplyRecoverableOfferSearch(url: string): Promise<Response> {
  if (typeof window === 'undefined') {
    return fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const id = `ziiply-offer-${++nextRequestId}`;
  const unregister = registerZiiplyRecoverableRequest(id, {
    kind: 'offer-search',
    startedAt: Date.now(),
    abort: () => controller.abort(),
    // The existing offer search UI owns retries; never restart server leaflet parsing
    // or touch the basket from a background wake-up.
    recover: () => window.dispatchEvent(new CustomEvent('ziiply:offer-search-interrupted')),
  });
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    unregister();
  }
}

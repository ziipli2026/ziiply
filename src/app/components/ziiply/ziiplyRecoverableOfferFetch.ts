import { registerZiiplyRecoverableRequest } from '../ziiplyRequestRecovery';

let nextRequestId = 0;

/**
 * Keep the request registered until the JSON body has finished downloading.
 * fetch() alone resolves on response headers, which can leave a suspended tab
 * hanging in response.json() with no recoverable request registered.
 */
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
  });

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    // Fully buffer the body while the abort controller remains active.
    // Reconstitute a standard Response so existing .clone() and .json()
    // callers work without modification.
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } finally {
    clearTimeout(timeout);
    unregister();
  }
}

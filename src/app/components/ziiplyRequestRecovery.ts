/**
 * Optional registry for in-flight searches. A wake event can cancel only requests
 * that explicitly register here; never registers basket price fetches.
 */
export type ZiiplyRecoverableKind = 'product-search' | 'offer-search' | 'store-search';
type RequestEntry = { kind: ZiiplyRecoverableKind; startedAt: number; abort: () => void; recover?: () => void };
const requests = new Map<string, RequestEntry>();
export function registerZiiplyRecoverableRequest(id: string, request: RequestEntry): () => void {
  requests.set(id, request);
  return () => { if (requests.get(id) === request) requests.delete(id); };
}
export function recoverZiiplyStalledRequests(now: number, staleAfterMs = 30_000): number {
  let recovered = 0;
  for (const [id, request] of requests) {
    if (now - request.startedAt < staleAfterMs) continue;
    requests.delete(id);
    try { request.abort(); } catch { /* stale request may already be settled */ }
    try { request.recover?.(); } catch { /* isolated UI recovery */ }
    recovered++;
  }
  return recovered;
}

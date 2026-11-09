"use client";

/** Privacy-safe search outcome measurement. Call at actual UI state transitions. */
export type SearchOutcome = "priced_results" | "no_priced_results" | "partial_source_failure" | "error";
export type SearchKind = "normal" | "ean" | "offer";
export type SearchSession = { id: string; kind: SearchKind; startedAt: number; firstPriceReported: boolean; finished: boolean };

const active = new Map<string, SearchSession>();
let lastCompletedSearch: { id: string; kind: SearchKind; selected: boolean; closed: boolean } | null = null;

export function recordSearchResultsDismissed(): void {
  const previous = lastCompletedSearch;
  if (!previous || previous.selected || previous.closed) return;
  previous.closed = true;
  safeCapture("search_results_dismissed", { search_id: previous.id, search_kind: previous.kind });
}

// Deliver via Ziiply's own server endpoint so Safari content blockers cannot
// silently suppress the PostHog SDK. The server logs the upstream HTTP result.
const safeCapture = (event: string, props: Record<string, string | number | boolean>) => {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/analytics/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...props }),
      keepalive: true,
    }).catch(() => { /* analytics must never block search */ });
  } catch { /* analytics must never block search */ }
};

export function beginSearchTelemetry(kind: SearchKind): SearchSession {
  const session: SearchSession = {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind, startedAt: typeof performance !== "undefined" ? performance.now() : Date.now(),
    firstPriceReported: false, finished: false,
  };
  // Starting another search without selecting a result is browsing, not a failed search.
  if (lastCompletedSearch && !lastCompletedSearch.selected && !lastCompletedSearch.closed) {
    safeCapture("search_no_selection", { search_id: lastCompletedSearch.id, search_kind: lastCompletedSearch.kind });
  }
  lastCompletedSearch = null;
  active.set(session.id, session);
  safeCapture("search_started", { search_id: session.id, search_kind: kind });
  return session;
}

export function recordFirstPricedResults(session: SearchSession, pricedCount: number): void {
  const current = active.get(session.id);
  if (!current || current.finished || current.firstPriceReported || pricedCount < 1) return;
  current.firstPriceReported = true;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  safeCapture("search_first_price_shown", {
    search_id: session.id, search_kind: session.kind,
    time_to_first_price_ms: Math.max(0, Math.round(now - session.startedAt)),
    priced_count: Math.max(1, Math.floor(pricedCount)),
  });
}

export function finishSearchTelemetry(session: SearchSession, outcome: SearchOutcome, pricedCount = 0): void {
  const current = active.get(session.id);
  if (!current || current.finished) return;
  if (pricedCount > 0) recordFirstPricedResults(current, pricedCount);
  current.finished = true;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  safeCapture("search_completed", {
    search_id: session.id, search_kind: session.kind, outcome,
    priced_count: Math.max(0, Math.floor(pricedCount)),
    elapsed_ms: Math.max(0, Math.round(now - session.startedAt)),
  });
  active.delete(session.id);
  if (outcome === "priced_results" && pricedCount > 0) lastCompletedSearch = { id: session.id, kind: session.kind, selected: false, closed: false };
}

/** Cancelled searches are excluded from success-rate denominators. */
export function cancelSearchTelemetry(session: SearchSession): void {
  if (!active.has(session.id)) return;
  active.delete(session.id);
  safeCapture("search_cancelled", { search_id: session.id, search_kind: session.kind });
}

/** Track a real user cart selection, not merely displaying search results.
 * Never transmit product names, EANs, search terms, or cart contents.
 */
export function recordSearchProductAddedToCart(): void {
  const previous = lastCompletedSearch;
  // A cart selection belongs to the actual displayed search, not a new random ID.
  // Multiple selections from the same results intentionally share the search_id.
  if (!previous || previous.closed) return;
  previous.selected = true;
  safeCapture("product_added_to_cart", { search_id: previous.id, search_kind: previous.kind });
}

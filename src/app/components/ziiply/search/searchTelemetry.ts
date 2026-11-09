"use client";

/** Privacy-safe search outcome measurement. Call at actual UI state transitions. */
export type SearchOutcome = "priced_results" | "no_priced_results" | "partial_source_failure" | "error";
export type SearchKind = "normal" | "ean" | "offer";
export type SearchSession = { id: string; kind: SearchKind; startedAt: number; finished: boolean };

const active = new Map<string, SearchSession>();
let lastCompletedSearch: { id: string; kind: SearchKind; selected: boolean; closed: boolean } | null = null;

export function recordSearchResultsDismissed(): void {
  const previous = lastCompletedSearch;
  if (!previous || previous.selected || previous.closed) return;
  previous.closed = true;
  safeCapture("search_results_dismissed", { search_id: previous.id, search_kind: previous.kind });
}

// Anonymous browser ID: no names, emails, search terms or device fingerprinting.
const ANON_ID_KEY = "ziiply_search_anon_id_v1";
let inMemoryAnonId: string | null = null;
function anonymousSearchUserId(): string {
  if (inMemoryAnonId) return inMemoryAnonId;
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY);
    if (existing && /^a[a-f0-9-]{36}$/.test(existing)) return (inMemoryAnonId = existing);
  } catch { /* storage unavailable */ }
  const id = "a" + (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2));
  inMemoryAnonId = id;
  try { window.localStorage.setItem(ANON_ID_KEY, id); } catch { /* session-only fallback */ }
  return id;
}

// Deliver via Ziiply's own server endpoint so Safari content blockers cannot
// silently suppress the PostHog SDK. The server logs the upstream HTTP result.
const safeCapture = (event: string, props: Record<string, string | number | boolean>) => {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/analytics/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...props, anonymous_user_id: anonymousSearchUserId() }),
      keepalive: true,
    }).catch(() => { /* analytics must never block search */ });
  } catch { /* analytics must never block search */ }
};

export function beginSearchTelemetry(kind: SearchKind): SearchSession {
  const session: SearchSession = {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind, startedAt: typeof performance !== "undefined" ? performance.now() : Date.now(),
    finished: false,
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

export function finishSearchTelemetry(session: SearchSession, outcome: SearchOutcome, pricedCount = 0): void {
  const current = active.get(session.id);
  if (!current || current.finished) return;
  current.finished = true;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  safeCapture("search_completed", {
    search_id: session.id, search_kind: session.kind, outcome,
    results_count: Math.max(0, Math.floor(pricedCount)),
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

"use client";

import posthog from "posthog-js";

/** Privacy-safe search outcome measurement. Call at actual UI state transitions. */
export type SearchOutcome = "priced_results" | "no_priced_results" | "partial_source_failure" | "error";
export type SearchKind = "normal" | "ean" | "offer";
export type SearchSession = { id: string; kind: SearchKind; startedAt: number; firstPriceReported: boolean; finished: boolean };

const active = new Map<string, SearchSession>();
const safeCapture = (event: string, props: Record<string, string | number | boolean>) => {
  try { if (typeof window !== "undefined" && posthog.__loaded) posthog.capture(event, props); }
  catch { /* analytics must never block a search */ }
};

export function beginSearchTelemetry(kind: SearchKind): SearchSession {
  const session: SearchSession = {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind, startedAt: typeof performance !== "undefined" ? performance.now() : Date.now(),
    firstPriceReported: false, finished: false,
  };
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
}

/** Cancelled searches are excluded from success-rate denominators. */
export function cancelSearchTelemetry(session: SearchSession): void {
  if (!active.has(session.id)) return;
  active.delete(session.id);
  safeCapture("search_cancelled", { search_id: session.id, search_kind: session.kind });
}

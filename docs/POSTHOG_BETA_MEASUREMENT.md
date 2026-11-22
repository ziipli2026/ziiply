# Ziiply Beta — PostHog measurement plan

The app's shared PostHog initialization is in src/app/components/PostHogProvider.tsx.
Beetaseurannan tavoitteena on hyödyllinen käyttö, ei pelkkä sivunavaus.

## Dashboard "Ziiply Beta" (create in the PostHog UI)

Filters for every insight: `ziiply_environment = production` and `ziiply_internal_test = false`.
Until actual beta identity/consent is integrated, these filters mean *public production traffic*, not reliably *invited beta users*. Never label the result "beta users" without a server-verified cohort.

1. Activation funnel: `beta_login_succeeded` → first of `search_priced_results_shown`, `cart_item_added`, `cart_comparison_completed`, `recipe_items_added_to_list`, within 24h. Source of the invite count: beta register, not pageviews.
2. Search success: `search_started` → `search_priced_results_shown`; failure `search_no_priced_results` and `search_failed`. On successful results send `time_to_first_price_ms`, `priced_count`, `source_count`; send one terminal result per search ID, not per provider.
3. Basket: `cart_item_added`, `cart_comparison_completed`; send `mode` (one/many), `comparable_store_count`, `calculated_price_difference_eur` (only comparable baskets).
4. Retention: unique verified beta users having one of the meaningful actions on D7–D13 after activation.
5. Feature health: `watch_saved`, `watch_results_opened`, `recipe_items_added_to_list`, `store_switch_prompt_shown`, `store_switch_accepted`, `arvo_health_import_completed`, `arvo_health_import_failed`.
6. Feedback: `search_result_reported_wrong` with enumerated reason and search ID (no raw search term).

## Integration checklist

- Emit events **at successful state transitions** in both mobile main and desktop preview; no UI-click-only proxy for completed search or basket comparison.
- Verify no event is emitted twice on React re-renders; use an ID for per-operation deduplication.
- Identify people only using stable opaque IDs after validated magic-link login; reset identity on logout.
- Keep invite count and verified beta membership sourced from Neon (never trust a user-controlled query parameter).
- Separate internal tests/automated jobs/preview; `?ziiply_test=1` is a convenience browser marker, not an authoritative identity test.
- PostHog live event check after deployment with a consented test user, then a small real beta test.
- Do not send email, raw search terms, magic links, barcode values, recipe/meal content, health measurements, precise GPS, or raw error stacks.
- Disable or mask session recording and autocapture wherever health, location or personal information may appear. Review consent/legal basis before enabling beta analytics.

## Verified status (2026-11-17, preview only)

- GitHub Actions runs 44089587177 and 44089587267 passed. The preview mobile Chromium test selected Prisma Hyvinkää, searched for `maito`, and displayed priced products.
- Actual search events are `search_started` and `search_completed`, with `search_kind: normal`; the terminal `search_completed` includes `outcome: priced_results`, `results_count`, and `elapsed_ms`.
- The search telemetry path is browser `searchTelemetry.ts` -> `POST /api/analytics/search` -> PostHog EU capture. The test observed two HTTP 200 responses with `accepted: true`. PostHog Activity was also visually confirmed to show these event names.
- Browser SDK `/ph-ingest` traffic may contain only feature-flag requests. Client autocapture, pageviews, and session recording are disabled by design; absence of browser capture requests does **not** mean the server search events failed.
- Server search events use `ziiply_analytics_schema: 3` and `ziiply_environment`. **They do not currently set `ziiply_internal_test`**, unlike the browser SDK. Preview environment must therefore be excluded explicitly from public-production insights.
- The dashboard plan above contains **proposed**, not yet proven, event names such as `search_priced_results_shown`, `cart_item_added`, and `beta_login_succeeded`. Do not build a funnel expecting them without implementing and verifying the relevant emitters. For search success, use `search_completed` filtered by `outcome=priced_results` until the event taxonomy is intentionally migrated.
- The successful smoke verifies only the normal search path. It does not establish verified beta identities, invited-user cohorts, consent/legal basis, D7 retention, cart comparison, offer-watch or recipe event coverage.
- PR #295 is a draft and should not be merged solely on the strength of these two successful checks.

## Next validation

1. Inspect a `search_completed` event in PostHog for `search_id`, `search_kind`, `outcome`, `results_count`, `elapsed_ms`, `ziiply_environment`, and schema version. Confirm no raw search term or EAN is present.
2. Audit event emitters and consent before enabling production beta dashboards. Decide how to identify internal test events on the server without trusting a user-supplied test marker.
3. Add separate UI-transition smoke checks for cart addition/comparison, Gösta watch, and recipe actions before claiming full beta instrumentation readiness.


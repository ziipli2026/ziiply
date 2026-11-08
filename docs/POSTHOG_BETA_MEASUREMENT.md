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

## Current status (2026-11-08)

PostHog SDK exists and the Arvo nutrition scanner emits several events. The main shared `trackZiiplyEvent` helper exists, but GitHub search did not reveal application callers. Events and dashboards inside PostHog are not yet independently verified. A shared privacy/environment-filter baseline was committed on 2026-11-08; do not confuse it with a complete beta dashboard.

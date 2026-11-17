# PostHog beta verification (test branch only)

## Verified by CI
- Inventory: 24 unique literal event names through `trackZiiplyEvent` (plus direct PostHog calls that need separate review).
- 10 static regression checks passed in GitHub Actions run 43935084170.
- Autocapture, automatic pageviews and session recording remain disabled.
- Internal test marker and environment marker are configured.

## Not yet verified
- Actual ingestion by PostHog EU project through `/ph-ingest`.
- Search completion / no-results / API failure coverage, offer-watch refresh outcomes, and application errors.
- Privacy of *values* in event properties and PostHog default properties (static checks only test presence of the scrubber).
- Mobile and desktop browser behavior, and session replay consent/masking.

## Manual smoke test (once preview is available)
1. Open preview with `?ziiply_test=1` and confirm the internal-test marker persists in localStorage. Do not use a real user account.
2. In browser developer tools, filter Network for `ph-ingest`. Select a store, search for a common product, add an item to cart and open Gösta's offers.
3. Verify ingestion HTTP response and PostHog Live Events; inspect event names and properties, and confirm `ziiply_environment=preview`, `ziiply_internal_test=true`.
4. Confirm no raw search text, EAN, GPS coordinates, nutrition/health data, email, full URL or login tokens appear in event properties. Test with synthetic input only.
5. Repeat on mobile viewport. Verify the same action produces one event per user action and no console errors.
6. Open `?ziiply_test=0` to clear the internal test marker after testing.

Do not turn on session replay or deploy this PR to production until privacy and browser tests pass.

## Live Chromium finding — 2026-11-17

- Production app alias `https://ziiply.vercel.app/` loads the real application (not the `ziiply.fi` marketing site).
- `Gösta: Tarjoushaku` button can be clicked in mobile Chromium.
- The observed two PostHog POSTs were **only** `/ph-ingest/flags/` (HTTP 308 redirect) and `/ph-ingest/flags` (HTTP 200). These are feature-flag requests, **not captured analytics events**.
- The stricter smoke test correctly fails when no event-ingestion response is observed (GitHub Actions run 44028840456).
- The shared `trackZiiplyEvent` helper exists in `ziiplyCore.ts`, but the search-card UI invokes `onNormalSearch` without direct tracking. Do not add `search_priced_results_shown` at the click handler: it must be emitted after actual priced results are available. The real parent search orchestration needs to be identified before instrumenting success/failure transitions in both layouts.
- Event receipt in the PostHog project remains **unverified**. Do not merge on the basis of flag requests or a passing page-load smoke test.

## Search orchestration trace (2026-11-17)

- Source: `src/app/page.tsx` (Git blob `179fe9372378da7253cc5198f862bf55b5ac65e6`), examined directly rather than relying on incomplete code-search indexing.
- Mobile `ZiiplyMobileSearchCard` receives `onNormalSearch={handleMainNormalSearch}`.
- `handleMainNormalSearch` already calls `trackZiiplyEvent('main_search_clicked', {query, searchType, cartItemsCount})`, then invokes `searchNormalPrices(...)`. The provider's privacy filtering must be verified for the raw `query` property before approving beta analytics.
- `searchNormalPrices` is the async search orchestrator; it handles shared S/K/Lidl/Tokmanni store queries and other modes. Instrument **actual terminal results**, not just the button callback.
- `search_priced_results_shown` is not present in the inspected `page.tsx`. Implement a deduplicated success/empty/error outcome only after identifying the authoritative terminal state in `searchNormalPrices`.
- Existing `main_search_clicked` is a genuine instrumentation call, correcting the earlier overly broad statement that normal search had no event call sites. Its presence in source does **not** establish that production emitted or PostHog stored it.

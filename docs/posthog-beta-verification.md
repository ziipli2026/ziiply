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

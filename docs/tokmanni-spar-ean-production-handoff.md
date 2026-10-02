# EAN production integration — implementation handoff (audit only)

## Existing behavior to protect
- `src/app/api/tokmanni/products/route.ts`: live Klevu normal-price search, HTML fallback, and background EAN observations.
- `src/lib/eanBank.ts`: `observeEanProductsBestEffort` writes observations to Neon when `DATABASE_URL` is present. Its UPSERT may replace NULL/blank/`Muut` with a provider-supplied category. This is **not equivalent** to manual classification approval.
- Do not use the audit JSON as a static production allowlist: Klevu inventory changes and newly discovered EANs would disappear.

## Required changes before enabling filtering
1. Store provider-supplied category and independently reviewed grocery category separately; preserve original `category` until an explicit migration is approved.
2. Add classification status and evidence to a separate, versioned table keyed by normalized EAN (or approved equivalent), with an explicit unknown state. No automatic promotion from name proposals.
3. Join this index in a **read-only preview** before enabling filtering. Produce counts of accepted, excluded and unknown matches for representative queries, including newly discovered EANs.
4. Preserve barcode recognition independently from grocery-search visibility. Preserve Gösta offer rules and Justiina normal-price semantics.
5. Verify HTML fallback is subject to the same approved visibility policy only after its EAN coverage has been tested.
6. Keep old behavior behind an explicit rollback switch. No Neon schema/write, PR merge or production deploy without approval.

## Acceptance criteria
- Previously approved groceries remain discoverable and priced correctly.
- Known non-grocery products do not enter grocery search merely because they have an EAN.
- Unknown EANs are retained for scanner recognition/review, not silently promoted.
- No product vanishes just because it is absent from a finite audit snapshot; unknown handling must be deliberate and tested.
- No change to basket price arithmetic or offer comparison.
- Audit artifacts and classification suggestions remain review-only.

Status: design handoff only. Audit workflow is green; mobile integration and migration are not yet validated.

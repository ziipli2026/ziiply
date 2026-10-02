# SPAR/Tokmanni EAN audit — acceptance report (2026-10-02)

Source: GitHub Actions run 37023719650, commit 294ddcb, artifact 11234240663.

## Results
- Run: success. Regression checks: **10/10 passed**. Quality gate: passed; zero reported errors.
- 7,136 unique EANs: 3,012 daily; 334 department_store; 3,790 review.
- Historical rows: 3,644. Latest Klevu gap rows: 4,279. Overlap: 787.
- Historical `Muut` review triage: 59 grocery category proposals, 977 department-store proposals, 1,145 unresolved (2,181 total in this snapshot).
- No automatic approvals; no Neon writes.

## Scope and limitations
- Passing tests validate dataset conservation, uniqueness, classification structure and static presence of normal-price, fallback and EAN observation code.
- This **does not** verify real mobile usage, accuracy of every category, production database migration or live production filtering.
- Audit labels and name-based proposals are not approved categories. Do not silently insert them into grocery search.
- Counts may change between Klevu snapshots; this report applies to the specific run above.

## Release status
**Audit regression complete. Production integration not approved or deployed.**
Before activation: review classification sample and unresolved handling, approve proposed schema/filtering, verify scanner + Justiina + Gösta + basket on mobile, then explicitly authorize any Neon write and deployment.

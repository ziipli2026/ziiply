# Fuel production cutover — prepared 2026-10-14

Source: `br-weathered-meadow-b1bwpzst`.
Live target: `br-lucky-fog-b1hwz641`.
Validation copy: `br-aged-water-b1u2adko` (a child of live production).

The migration touches only these five fuel tables: stations, normalized price observations,
raw provider observations, station identity review candidates, and user fuel reports.
Existing live rows are preserved. Reviewed source station metadata and traffic classification
replace matching station rows. Price history is deduplicated by its natural key; local
observation identity IDs are generated in the destination. No Teboil rows are imported.

Exactly one retained user report is required before execution:
`c7d664a0-c0ab-4a0e-8d73-3e1f15db8041`, ABC Sale Monninkylä, observed
2026-10-14 at 15:38 Europe/Helsinki, prices 95=2.178, 98=2.275, diesel=2.421.
Its photo, evidence, GPS, timestamps, UUID and pending review status are preserved.
Any new source report causes execution to stop for review rather than silently omit it.

`prepare-migration.cjs` requires a private, untracked JSON file containing `source` and
`target` connection strings. Credentials must never be committed. All writes run in one
transaction after checking both branch identities. The live target additionally requires
`--apply-production`; do not use that flag for preparation.

## Validation

1. Point the private target connection to the validation copy.
2. Run `node scripts/fuel-production/prepare-migration.cjs <private-config> br-aged-water-b1u2adko`.
3. Run `node scripts/fuel-production/verify-validation.cjs <private-config> br-aged-water-b1u2adko`.
4. Re-run the migration and verify row counts stay unchanged (idempotence).

The verification uses the real station GET route and report POST route against the validation
copy. It checks the full station list, Monninkylä's 36 m GPS match, all three report prices,
and duplicate submission protection without adding another report.

## Production activation (separate from preparation)

1. Obtain a fresh backup/snapshot of the live branch.
2. Ensure no new source reports arrived and the tested code is ready for release.
3. Change only the private config's target connection to live main.
4. Run the reviewed migration with expected target `br-lucky-fog-b1hwz641` and
   explicit `--apply-production`.
5. Verify the copied registry and retained report directly in main.
6. Publish this prepared application change and set `FUEL_PRODUCTION_ENABLED=true`
   for Production, then redeploy. `DATABASE_URL` remains the existing live main connection.
7. Check the live station GET and photo report flow. Reports remain pending review;
   switching databases does not automatically publish user-submitted prices.

## Rollback

Set `FUEL_PRODUCTION_ENABLED=false` and redeploy: photo lookup and report collection
return to the existing test registry. Preserve all reports received in main; do not restore
a database snapshot over other Ziiply data. Reconcile any reports written during a live
period before subsequent activation. Preparation does not change Production env values.

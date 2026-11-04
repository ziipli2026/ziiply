# Arvo cloud meal storage: server contract

Status: **design only**. Do not expose this API or apply migration until verified beta session authentication and explicit cloud meal consent are implemented.

## Security requirements

- All endpoints require a server-validated, non-revoked, unexpired beta session; derive the user ID from the session only.
- Require separately recorded consent to cloud meal storage, not merely Apple Health read permission. Recheck it on each read/write/delete.
- Reject client-supplied user IDs and enforce a bounded request body and batch size.
- All SQL operations must include `WHERE user_id = authenticated_user_id`; never accept arbitrary user IDs in a query parameter.
- POST is idempotent by `(user_id,meal_id)`. Do not overwrite an existing server meal silently on conflict.
- DELETE is a soft-delete (`deleted_at`) to prevent an older device re-uploading a removed meal.
- GET returns only rows with `deleted_at IS NULL`, while sync metadata may include tombstone IDs scoped to the same user.
- Treat unknown nutrient values as NULL; reject nonfinite/negative values and invalid UUIDs.
- Revoke cloud consent: immediately block all future reads and writes. Define a separate authenticated deletion flow for stored cloud data.
- HealthKit data is a different, more sensitive permission domain; this meal contract does not authorize any health data transfer.

## Prerequisites before rollout

1. Locate and verify the production beta authentication implementation, including how a secure cookie maps to `ziiply_beta_sessions.token_hash`.
2. Verify database schema and identify where explicit consent is durably recorded and revoked.
3. Add server integration tests for unauthorized requests, cross-user isolation, revoked sessions, consent withdrawal, duplicate uploads, and deleted-meal resurrection.
4. Apply migration in a controlled environment, test and review before any production change.

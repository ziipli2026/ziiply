-- Arvo meal persistence statements, to be executed ONLY after the caller
-- is authenticated and explicit meal cloud consent is verified server-side.
-- All queries scope records to the authenticated user ID ($1).
-- These are templates, not exposed endpoints or applied migrations.

-- Insert statements below use the durable deletion ledger guard.

-- Soft-delete an existing meal. A retry is idempotent.
-- $1 user_id, $2 meal_id
UPDATE public.ziiply_arvo_meals
SET deleted_at=COALESCE(deleted_at,now()),updated_at=now()
WHERE user_id=$1 AND meal_id=$2;

-- Fetch visible meals for this user only, most recent first.
-- $1 user_id, $2 limit
SELECT meal_id,consumed_at,ean,product_name,grams,kcal,protein_g,carbs_g,fat_g
FROM public.ziiply_arvo_meals
WHERE user_id=$1 AND deleted_at IS NULL
ORDER BY consumed_at DESC,meal_id DESC LIMIT $2;

-- Fetch durable deletion identifiers, including delete-before-insert records.
-- $1 user_id, $2 limit
SELECT meal_id,deleted_at
FROM public.ziiply_arvo_meal_deletions
WHERE user_id=$1
ORDER BY deleted_at DESC,meal_id DESC LIMIT $2;

-- Out-of-order-safe deletion, executed in a transaction with the UPDATE:
-- $1 user_id, $2 meal_id. This creates a tombstone even if no meal exists.
INSERT INTO public.ziiply_arvo_meal_deletions (user_id,meal_id)
VALUES ($1,$2)
ON CONFLICT (user_id,meal_id) DO NOTHING;

-- Guard new inserts by checking the durable deletion ledger.
-- The API must serialize insert/delete for the same (user_id,meal_id),
-- e.g. a transaction-scoped advisory lock, to avoid a concurrent race.
-- Example guarded insert predicate to use with INSERT ... SELECT:
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.ziiply_arvo_meal_deletions
--   WHERE user_id=$1 AND meal_id=$2
-- );

-- REQUIRED transaction protocol for each single-meal insert or delete:
-- BEGIN;
-- SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2::text, 0));
-- [execute the insert or delete below]
-- COMMIT;
-- The lock is scoped to user_id and meal_id; all writers must use it.
-- PostgreSQL hash collisions only cause extra serialization, not data leakage.

-- Guarded insert; execute inside the per-meal transaction above.
-- $1 user_id, $2 meal_id, $3 consumed_at, $4 ean, $5 product_name,
-- $6 grams, $7 kcal, $8 protein_g, $9 carbs_g, $10 fat_g
INSERT INTO public.ziiply_arvo_meals
 (user_id,meal_id,consumed_at,ean,product_name,grams,kcal,protein_g,carbs_g,fat_g)
SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
WHERE NOT EXISTS (
 SELECT 1 FROM public.ziiply_arvo_meal_deletions
 WHERE user_id=$1 AND meal_id=$2
)
ON CONFLICT (user_id,meal_id) DO NOTHING;

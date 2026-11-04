-- Ziiply Arvo: user-owned meal records.
-- Apply only to the Ziiply application database after verifying session integration.
CREATE TABLE IF NOT EXISTS public.ziiply_arvo_meals (
  user_id uuid NOT NULL REFERENCES public.ziiply_beta_users(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL,
  consumed_at timestamptz NOT NULL,
  ean text NOT NULL CHECK (ean ~ '^[0-9]{8,14}$'),
  product_name text NOT NULL CHECK (length(trim(product_name)) BETWEEN 1 AND 500),
  grams numeric(12,2) NOT NULL CHECK (grams > 0),
  kcal numeric(12,2) CHECK (kcal >= 0),
  protein_g numeric(12,2) CHECK (protein_g >= 0),
  carbs_g numeric(12,2) CHECK (carbs_g >= 0),
  fat_g numeric(12,2) CHECK (fat_g >= 0),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,meal_id)
);
CREATE INDEX IF NOT EXISTS ziiply_arvo_meals_user_consumed_idx
  ON public.ziiply_arvo_meals(user_id,consumed_at DESC);
-- The API must derive user_id from a validated server-side session.
-- Never grant anonymous INSERT/SELECT/UPDATE/DELETE on this table.

-- A soft-delete tombstone survives a retry and prevents an older device
-- from resurrecting a meal. The API must exclude deleted_at IS NOT NULL
-- from statistics, and reject stale re-uploads until explicitly restored.
-- Never trust client-provided user_id, consent or timestamps as authorization.

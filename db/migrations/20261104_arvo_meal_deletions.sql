-- Durable delete ledger for out-of-order Arvo sync.
-- Not applied. Requires verified server session and explicit cloud meal consent.
CREATE TABLE IF NOT EXISTS public.ziiply_arvo_meal_deletions (
  user_id uuid NOT NULL REFERENCES public.ziiply_beta_users(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,meal_id)
);
CREATE INDEX IF NOT EXISTS ziiply_arvo_meal_deletions_user_time_idx
 ON public.ziiply_arvo_meal_deletions(user_id,deleted_at DESC);
-- Ledger entries are retained to reject stale uploads from offline devices.
-- Never grant anonymous access to this table.

-- Run against Ziiply production Neon before enabling durable local Tjek snapshots.
CREATE TABLE IF NOT EXISTS public.ziiply_kcitymarket_tjek_snapshots (
  store_key text PRIMARY KEY,
  offers jsonb NOT NULL,
  publication_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  valid_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ziiply_kcitymarket_tjek_snapshots_valid_until_idx
  ON public.ziiply_kcitymarket_tjek_snapshots(valid_until);

-- Arvo health consent foundation. REVIEW ONLY: do not run against production before auth and privacy review.
BEGIN;
CREATE TABLE IF NOT EXISTS public.arvo_health_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  notice_version text NOT NULL,
  purposes text[] NOT NULL CHECK (cardinality(purposes)>0),
  categories text[] NOT NULL CHECK (cardinality(categories)>0),
  action text NOT NULL CHECK (action IN ('granted','revoked')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  supersedes_id uuid REFERENCES public.arvo_health_consents(id)
);
CREATE INDEX IF NOT EXISTS arvo_health_consents_user_time_idx ON public.arvo_health_consents(user_id,recorded_at DESC);
CREATE TABLE IF NOT EXISTS public.arvo_health_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('apple_health','health_connect')),
  consent_id uuid NOT NULL REFERENCES public.arvo_health_consents(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','revoked','error')),
  last_synced_at timestamptz,
  UNIQUE(user_id,provider)
);
CREATE TABLE IF NOT EXISTS public.arvo_health_daily_summaries (
  user_id text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('apple_health','health_connect')),
  local_date date NOT NULL,
  timezone text NOT NULL,
  steps integer CHECK (steps>=0),
  active_kcal numeric(10,2) CHECK (active_kcal>=0),
  total_kcal numeric(10,2) CHECK (total_kcal>=0),
  weight_kg numeric(7,2) CHECK (weight_kg>0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,provider,local_date)
);
-- Application DB role must NOT get unrestricted access. Configure least-privilege
-- server-side user scoping and/or RLS before deploying this migration.
COMMIT;

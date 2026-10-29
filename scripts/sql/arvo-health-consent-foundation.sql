-- Arvo Health: schema only. DO NOT run against production until auth, retention,
-- access control and privacy review are completed.
-- No public API access: only trusted server role may access these tables.
CREATE TABLE IF NOT EXISTS public.arvo_health_consents (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id text NOT NULL,
 policy_version text NOT NULL,
 purposes text[] NOT NULL,
 categories text[] NOT NULL,
 privacy_acknowledged boolean NOT NULL CHECK (privacy_acknowledged),
 explicitly_consented boolean NOT NULL CHECK (explicitly_consented),
 consented_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 CHECK (array_length(purposes, 1) > 0),
 CHECK (array_length(categories, 1) > 0),
 CHECK (revoked_at IS NULL OR revoked_at >= consented_at)
);
CREATE INDEX IF NOT EXISTS arvo_health_consents_user_idx ON public.arvo_health_consents(user_id, consented_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS arvo_health_one_active_consent_idx ON public.arvo_health_consents(user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.arvo_health_connections (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id text NOT NULL,
 provider text NOT NULL CHECK (provider IN ('apple_health', 'health_connect')),
 consent_id bigint NOT NULL REFERENCES public.arvo_health_consents(id),
 enabled boolean NOT NULL DEFAULT false,
 last_sync_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, provider)
);
CREATE INDEX IF NOT EXISTS arvo_health_connections_user_idx ON public.arvo_health_connections(user_id);

CREATE TABLE IF NOT EXISTS public.arvo_health_daily_summaries (
 user_id text NOT NULL,
 provider text NOT NULL CHECK (provider IN ('apple_health', 'health_connect')),
 local_date date NOT NULL,
 timezone text NOT NULL,
 steps integer CHECK (steps >= 0),
 active_energy_kcal numeric(10,2) CHECK (active_energy_kcal >= 0),
 resting_heart_rate_bpm numeric(7,2) CHECK (resting_heart_rate_bpm > 0),
 hrv_sdnn_ms numeric(9,2) CHECK (hrv_sdnn_ms >= 0),
 sleep_total_minutes integer CHECK (sleep_total_minutes >= 0),
 sleep_rem_minutes integer CHECK (sleep_rem_minutes >= 0),
 sleep_deep_minutes integer CHECK (sleep_deep_minutes >= 0),
 sleep_core_minutes integer CHECK (sleep_core_minutes >= 0),
 sleep_awake_minutes integer CHECK (sleep_awake_minutes >= 0),
 source_device text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id, provider, local_date)
);
CREATE INDEX IF NOT EXISTS arvo_health_daily_summaries_user_date_idx ON public.arvo_health_daily_summaries(user_id, local_date DESC);

CREATE TABLE IF NOT EXISTS public.arvo_health_privacy_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id text NOT NULL,
 consent_id bigint REFERENCES public.arvo_health_consents(id),
 event_type text NOT NULL CHECK (event_type IN ('granted', 'revoked', 'deletion_requested', 'deletion_completed')),
 policy_version text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS arvo_health_privacy_events_user_idx ON public.arvo_health_privacy_events(user_id, created_at DESC);

-- Defense in depth: ordinary public/anonymous database roles cannot read health data.
REVOKE ALL ON public.arvo_health_consents, public.arvo_health_connections,
 public.arvo_health_daily_summaries, public.arvo_health_privacy_events FROM PUBLIC;
ALTER TABLE public.arvo_health_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arvo_health_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arvo_health_daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arvo_health_privacy_events ENABLE ROW LEVEL SECURITY;
-- No policies intentionally: deny-by-default for non-bypass roles.
-- The application must use authenticated, server-side per-user authorization.
-- Do not enable ingestion until consent/withdrawal/deletion APIs are implemented.

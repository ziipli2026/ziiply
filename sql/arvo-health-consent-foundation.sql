-- Arvo Health: staging migration. Do NOT run on production until auth and DPIA review.
-- No public role should receive access to these tables.
BEGIN;
CREATE TABLE IF NOT EXISTS arvo_health_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL,
 policy_version text NOT NULL,
 purposes text[] NOT NULL CHECK (cardinality(purposes)>0),
 categories text[] NOT NULL CHECK (cardinality(categories)>0),
 consented_at timestamptz NOT NULL DEFAULT now(),
 withdrawn_at timestamptz,
 CHECK (withdrawn_at IS NULL OR withdrawn_at >= consented_at)
);
CREATE INDEX IF NOT EXISTS arvo_health_consents_user_idx ON arvo_health_consents(user_id,consented_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS arvo_health_one_active_consent ON arvo_health_consents(user_id) WHERE withdrawn_at IS NULL;

CREATE TABLE IF NOT EXISTS arvo_health_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL,
 provider text NOT NULL CHECK(provider IN ('apple_health','health_connect')),
 consent_id uuid NOT NULL REFERENCES arvo_health_consents(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 last_synced_at timestamptz,
 disconnected_at timestamptz,
 UNIQUE(user_id,provider)
);
CREATE TABLE IF NOT EXISTS arvo_health_daily_summaries (
 user_id text NOT NULL,
 provider text NOT NULL CHECK(provider IN ('apple_health','health_connect')),
 local_date date NOT NULL,
 timezone text NOT NULL,
 steps integer CHECK (steps IS NULL OR steps>=0),
 active_energy_kcal numeric(12,3) CHECK (active_energy_kcal IS NULL OR active_energy_kcal>=0),
 resting_heart_rate_bpm numeric(8,3) CHECK (resting_heart_rate_bpm IS NULL OR resting_heart_rate_bpm>0),
 hrv_sdnn_ms numeric(10,3) CHECK (hrv_sdnn_ms IS NULL OR hrv_sdnn_ms>=0),
 sleep_minutes integer CHECK(sleep_minutes IS NULL OR sleep_minutes>=0),
 rem_minutes integer CHECK(rem_minutes IS NULL OR rem_minutes>=0),
 core_minutes integer CHECK(core_minutes IS NULL OR core_minutes>=0),
 deep_minutes integer CHECK(deep_minutes IS NULL OR deep_minutes>=0),
 awake_minutes integer CHECK(awake_minutes IS NULL OR awake_minutes>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,provider,local_date)
);
CREATE INDEX IF NOT EXISTS arvo_health_daily_user_date_idx ON arvo_health_daily_summaries(user_id,local_date DESC);
CREATE TABLE IF NOT EXISTS arvo_health_audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id text NOT NULL,
 event_type text NOT NULL CHECK(event_type IN ('consent_granted','consent_withdrawn','connection_removed','health_data_deleted')),
 consent_id uuid REFERENCES arvo_health_consents(id) ON DELETE SET NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 policy_version text,
 categories text[]
);
CREATE INDEX IF NOT EXISTS arvo_health_audit_user_idx ON arvo_health_audit_events(user_id,occurred_at DESC);
-- Explicitly deny access to common Postgres roles when present; runtime DB credentials
-- must also be restricted separately and all API reads must filter by verified session user.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='PUBLIC') THEN NULL; END IF;
END $$;
REVOKE ALL ON arvo_health_consents, arvo_health_connections, arvo_health_daily_summaries, arvo_health_audit_events FROM PUBLIC;
COMMIT;

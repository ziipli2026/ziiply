-- Arvo Health: link an authenticated beta user to a separate, revocable health consent.
-- Apply only after the beta auth foundation and existing Arvo health migrations.
-- No login, API ingestion or health-data collection is enabled by this migration.
CREATE TABLE IF NOT EXISTS public.ziiply_beta_health_enrolments (
  user_id uuid PRIMARY KEY REFERENCES public.ziiply_beta_users(id) ON DELETE CASCADE,
  opted_in_at timestamptz NOT NULL DEFAULT now(),
  opted_out_at timestamptz,
  policy_version text NOT NULL,
  CHECK (length(policy_version) BETWEEN 1 AND 100),
  CHECK (opted_out_at IS NULL OR opted_out_at >= opted_in_at)
);
CREATE INDEX IF NOT EXISTS ziiply_beta_health_enrolments_active_idx
  ON public.ziiply_beta_health_enrolments (opted_in_at)
  WHERE opted_out_at IS NULL;
REVOKE ALL ON public.ziiply_beta_health_enrolments FROM PUBLIC;
COMMENT ON TABLE public.ziiply_beta_health_enrolments IS
  'Optional beta health programme participation only; not HealthKit/Health Connect data-read consent. Verified, versioned category consent is required separately.';

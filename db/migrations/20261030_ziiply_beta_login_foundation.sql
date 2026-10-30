-- Beta login only. Review and apply on a dedicated test branch before production.
CREATE TABLE IF NOT EXISTS public.ziiply_beta_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id bigint NOT NULL UNIQUE REFERENCES public.ziiply_beta_applications(id),
  email_verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.ziiply_beta_login_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id bigint NOT NULL REFERENCES public.ziiply_beta_applications(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ziiply_beta_login_challenges_app_idx
 ON public.ziiply_beta_login_challenges(application_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.ziiply_beta_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.ziiply_beta_users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ziiply_beta_sessions_user_idx
 ON public.ziiply_beta_sessions(user_id,expires_at DESC);
CREATE TABLE IF NOT EXISTS public.ziiply_beta_login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_hash text NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ziiply_beta_login_attempts_email_idx
 ON public.ziiply_beta_login_attempts(email_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS ziiply_beta_login_attempts_ip_idx
 ON public.ziiply_beta_login_attempts(ip_hash,created_at DESC);
REVOKE ALL ON public.ziiply_beta_users,public.ziiply_beta_login_challenges,
public.ziiply_beta_sessions,public.ziiply_beta_login_attempts FROM PUBLIC;

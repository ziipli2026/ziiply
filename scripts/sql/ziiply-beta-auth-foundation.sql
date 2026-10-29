-- Ziiply beta authentication foundation: schema only; not a working login.
-- Does not alter existing beta applications, profiles or quotas.
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
CREATE INDEX IF NOT EXISTS ziiply_beta_login_challenges_app_idx ON public.ziiply_beta_login_challenges(application_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.ziiply_beta_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.ziiply_beta_users(id),
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ziiply_beta_sessions_user_idx ON public.ziiply_beta_sessions(user_id,expires_at DESC);
-- Beta grants every available feature at zero charge. No payment records.
CREATE VIEW public.ziiply_beta_full_access AS
SELECT u.id AS user_id, a.id AS application_id,
       true AS all_features_enabled, 0::numeric AS price_eur
FROM public.ziiply_beta_users u
JOIN public.ziiply_beta_applications a ON a.id=u.application_id
WHERE u.disabled_at IS NULL AND a.status IN ('invited','active');
REVOKE ALL ON public.ziiply_beta_users,public.ziiply_beta_login_challenges,
 public.ziiply_beta_sessions,public.ziiply_beta_full_access FROM PUBLIC;
-- Implementation must use server-side verified, single-use, expiring email challenges;
-- rate limiting, session cookies and CSRF protection before enabling.

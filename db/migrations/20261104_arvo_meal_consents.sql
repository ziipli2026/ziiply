-- Arvo cloud meal consent: explicit, revocable, separate from HealthKit.
-- NOT APPLIED. Requires verified server session and consent UI.
CREATE TABLE IF NOT EXISTS public.ziiply_arvo_meal_consents (
  user_id uuid PRIMARY KEY REFERENCES public.ziiply_beta_users(id) ON DELETE CASCADE,
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arvo_meal_consent_order CHECK (
    revoked_at IS NULL OR granted_at IS NULL OR revoked_at >= granted_at
  )
);
-- Consent is active only if granted_at IS NOT NULL and revoked_at IS NULL.
-- Do not allow anonymous access; all mutations require a verified user session.

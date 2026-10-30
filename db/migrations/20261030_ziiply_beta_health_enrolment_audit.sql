-- Harden beta health participation with a verifiable audit trail.
-- Requires 20261030_ziiply_beta_health_enrolments.sql.
-- This does NOT grant access to device health data or enable API sync.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ziiply_beta_health_enrolment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.ziiply_beta_users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('opt_in','opt_out')),
  policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 100),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ziiply_beta_health_events_user_idx
  ON public.ziiply_beta_health_enrolment_events(user_id, recorded_at DESC, id DESC);
REVOKE ALL ON public.ziiply_beta_health_enrolment_events FROM PUBLIC;
-- Atomic enrollment transition, callable only by a tightly scoped server DB role.
CREATE OR REPLACE FUNCTION public.ziiply_set_beta_health_enrolment(
  p_user_id uuid, p_action text, p_policy_version text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF p_user_id IS NULL OR p_action NOT IN ('opt_in','opt_out')
     OR p_policy_version IS NULL OR length(p_policy_version) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid health enrolment request';
  END IF;
  IF p_action = 'opt_in' THEN
    INSERT INTO public.ziiply_beta_health_enrolments
      (user_id, opted_in_at, opted_out_at, policy_version)
    VALUES (p_user_id, now(), NULL, p_policy_version)
    ON CONFLICT (user_id) DO UPDATE SET
      opted_in_at = now(), opted_out_at = NULL, policy_version = EXCLUDED.policy_version;
  ELSE
    UPDATE public.ziiply_beta_health_enrolments
      SET opted_out_at = now()
      WHERE user_id = p_user_id AND opted_out_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'No active health enrolment'; END IF;
  END IF;
  INSERT INTO public.ziiply_beta_health_enrolment_events(user_id, action, policy_version)
    VALUES (p_user_id, p_action, p_policy_version);
END;
$$;
REVOKE ALL ON FUNCTION public.ziiply_set_beta_health_enrolment(uuid,text,text) FROM PUBLIC;
COMMIT;

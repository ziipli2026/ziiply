-- Ziiply beta tester administration: run manually with authorized database access.
-- Do not expose these operations through an unauthenticated public API.
-- List aggregate statuses (no personal information):
SELECT status, count(*) AS testers
FROM public.ziiply_beta_applications
GROUP BY status ORDER BY status;

-- Inspect a single application by its known ID before changing its status:
-- SELECT id, email, status, invited_at, updated_at
-- FROM public.ziiply_beta_applications WHERE id = :application_id;

-- Invite an approved applicant (substitute a verified application ID):
-- UPDATE public.ziiply_beta_applications
-- SET status = 'invited', invited_at = now(), updated_at = now()
-- WHERE id = :application_id AND status = 'registered'
-- RETURNING id, status, invited_at;

-- Activate an invited tester:
-- UPDATE public.ziiply_beta_applications
-- SET status = 'active', updated_at = now()
-- WHERE id = :application_id AND status = 'invited'
-- RETURNING id, status;

-- Revoke access and invalidate every active session in the same transaction:
-- BEGIN;
-- UPDATE public.ziiply_beta_applications
-- SET status = 'revoked', updated_at = now()
-- WHERE id = :application_id AND status IN ('registered','invited','active');
-- UPDATE public.ziiply_beta_sessions s SET revoked_at = now()
-- FROM public.ziiply_beta_users u
-- WHERE s.user_id = u.id AND u.application_id = :application_id
--   AND s.revoked_at IS NULL;
-- COMMIT;

-- Verify session lifecycle without exposing email or tokens:
SELECT count(*) AS total_sessions,
       count(*) FILTER (WHERE revoked_at IS NOT NULL) AS revoked_sessions,
       count(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now()) AS valid_sessions
FROM public.ziiply_beta_sessions;
